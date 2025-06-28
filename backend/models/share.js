const mongoose = require('mongoose');
const { Schema } = mongoose;

const shareSchema = new Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  post: { 
    type: Schema.Types.ObjectId, 
    ref: 'Post', 
    required: true 
  },
  sharedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Prevent duplicate shares by same user on same post (optional)
shareSchema.index({ user: 1, post: 1 }, { unique: true });

const Share = mongoose.model('Share', shareSchema);

module.exports = Share;
