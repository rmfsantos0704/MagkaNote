const mongoose = require('mongoose');
const { Schema } = mongoose;

const RecipeRatingSchema = new Schema({
  recipe_id: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true, index: true },
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  feedback: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true });

RecipeRatingSchema.index({ recipe_id: 1, user_id: 1 }, { unique: true });

module.exports = mongoose.model('RecipeRating', RecipeRatingSchema);
