const mongoose = require('mongoose');
const { Schema } = mongoose;


const postSchema = new Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  media: {
    type: { 
      type: String, 
      enum: ['photo', 'video'], 
      required: true 
    },
    url: { 
      type: String, 
      required: true 
    },
    thumbnailUrl: String
  },
  
  caption: String,
  
  likesCount :{type:Number, default:0},
  
  shares: { 
    type: Number, 
    default: 0 
  },
  
  commentsCount: {type:Number, default:0},
  
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});


postSchema.index({ user: 1 });
postSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post;