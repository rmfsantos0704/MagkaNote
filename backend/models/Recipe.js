const mongoose = require('mongoose');
const { Schema } = mongoose;
const { MEASUREMENT_UNITS } = require('./PriceReport');

// Sub-document: one line item inside a recipe's ingredient list.
// No its own _id needed at the top level of the array item is fine to keep
// (Mongoose adds one by default), useful for editing/removing a single line
// from the frontend without re-sending the whole array.
const RecipeItemSchema = new Schema(
  {
    item_id: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    measurement_unit: {
      type: String,
      enum: MEASUREMENT_UNITS,
      required: true,
    },
  },
  { _id: false }
);

const RecipeSchema = new Schema(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    // Optional metadata collected on the SmartNote "Compose" tab. All
    // optional: a recipe is valid with just a title and ingredients.
    category: { type: String, trim: true, maxlength: 40, default: null },
    servings: { type: Number, min: 1, max: 100, default: null },
    prep_time: { type: String, trim: true, maxlength: 40, default: null }, // free text, e.g. "45 min"
    difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', null], default: null },
    notes: { type: String, trim: true, maxlength: 2000, default: null },
    // Photo of the finished dish, uploaded to Cloudinary from the client.
    // See src/cloudinary.ts on the frontend for the unsigned upload flow.
    image_url: { type: String, trim: true, default: null },
    // Starred recipes stay pinned to the top of the dashboard.
    is_favorite: { type: Boolean, default: false, index: true },
    // The PSGC city/municipality this recipe was priced against, so
    // reopening it for editing can reload the same location instead of
    // asking again. Still just a starting point — editable like everything else.
    location_psgc_code: { type: String, trim: true, default: null },
    location_name: { type: String, trim: true, default: null },
    items: {
      type: [RecipeItemSchema],
      default: [],
    },
    // Denormalized snapshot so the "Smart Note" can render a total instantly
    // without recomputing on every read; recalculated server-side whenever
    // items[] changes (see Phase 2/3 pricing logic).
    total_estimated_cost: {
      type: Number,
      default: 0,
      min: 0,
    },
    // The same recipe's cost if priced at supermarkets instead, computed
    // alongside total_estimated_cost at save time. Powers the "save ₱X vs
    // supermarket" line on the dashboard without an extra API call per card.
    total_supermarket_cost: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = mongoose.model('Recipe', RecipeSchema);