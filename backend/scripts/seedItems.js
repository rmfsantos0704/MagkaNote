require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Item = require('../models/Item');

/**
 * Seeds a solid base of common Philippine ingredients so the SmartNote
 * Ingredients tab has real things to browse, not just the single test item
 * from scripts/seedPricing.js. Idempotent (upsert by name) — safe to re-run.
 *
 * baseline_price is a rough Metro Manila supermarket reference price, used
 * as a fallback until real PriceReport crowdsourced data exists for an item.
 */
const ITEMS = [
  // --- Produce (Gulay) ---
  { default_name: 'Kamatis (Tomato)', category: 'Produce', baseline_price: 80, baseline_unit: 'kilo' },
  { default_name: 'Sibuyas (Red Onion)', category: 'Produce', baseline_price: 140, baseline_unit: 'kilo' },
  { default_name: 'Bawang (Garlic)', category: 'Produce', baseline_price: 220, baseline_unit: 'kilo' },
  { default_name: 'Luya (Ginger)', category: 'Produce', baseline_price: 120, baseline_unit: 'kilo' },
  { default_name: 'Talong (Eggplant)', category: 'Produce', baseline_price: 60, baseline_unit: 'kilo' },
  { default_name: 'Kalabasa (Squash)', category: 'Produce', baseline_price: 50, baseline_unit: 'kilo' },
  { default_name: 'Sitaw (String Beans)', category: 'Produce', baseline_price: 90, baseline_unit: 'kilo' },
  { default_name: 'Kangkong (Water Spinach)', category: 'Produce', baseline_price: 40, baseline_unit: 'tali' },
  { default_name: 'Pechay (Bok Choy)', category: 'Produce', baseline_price: 45, baseline_unit: 'tali' },
  { default_name: 'Okra', category: 'Produce', baseline_price: 70, baseline_unit: 'kilo' },
  { default_name: 'Gabi (Taro)', category: 'Produce', baseline_price: 65, baseline_unit: 'kilo' },
  { default_name: 'Labanos (Radish)', category: 'Produce', baseline_price: 55, baseline_unit: 'kilo' },
  { default_name: 'Kamote (Sweet Potato)', category: 'Produce', baseline_price: 55, baseline_unit: 'kilo' },
  { default_name: 'Mais (Corn)', category: 'Produce', baseline_price: 50, baseline_unit: 'piraso' },
  { default_name: 'Kalamansi', category: 'Produce', baseline_price: 100, baseline_unit: 'kilo' },
  { default_name: 'Sili (Chili Pepper)', category: 'Produce', baseline_price: 180, baseline_unit: 'kilo' },
  { default_name: 'Repolyo (Cabbage)', category: 'Produce', baseline_price: 70, baseline_unit: 'kilo' },
  { default_name: 'Sayote (Chayote)', category: 'Produce', baseline_price: 45, baseline_unit: 'kilo' },

  // --- Meat & Poultry (Karne) ---
  { default_name: 'Liempo (Pork Belly)', category: 'Meat_Poultry', baseline_price: 320, baseline_unit: 'kilo' },
  { default_name: 'Giniling (Ground Pork)', category: 'Meat_Poultry', baseline_price: 280, baseline_unit: 'kilo' },
  { default_name: 'Manok (Whole Chicken)', category: 'Meat_Poultry', baseline_price: 210, baseline_unit: 'kilo' },
  { default_name: 'Chicken Breast', category: 'Meat_Poultry', baseline_price: 230, baseline_unit: 'kilo' },
  { default_name: 'Baka (Beef Cubes)', category: 'Meat_Poultry', baseline_price: 420, baseline_unit: 'kilo' },
  { default_name: 'Longganisa', category: 'Meat_Poultry', baseline_price: 220, baseline_unit: 'kilo' },
  { default_name: 'Tocino', category: 'Meat_Poultry', baseline_price: 210, baseline_unit: 'kilo' },
  { default_name: 'Chicken Wings', category: 'Meat_Poultry', baseline_price: 240, baseline_unit: 'kilo' },

  // --- Seafood (Isda) ---
  { default_name: 'Bangus (Milkfish)', category: 'Seafood', baseline_price: 220, baseline_unit: 'kilo' },
  { default_name: 'Tilapia', category: 'Seafood', baseline_price: 150, baseline_unit: 'kilo' },
  { default_name: 'Galunggong (Round Scad)', category: 'Seafood', baseline_price: 180, baseline_unit: 'kilo' },
  { default_name: 'Hipon (Shrimp)', category: 'Seafood', baseline_price: 380, baseline_unit: 'kilo' },
  { default_name: 'Pusit (Squid)', category: 'Seafood', baseline_price: 320, baseline_unit: 'kilo' },
  { default_name: 'Tahong (Mussels)', category: 'Seafood', baseline_price: 100, baseline_unit: 'kilo' },

  // --- Dairy & Eggs ---
  { default_name: 'Itlog (Chicken Eggs)', category: 'Dairy_Eggs', baseline_price: 8, baseline_unit: 'piraso' },
  { default_name: 'Fresh Milk', category: 'Dairy_Eggs', baseline_price: 95, baseline_unit: 'litro' },
  { default_name: 'Eskimo Cheese (Quickmelt)', category: 'Dairy_Eggs', baseline_price: 130, baseline_unit: 'piece' },
  { default_name: 'Butter', category: 'Dairy_Eggs', baseline_price: 180, baseline_unit: 'piece' },

  // --- Pantry / Dry Goods ---
  { default_name: 'Bigas (Rice)', category: 'Pantry_Dry_Goods', baseline_price: 55, baseline_unit: 'kilo' },
  { default_name: 'Pancit Canton (Noodles)', category: 'Pantry_Dry_Goods', baseline_price: 55, baseline_unit: 'piece' },
  { default_name: 'Bihon (Rice Noodles)', category: 'Pantry_Dry_Goods', baseline_price: 60, baseline_unit: 'piece' },
  { default_name: 'Gawgaw (Cornstarch)', category: 'Pantry_Dry_Goods', baseline_price: 30, baseline_unit: 'piece' },
  { default_name: 'Harina (Flour)', category: 'Pantry_Dry_Goods', baseline_price: 65, baseline_unit: 'kilo' },
  { default_name: 'Asukal (Sugar)', category: 'Pantry_Dry_Goods', baseline_price: 90, baseline_unit: 'kilo' },
  { default_name: 'Munggo (Mung Beans)', category: 'Pantry_Dry_Goods', baseline_price: 110, baseline_unit: 'kilo' },

  // --- Condiments ---
  { default_name: 'Toyo (Soy Sauce)', category: 'Condiments', baseline_price: 35, baseline_unit: 'piece' },
  { default_name: 'Suka (Vinegar)', category: 'Condiments', baseline_price: 28, baseline_unit: 'piece' },
  { default_name: 'Patis (Fish Sauce)', category: 'Condiments', baseline_price: 32, baseline_unit: 'piece' },
  { default_name: 'Bagoong Alamang', category: 'Condiments', baseline_price: 60, baseline_unit: 'piece' },
  { default_name: 'Banana Ketchup', category: 'Condiments', baseline_price: 45, baseline_unit: 'piece' },
  { default_name: 'Oyster Sauce', category: 'Condiments', baseline_price: 55, baseline_unit: 'piece' },
  { default_name: 'Asin (Salt)', category: 'Condiments', baseline_price: 20, baseline_unit: 'piece' },
  { default_name: 'Paminta (Black Pepper)', category: 'Condiments', baseline_price: 35, baseline_unit: 'piece' },
  { default_name: 'Laurel (Bay Leaves)', category: 'Condiments', baseline_price: 15, baseline_unit: 'piraso' },
  { default_name: 'Cooking Oil', category: 'Condiments', baseline_price: 90, baseline_unit: 'litro' },

  // --- Packaged Snacks ---
  { default_name: 'Piattos', category: 'Packaged_Snacks', baseline_price: 40, baseline_unit: 'piece' },
  { default_name: 'SkyFlakes Crackers', category: 'Packaged_Snacks', baseline_price: 30, baseline_unit: 'piece' },
  { default_name: 'Boy Bawang', category: 'Packaged_Snacks', baseline_price: 25, baseline_unit: 'piece' },

  // --- Beverages ---
  { default_name: 'Kape (Instant Coffee)', category: 'Beverages', baseline_price: 150, baseline_unit: 'piece' },
  { default_name: 'Sago\'t Gulaman Mix', category: 'Beverages', baseline_price: 20, baseline_unit: 'piece' },
  { default_name: 'Buko Juice', category: 'Beverages', baseline_price: 40, baseline_unit: 'litro' },

  // --- Frozen ---
  { default_name: 'Frozen Embutido', category: 'Frozen', baseline_price: 150, baseline_unit: 'piece' },
  { default_name: 'Frozen Siomai', category: 'Frozen', baseline_price: 130, baseline_unit: 'piece' },
];

(async () => {
  await connectDB();

  let created = 0;
  let updated = 0;

  for (const item of ITEMS) {
    const result = await Item.findOneAndUpdate(
      { default_name: item.default_name },
      { $setOnInsert: item },
      { upsert: true, new: true, rawResult: true }
    );
    if (result.lastErrorObject?.updatedExisting) updated++;
    else created++;
  }

  console.log(`Seeded ${ITEMS.length} items: ${created} created, ${updated} already existed.`);
  await mongoose.disconnect();
})();