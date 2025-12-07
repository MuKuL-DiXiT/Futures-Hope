const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/create-direct', chatController.createDirect);
router.post('/create-community-chat', chatController.createCommunityChat);
router.post('/:chatId/message', chatController.sendMessage);
router.get('/:chatId/messages', chatController.getMessages);
router.get('/user/:userId', chatController.getUserChats);

module.exports = router;
