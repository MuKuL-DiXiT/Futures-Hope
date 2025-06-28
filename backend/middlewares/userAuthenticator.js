const User = require('../models/Users') 
const bcrypt = require('bcrypt');
async function authenticateUser(req, res, next) {
  try {
    const { email, password } = req.body;
    
    // 1. Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 2. Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Attach user to request for route handler
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}
module.exports = authenticateUser