require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Item = require('../models/Item');
const PriceReport = require('../models/PriceReport');
const { getPriceEstimate } = require('../services/pricingService');

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// Real PSGC codes, so this script doubles as a sanity check for the picker.
const CEBU_CITY = { code: '072217000', name: 'Cebu City, Cebu' };
const QUEZON_CITY = { code: '137404000', name: 'Quezon City, Metro Manila' };

(async () => {
  await connectDB();

  const user = await User.findOneAndUpdate(
    { username: 'seed_user' },
    {
      username: 'seed_user',
      email: 'seed@example.com',
      location_psgc_code: CEBU_CITY.code,
      location_name: CEBU_CITY.name,
    },
    { upsert: true, new: true }
  );

  const item = await Item.findOneAndUpdate(
    { default_name: 'Kamatis (Tomato)' },
    {
      default_name: 'Kamatis (Tomato)',
      category: 'Produce',
      baseline_price: 120,
      baseline_unit: 'kilo',
    },
    { upsert: true, new: true }
  );

  // Clean previous seed reports for a repeatable test
  await PriceReport.deleteMany({ item_id: item._id, user_id: user._id });

  const base = {
    item_id: item._id,
    user_id: user._id,
    measurement_unit: 'kilo',
    location_psgc_code: CEBU_CITY.code,
    location_name: CEBU_CITY.name,
  };

  await PriceReport.insertMany([
    // Normal palengke reports (should be averaged)
    { ...base, price: 78, timestamp: daysAgo(1) },
    { ...base, price: 80, timestamp: daysAgo(2) },
    { ...base, price: 82, timestamp: daysAgo(3), upvotes: 4 }, // trusted, counts more
    { ...base, price: 85, timestamp: daysAgo(5) },
    { ...base, price: 79, timestamp: daysAgo(7) },
    // Extreme outlier: should be filtered by IQR
    { ...base, price: 400, timestamp: daysAgo(2) },
    // Older than 14 days: should be ignored by the window
    { ...base, price: 50, timestamp: daysAgo(20) },
    // Heavily downvoted troll report: should be ignored by vote filter
    { ...base, price: 10, timestamp: daysAgo(1), downvotes: 6 },
    // Different city: should not appear in the Cebu City result
    { ...base, location_psgc_code: QUEZON_CITY.code, location_name: QUEZON_CITY.name, price: 95, timestamp: daysAgo(1) },
  ]);

  const result = await getPriceEstimate({ itemId: item._id.toString(), locationCode: CEBU_CITY.code });
  console.log('\nItem ID (use this to test the API):', item._id.toString());
  console.log('Cebu City PSGC code (use this to test the API):', CEBU_CITY.code);
  console.log(JSON.stringify(result, null, 2));

  // Expected: 1 estimate for kilo/palengke, sample_size 5, outliers_removed 1,
  // average around 80-81, range 78 to 85.

  await mongoose.disconnect();
})();
