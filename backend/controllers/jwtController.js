const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
  const payload = {
    _id: user._id,
    email: user.email,
  };

 const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' }); 


  return { accessToken, refreshToken };
};

const verifyTokenWithSecret = (secret, tokenName = 'accessToken') => (req, res, next) => {
  const token = req.cookies?.[tokenName];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};


const verifyAccessToken = verifyTokenWithSecret(process.env.JWT_SECRET, 'accessToken');
const verifyRefreshToken = verifyTokenWithSecret(process.env.JWT_REFRESH_SECRET, 'refreshToken');

module.exports = {
  generateToken,
  verifyAccessToken,
  verifyRefreshToken,
};
