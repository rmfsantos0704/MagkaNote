const mongoose = require('mongoose');
const { Schema } = mongoose;
const { PSGC_CODE_PATTERN } = require('./User');

/**
 * A physical place to shop — a palengke stall cluster, a public market, or a
 * supermarket branch. Distinct from PriceReport.outlet_name (free text a
 * person types): a Market is a real, geolocated place we can show on a map,
 * compute real distance to, and link out to for directions.
 *
 * `name` is meant to match the outlet names people type when reporting
 * prices (see routes/prices.js), so a market's "basket total" can be priced
 * using the same crowdsourced PriceReport data — case-insensitive exact
 * match, same convention the pricing engine already uses for outlet_name.
 */
const MarketSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, enum: ['palengke', 'supermarket'], required: true },
    address: { type: String, trim: true, maxlength: 200, default: null },

    // City/municipality this market sits in — ties it to the rest of the
    // location system (LocationPicker, PriceReport.location_psgc_code).
    location_psgc_code: {
      type: String,
      required: true,
      match: [PSGC_CODE_PATTERN, 'location_psgc_code must be a 9-digit PSGC code'],
      index: true,
    },
    // Cached display name, e.g. "Manila, Metro Manila" — avoids a PSGC
    // lookup just to submit a price report naming this market as the outlet.
    location_name: { type: String, trim: true, default: null },

    // Real coordinates, not a mock-map position. [longitude, latitude] —
    // GeoJSON order, which is reversed from how people normally say it.
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },

    hours: { type: String, trim: true, maxlength: 80, default: null }, // free text, e.g. "5:00 AM - 7:00 PM"

    // Submitted by whoever added this market. Nullable: the seed script
    // doesn't have a user to attribute to.
    added_by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// Powers $near / $geoNear queries for "markets within X km of me".
MarketSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Market', MarketSchema);