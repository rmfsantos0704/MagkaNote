const mongoose = require('mongoose');
const { Schema } = mongoose;
const { MEASUREMENT_UNITS } = require('./PriceReport');

const CATEGORIES = [
  'Produce',
  'Meat_Poultry',
  'Seafood',
  'Dairy_Eggs',
  'Pantry_Dry_Goods',
  'Packaged_Snacks',
  'Beverages',
  'Condiments',
  'Frozen',
  'Other',
];

const ItemSchema = new Schema(
  {
    default_name: {
      type: String,
      required: true,
      trim: true,
      index: true, // supports the ingredient text-bar search
    },
    category: {
      type: String,
      enum: CATEGORIES,
      default: 'Other',
    },
    image_url: {
      type: String, // Cloudinary secure_url
      default: null,
    },
    barcode_ean13: {
      type: String,
      required: false,
      unique: true,
      sparse: true, // allows many docs with no barcode without violating uniqueness
      match: [/^\d{13}$/, 'EAN-13 barcode must be exactly 13 digits'],
    },
    baseline_price: {
      type: Number, // seeded from supermarket scrape; null until a price is known
      default: null,
      min: 0,
    },
    baseline_unit: {
      type: String, // the unit the baseline price is quoted in
      enum: MEASUREMENT_UNITS,
      default: 'kilo',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

// Enables the "Smart Note" search bar to do fast partial-text lookups
ItemSchema.index({ default_name: 'text' });

module.exports = mongoose.model('Item', ItemSchema);
module.exports.CATEGORIES = CATEGORIES;