const mongoose = require('mongoose');
const { Schema } = mongoose;

// PSGC "correspondence code" for a city or municipality, e.g. "072217000" (Cebu City).
// See services/psgcService.js for validation and lookups against the PSGC API.
const PSGC_CODE_PATTERN = /^\d{9}$/;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    // Anywhere in the Philippines, picked from the PSGC region/province/city cascade.
    location_psgc_code: {
      type: String,
      required: true,
      match: [PSGC_CODE_PATTERN, 'location_psgc_code must be a 9-digit PSGC code'],
    },
    // Cached display string, e.g. "Cebu City, Cebu", so the UI never has to
    // re-look-up the PSGC hierarchy just to show where a user is from.
    location_name: {
      type: String,
      required: true,
      trim: true,
    },
    trust_score: {
      type: Number,
      default: 100, // starting reputation; adjusted by upvotes/downvotes on their price reports
      min: 0,
    },
  },
  {
    // createdAt + updatedAt handled automatically instead of a manual createdAt field
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = mongoose.model('User', UserSchema);
module.exports.PSGC_CODE_PATTERN = PSGC_CODE_PATTERN;
