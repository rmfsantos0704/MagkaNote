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
  },
  {
    timestamps: { createdAt: true, updatedAt: true },
  }
);

module.exports = mongoose.model('Recipe', RecipeSchema);
