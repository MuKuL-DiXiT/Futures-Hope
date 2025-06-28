const express = require("express");
const router = express.Router();
const User = require("../models/Users"); 
const { verifyAccessToken } = require("../controllers/jwtController");
const Post = require('../models/Post')
const Bond = require('../models/bond')
const Com = require('../models/community')

router.get("/", verifyAccessToken, async (req, res) => {
  try {
    const email = req.user.email;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const post_user = await Post.find({ user: user._id });
    const postCount = post_user.length;

    const com_user = await Com.find({ members: user._id });
    const comCount = com_user.length;

    const bond_user = await Bond.find({
      $or: [{ receiver: user._id }, { requester: user._id }]
    });
    const bondCount = bond_user.length;

    res.json({
      user: user.toObject(),
      postCount,
      bondCount,
      comCount,
    });
  } catch (err) {
    console.error("Server error in /extractUser:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



module.exports = router;
