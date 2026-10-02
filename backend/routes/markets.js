const express = require('express');
const mongoose = require('mongoose');
const Market = require('../models/Market');
const { PSGC_CODE_PATTERN } = require('../models/User');

const router = express.Router();

const TYPES = ['palengke', 'supermarket'];

function toPublicMarket(m, distanceMeters) {
  return {
    _id: m._id,
    name: m.name,
    type: m.type,
    address: m.address,
    hours: m.hours,
    location_psgc_code: m.location_psgc_code,
    location_name: m.location_name,
    latitude: m.location.coordinates[1],
    longitude: m.location.coordinates[0],
    distance_km: distanceMeters != null ? Math.round((distanceMeters / 1000) * 10) / 10 : undefined,
  };
}

// GET /api/markets/nearby?lat=14.60&lng=120.97&radius_km=5[&type=palengke]
// Real distance from the device's own GPS (see expo-location on the client),
// not a mock map position. Sorted nearest-first.
router.get('/nearby', async (req, res, next) => {
  try {
    const latitude = parseFloat(req.query.lat);
    const longitude = parseFloat(req.query.lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'lat and lng are required numbers' });
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'lat/lng out of range' });
    }

    const radiusKm = Math.min(parseFloat(req.query.radius_km) || 5, 50);

    const query = {};
    if (req.query.type) {
      if (!TYPES.includes(req.query.type)) {
        return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
      }
      query.type = req.query.type;
    }

    const markets = await Market.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance_meters',
          maxDistance: radiusKm * 1000,
          spherical: true,
          query,
        },
      },
      { $limit: 50 },
    ]);

    res.json({
      count: markets.length,
      markets: markets.map((m) => toPublicMarket(m, m.distance_meters)),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/markets/:id
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid market id' });
    }
    const market = await Market.findById(req.params.id);
    if (!market) return res.status(404).json({ error: 'Market not found' });
    res.json(toPublicMarket(market));
  } catch (err) {
    next(err);
  }
});

// POST /api/markets
// body: { name, type, address?, hours?, latitude, longitude, location_code, added_by? }
// Lets a user add a market that's missing from the list — community-sourced,
// same spirit as crowdsourced prices.
router.post('/', async (req, res, next) => {
  try {
    const { name, type, address, hours, latitude, longitude, location_code, location_name, added_by } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });
    if (!TYPES.includes(type)) return res.status(400).json({ error: `type must be one of: ${TYPES.join(', ')}` });
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ error: 'latitude and longitude are required numbers' });
    }
    if (!location_code || !PSGC_CODE_PATTERN.test(location_code)) {
      return res.status(400).json({ error: 'location_code must be a 9-digit PSGC city/municipality code' });
    }
    if (added_by && !mongoose.isValidObjectId(added_by)) {
      return res.status(400).json({ error: 'Invalid added_by user id' });
    }

    const market = await Market.create({
      name: name.trim(),
      type,
      address: address?.trim() || null,
      hours: hours?.trim() || null,
      location_psgc_code: location_code,
      location_name: location_name?.trim() || null,
      location: { type: 'Point', coordinates: [longitude, latitude] },
      added_by: added_by || null,
    });

    res.status(201).json(toPublicMarket(market));
  } catch (err) {
    next(err);
  }
});

module.exports = router;