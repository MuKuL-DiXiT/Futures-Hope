// routes/chatRoute.js
const express = require('express');
const mongoose = require('mongoose');
const Chat = require('../models/chat');
const User = require('../models/User');
const Community = require('../models/community');

const router = express.Router();

// Create one-to-one chat
router.post('/create-direct', async (req, res, next) => {
  try {
    const { user1, user2 } = req.body;
    if (!mongoose.Types.ObjectId.isValid(user1) || !mongoose.Types.ObjectId.isValid(user2)) {
      return res.status(400).json({ error: 'Invalid user ID(s)' });
    }

    let chat = await Chat.findOne({
      participants: { $all: [user1, user2] },
      isGroupChat: false
    });

    if (!chat) {
      chat = new Chat({
        participants: [user1, user2],
        isGroupChat: false
      });
      await chat.save();
    }

    res.json(chat);
  } catch (err) {
    next(err);
  }
});

// Create community (group) chat
router.post('/create-community-chat', async (req, res, next) => {
  try {
    const { communityId, adminId } = req.body;

    const community = await Community.findById(communityId).populate('members');
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const chat = new Chat({
      participants: community.members,
      isGroupChat: true,
      groupName: community.name,
      groupAdmin: adminId
    });
    await chat.save();

    res.status(201).json(chat);
  } catch (err) {
    next(err);
  }
});

// Send a message to a chat
router.post('/:chatId/message', async (req, res, next) => {
  try {
    const { sender, content } = req.body;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(sender)) {
      return res.status(400).json({ error: 'Invalid sender ID' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    const message = {
      sender,
      content,
      createdAt: new Date()
    };

    chat.messages.push(message);
    await chat.save();

    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

// Get chat messages
router.get('/:chatId/messages', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId).populate('messages.sender', 'firstname lastname');
    if (!chat) return res.status(404).json({ error: 'Chat not found' });

    res.json(chat.messages);
  } catch (err) {
    next(err);
  }
});

// Get all chats for a user
router.get('/user/:userId', async (req, res, next) => {
  try {
    const { userId } = req.params;
    const chats = await Chat.find({ participants: userId })
      .populate('participants', 'firstname lastname')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
