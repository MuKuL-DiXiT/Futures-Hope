const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  chat: {
    type: Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true // For faster querying
  },
  sender: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: function() { return !this.attachments?.length; },
    trim: true,
    maxlength: 2000
  },
  attachments: [{
    url: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'audio'],
      required: true
    },
    filename: String,
    size: Number,
    duration: Number // For audio/video
  }],
  readBy: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  edited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  reactions: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
messageSchema.index({ createdAt: -1 });
messageSchema.index({ chat: 1, createdAt: -1 });
module.exports = mongoose.model('Message', messageSchema);