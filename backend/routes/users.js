const express = require('express');
const User = require('../models/User');

const router = express.Router();

const DEVICE_ID_PATTERN = /^[a-zA-Z0-9-]{8,100}$/;

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

module.exports = router;