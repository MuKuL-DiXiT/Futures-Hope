const express = require('express');
const jwt = require('jsonwebtoken');
const { generateToken, verifyRefreshToken } = require('../controllers/jwtController')
const router = express.Router();
const USER = require('../models/Users')
require('dotenv').config()

router.use(express.json());

router.post('/', verifyRefreshToken, async (req, res, next) => {
  try {
    const OG = await USER.findOne({ email: req.user.email });
    if (!OG) return res.status(404).json({ error: 'User not found' });
    const { accessToken, refreshToken } = generateToken(OG);
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    return res.json({
      accessToken,
      refreshToken: refreshToken
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;