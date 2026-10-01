const express = require('express');
const mongoose = require('mongoose');
const Item = require('../models/Item');
const { CATEGORIES } = require('../models/Item');
const { lookupBarcode, isValidEan13 } = require('../services/barcodeService');

const router = express.Router();

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/items?category=Produce[&limit=30]
// Browsable list, no search text required — this is what the SmartNote
// Ingredients tab shows before the person types anything.
router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.category) {
      if (!CATEGORIES.includes(req.query.category)) {
        return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
      }
      filter.category = req.query.category;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 60);

    const items = await Item.find(filter)
      .select('default_name category image_url barcode_ean13 baseline_price baseline_unit')
      .sort({ default_name: 1 })
      .limit(limit);

    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/search?q=kamat[&category=Produce][&limit=20]
// Used by the Smart Note ingredient search bar (partial, case-insensitive match)
router.get('/search', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const filter = { default_name: { $regex: escapeRegex(q), $options: 'i' } };
    if (req.query.category) {
      if (!CATEGORIES.includes(req.query.category)) {
        return res.status(400).json({ error: `category must be one of: ${CATEGORIES.join(', ')}` });
      }
      filter.category = req.query.category;
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);

    const items = await Item.find(filter)
      .select('default_name category image_url barcode_ean13 baseline_price baseline_unit')
      .sort({ default_name: 1 })
      .limit(limit);

    res.json({ count: items.length, items });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/barcode/:ean
// 200 -> found (internal or Open Food Facts), 404 -> client should show "add item" form
router.get('/barcode/:ean', async (req, res, next) => {
  try {
    const { ean } = req.params;

    if (!isValidEan13(ean)) {
      return res.status(400).json({ error: 'Not a valid EAN-13 barcode. Try scanning again.' });
    }

    const result = await lookupBarcode(ean);

    if (result.source === 'not_found') {
      return res.status(404).json({
        source: 'not_found',
        barcode_ean13: ean,
        external_lookup_failed: result.external_lookup_failed,
        message: 'Item not found. Please enter its details and add a photo.',
      });
    }

    res.json({ source: result.source, item: result.item });
  } catch (err) {
    next(err);
  }
});

// POST /api/items
// Manual entry when a barcode isn't found anywhere (also seeds our database).
// image_url is expected to be a Cloudinary URL (upload handled in a later step).
router.post('/', async (req, res, next) => {
  try {
    const { default_name, category, barcode_ean13, image_url, baseline_price, baseline_unit } = req.body;

    if (!default_name || !default_name.trim()) {
      return res.status(400).json({ error: 'default_name is required' });
    }
    if (barcode_ean13 && !isValidEan13(barcode_ean13)) {
      return res.status(400).json({ error: 'barcode_ean13 is not a valid EAN-13' });
    }

    const item = await Item.create({
      default_name,
      category,
      barcode_ean13: barcode_ean13 || undefined, // keep the sparse unique index happy
      image_url,
      baseline_price,
      baseline_unit,
    });

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id  (keep this LAST so it doesn't swallow /search and /barcode)
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid item id' });
    }
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;