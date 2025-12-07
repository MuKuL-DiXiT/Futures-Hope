const express = require('express');
const router2 = express.Router();
const authenticateUser = require('../middlewares/userAuthenticator');
const authController = require('../controllers/authController');

router2.use(express.json());
router2.post('/', authenticateUser, authController.login);

module.exports = router2;