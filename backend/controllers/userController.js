const User = require('../models/Users');
const Post = require('../models/Post');
const Bond = require('../models/bond');
const Community = require('../models/community');

const searchAllUsers = async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  const users = await User.find({ name: { $regex: query, $options: 'i' } }).select('name avatar username');
  res.json(users);
};

const extractUser = async (req, res) => {
  try {
    const email = req.user.email;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const post_user = await Post.find({ user: user._id });
    const postCount = post_user.length;

    const com_user = await Community.find({ members: user._id });
    const comCount = com_user.length;

    const bond_user = await Bond.find({ $or: [{ receiver: user._id }, { requester: user._id }] });
    const bondCount = bond_user.length;

    res.json({ user: user.toObject(), postCount, bondCount, comCount });
  } catch (err) {
    console.error('Server error in /extractUser:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getPeople = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const post_user = await Post.find({ user: user._id });
    const postCount = post_user.length;

    const com_user = await Community.find({ members: user._id });
    const comCount = com_user.length;

    const bond_user = await Bond.find({ $or: [{ receiver: user._id }, { requester: user._id }] });
    const bondCount = bond_user.length;

    res.json({ user: user.toObject(), postCount, bondCount, comCount });
  } catch (err) {
    console.error('Server error in /people:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const editProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { firstname, lastname } = req.body;

    if (req.file) user.profilePic = req.file.path;

    user.firstname = firstname || user.firstname;
    user.lastname = lastname || user.lastname;

    await user.save();

    res.status(200).json({ message: 'Profile updated successfully', user });
  } catch (err) {
    console.error('Update error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { searchAllUsers, extractUser, getPeople, editProfile };
