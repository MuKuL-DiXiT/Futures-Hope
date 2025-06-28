const mongoose = require('mongoose');
const { Schema } = mongoose;
const Chat = require('./chat'); // Your existing Chat model

const communitySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 50
  },
  profilePic: { 
    type: String, 
    default: ""
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  members: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  posts: [{
    type: Schema.Types.ObjectId,
    ref: 'Post'
  }],
  moderators: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  chatRoom: {
    type: Schema.Types.ObjectId,
    ref: 'Chat'
  },
  rules: [{
    title: String,
    description: String
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },
  qrCodeUrl: {
  type: String,
  default: ""
},
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});



const Community = mongoose.model('Community', communitySchema);

module.exports = Community;