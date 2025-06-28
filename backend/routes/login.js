const express = require('express');
const router2 = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/Users');
const { generateToken } = require('../controllers/jwtController');
const authenticateUser = require('../middlewares/userAuthenticator');

router2.use(express.json());

router2.post('/', authenticateUser, async (req, res, next) => {
    try {
        const { accessToken, refreshToken } = generateToken(req.user);

        const userResponse = {
            id: req.user._id,
            firstname: req.user.firstname,
            lastname: req.user.lastname,
            email: req.user.email
        };

        res.cookie('accessToken', accessToken, {
  httpOnly: true,
  sameSite: 'None',       // ✅ Must be 'None' for cross-origin
  secure: true,           // ✅ Must be true for cross-origin cookies to work
  maxAge: 60 * 60 * 1000  // 1 hour
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  sameSite: 'None',       // ✅ Must be 'None' for cross-origin
  secure: true,           // ✅ Must be true for cross-origin
  maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days
});


        res.status(200).json({
            message: "Login successful",
            user: userResponse,
            accessToken
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router2