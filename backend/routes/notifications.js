const express = require('express');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { user_id } = req.query;
    if (!mongoose.isValidObjectId(user_id) || !(await User.exists({ _id: user_id }))) return res.status(400).json({ error: 'A valid user_id is required' });
    const notifications = await Notification.find({ user_id }).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ notifications, unread_count: notifications.filter((item) => !item.read_at).length });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!mongoose.isValidObjectId(user_id)) return res.status(400).json({ error: 'A valid user_id is required' });
    await Notification.updateMany({ user_id, read_at: null }, { $set: { read_at: new Date() } });
    res.json({ updated: true });
  } catch (err) { next(err); }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const { user_id } = req.body;
    if (!mongoose.isValidObjectId(user_id) || !mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Valid user_id and notification id are required' });
    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, user_id }, { $set: { read_at: new Date() } }, { new: true });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(notification);
  } catch (err) { next(err); }
});

module.exports = router;
