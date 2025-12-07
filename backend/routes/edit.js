const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer_middleware'); 
const User = require('../models/Users');
const { verifyAccessToken } = require('../controllers/jwtController');
require('dotenv').config();

router.post('/', verifyAccessToken, upload.single('profilePic'), async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { firstname, lastname } = req.body;

    if (req.file) {
      user.profilePic = req.file.path;
    }

    user.firstname = firstname || user.firstname;
    user.lastname = lastname || user.lastname;

    await user.save();

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;