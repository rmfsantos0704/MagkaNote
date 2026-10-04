const express = require('express');
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const RecipeRating = require('../models/RecipeRating');
const ModerationReport = require('../models/ModerationReport');
const Notification = require('../models/Notification');

const router = express.Router();
const REPORT_REASONS = ['spam', 'harassment', 'misinformation', 'copyright', 'inappropriate', 'other'];

router.get('/recipes', async (req, res, next) => {
  try {
    const query = { is_public: true };
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
    if (search) query.title = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const recipes = await Recipe.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user_id', 'username location_name')
      .populate('items.item_id', 'default_name');
    const ratings = await RecipeRating.aggregate([
      { $match: { recipe_id: { $in: recipes.map((recipe) => recipe._id) } } },
      { $group: { _id: '$recipe_id', average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    const ratingMap = new Map(ratings.map((rating) => [String(rating._id), rating]));
    res.json({ recipes: recipes.map((recipe) => {
      const summary = ratingMap.get(String(recipe._id));
      return {
        _id: recipe._id,
        author_id: recipe.user_id?._id,
        title: recipe.title,
        author: recipe.user_id?.username ?? 'Community cook',
        area: recipe.location_name ?? recipe.user_id?.location_name ?? '',
        image_url: recipe.image_url,
        cost: recipe.total_estimated_cost,
        servings: recipe.servings,
        category: recipe.category,
        tags: [recipe.category, recipe.difficulty].filter(Boolean),
        ingredients: recipe.items.filter((line) => line.item_id).map((line) => ({
          name: line.item_id.default_name,
          amount: `${line.quantity} ${line.measurement_unit}`,
        })),
        steps: recipe.steps,
        rating_average: summary ? Math.round(summary.average * 10) / 10 : 0,
        rating_count: summary?.count ?? 0,
        created_at: recipe.createdAt,
      };
    }) });
  } catch (err) { next(err); }
});

router.post('/recipes/:id/copy', async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(user_id)) return res.status(400).json({ error: 'Valid recipe id and user_id are required' });
    if (!(await User.exists({ _id: user_id }))) return res.status(404).json({ error: 'User not found' });
    const source = await Recipe.findOne({ _id: req.params.id, is_public: true });
    if (!source) return res.status(404).json({ error: 'Community recipe not found' });
    const recipe = await Recipe.create({
      user_id,
      title: source.title,
      category: source.category,
      servings: source.servings,
      prep_time: source.prep_time,
      difficulty: source.difficulty,
      notes: source.notes,
      image_url: source.image_url,
      location_psgc_code: source.location_psgc_code,
      location_name: source.location_name,
      outlet_name: source.outlet_name,
      steps: source.steps,
      items: source.items.map((line) => ({
        item_id: line.item_id,
        quantity: line.quantity,
        measurement_unit: line.measurement_unit,
        purchase_outlet: line.purchase_outlet,
        purchase_price: line.purchase_price,
        purchase_weight_grams: line.purchase_weight_grams,
        purchase_quantity: line.purchase_quantity,
      })),
      total_estimated_cost: source.total_estimated_cost,
      total_supermarket_cost: source.total_supermarket_cost,
    });
    await recipe.populate('items.item_id', 'default_name image_url category baseline_unit baseline_price');
    res.status(201).json({ recipe });
  } catch (err) { next(err); }
});

router.post('/recipes/:id/ratings', async (req, res, next) => {
  try {
    const { user_id, rating, feedback = '' } = req.body;
    if (!mongoose.isValidObjectId(req.params.id) || !mongoose.isValidObjectId(user_id)) return res.status(400).json({ error: 'Valid recipe id and user_id are required' });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating must be an integer from 1 to 5' });
    if (typeof feedback !== 'string' || feedback.trim().length > 500) return res.status(400).json({ error: 'feedback must be 500 characters or fewer' });
    const [recipe, user] = await Promise.all([
      Recipe.findOne({ _id: req.params.id, is_public: true }),
      User.findById(user_id).select('username'),
    ]);
    if (!recipe) return res.status(404).json({ error: 'Community recipe not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (recipe.user_id.equals(user_id)) return res.status(403).json({ error: 'You cannot rate your own recipe' });

    await RecipeRating.findOneAndUpdate(
      { recipe_id: recipe._id, user_id },
      { rating, feedback: feedback.trim() },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    const [summary] = await RecipeRating.aggregate([
      { $match: { recipe_id: recipe._id } },
      { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await Notification.create({
      user_id: recipe.user_id,
      type: 'rating',
      title: 'Recipe feedback received',
      message: `${user.username} rated ${recipe.title} ${rating} out of 5 stars.`,
      related_id: recipe._id,
    });
    res.json({ rating_average: Math.round(summary.average * 10) / 10, rating_count: summary.count });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'You have already rated this recipe' });
    next(err);
  }
});

router.get('/recipes/:id/ratings', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid recipe id' });
    if (!(await Recipe.exists({ _id: req.params.id, is_public: true }))) return res.status(404).json({ error: 'Community recipe not found' });
    const ratings = await RecipeRating.find({ recipe_id: req.params.id })
      .sort({ updatedAt: -1 })
      .limit(30)
      .populate('user_id', 'username')
      .lean();
    res.json({ ratings: ratings.map((entry) => ({
      _id: entry._id,
      username: entry.user_id?.username ?? 'Community cook',
      rating: entry.rating,
      feedback: entry.feedback,
      created_at: entry.updatedAt,
    })) });
  } catch (err) { next(err); }
});

router.post('/reports', async (req, res, next) => {
  try {
    const { reporter_user_id, target_type, target_id, reason, details = '' } = req.body;
    if (!mongoose.isValidObjectId(reporter_user_id) || !mongoose.isValidObjectId(target_id)) return res.status(400).json({ error: 'Valid reporter_user_id and target_id are required' });
    if (!['recipe', 'user'].includes(target_type)) return res.status(400).json({ error: 'target_type must be recipe or user' });
    if (!REPORT_REASONS.includes(reason)) return res.status(400).json({ error: `reason must be one of: ${REPORT_REASONS.join(', ')}` });
    if (typeof details !== 'string' || details.trim().length > 1000) return res.status(400).json({ error: 'details must be 1000 characters or fewer' });
    const [reporter, target] = await Promise.all([
      User.exists({ _id: reporter_user_id }),
      target_type === 'recipe'
        ? Recipe.exists({ _id: target_id, is_public: true })
        : User.exists({ _id: target_id }),
    ]);
    if (!reporter) return res.status(404).json({ error: 'Reporter not found' });
    if (!target) return res.status(404).json({ error: 'Reported content not found' });
    const report = await ModerationReport.create({ reporter_user_id, target_type, target_id, reason, details: details.trim() });
    res.status(201).json({ _id: report._id, status: report.status, createdAt: report.createdAt });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'You have already reported this content' });
    next(err);
  }
});

module.exports = router;
