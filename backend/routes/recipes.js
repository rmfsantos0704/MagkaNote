const express = require('express');
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const { PSGC_CODE_PATTERN } = require('../models/User');
const { MEASUREMENT_UNITS } = require('../models/PriceReport');
const { estimateRecipe } = require('../services/recipeService');

const router = express.Router();

const SOURCE_TYPES = ['palengke', 'supermarket', 'sari_sari_store'];
const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

/** Shared validation for the items[] array used by /estimate and POST /. */
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'items must be a non-empty array';
  if (items.length > 50) return 'A recipe can have at most 50 items';

  for (const line of items) {
    if (!mongoose.isValidObjectId(line.item_id)) return 'Each line needs a valid item_id';
    if (typeof line.quantity !== 'number' || !(line.quantity > 0)) {
      return 'Each line needs a quantity greater than 0';
    }
    if (!MEASUREMENT_UNITS.includes(line.measurement_unit)) {
      return `measurement_unit must be one of: ${MEASUREMENT_UNITS.join(', ')}`;
    }
  }
  return null;
}

/** Pulls the optional Compose-tab fields out of a request body, ignoring blanks. */
function pickMetadata(body) {
  const meta = {};
  if (body.category != null) meta.category = String(body.category).trim() || null;
  if (body.servings != null) meta.servings = Number(body.servings) || null;
  if (body.prep_time != null) meta.prep_time = String(body.prep_time).trim() || null;
  if (body.notes != null) meta.notes = String(body.notes).trim() || null;
  if (body.image_url != null) meta.image_url = String(body.image_url).trim() || null;
  if (body.difficulty != null) {
    if (body.difficulty && !DIFFICULTIES.includes(body.difficulty)) {
      throw Object.assign(new Error(`difficulty must be one of: ${DIFFICULTIES.join(', ')}`), { status: 400 });
    }
    meta.difficulty = body.difficulty || null;
  }
  return meta;
}

// POST /api/recipes/estimate
// body: { location_code, source?, items: [{ item_id, quantity, measurement_unit }] }
// location_code is a 9-digit PSGC city/municipality code, from the location picker.
// The Smart Note calls this every time an ingredient, quantity, unit or location changes.
router.post('/estimate', async (req, res, next) => {
  try {
    const { location_code, source, outlet_name, items } = req.body;

    if (!location_code || !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    if (source && !SOURCE_TYPES.includes(source)) {
      return res.status(400).json({ error: 'Invalid source' });
    }
    if (outlet_name != null && (typeof outlet_name !== 'string' || outlet_name.trim().length > 120)) {
      return res.status(400).json({ error: 'outlet_name must be 120 characters or fewer' });
    }
    const problem = validateItems(items);
    if (problem) return res.status(400).json({ error: problem });

    res.json(await estimateRecipe({ items, locationCode: location_code, source, outletName: outlet_name?.trim() || undefined }));
  } catch (err) {
    next(err);
  }
});

// POST /api/recipes
// body: { user_id, title, location_code, source?, items: [...], category?, servings?, prep_time?, difficulty?, notes? }
// Saves the recipe with a snapshot of its estimated total.
router.post('/', async (req, res, next) => {
  try {
    const { user_id, title, location_code, location_name, outlet_name, source, items, supermarket_total } = req.body;

    if (!mongoose.isValidObjectId(user_id) || !(await User.exists({ _id: user_id }))) {
      return res.status(400).json({ error: 'A valid user_id is required' });
    }
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!location_code || !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    if (outlet_name != null && (typeof outlet_name !== 'string' || outlet_name.trim().length > 120)) {
      return res.status(400).json({ error: 'outlet_name must be 120 characters or fewer' });
    }
    const problem = validateItems(items);
    if (problem) return res.status(400).json({ error: problem });

    const estimate = await estimateRecipe({ items, locationCode: location_code, source, outletName: outlet_name?.trim() || undefined });

    const recipe = await Recipe.create({
      user_id,
      title,
      location_psgc_code: location_code,
      location_name: location_name ?? null,
      outlet_name: outlet_name?.trim() || null,
      ...pickMetadata(req.body),
      items: items.map(({ item_id, quantity, measurement_unit }) => ({
        item_id,
        quantity,
        measurement_unit,
      })),
      total_estimated_cost: estimate.total.estimated,
      total_supermarket_cost: typeof supermarket_total === 'number' ? supermarket_total : null,
    });

    res.status(201).json({ recipe, estimate });
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes?user_id=...
// Lists a user's saved recipes, most recent first. Used by the dashboard.
router.get('/', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    if (!mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ error: 'A valid user_id is required' });
    }

    const recipes = await Recipe.find({ user_id })
      .sort({ is_favorite: -1, createdAt: -1 })
      .limit(100)
      .select('title category servings prep_time difficulty image_url is_favorite items total_estimated_cost total_supermarket_cost outlet_name createdAt');

    res.json({
      count: recipes.length,
      recipes: recipes.map((r) => ({
        _id: r._id,
        title: r.title,
        category: r.category,
        servings: r.servings,
        prep_time: r.prep_time,
        difficulty: r.difficulty,
        image_url: r.image_url,
        is_favorite: r.is_favorite,
        item_count: r.items.length,
        total_estimated_cost: r.total_estimated_cost,
        total_supermarket_cost: r.total_supermarket_cost,
        outlet_name: r.outlet_name,
        created_at: r.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/recipes/:id/favorite   body: { user_id, is_favorite }
// Stars/unstars a recipe. Checked against the owner like delete is.
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, is_favorite } = req.body;

    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ error: 'A valid recipe id and user_id are required' });
    }
    if (typeof is_favorite !== 'boolean') {
      return res.status(400).json({ error: 'is_favorite must be a boolean' });
    }

    const recipe = await Recipe.findOneAndUpdate(
      { _id: id, user_id },
      { is_favorite },
      { new: true }
    ).select('_id is_favorite');
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    res.json({ _id: recipe._id, is_favorite: recipe.is_favorite });
  } catch (err) {
    next(err);
  }
});

// GET /api/recipes/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid recipe id' });
    }
    const recipe = await Recipe.findById(req.params.id).populate(
      'items.item_id',
      'default_name image_url category baseline_unit'
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

// PUT /api/recipes/:id
// body: same shape as POST, plus user_id checked against the recipe's owner.
// Used when editing an existing recipe from SmartNote instead of creating a duplicate.
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, title, location_code, location_name, outlet_name, source, items, supermarket_total } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid recipe id' });
    }
    if (!mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ error: 'A valid user_id is required' });
    }
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!location_code || !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    if (outlet_name != null && (typeof outlet_name !== 'string' || outlet_name.trim().length > 120)) {
      return res.status(400).json({ error: 'outlet_name must be 120 characters or fewer' });
    }
    const problem = validateItems(items);
    if (problem) return res.status(400).json({ error: problem });

    const existing = await Recipe.findOne({ _id: id, user_id });
    if (!existing) return res.status(404).json({ error: 'Recipe not found' });

    const estimate = await estimateRecipe({ items, locationCode: location_code, source, outletName: outlet_name?.trim() || undefined });

    existing.set({
      title,
      location_psgc_code: location_code,
      location_name: location_name ?? existing.location_name,
      outlet_name: outlet_name === undefined ? existing.outlet_name : outlet_name?.trim() || null,
      ...pickMetadata(req.body),
      items: items.map(({ item_id, quantity, measurement_unit }) => ({
        item_id,
        quantity,
        measurement_unit,
      })),
      total_estimated_cost: estimate.total.estimated,
      total_supermarket_cost: typeof supermarket_total === 'number' ? supermarket_total : existing.total_supermarket_cost,
    });
    await existing.save();

    res.json({ recipe: existing, estimate });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/recipes/:id?user_id=...
// user_id is required and checked against the recipe's owner so one device
// can't delete another's recipe just by guessing an id.
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id } = req.query;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ error: 'A valid recipe id and user_id are required' });
    }

    const recipe = await Recipe.findOneAndDelete({ _id: id, user_id });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });

    res.json({ deleted: true, _id: id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;