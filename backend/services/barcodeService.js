const axios = require('axios');
const Item = require('../models/Item');

const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_TIMEOUT_MS = 5000;

// Open Food Facts asks API users to identify their app in the User-Agent
const USER_AGENT = 'MagkaNote/0.1 (student project)';

// Rough mapping from Open Food Facts category tags to our own categories
const CATEGORY_HINTS = [
  ['frozen', 'Frozen'],
  ['beverage', 'Beverages'],
  ['snack', 'Packaged_Snacks'],
  ['biscuit', 'Packaged_Snacks'],
  ['chips', 'Packaged_Snacks'],
  ['crisps', 'Packaged_Snacks'],
  ['dairies', 'Dairy_Eggs'],
  ['milk', 'Dairy_Eggs'],
  ['egg', 'Dairy_Eggs'],
  ['meat', 'Meat_Poultry'],
  ['seafood', 'Seafood'],
  ['fish', 'Seafood'],
  ['sauce', 'Condiments'],
  ['condiment', 'Condiments'],
  ['fruit', 'Produce'],
  ['vegetable', 'Produce'],
  ['cereal', 'Pantry_Dry_Goods'],
  ['noodle', 'Pantry_Dry_Goods'],
  ['rice', 'Pantry_Dry_Goods'],
  ['canned', 'Pantry_Dry_Goods'],
];

function mapCategory(tags = []) {
  // Open Food Facts adds broad umbrella tags such as "plant-based-foods-and-beverages"
  // to almost every food. Ignore them or everything matches "beverage".
  const specific = tags.map((t) => t.toLowerCase()).filter((t) => !t.includes('foods-and-beverages'));

  for (const [keyword, category] of CATEGORY_HINTS) {
    if (specific.some((t) => t.includes(keyword))) return category;
  }
  return 'Other';
}

/** EAN-13 check digit validation: catches most bad camera reads. */
function isValidEan13(code) {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}

async function fetchFromOpenFoodFacts(ean) {
  const { data } = await axios.get(`${OFF_URL}/${ean}.json`, {
    params: { fields: 'product_name,generic_name,brands,image_front_url,categories_tags' },
    headers: { 'User-Agent': USER_AGENT },
    timeout: OFF_TIMEOUT_MS,
  });

  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const baseName = (p.product_name || p.generic_name || '').trim();
  if (!baseName) return null; // a barcode with no usable name is not helpful

  const brand = (p.brands || '').split(',')[0].trim();

  return {
    default_name: brand && !baseName.toLowerCase().includes(brand.toLowerCase())
      ? `${baseName} - ${brand}`
      : baseName,
    category: mapCategory(p.categories_tags),
    image_url: p.image_front_url || null,
  };
}

/**
 * Lookup flow:
 *   1. Our own MongoDB          -> source: 'internal'
 *   2. Open Food Facts (cached into our DB so the next scan is instant)
 *                               -> source: 'open_food_facts'
 *   3. Neither                  -> source: 'not_found' (client asks user to add it)
 */
async function lookupBarcode(ean) {
  // Step 1: internal database
  const existing = await Item.findOne({ barcode_ean13: ean });
  if (existing) return { source: 'internal', item: existing };

  // Step 2: external API
  let externalFailed = false;
  try {
    const product = await fetchFromOpenFoodFacts(ean);

    if (product) {
      try {
        const item = await Item.create({ ...product, barcode_ean13: ean });
        return { source: 'open_food_facts', item };
      } catch (err) {
        // Two people scanned the same new barcode at once: use the winner's doc
        if (err.code === 11000) {
          const winner = await Item.findOne({ barcode_ean13: ean });
          if (winner) return { source: 'internal', item: winner };
        }
        throw err;
      }
    }
  } catch (err) {
    if (err.code === 11000) throw err;
    console.error(`Open Food Facts lookup failed for ${ean}: ${err.message}`);
    externalFailed = true; // timeout, network error, rate limit...
  }

  // Step 3: nothing found
  return { source: 'not_found', external_lookup_failed: externalFailed };
}

module.exports = { lookupBarcode, isValidEan13 };
