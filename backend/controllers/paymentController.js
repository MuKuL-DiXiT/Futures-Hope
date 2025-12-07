const Payment = require('../models/payment');
const User = require('../models/Users');
const Community = require('../models/community');
const Notification = require('../models/notification');

const createPayment = async (req, res) => {
  try {
    const io = req.io;
    const curr_user = await User.findById(req.user._id);
    const name = curr_user.firstname + ' ' + curr_user.lastname;
    const email = curr_user.email;
    const { amount, communityId } = req.body;
    if (!req.file || !req.file.path) return res.status(400).json({ message: 'Screenshot proof is required' });
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const payment = new Payment({ name, email, amount, proofScreenshotUrl: req.file.path, community: communityId });
    await payment.save();
    const notification = new Notification({ user: community.creator, from: req.user._id, type: 'payment', message: `New payment of ₹${amount} from ${name} to ${community.name}`, pay: payment._id, link: req?.file?.path });
    await notification.save();
    io.to(`user_${community.creator}`).emit('notify', { _id: notification._id, from: { _id: curr_user._id, firstname: curr_user.firstname, lastname: curr_user.lastname, profilePic: curr_user.profilePic }, message: notification.message, type: notification.type, link: req?.file?.path, pay: payment._id, createdAt: notification.createdAt });
    return res.status(201).json({ message: 'Payment created successfully', payment });
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const getVerified = async (req, res) => {
  try {
    const payments = await Payment.find({ isVerified: true }).populate('community');
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching verified payments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const getUnverified = async (req, res) => {
  try {
    const payments = await Payment.find({ isVerified: false }).populate('community');
    res.status(200).json(payments);
  } catch (error) {
    console.error('Error fetching unverified payments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const io = req.io;
    const { paymentId } = req.params;
    const user = await User.findById(req.user._id);
    const payment = await Payment.findById(paymentId).populate('community');
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.isVerified) return res.status(400).json({ message: 'Payment already verified' });
    payment.isVerified = true;
    await payment.save();

    const donor = await User.findOne({ email: payment.email });
    if (donor) {
      const notification = new Notification({ user: donor._id, from: req.user._id, type: 'payment', message: `Your donation of ₹${payment.amount} to ${payment.community.name} has been verified. Thank you!` });
      await notification.save();
      io.to(`user_${donor._id}`).emit('notify', { _id: notification._id, from: { _id: req.user._id, firstname: user.firstname, lastname: user.lastname, profilePic: user.profilePic }, message: notification.message, type: notification.type, createdAt: notification.createdAt });
    }

    res.status(200).json({ message: 'Payment verified successfully', payment });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { createPayment, getVerified, getUnverified, verifyPayment };
