const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/Users'); // Adjust path as needed
const upload = require('../middlewares/multer_middleware')
const { generateToken } = require('../controllers/jwtController');
const router = express.Router();

// Signup route with endpoint "/"
router.post('/', upload.single('profilePic'), async (req, res, next) => {
  try {
    const { firstname, lastname, age, mobile, email, password, gender } = req.body;
    
    // Basic validation
    if (!firstname || !lastname || !age || !mobile || !email || !password || !gender) {
      return res.status(400).json({ 
        success: false, 
        error: 'All fields are required' 
      });
    }

    // Age validation
    if (parseInt(age) < 13 || parseInt(age) > 150) {
      return res.status(400).json({ 
        success: false, 
        error: 'Age must be between 13 and 150' 
      });
    }

    // Password validation (at least 8 characters, includes uppercase, lowercase, and number)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Password must be at least 8 characters long and include uppercase, lowercase, and number' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this email already exists' 
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user object
    const userData = {
      firstname,
      lastname,
      age: parseInt(age),
      mobile,
      email,
      password: hashedPassword,
      gender
    };

    // Add profile picture URL if uploaded
    if (req.file) {
      userData.profilePic = req.file.path; // Cloudinary URL
    }

    // Create new user
    const newUser = new User(userData);
    await newUser.save();

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateToken(newUser);

    // Set cookies
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

    // Return success response (excluding password)
    const userResponse = {
      _id: newUser._id,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      email: newUser.email,
      age: newUser.age,
      mobile: newUser.mobile,
      gender: newUser.gender,
      profilePic: newUser.profilePic
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });

  } catch (err) {
    next(err); // Pass error to error handler middleware
  }
});

module.exports = router;