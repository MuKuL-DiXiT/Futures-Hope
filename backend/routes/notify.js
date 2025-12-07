const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../controllers/jwtController');
const notifyController = require('../controllers/notifyController');

router.get('/', verifyAccessToken, notifyController.getNotifications);
router.patch('/:notificationId', verifyAccessToken, notifyController.markNotification);
router.delete('/:notificationId', verifyAccessToken, notifyController.deleteNotification);
router.get('/unseenCount', verifyAccessToken, notifyController.unseenCount);

module.exports = router;
