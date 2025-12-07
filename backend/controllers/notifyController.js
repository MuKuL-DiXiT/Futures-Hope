const mongoose = require('mongoose');
const Notification = require('../models/notification');
const Message = require('../models/Messages');
const Chat = require('../models/chat');

const getNotifications = async (req, res, next) => {
  try {
    const all = await Notification.find({ user: req.user._id }).populate('from', 'firstname lastname profilePic').sort({ createdAt: -1 });

    const unseen = all.filter((n) => !n.seen);
    const seen = all.filter((n) => n.seen);

    res.json({ unseen, seen });
  } catch (err) {
    next(err);
  }
};

const markNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.notificationId;

    if (!mongoose.Types.ObjectId.isValid(notificationId)) return res.status(400).json({ error: 'Invalid notification ID' });

    const notification = await Notification.findByIdAndUpdate(notificationId, { seen: true });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    res.json(notification);
  } catch (err) {
    next(err);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const notificationId = req.params.notificationId;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) return res.status(400).json({ error: 'Invalid notification ID' });

    const result = await Notification.findByIdAndDelete(notificationId);
    if (!result) return res.status(404).json({ error: 'Notification not found' });

    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};

const unseenCount = async (req, res, next) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    const unseenCount = await Notification.countDocuments({ user: req.user._id, seen: false });

    const chatIds = await Chat.find({ participants: req.user._id }).distinct('_id');

    const messageCount = await Message.countDocuments({ chat: { $in: chatIds }, sender: { $ne: req.user._id }, 'readBy.user': { $ne: userId } });

    res.json({ notifications: unseenCount, messages: messageCount });
  } catch (err) {
    console.error('❌ unseenCount error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getNotifications, markNotification, deleteNotification, unseenCount };
