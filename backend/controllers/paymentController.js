const Payment = require('../models/payment');
const User = require('../models/Users');
const Community = require('../models/community');
const Notification = require('../models/notification');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.key_id,
  key_secret: process.env.key_secret,
});

const createOrder = async (req, res) => {
  try {
    const { amount, communityId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return res.status(200).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ message: 'Failed to create order' });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const io = req.io;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, communityId, amount, message } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.key_secret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed' });
    }

    // Fetch user and community
    const curr_user = await User.findById(req.user._id);
    const community = await Community.findById(communityId);

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    const name = curr_user.firstname + ' ' + curr_user.lastname;
    const email = curr_user.email;

    // Save payment to database
    const payment = new Payment({
      name,
      email,
      amount,
      community: communityId,
      message: message || '',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    await payment.save();

    // Create and send notification to community founder
    const notificationMessage = `New donation of ₹${amount} from ${name}${message ? ` with message: "${message}"` : ''}`;
    const notification = new Notification({
      user: community.creator,
      from: req.user._id,
      type: 'payment',
      message: notificationMessage,
      pay: payment._id,
    });

    await notification.save();

    // Emit real-time notification
    io.to(`user_${community.creator}`).emit('notify', {
      _id: notification._id,
      from: {
        _id: curr_user._id,
        firstname: curr_user.firstname,
        lastname: curr_user.lastname,
        profilePic: curr_user.profilePic,
      },
      message: notification.message,
      type: notification.type,
      pay: payment._id,
      createdAt: notification.createdAt,
    });

    return res.status(200).json({ success: true, message: 'Payment verified and saved successfully', payment });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

const createPayment = async (req, res) => {
  try {
    const io = req.io;
    const curr_user = await User.findById(req.user._id);
    const name = curr_user.firstname + ' ' + curr_user.lastname;
    const email = curr_user.email;
    const { amount, communityId, mess } = req.body;
    const community = await Community.findById(communityId);
    if (!community) return res.status(404).json({ message: 'Community not found' });
    const payment = new Payment({ name, email, amount, community: communityId, message: mess });
    await payment.save();
    const notification = new Notification({ user: community.creator, from: req.user._id, type: 'payment', message: `New payment of ₹${amount} from ${name} to ${community.name}`, pay: payment._id });
    await notification.save();
    io.to(`user_${community.creator}`).emit('notify', { _id: notification._id, from: { _id: curr_user._id, firstname: curr_user.firstname, lastname: curr_user.lastname, profilePic: curr_user.profilePic }, message: notification.message, type: notification.type, link: req?.file?.path, pay: payment._id, createdAt: notification.createdAt });
    return res.status(201).json({ message: 'Payment created successfully', payment });
  } catch (error) {
    console.error('Error creating payment:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { createPayment, createOrder, verifyPayment };
