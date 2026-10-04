const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['rating', 'price_report', 'community'], required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  related_id: { type: Schema.Types.ObjectId, default: null },
  read_at: { type: Date, default: null },
}, { timestamps: true });

NotificationSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
