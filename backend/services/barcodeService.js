const axios = require('axios');
const Item = require('../models/Item');

const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product';
const OFF_TIMEOUT_MS = 5000;

// Open Food Facts asks API users to identify their app in the User-Agent
const USER_AGENT = 'MagkaNote/0.1 (student project)';

const UPCITEMDB_URL = 'https://api.upcitemdb.com/prod/trial/lookup';
const UPCITEMDB_TIMEOUT_MS = 5000;

// Rough mapping from a product's category tags/breadcrumbs to our own
// categories. Shared by both Open Food Facts (array of tags) and UPCitemdb
// (one "A > B > C" breadcrumb string, split before matching).
const CATEGORY_HINTS = [
  ['frozen', 'Frozen'],
  ['beverage', 'Beverages'],
  ['drink', 'Beverages'],
  ['snack', 'Packaged_Snacks'],
  ['biscuit', 'Packaged_Snacks'],
  ['chips', 'Packaged_Snacks'],
  ['crisps', 'Packaged_Snacks'],
  ['dairies', 'Dairy_Eggs'],
  ['dairy', 'Dairy_Eggs'],
  ['milk', 'Dairy_Eggs'],
  ['egg', 'Dairy_Eggs'],
  ['meat', 'Meat_Poultry'],
  ['poultry', 'Meat_Poultry'],
  ['seafood', 'Seafood'],
  ['fish', 'Seafood'],
  ['sauce', 'Condiments'],
  ['condiment', 'Condiments'],
  ['spice', 'Condiments'],
  ['fruit', 'Produce'],
  ['vegetable', 'Produce'],
  ['cereal', 'Pantry_Dry_Goods'],
  ['noodle', 'Pantry_Dry_Goods'],
  ['pasta', 'Pantry_Dry_Goods'],
  ['rice', 'Pantry_Dry_Goods'],
  ['canned', 'Pantry_Dry_Goods'],
  ['grocery', 'Pantry_Dry_Goods'],
];

/** `tags` is an array of category strings (tags, or breadcrumb segments). */
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
 * Open Food Facts is food-only and has patchy Philippine coverage.
 * UPCitemdb's free trial tier covers general retail goods (non-food included)
 * and often has items OFF doesn't. The trial tier needs no signup/API key,
 * but is capped at 100 lookups/day for the whole app (not per-user) — fine
 * for development, worth a paid key if this becomes a real bottleneck.
 * https://www.upcitemdb.com/wp/docs/main/development/lookup-api/
 */
async function fetchFromUpcItemDb(ean) {
  const { data } = await axios.get(UPCITEMDB_URL, {
    params: { upc: ean },
    headers: { Accept: 'application/json' },
    timeout: UPCITEMDB_TIMEOUT_MS,
  });

  if (data.code !== 'OK' || !data.items || data.items.length === 0) return null;

  const p = data.items[0];
  const baseName = (p.title || '').trim();
  if (!baseName) return null;

  const brand = (p.brand || '').trim();
  const breadcrumbs = (p.category || '').split('>').map((s) => s.trim()).filter(Boolean);

  return {
    default_name: brand && !baseName.toLowerCase().includes(brand.toLowerCase())
      ? `${baseName} - ${brand}`
      : baseName,
    category: mapCategory(breadcrumbs),
    image_url: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
  };
}

/** Tries to create the Item; if another request won the race on the same
 * barcode in the meantime, returns the winner's doc instead of throwing. */
async function createOrAdoptItem(product, ean) {
  try {
    const item = await Item.create({ ...product, barcode_ean13: ean });
    return item;
  } catch (err) {
    if (err.code === 11000) {
      const winner = await Item.findOne({ barcode_ean13: ean });
      if (winner) return winner;
    }
    throw err;
  }
}

/**
 * Lookup flow:
 *   1. Our own MongoDB          -> source: 'internal'
 *   2. Open Food Facts (cached into our DB so the next scan is instant)
 *                               -> source: 'open_food_facts'
 *   3. UPCitemdb (same caching) -> source: 'upcitemdb'
 *   4. Neither                  -> source: 'not_found' (client asks user to add it)
 */
async function lookupBarcode(ean) {
  // Step 1: internal database
  const existing = await Item.findOne({ barcode_ean13: ean });
  if (existing) return { source: 'internal', item: existing };

  let externalFailed = false;

  // Step 2: Open Food Facts
  try {
    const product = await fetchFromOpenFoodFacts(ean);
    if (product) {
      const item = await createOrAdoptItem(product, ean);
      return { source: 'open_food_facts', item };
    }
  } catch (err) {
    if (err.code === 11000) throw err;
    console.error(`Open Food Facts lookup failed for ${ean}: ${err.message}`);
    externalFailed = true; // timeout, network error, rate limit...
  }

  // Step 3: UPCitemdb
  try {
    const product = await fetchFromUpcItemDb(ean);
    if (product) {
      const item = await createOrAdoptItem(product, ean);
      return { source: 'upcitemdb', item };
    }
  } catch (err) {
    if (err.code === 11000) throw err;
    if (axios.isAxiosError(err) && err.response?.status === 429) {
      console.error('UPCitemdb daily trial limit reached.');
    } else {
      console.error(`UPCitemdb lookup failed for ${ean}: ${err.message}`);
    }
    externalFailed = true;
  }

  // Step 4: nothing found
  return { source: 'not_found', external_lookup_failed: externalFailed };
}

module.exports = { lookupBarcode, isValidEan13 };