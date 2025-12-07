const mongoose = require('mongoose');
const Post = require('../models/Post');
const Like = require('../models/like');
const Share = require('../models/share');
const Comment = require('../models/comment');
const Bookmark = require('../models/bookmark');
const User = require('../models/Users');
const Bond = require('../models/bond');
const Community = require('../models/community');
const Chat = require('../models/chat');
const Message = require('../models/Messages');
const Notification = require('../models/notification');

const createPost = async (req, res) => {
  try {
    const { caption, type } = req.body;
    const newPost = new Post({
      user: req.user._id,
      media: {
        type,
        url: req.file.path,
        thumbnailUrl: type === 'video' ? req.file.thumbnailUrl : null,
      },
      caption,
    });

    await newPost.save();
    res.status(201).json({ message: 'Post uploaded successfully', post: newPost });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (!post.user.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

    await Like.deleteMany({ post: req.params.postId });
    await Comment.deleteMany({ post: req.params.postId });
    await Share.deleteMany({ post: req.params.postId });
    await Bookmark.deleteMany({ post: req.params.postId });

    await Post.findByIdAndDelete(req.params.postId);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'firstname lastname profilePic')
      .lean();

    const postsWithEngagement = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, commentsCount, sharesCount] = await Promise.all([
          Like.countDocuments({ post: post._id }),
          Comment.countDocuments({ post: post._id }),
          Share.countDocuments({ post: post._id }),
        ]);

        return {
          ...post,
          likesCount,
          commentsCount,
          sharesCount,
          verified: Math.floor(Math.random() * 20) + 1,
        };
      })
    );

    res.json(postsWithEngagement);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getUserPosts = async (req, res) => {
  try {
    const userId = req.params.userId;

    const posts = await Post.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('user', 'firstname lastname profilePic')
      .lean();

    const postsWithEngagement = await Promise.all(
      posts.map(async (post) => {
        const [likesCount, commentsCount, sharesCount] = await Promise.all([
          Like.countDocuments({ post: post._id }),
          Comment.countDocuments({ post: post._id }),
          Share.countDocuments({ post: post._id }),
        ]);

        return {
          ...post,
          likesCount,
          commentsCount,
          sharesCount,
          verified: Math.floor(Math.random() * 20) + 1,
        };
      })
    );

    res.status(200).json(postsWithEngagement);
  } catch (err) {
    console.error("Error fetching user's posts:", err);
    res.status(500).json({ message: 'Server error while fetching posts' });
  }
};

const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await Comment.find({ post: postId })
      .populate('author', 'firstname lastname profilePic')
      .populate('replies.author', 'firstname lastname profilePic')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json(comments);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: err.message });
  }
};

const likePost = async (req, res) => {
  try {
    const io = req.io;
    const existing = await Like.findOne({ user: req.user._id, post: req.params.postId });
    if (existing) return res.status(400).json({ message: 'Already liked' });

    await Like.create({ user: req.user._id, post: req.params.postId });
    await Post.findByIdAndUpdate(req.params.postId, { $inc: { likesCount: 1 } });

    const post = await Post.findById(req.params.postId);
    const curr_user = await User.findById(req.user._id);
    if (req.user._id.toString() != post.user.toString()) {
      const notification = await Notification.create({
        user: post.user,
        from: req.user._id,
        type: 'like',
        message: `${curr_user.firstname} ${curr_user.lastname} liked your post`,
        post: post._id,
      });
      io.to(`user_${post.user}`).emit('notify', {
        _id: notification._id,
        from: {
          _id: curr_user._id,
          firstname: curr_user.firstname,
          lastname: curr_user.lastname,
          profilePic: curr_user.profilePic,
        },
        message: notification.message,
        type: notification.type,
        post: notification.post,
        createdAt: notification.createdAt,
      });
    }

    res.json({ message: 'Post liked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const unlikePost = async (req, res) => {
  try {
    const like = await Like.findOneAndDelete({ user: req.user._id, post: req.params.postId });
    if (!like) return res.status(400).json({ message: 'Not liked yet' });

    await Post.findByIdAndUpdate(req.params.postId, { $inc: { likesCount: -1 } });
    res.json({ message: 'Post unliked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const checkLiked = async (req, res) => {
  try {
    const like = await Like.findOne({ user: req.user._id, post: req.params.postId });
    res.json({ liked: !!like });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const sharePost = async (req, res) => {
  const { postId } = req.params;
  const { recipients } = req.body;
  const senderId = req.user._id;
  const link = `${process.env.CLIENT_URL}/post/${postId}`;
  const io = req.io;
  try {
    for (const rec of recipients) {
      const banda = await User.findById(rec);
      const bande = await Community.findById(rec);
      if (bande) {
        await Message.create({ chat: bande.chatRoom._id, sender: senderId, content: link });
      } else if (banda) {
        let chat = await Chat.findOne({
          isGroupChat: false,
          participants: { $all: [senderId, rec], $size: 2 },
        });

        if (!chat) {
          chat = await Chat.create({ isGroupChat: false, participants: [senderId, rec] });
        }
        await Message.create({ chat: chat._id, sender: senderId, content: link });
      }
    }

    res.json({ message: 'Post shared successfully.' });
  } catch (err) {
    console.error('Share error:', err);
    res.status(500).json({ error: 'Failed to share post.' });
  }
};

const addComment = async (req, res) => {
  try {
    const io = req.io;
    const { content } = req.body;
    const comment = await Comment.create({ post: req.params.postId, author: req.user._id, content });

    const post = await Post.findById(req.params.postId);
    const curr_user = await User.findById(req.user._id);
    await Post.findByIdAndUpdate(req.params.postId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id).populate('author', 'firstname lastname profilePic');

    if (post.user.toString() !== curr_user._id.toString()) {
      const notification = await Notification.create({
        user: post.user,
        from: req.user._id,
        type: 'comment',
        message: `${curr_user.firstname} ${curr_user.lastname} Commented on your post`,
        post: post._id,
      });
      io.to(`user_${post.user}`).emit('notify', {
        _id: notification._id,
        from: {
          _id: curr_user._id,
          firstname: curr_user.firstname,
          lastname: curr_user.lastname,
          profilePic: curr_user.profilePic,
        },
        message: notification.message,
        type: notification.type,
        post: notification.post,
        createdAt: notification.createdAt,
      });
    }

    res.status(201).json({ message: 'Comment added', comment: populatedComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (!comment.author.equals(req.user._id)) return res.status(403).json({ message: 'Unauthorized' });

    await Comment.findByIdAndDelete(req.params.commentId);
    await Post.findByIdAndUpdate(comment.post, { $inc: { commentsCount: -1 } });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const replyToComment = async (req, res) => {
  try {
    const io = req.io;
    const { content } = req.body;

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: 'Parent comment not found' });

    const reply = { author: req.user._id, content };

    comment.replies.push(reply);
    await comment.save();

    await Post.findByIdAndUpdate(req.params.postId, { $inc: { commentsCount: 1 } });

    const populatedComment = await Comment.findById(comment._id)
      .populate('author', 'firstname lastname profilePic')
      .populate('replies.author', 'firstname lastname profilePic');

    const post = await Post.findById(req.params.postId);
    const curr_user = await User.findById(req.user._id);
    if (comment.author.toString() !== curr_user._id.toString()) {
      const notification = await Notification.create({
        user: comment.author,
        from: req.user._id,
        type: 'comment',
        message: `${curr_user.firstname} ${curr_user.lastname} replied to your comment`,
        post: post._id,
      });
      io.to(`user_${comment.author}`).emit('notify', {
        _id: notification._id,
        from: {
          _id: curr_user._id,
          firstname: curr_user.firstname,
          lastname: curr_user.lastname,
          profilePic: curr_user.profilePic,
        },
        message: notification.message,
        type: notification.type,
        post: notification.post,
        createdAt: notification.createdAt,
      });
    }

    res.status(201).json({ message: 'Reply added', comment: populatedComment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (comment.likedBy && comment.likedBy.includes(req.user._id)) {
      return res.status(400).json({ message: 'Already liked this comment' });
    }

    await Comment.findByIdAndUpdate(req.params.commentId, { $addToSet: { likedBy: req.user._id }, $inc: { likesCount: 1 } });

    res.json({ message: 'Comment liked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const unlikeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (!comment.likedBy || !comment.likedBy.includes(req.user._id)) {
      return res.status(400).json({ message: 'Comment not liked yet' });
    }

    await Comment.findByIdAndUpdate(req.params.commentId, { $pull: { likedBy: req.user._id }, $inc: { likesCount: -1 } });

    res.json({ message: 'Comment unliked' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const users = await User.find({
      $or: [
        { firstname: { $regex: query, $options: 'i' } },
        { lastname: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .select('firstname lastname profilePic email _id')
      .limit(10);

    const community = await Community.find({ name: { $regex: query, $options: 'i' } })
      .select('name profilePic _id')
      .limit(10);

    res.json({ users, community });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const searchShareBonds = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const bonds = await Bond.find({
      status: 'accepted',
      $or: [{ requester: req.user._id }, { receiver: req.user._id }],
    });

    const bondedUserIds = bonds.map((bond) => (bond.requester.equals(req.user._id) ? bond.receiver : bond.requester));

    const users = await User.find({
      _id: { $in: bondedUserIds },
      $or: [
        { firstname: { $regex: query, $options: 'i' } },
        { lastname: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ],
    })
      .select('firstname lastname profilePic email _id')
      .limit(10);

    const community = await Community.find({ name: { $regex: query, $options: 'i' }, members: req.user._id });

    res.json({ users, community });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

const getOnePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate('user', 'firstname lastname email _id');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  createPost,
  deletePost,
  getPosts,
  getUserPosts,
  getComments,
  likePost,
  unlikePost,
  checkLiked,
  sharePost,
  addComment,
  deleteComment,
  replyToComment,
  likeComment,
  unlikeComment,
  searchUsers,
  searchShareBonds,
  getOnePost,
};
