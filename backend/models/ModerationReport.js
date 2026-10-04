const mongoose = require('mongoose');
const { Schema } = mongoose;

const ModerationReportSchema = new Schema({
  reporter_user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  target_type: { type: String, enum: ['recipe', 'user'], required: true },
  target_id: { type: Schema.Types.ObjectId, required: true },
  reason: { type: String, enum: ['spam', 'harassment', 'misinformation', 'copyright', 'inappropriate', 'other'], required: true },
  details: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'reviewed', 'dismissed', 'actioned'], default: 'pending', index: true },
}, { timestamps: true });

ModerationReportSchema.index({ reporter_user_id: 1, target_type: 1, target_id: 1 }, { unique: true });

module.exports = mongoose.model('ModerationReport', ModerationReportSchema);
