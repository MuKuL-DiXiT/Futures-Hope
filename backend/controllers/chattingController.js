const Chat = require('../models/chat');
const Message = require('../models/Messages');
const Community = require('../models/community');
const User = require('../models/Users');
const mongoose = require('mongoose');

const accessChat = async (req, res) => {
  try {
    const { userId } = req.body;
    const loggedInUserId = req.user._id;

    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).json({ error: 'Invalid user ID format' });
    if (userId === loggedInUserId.toString()) return res.status(400).json({ error: 'Cannot create chat with yourself' });

    const [targetUser, currentUser] = await Promise.all([User.findById(userId), User.findById(loggedInUserId)]);
    if (!targetUser || !currentUser) return res.status(404).json({ error: 'User not found' });

    let chat = await Chat.findOne({ isGroupChat: false, $or: [{ participants: [loggedInUserId, userId] }, { participants: [userId, loggedInUserId] }] }).populate('participants', 'username profilePic');

    if (!chat) {
      chat = await Chat.create({ participants: [loggedInUserId, userId], isGroupChat: false });
      chat = await Chat.findById(chat._id).populate('participants', 'username profilePic');
    }

    res.status(200).json(chat);
  } catch (err) {
    console.error('Chat access error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getChats = async (req, res) => {
  try {
    const userId = req.user._id;

    const personalChats = await Chat.find({ participants: userId, isGroupChat: false })
      .populate('participants', 'firstname lastname profilePic')
      .populate({ path: 'lastMessage', select: 'content sender readBy deleted', populate: { path: 'readBy.user', select: 'firstname lastname profilePic' }, strictPopulate: false });

    const communities = await Community.find({ $or: [{ members: userId }, { moderators: userId }] }).populate({ path: 'chatRoom', populate: [{ path: 'participants', select: 'firstname lastname profilePic' }, { path: 'lastMessage', select: 'content sender readBy', populate: [{ path: 'sender', select: 'firstname lastname profilePic' }, { path: 'readBy.user', select: 'firstname lastname profilePic' }] }] });

    const communityChats = communities.map((c) => c.chatRoom).filter(Boolean);
    const allChats = [...personalChats, ...communityChats].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    const completechats = { chats: allChats, userId };
    res.status(200).json(completechats);
  } catch (err) {
    console.error('Fetch chats error:', err);
    res.status(500).json({ error: 'Failed to fetch chats' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { chatId, content, attachments } = req.body;
    const sender = req.user._id;

    if (!chatId || (!content?.trim() && !attachments?.length)) return res.status(400).json({ error: 'Chat ID and content or attachments are required' });

    const chat = await Chat.findById(chatId).populate('community');
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    if (chat.community) {
      const community = await Community.findById(chat.community);
      const isMember = community.members.includes(sender) || community.moderators.includes(sender);
      if (!isMember) return res.status(403).json({ error: 'Not a community member' });
    } else if (!chat.participants.some((p) => p.toString() === sender.toString())) {
      return res.status(403).json({ error: 'Not authorized in this chat' });
    }

    const message = await Message.create({ chat: chatId, sender, content: content?.trim(), attachments: attachments || [] });

    await Chat.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    const populatedMessage = await Message.findById(message._id).populate('sender', 'username profilePic').populate({ path: 'chat', populate: { path: 'participants', select: 'username profilePic' } });

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    let community = null;

    if (chat.isGroupChat) {
      community = await Community.findOne({ chatRoom: chatId });
      const isMember = community.members.includes(userId) || community.moderators.includes(userId);
      if (!isMember) return res.status(403).json({ error: 'Not authorized' });
    } else if (!chat.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const messages = await Message.find({ chat: chatId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('sender', 'username profilePic').lean();

    const totalMessages = await Message.countDocuments({ chat: chatId });

    const response = { messages: messages.reverse(), page, totalPages: Math.ceil(totalMessages / limit), totalMessages };
    if (community) response.community = community._id;

    res.status(200).json(response);
  } catch (err) {
    console.error('Fetch messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId).populate('chat');
    if (!message) return res.status(404).json({ error: 'Message not found' });

    let isModerator = false;
    if (message.chat.community) {
      const community = await Community.findById(message.chat.community);
      isModerator = community.moderators.includes(userId);
    }

    if (message.sender.toString() !== userId.toString() && !isModerator) return res.status(403).json({ error: 'Not authorized' });

    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    res.status(200).json({ message: 'Message deleted' });
  } catch (err) {
    console.error('Delete message error:', err);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

const getCommunityChat = async (req, res) => {
  try {
    const community = await Community.findById(req.params.communityId).populate({ path: 'chatRoom', populate: [{ path: 'participants', select: 'username profilePic' }, { path: 'lastMessage', populate: { path: 'sender', select: 'username profilePic' } }] });

    if (!community || !community.chatRoom) return res.status(404).json({ error: 'Community chat not found' });

    const isMember = community.members.includes(req.user._id) || community.moderators.includes(req.user._id);
    if (!isMember) return res.status(403).json({ error: 'Not a community member' });

    res.status(200).json(community.chatRoom);
  } catch (err) {
    console.error('Get community chat error:', err);
    res.status(500).json({ error: 'Failed to fetch community chat' });
  }
};

const extractMessage = async (req, res) => {
  try {
    const { mid } = req.params;

    if (!mid.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ error: 'Invalid message ID' });

    const message = await Message.findById(mid).populate('sender', 'firstname lastname profilePic').populate('readBy.user', 'firstname lastname profilePic');
    if (!message) return res.status(404).json({ error: 'Message not found' });

    res.status(200).json({ message });
  } catch (err) {
    console.error('Extract message error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    await Message.updateMany({ chat: chatId, 'readBy.user': { $ne: userId } }, { $addToSet: { readBy: { user: userId, readAt: new Date() } } });

    res.status(200).json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
};

module.exports = {
  accessChat,
  getChats,
  sendMessage,
  getMessages,
  deleteMessage,
  getCommunityChat,
  extractMessage,
  markAsRead,
};
