const mongoose = require('mongoose');
const { Schema } = mongoose;
const { PSGC_CODE_PATTERN } = require('./User');

// "Tingi" culture: Filipinos frequently buy in small, informal local units
// rather than fixed metric weights, especially at the palengke.
const MEASUREMENT_UNITS = [
  'kilo',
  'gramo', // grams
  'tali', // bundle (e.g. of kangkong, sitaw)
  'guhit', // a "line"/segment portion, common for fish
  'piraso', // piece
  'kaing', // crate/basket (bulk)
  'sako', // sack (e.g. rice, 25kg/50kg)
  'litro', // liter
  'piece', // packaged goods (canned, bottled)
];

const PriceReportSchema = new Schema(
  {
    item_id: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    measurement_unit: {
      type: String,
      enum: MEASUREMENT_UNITS,
      required: true,
    },
    // City/municipality level is the right granularity for a palengke: prices
    // vary block by block within a city but rarely make sense averaged across
    // a whole province. This is the PSGC code of that city/municipality.
    location_psgc_code: {
      type: String,
      required: true,
      match: [PSGC_CODE_PATTERN, 'location_psgc_code must be a 9-digit PSGC code'],
      index: true,
    },
    location_name: {
      type: String,
      required: true,
      trim: true,
    },
    source_type: {
      // Distinguishes the "Palengke vs. Supermarket" toggle at the data level
      type: String,
      enum: ['palengke', 'supermarket', 'sari_sari_store'],
      default: 'palengke',
    },
    upvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
    downvotes: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    // "timestamp" from the PRD is covered by createdAt; updatedAt tracks vote edits
    timestamps: { createdAt: 'timestamp', updatedAt: true },
  }
);

// Speeds up the 14-day rolling average aggregation, which always filters by
// item_id + location_psgc_code and sorts/filters by timestamp.
PriceReportSchema.index({ item_id: 1, location_psgc_code: 1, timestamp: -1 });

module.exports = mongoose.model('PriceReport', PriceReportSchema);
module.exports.MEASUREMENT_UNITS = MEASUREMENT_UNITS;
