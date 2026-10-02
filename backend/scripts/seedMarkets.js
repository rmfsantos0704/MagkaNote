require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Market = require('../models/Market');

/**
 * Seeds a couple of real, well-known Manila palengkes to start the Nearby
 * Markets list with — not invented data. Coordinates are sourced from
 * Wikipedia/public geocoding and are accurate to roughly street level,
 * which is enough for a "how far is this" calculation.
 *
 * This is a starting point, not a database of every market in the
 * Philippines — add more via POST /api/markets (see routes/markets.js), or
 * extend this list with markets near wherever you're actually testing from,
 * since "nearby" is meaningless if every seeded market is in Manila and
 * you're testing from Cebu.
 */
const MARKETS = [
  {
    name: 'Divisoria Market',
    type: 'palengke',
    address: 'Asuncion St, Tondo, Manila',
    hours: '4:00 AM - 8:00 PM',
    location_code: '133900000', // City of Manila
    location_name: 'Manila, Metro Manila',
    latitude: 14.603928,
    longitude: 120.966168,
  },
  {
    name: 'Quinta Market',
    type: 'palengke',
    address: 'Carlos Palanca St, Quiapo, Manila',
    hours: '5:00 AM - 7:00 PM',
    location_code: '133900000', // City of Manila
    location_name: 'Manila, Metro Manila',
    latitude: 14.59649,
    longitude: 120.982863,
  },
];

(async () => {
  await connectDB();

  let created = 0;
  for (const m of MARKETS) {
    const exists = await Market.findOne({ name: m.name, location_psgc_code: m.location_code });
    if (exists) continue;
    await Market.create({
      name: m.name,
      type: m.type,
      address: m.address,
      hours: m.hours,
      location_psgc_code: m.location_code,
      location: { type: 'Point', coordinates: [m.longitude, m.latitude] },
    });
    created++;
  }

  console.log(`Seeded ${created} of ${MARKETS.length} markets (skipped any already present).`);
  await mongoose.disconnect();
})();