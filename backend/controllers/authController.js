const bcrypt = require('bcrypt');
const User = require('../models/Users');
const { generateToken } = require('./jwtController');
const { z } = require('zod');

const signupSchema = z.object({
  firstname: z.string().min(1, 'Firstname is required'),
  lastname: z.string().min(1, 'Lastname is required'),
  age: z.coerce.number().int().min(13).max(150),
  mobile: z.string().regex(/^\d{10}$/, 'Mobile must be exactly 10 digits'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8).regex(/[a-z]/, 'Must include lowercase').regex(/[A-Z]/, 'Must include uppercase').regex(/\d/, 'Must include number'),
  gender: z.enum(['male', 'female', 'other']),
});

const signup = async (req, res, next) => {
  try {
    const result = signupSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { firstname, lastname, age, mobile, email, password, gender } = result.data;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, error: 'User with this email already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = { firstname, lastname, age, mobile, email, password: hashedPassword, gender };
    if (req.file) userData.profilePic = req.file.path;

    const newUser = new User(userData);
    await newUser.save();

    const { accessToken, refreshToken } = generateToken(newUser);

    res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    const userResponse = { _id: newUser._id, firstname: newUser.firstname, lastname: newUser.lastname, email: newUser.email, age: newUser.age, mobile: newUser.mobile, gender: newUser.gender, profilePic: newUser.profilePic };

    res.status(201).json({ success: true, message: 'User created successfully', user: userResponse });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { accessToken, refreshToken } = generateToken(req.user);

    const userResponse = { id: req.user._id, firstname: req.user.firstname, lastname: req.user.lastname, email: req.user.email };

    res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.status(200).json({ message: 'Login successful', user: userResponse, accessToken });
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const OG = await User.findOne({ email: req.user.email });
    if (!OG) return res.status(404).json({ error: 'User not found' });
    const { accessToken, refreshToken } = generateToken(OG);
    res.cookie('accessToken', accessToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 60 * 60 * 1000 });
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'None', secure: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.json({ accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, refresh };
