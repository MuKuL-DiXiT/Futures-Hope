const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../controllers/jwtController');
const chattingController = require('../controllers/chattingController');

router.post('/access', verifyAccessToken, chattingController.accessChat);
router.get('/', verifyAccessToken, chattingController.getChats);
router.post('/message', verifyAccessToken, chattingController.sendMessage);
router.get('/messages/:chatId', verifyAccessToken, chattingController.getMessages);
router.delete('/message/:messageId', verifyAccessToken, chattingController.deleteMessage);
router.get('/community/:communityId', verifyAccessToken, chattingController.getCommunityChat);
router.get('/extractmessage/:mid', verifyAccessToken, chattingController.extractMessage);
router.patch('/markasread/:chatId', verifyAccessToken, chattingController.markAsRead);

module.exports = router;

