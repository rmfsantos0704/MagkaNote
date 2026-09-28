const express = require('express');
const mongoose = require('mongoose');
const { getPriceEstimate } = require('../services/pricingService');
const { VALID_ZONES } = require('../models/User');
const PriceReport = require('../models/PriceReport');
const { MEASUREMENT_UNITS } = require('../models/PriceReport');
const User = require('../models/User');
const Item = require('../models/Item');

const SOURCE_TYPES = ['palengke', 'supermarket', 'sari_sari_store'];

const router = express.Router();

// GET /api/prices/estimate?item_id=...&zone=Cebu[&unit=kilo][&source=palengke]
router.get('/estimate', async (req, res, next) => {
  try {
    const { item_id, zone, unit, source } = req.query;

    if (!item_id || !mongoose.isValidObjectId(item_id)) {
      return res.status(400).json({ error: 'A valid item_id is required' });
    }
    if (!zone || !VALID_ZONES.includes(zone)) {
      return res.status(400).json({ error: `zone must be one of: ${VALID_ZONES.join(', ')}` });
    }
    if (unit && !MEASUREMENT_UNITS.includes(unit)) {
      return res.status(400).json({ error: `unit must be one of: ${MEASUREMENT_UNITS.join(', ')}` });
    }
    if (source && !SOURCE_TYPES.includes(source)) {
      return res.status(400).json({ error: 'Invalid source' });
    }

    const result = await getPriceEstimate({
      itemId: item_id,
      zone,
      unit,
      sourceType: source,
    });

    if (!result) return res.status(404).json({ error: 'Item not found' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/prices
// Crowdsourced price submission.
// NOTE: user_id comes from the body for now. Once auth exists (JWT), read it from the token instead.
router.post('/', async (req, res, next) => {
  try {
    const { item_id, user_id, price, measurement_unit, location_zone, source_type } = req.body;

    if (!mongoose.isValidObjectId(item_id) || !mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ error: 'Valid item_id and user_id are required' });
    }
    if (typeof price !== 'number' || !(price > 0)) {
      return res.status(400).json({ error: 'price must be a number greater than 0' });
    }

    const [item, user] = await Promise.all([
      Item.exists({ _id: item_id }),
      User.exists({ _id: user_id }),
    ]);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const report = await PriceReport.create({
      item_id,
      user_id,
      price,
      measurement_unit,
      location_zone,
      source_type,
    });

    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

// POST /api/prices/:id/vote   body: { "direction": "up" | "down" }
// Adjusts the report's vote count and the reporter's trust_score (never below 0).
// LIMITATION: nothing stops one person voting many times until auth + a votes
// collection exist. Fine for development, must be fixed before launch.
router.post('/:id/vote', async (req, res, next) => {
  try {
    const { direction } = req.body;

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid report id' });
    }
    if (!['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: 'direction must be "up" or "down"' });
    }

    const field = direction === 'up' ? 'upvotes' : 'downvotes';
    const report = await PriceReport.findByIdAndUpdate(
      req.params.id,
      { $inc: { [field]: 1 } },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Price report not found' });

    const delta = direction === 'up' ? 1 : -1;
    await User.updateOne({ _id: report.user_id }, [
      { $set: { trust_score: { $max: [0, { $add: ['$trust_score', delta] }] } } },
    ]);

    res.json({ _id: report._id, upvotes: report.upvotes, downvotes: report.downvotes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;