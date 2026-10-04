const mongoose = require('mongoose');
const { Schema } = mongoose;
const { MEASUREMENT_UNITS } = require('./PriceReport');

const GroceryEntrySchema = new Schema({
  item_id: { type: Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, required: true, min: 0.01 },
  measurement_unit: { type: String, enum: MEASUREMENT_UNITS, required: true },
  checked: { type: Boolean, default: false },
}, { _id: true });

const GroceryListSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  items: { type: [GroceryEntrySchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('GroceryList', GroceryListSchema);
