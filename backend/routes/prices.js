const express = require('express');
const mongoose = require('mongoose');
const { getPriceEstimate } = require('../services/pricingService');
const { PSGC_CODE_PATTERN } = require('../models/User');
const PriceReport = require('../models/PriceReport');
const { MEASUREMENT_UNITS } = require('../models/PriceReport');
const User = require('../models/User');
const Item = require('../models/Item');
const Notification = require('../models/Notification');

const SOURCE_TYPES = ['palengke', 'supermarket', 'sari_sari_store'];

const router = express.Router();

// GET /api/prices/estimate?item_id=...&location_code=072217000[&unit=kilo][&source=palengke]
// location_code is the PSGC code of a city/municipality, picked from the
// region -> province -> city cascade (see src/screens/LocationPickerScreen on
// the frontend). We don't validate it against the PSGC API here, only its
// shape, to keep this endpoint fast and independent of a third-party outage.
router.get('/estimate', async (req, res, next) => {
  try {
    const { item_id, location_code, unit, source, outlet_name } = req.query;

    if (!item_id || !mongoose.isValidObjectId(item_id)) {
      return res.status(400).json({ error: 'A valid item_id is required' });
    }
    if (!location_code || !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    if (unit && !MEASUREMENT_UNITS.includes(unit)) {
      return res.status(400).json({ error: `unit must be one of: ${MEASUREMENT_UNITS.join(', ')}` });
    }
    if (source && !SOURCE_TYPES.includes(source)) {
      return res.status(400).json({ error: 'Invalid source' });
    }
    if (outlet_name != null && (typeof outlet_name !== 'string' || outlet_name.trim().length > 120)) {
      return res.status(400).json({ error: 'outlet_name must be 120 characters or fewer' });
    }

    const result = await getPriceEstimate({
      itemId: item_id,
      locationCode: location_code,
      unit,
      sourceType: source,
      outletName: outlet_name?.trim() || undefined,
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
// location_psgc_code/location_name are sent by the client from the same PSGC
// picker used for search, so they always match what the user selected.
router.post('/', async (req, res, next) => {
  try {
    const { item_id, user_id, price, measurement_unit, location_psgc_code, location_name, outlet_name, source_type } = req.body;

    if (!mongoose.isValidObjectId(item_id) || !mongoose.isValidObjectId(user_id)) {
      return res.status(400).json({ error: 'Valid item_id and user_id are required' });
    }
    if (typeof price !== 'number' || !(price > 0)) {
      return res.status(400).json({ error: 'price must be a number greater than 0' });
    }
    if (!location_psgc_code || !PSGC_CODE_PATTERN.test(location_psgc_code)) {
      return res.status(400).json({ error: 'location_psgc_code must be a 9-digit PSGC city/municipality code' });
    }
    if (!location_name || !location_name.trim()) {
      return res.status(400).json({ error: 'location_name is required' });
    }
    if (outlet_name != null && (typeof outlet_name !== 'string' || outlet_name.trim().length > 120)) {
      return res.status(400).json({ error: 'outlet_name must be 120 characters or fewer' });
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
      location_psgc_code,
      location_name,
      outlet_name: outlet_name?.trim() || null,
      source_type,
    });

    await Notification.create({
      user_id,
      type: 'price_report',
      title: 'Price report received',
      message: `Your ${item.default_name} price report has been added to community estimates.`,
      related_id: report._id,
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
