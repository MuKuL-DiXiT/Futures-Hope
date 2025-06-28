const express = require("express");
const router = express.Router();
const User = require("../models/Users"); 
const { verifyAccessToken } = require("../controllers/jwtController");
const Post = require('../models/Post')
const Bond = require('../models/bond')
const Com = require('../models/community')

router.get("/", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  const users = await User.find({
    name: { $regex: query, $options: "i" },
  }).select("name avatar username");

  res.json(users);
});



module.exports = router;
