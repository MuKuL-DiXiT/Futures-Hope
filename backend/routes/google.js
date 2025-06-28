const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const cookieParser = require('cookie-parser');
const { generateToken } = require('../controllers/jwtController');
const User = require('../models/Users');
require('dotenv').config();

const router = express.Router();

router.use(cookieParser());
router.use(passport.initialize());

// Passport Google strategy config
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ email: profile.emails[0].value });
    if (!user) {
      user = new User({
        email: profile.emails[0].value,
        firstname: profile.name?.givenName || '',
        lastname: profile.name?.familyName || '',
        googleId: profile.id,
      });
      await user.save();
    }
    done(null, user);
  } catch (err) {
    done(err, null);
  }
}));

// Route to start OAuth login
router.get('/', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

// OAuth callback route
router.get('/callback', passport.authenticate('google', {
  failureRedirect: '/'
}), (req, res) => {
  // User authenticated successfully here, set tokens and redirect
  const { accessToken, refreshToken } = generateToken(req.user);

  res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 1000 //1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

  res.redirect(process.env.CLIENT_URL + '/home');

});

module.exports = router;
