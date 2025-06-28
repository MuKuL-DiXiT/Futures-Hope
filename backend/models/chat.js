const mongoose = require('mongoose');
const { Schema } = mongoose;
const Messages = require('./Messages')

const chatSchema = new Schema({
  // For direct messages (one-on-one)
  participants: {
    type: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    validate: [
      {
        validator: function (arr) {
          return arr.length === 2 || this.isGroupChat;
        },
        message: 'Direct chats must have exactly 2 participants'
      }
    ]
  },
  lastMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  // For group chats
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    required: function () { return this.isGroupChat; }
  },
  groupAdmin: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: function () {
      return this.isGroupChat;
    }
  }],

  groupImage: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

chatSchema.index({ participants: 1 });
chatSchema.index({ isGroupChat: 1 });

const Chat = mongoose.model('Chat', chatSchema);
module.exports = Chat;