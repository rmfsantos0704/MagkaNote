const mongoose = require('mongoose');
const { Schema } = mongoose;

const VALID_ZONES = [
  'Metro_Manila',
  'Cebu',
  'Davao',
  'Iloilo',
  'Bulacan',
  'Cavite',
  'Laguna',
  'Pampanga',
  'Other',
];

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
    location_zone: {
      type: String,
      enum: VALID_ZONES,
      default: 'Other',
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
module.exports.VALID_ZONES = VALID_ZONES;