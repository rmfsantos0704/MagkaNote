const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { PSGC_CODE_PATTERN } = require('../models/User');

const router = express.Router();

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]{8,100}$/;
const SEARCH_RADII = [1, 3, 5, 10];

function serializeSettings(user) {
  const preferences = user.preferences ?? {};
  return {
    profile: {
      username: user.username,
      email: user.email,
      profile_image_url: user.profile_image_url ?? null,
    },
    preferences: {
      location: user.location_psgc_code && user.location_name
        ? { code: user.location_psgc_code, name: user.location_name }
        : null,
      radius: preferences.radius ?? 3,
      market: preferences.market ?? 'Any nearby market',
      household_size: preferences.household_size ?? 4,
      weekly_budget: preferences.weekly_budget ?? null,
      dietary: preferences.dietary ?? [],
      price_drops: preferences.price_drops ?? true,
      nearby_reports: preferences.nearby_reports ?? true,
      weekly_summary: preferences.weekly_summary ?? true,
      public_profile: preferences.public_profile ?? false,
    },
  };
}

// POST /api/users/device   body: { device_id }
// Finds the user tied to this device, or creates one on the spot.
// This is a stand-in for real accounts: it lets the app save and list
// recipes without a signup/login flow. Swap for real auth later by keeping
// this endpoint's shape (returns a user with _id) so callers don't change.
router.post('/device', async (req, res, next) => {
  try {
    const { device_id } = req.body;

    if (!device_id || !DEVICE_ID_PATTERN.test(device_id)) {
      return res.status(400).json({ error: 'A valid device_id is required' });
    }

    let user = await User.findOne({ device_id });

    if (!user) {
      const suffix = device_id.replace(/-/g, '').slice(-10);
      user = await User.create({
        device_id,
        username: `guest_${suffix}`,
        email: `${suffix}@device.magkanote.local`,
      });
    }

    res.json({ _id: user._id, username: user.username, trust_score: user.trust_score });
  } catch (err) {
    // Two requests raced to create the same device_id: fetch the winner instead of erroring
    if (err.code === 11000) {
      try {
        const user = await User.findOne({ device_id: req.body.device_id });
        if (user) {
          return res.json({ _id: user._id, username: user.username, trust_score: user.trust_score });
        }
      } catch (inner) {
        return next(inner);
      }
    }
    next(err);
  }
});

// GET /api/users/:id/settings
router.get('/:id/settings', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(serializeSettings(user));
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id/settings
router.put('/:id/settings', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const {
      location_code,
      location_name,
      radius,
      market,
      household_size,
      weekly_budget,
      dietary,
      price_drops,
      nearby_reports,
      weekly_summary,
      public_profile,
      profile_image_url,
    } = req.body;

    if (location_code && !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    if (location_code && (!location_name || !location_name.trim())) {
      return res.status(400).json({ error: 'location_name is required with location_code' });
    }
    if (!SEARCH_RADII.includes(radius)) return res.status(400).json({ error: 'radius must be 1, 3, 5, or 10 km' });
    if (typeof market !== 'string' || !market.trim() || market.trim().length > 120) {
      return res.status(400).json({ error: 'market must be between 1 and 120 characters' });
    }
    if (!Number.isInteger(household_size) || household_size < 1 || household_size > 20) {
      return res.status(400).json({ error: 'household_size must be between 1 and 20' });
    }
    if (weekly_budget != null && (typeof weekly_budget !== 'number' || !Number.isFinite(weekly_budget) || weekly_budget < 0)) {
      return res.status(400).json({ error: 'weekly_budget must be a non-negative number or null' });
    }
    if (!Array.isArray(dietary) || dietary.length > 20 || dietary.some((value) => typeof value !== 'string' || value.length > 40)) {
      return res.status(400).json({ error: 'dietary must be an array of up to 20 labels' });
    }
    for (const [key, value] of Object.entries({ price_drops, nearby_reports, weekly_summary, public_profile })) {
      if (typeof value !== 'boolean') return res.status(400).json({ error: `${key} must be a boolean` });
    }
    if (profile_image_url != null) {
      try {
        if (new URL(profile_image_url).protocol !== 'https:') throw new Error('https required');
      } catch {
        return res.status(400).json({ error: 'profile_image_url must be a valid HTTPS URL' });
      }
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.location_psgc_code = location_code || null;
    user.location_name = location_code ? location_name.trim() : null;
    if (profile_image_url !== undefined) user.profile_image_url = profile_image_url || null;
    user.preferences = {
      radius,
      market: market.trim(),
      household_size,
      weekly_budget,
      dietary,
      price_drops,
      nearby_reports,
      weekly_summary,
      public_profile,
    };
    await user.save();
    res.json(serializeSettings(user));
  } catch (err) {
    next(err);
  }
});

module.exports = router;