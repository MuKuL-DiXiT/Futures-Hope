const mongoose = require('mongoose');
const { Schema } = mongoose;

const likeSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  post: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  createdAt: { type: Date, default: Date.now }
});

likeSchema.index({ user: 1, post: 1 }, { unique: true }); // prevent duplicate likes

const Like = mongoose.model('Like', likeSchema);
module.exports = Like;
