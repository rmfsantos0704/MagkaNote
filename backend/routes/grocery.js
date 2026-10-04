const express = require('express');
const mongoose = require('mongoose');
const GroceryList = require('../models/GroceryList');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const Item = require('../models/Item');
const { MEASUREMENT_UNITS } = require('../models/PriceReport');

const router = express.Router();

async function getList(userId) {
  let list = await GroceryList.findOne({ user_id: userId });
  if (!list) list = await GroceryList.create({ user_id: userId, items: [] });
  return list.populate('items.item_id', 'default_name category image_url baseline_price baseline_unit');
}

router.get('/', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    if (!mongoose.isValidObjectId(user_id) || !(await User.exists({ _id: user_id }))) {
      return res.status(400).json({ error: 'A valid user_id is required' });
    }
    res.json(await getList(user_id));
  } catch (err) { next(err); }
});

router.post('/from-recipes', async (req, res, next) => {
  try {
    const { user_id, recipe_ids } = req.body;
    if (!mongoose.isValidObjectId(user_id) || !(await User.exists({ _id: user_id }))) {
      return res.status(400).json({ error: 'A valid user_id is required' });
    }
    if (!Array.isArray(recipe_ids) || !recipe_ids.length || recipe_ids.length > 100 || recipe_ids.some((id) => !mongoose.isValidObjectId(id))) {
      return res.status(400).json({ error: 'recipe_ids must be a non-empty array of valid recipe ids' });
    }
    const recipes = await Recipe.find({ _id: { $in: recipe_ids }, user_id }).select('items');
    if (recipes.length !== new Set(recipe_ids).size) return res.status(404).json({ error: 'One or more recipes were not found' });
    const list = await GroceryList.findOneAndUpdate({ user_id }, { $setOnInsert: { user_id, items: [] } }, { upsert: true, new: true });
    for (const recipe of recipes) {
      for (const line of recipe.items) {
        const existing = list.items.find((entry) => entry.item_id.equals(line.item_id) && entry.measurement_unit === line.measurement_unit);
        if (existing) existing.quantity += line.quantity;
        else list.items.push({ item_id: line.item_id, quantity: line.quantity, measurement_unit: line.measurement_unit });
      }
    }
    await list.save();
    res.status(201).json(await list.populate('items.item_id', 'default_name category image_url baseline_price baseline_unit'));
  } catch (err) { next(err); }
});

router.post('/items', async (req, res, next) => {
  try {
    const { user_id, item_id, quantity, measurement_unit } = req.body;
    if (!mongoose.isValidObjectId(user_id) || !mongoose.isValidObjectId(item_id)) return res.status(400).json({ error: 'Valid user_id and item_id are required' });
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity <= 0) return res.status(400).json({ error: 'quantity must be greater than 0' });
    if (!MEASUREMENT_UNITS.includes(measurement_unit)) return res.status(400).json({ error: 'Invalid measurement_unit' });
    const [itemExists, userExists] = await Promise.all([
      Item.exists({ _id: item_id }),
      User.exists({ _id: user_id }),
    ]);
    if (!userExists) return res.status(404).json({ error: 'User not found' });
    if (!itemExists) return res.status(404).json({ error: 'Item not found' });
    const list = await GroceryList.findOneAndUpdate({ user_id }, { $setOnInsert: { user_id, items: [] } }, { upsert: true, new: true });
    const existing = list.items.find((entry) => entry.item_id.equals(item_id) && entry.measurement_unit === measurement_unit);
    if (existing) existing.quantity += quantity;
    else list.items.push({ item_id, quantity, measurement_unit });
    await list.save();
    res.status(201).json(await list.populate('items.item_id', 'default_name category image_url baseline_price baseline_unit'));
  } catch (err) { next(err); }
});

router.patch('/items/:entryId', async (req, res, next) => {
  try {
    const { user_id, checked } = req.body;
    if (!mongoose.isValidObjectId(user_id) || !mongoose.isValidObjectId(req.params.entryId)) return res.status(400).json({ error: 'Valid user_id and entry id are required' });
    if (typeof checked !== 'boolean') return res.status(400).json({ error: 'checked must be a boolean' });
    const list = await GroceryList.findOne({ user_id });
    const entry = list?.items.id(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Grocery item not found' });
    entry.checked = checked;
    await list.save();
    res.json(await list.populate('items.item_id', 'default_name category image_url baseline_price baseline_unit'));
  } catch (err) { next(err); }
});

router.delete('/items/:entryId', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    if (!mongoose.isValidObjectId(user_id) || !mongoose.isValidObjectId(req.params.entryId)) return res.status(400).json({ error: 'Valid user_id and entry id are required' });
    const list = await GroceryList.findOne({ user_id });
    const entry = list?.items.id(req.params.entryId);
    if (!entry) return res.status(404).json({ error: 'Grocery item not found' });
    entry.deleteOne();
    await list.save();
    res.json(await list.populate('items.item_id', 'default_name category image_url baseline_price baseline_unit'));
  } catch (err) { next(err); }
});

router.delete('/', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ error: 'A valid user_id is required' });
    if (!(await User.exists({ _id: user_id }))) return res.status(404).json({ error: 'User not found' });
    const list = await GroceryList.findOneAndUpdate({ user_id }, { $set: { items: [] } }, { new: true, upsert: true, setDefaultsOnInsert: true });
    res.json(await list.populate('items.item_id', 'default_name category image_url baseline_price baseline_unit'));
  } catch (err) { next(err); }
});

module.exports = router;
