const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // receiver
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // sender
  type: {
    type: String,
    enum: ['message', 'like', 'comment', 'bondRequest', 'bondAccepted', 'payment','join'],
    required: true
  },
  message: String,
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' }, // for like/comment
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' }, // for message
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);

