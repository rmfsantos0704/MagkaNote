const express = require('express');
const mongoose = require('mongoose');
const Recipe = require('../models/Recipe');
const User = require('../models/User');
const { PSGC_CODE_PATTERN } = require('../models/User');
const { MEASUREMENT_UNITS } = require('../models/PriceReport');
const { estimateRecipe } = require('../services/recipeService');

const router = express.Router();

const SOURCE_TYPES = ['palengke', 'supermarket', 'sari_sari_store'];

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

// POST /api/recipes/estimate
// body: { location_code, source?, items: [{ item_id, quantity, measurement_unit }] }
// location_code is a 9-digit PSGC city/municipality code, from the location picker.
// The Smart Note calls this every time an ingredient, quantity, unit or location changes.
router.post('/estimate', async (req, res, next) => {
  try {
    const { location_code, source, items } = req.body;

    if (!location_code || !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    if (source && !SOURCE_TYPES.includes(source)) {
      return res.status(400).json({ error: 'Invalid source' });
    }
    const problem = validateItems(items);
    if (problem) return res.status(400).json({ error: problem });

    res.json(await estimateRecipe({ items, locationCode: location_code, source }));
  } catch (err) {
    next(err);
  }
});

// POST /api/recipes
// body: { user_id, title, location_code, source?, items: [...] }
// Saves the recipe with a snapshot of its estimated total.
router.post('/', async (req, res, next) => {
  try {
    const { user_id, title, location_code, source, items } = req.body;

    if (!mongoose.isValidObjectId(user_id) || !(await User.exists({ _id: user_id }))) {
      return res.status(400).json({ error: 'A valid user_id is required' });
    }
    if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
    if (!location_code || !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    const problem = validateItems(items);
    if (problem) return res.status(400).json({ error: problem });

    const estimate = await estimateRecipe({ items, locationCode: location_code, source });

    const recipe = await Recipe.create({
      user_id,
      title,
      items: items.map(({ item_id, quantity, measurement_unit }) => ({
        item_id,
        quantity,
        measurement_unit,
      })),
      total_estimated_cost: estimate.total.estimated,
    });

    res.status(201).json({ recipe, estimate });
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
      'default_name image_url category'
    );
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
