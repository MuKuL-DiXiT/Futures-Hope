const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  firstname: { type: String },   // Not required for Google users
  lastname: { type: String },    // Not required for Google users
  age: { type: Number },         // Not required for Google users
  email: { type: String, required: true, unique: true }, // email is always required
  mobile: { type: String, unique: true, sparse: true },  // optional, unique only if present
  password: { type: String },  // Not required for Google users
  googleId: { type: String, unique: true, sparse: true }, // for Google OAuth
  
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
