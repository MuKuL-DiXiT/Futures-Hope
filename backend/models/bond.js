const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BondSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },  // who sent the bond request
  receiver: { type: Schema.Types.ObjectId, ref: 'User', required: true },   // who received the request
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  acceptedAt: { type: Date }
});

module.exports = mongoose.model('Bond', BondSchema);
