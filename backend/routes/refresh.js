const express = require('express');
const router = express.Router();
const { verifyRefreshToken } = require('../controllers/jwtController');
const authController = require('../controllers/authController');

router.use(express.json());
router.post('/', verifyRefreshToken, authController.refresh);

module.exports = router;