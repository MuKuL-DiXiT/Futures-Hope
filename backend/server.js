require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const { createServer } = require('http');
const { Server } = require('socket.io');
const chatSocketHandler = require('./sockets/chatSocket');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const passport = require('passport');
const User = require('./models/Users');

const app = express();

// CORS Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true,
  }
});
app.set("io", io);

// Basic Middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: 'your_secret_here',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true if using HTTPS
}));
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Pass io to routes via req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Socket handler
chatSocketHandler(io);

// Routes
app.use('/auth/signup', require('./routes/signup'));
app.use('/auth/login', require('./routes/login'));
app.use('/auth/refresh', require('./routes/refresh'));
app.use('/auth/posts', require('./routes/postRoute'));
app.use('/auth/extractUser', require('./routes/extractUser'));
app.use('/auth/google', require('./routes/google'));
app.use('/auth/logout', require('./routes/logout'));
app.use('/auth/people', require('./routes/people'));
app.use('/auth/community', require('./routes/communityRoute'));
app.use('/auth/chat', require('./routes/chatRoute'));
app.use('/auth/bond', require('./routes/bonding'));
app.use('/auth/notification', require('./routes/notify'));
app.use('/auth/payment', require('./routes/paymentRoutes'));

// Error handler
app.use(require('./middlewares/errorHandler'));

const port = process.env.PORT || 3000;
const startServer = async () => {
  await connectDB();
  server.listen(port, () => {
    console.log(`🚀 Server + WebSocket running on port ${port}`);
  });
};

startServer();
