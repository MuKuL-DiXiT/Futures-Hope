const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../controllers/jwtController');
const userController = require('../controllers/userController');

router.get('/', verifyAccessToken, userController.extractUser);

module.exports = router;
