const express = require('express');
const bcrypt = require('bcrypt');
const User = require('../models/Users');
const upload = require('../middlewares/multer_middleware');
const { generateToken } = require('../controllers/jwtController');
const { z } = require('zod');

const router = express.Router();

// Zod schema
const signupSchema = z.object({
  firstname: z.string().min(1, "Firstname is required"),
  lastname: z.string().min(1, "Lastname is required"),
  age: z.coerce.number().int().min(13).max(150),
  mobile: z
    .string()
    .regex(/^\d{10}$/, "Mobile must be exactly 10 digits"),
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8)
    .regex(/[a-z]/, "Must include lowercase")
    .regex(/[A-Z]/, "Must include uppercase")
    .regex(/\d/, "Must include number"),
  gender: z.enum(["male", "female", "other"]),
});


router.post('/', upload.single('profilePic'), async (req, res, next) => {
  try {
    // ✅ Validate and sanitize input
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error.errors[0].message, // Send first validation error
      });
    }

    const { firstname, lastname, age, mobile, email, password, gender } = result.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = {
      firstname,
      lastname,
      age,
      mobile,
      email,
      password: hashedPassword,
      gender,
    };

    if (req.file) {
      userData.profilePic = req.file.path;
    }

    const newUser = new User(userData);
    await newUser.save();

    const { accessToken, refreshToken } = generateToken(newUser);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      sameSite: 'None',
      secure: true,
      maxAge: 60 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'None',
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    const userResponse = {
      _id: newUser._id,
      firstname: newUser.firstname,
      lastname: newUser.lastname,
      email: newUser.email,
      age: newUser.age,
      mobile: newUser.mobile,
      gender: newUser.gender,
      profilePic: newUser.profilePic,
    };

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
