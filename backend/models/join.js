const mongoose = require('mongoose');
const { Schema } = mongoose;

const joinSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  community: {
    type: Schema.Types.ObjectId,
    ref: 'Community',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'joined'],
    default: 'pending'
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Unique pair: one request per user per community
joinSchema.index({ user: 1, community: 1 }, { unique: true });

const Join = mongoose.model('Join', joinSchema);
module.exports = Join;
