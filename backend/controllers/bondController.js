const mongoose = require('mongoose');
const Bond = require('../models/bond');
const User = require('../models/Users');
const Notification = require('../models/notification');
const Community = require('../models/community');

const notifyAboutBond = async (io, receiver, message, fromUser, typeOf) => {
  const notification = await Notification.create({
    user: receiver,
    from: fromUser._id,
    type: typeOf,
    message: `${fromUser.firstname} ${fromUser.lastname} ${message}`,
  });

  io.to(`user_${receiver}`).emit('notify', {
    _id: notification._id,
    from: {
      _id: fromUser._id,
      firstname: fromUser.firstname,
      lastname: fromUser.lastname,
      profilePic: fromUser.profilePic,
    },
    message: notification.message,
    type: notification.type,
    createdAt: notification.createdAt,
  });
};

const toggleBond = async (req, res, next) => {
  try {
    const io = req.io;
    const currUser = req.user._id;
    const { receiver } = req.params;
    if (!mongoose.Types.ObjectId.isValid(currUser) || !mongoose.Types.ObjectId.isValid(receiver)) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }
    if (currUser === receiver) {
      return res.status(400).json({ error: 'Cannot bond with yourself' });
    }
    const existingBond = await Bond.findOne({
      $or: [
        { requester: currUser, receiver },
        { requester: receiver, receiver: currUser },
      ],
    });
    const currentUser = await User.findById(currUser);
    if (existingBond) {
      if (existingBond.status === 'accepted' || existingBond.requester.toString() === currUser) {
        await existingBond.deleteOne();
        return res.status(200).json({ message: 'Bond removed successfully' });
      } else {
        existingBond.status = 'accepted';
        existingBond.acceptedAt = new Date();
        await existingBond.save();
        await notifyAboutBond(io, existingBond.requester, 'accepted your bond request', currentUser, 'bondAccepted');
        return res.status(200).json({ message: 'Bond request accepted', bond: existingBond });
      }
    }
    await notifyAboutBond(io, receiver, 'sent you a bond request', currentUser, 'bondRequest');
    const bond = new Bond({ requester: currUser, receiver });
    await bond.save();
    return res.status(201).json({ message: 'Bond request sent', bond });
  } catch (err) {
    next(err);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const currUser = req.user._id;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(currUser) || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }

    const currUserId = new mongoose.Types.ObjectId(currUser);
    const otherUserId = new mongoose.Types.ObjectId(userId);

    const bond = await Bond.findOne({
      $or: [
        { requester: currUserId, receiver: otherUserId },
        { requester: otherUserId, receiver: currUserId },
      ],
    });

    if (!bond) {
      return res.status(404).json({ error: 'No bond found between these users' });
    }
    return res.json({ status: bond.status, requester: bond.requester });
  } catch (err) {
    next(err);
  }
};

const getAllBondsAndCommunities = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const bonds = await Bond.find({
      status: 'accepted',
      $or: [{ requester: userId }, { receiver: userId }],
    })
      .populate('requester', 'firstname lastname profilePic email _id')
      .populate('receiver', 'firstname lastname profilePic email _id');

    const communities = await Community.find({ members: userId }).select('name creator profilePic _id');

    res.status(200).json({ bonds, communities });
  } catch (err) {
    console.error('Internal error:', err);
    next(err);
  }
};

const getPending = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const requests = await Bond.find({ status: 'pending', receiver: userId }).populate('requester', 'profilePic firstname lastname _id');

    res.json(requests);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  toggleBond,
  getStatus,
  getAllBondsAndCommunities,
  getPending,
};
