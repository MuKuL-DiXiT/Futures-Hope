const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  age: { type: Number, required: true },
  email: { type: String, required: true, unique: true },
  mobile: { type: String, required: true, unique: true },
  password: { type: String },  // Not required for Google users
  googleId: { type: String, unique: true, sparse: true }, // new for Google OAuth
  
  profilePic: { type: String, default: '' }, // profile picture URL
  
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  lastSeen: Date,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
