const express = require('express');
const router = express.Router();
const Community = require('../models/community');
const Chat = require('../models/chat');
const User = require('../models/Users');
const Join = require('../models/join')
const Notification = require('../models/notification')
const { verifyAccessToken } = require('../controllers/jwtController');
const upload = require('../middlewares/multer_middleware');

router.get('/communityDataBase', async (req, res) => {
  try {
    const community = await Community.find().populate('creator', 'firstname profilePic');
    res.status(200).json(community);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// Create community with automatic chat creation
router.post('/', verifyAccessToken, upload.single('profilePic'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const members = Array.isArray(req.body.members) ? req.body.members : [req.body.members].filter(Boolean);
    const moderators = Array.isArray(req.body.moderators) ? req.body.moderators : [req.body.moderators].filter(Boolean);

    // Basic validation
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }

    const doesExists = await Community.findOne({ name });
    if (doesExists) {
      return res.status(400).json({ error: 'Community with this name already exists' });
    }
    members.push(req.user._id);
    moderators.push(req.user._id);
    const newChatRoom = await Chat.create({
      isGroupChat: true,
      participants: [...members],
      groupName: name,
      groupAdmin: [...moderators],
      groupImage: req.file ? req.file.path : null
    });


    // Create the community (the pre-save hook will create the chat)
    const community = await Community.create({
      name,
      profilePic: req.file ? req.file.path : null,
      description,
      creator: req.user._id,
      members: members,
      moderators: moderators,
      chatRoom: newChatRoom._id,
    });




    // Populate the created community with necessary data
    const populatedCommunity = await Community.findById(community._id)
      .populate('creator', '_id firstname lastname profilePic')
      .populate('members', '_id firstname lastname profilePic')
      .populate('moderators', '_id firstname lastname profilePic')
      .populate('chatRoom');

    res.status(201).json(populatedCommunity);
  } catch (error) {
    console.error('Error creating community:', error);
    res.status(500).json({ error: error.message });
  }
});

//join request
router.post('/:id/join', verifyAccessToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id);
    const communityId = req.params.id;
    const userId = req.user._id;
    if (community.members.map(m => m.toString()).includes(userId)) {
      await Community.findByIdAndUpdate(
        communityId,
        { $pull: { members: userId } },
        { new: true }
      );
    }
    const io = req.io;
    // Check if already exists
    const existing = await Join.findOne({ user: userId, community: communityId });
    if (existing) {
      await Join.findOneAndDelete({ user: userId, community: communityId });
      return res.status(200).json({ message: 'you left the community' });
    }
    console.log('hello')

    // Create join request
    const joinRequest = await Join.create({
      user: userId,
      community: communityId,
      status: 'pending'
    });

    // Notify the creator
    const requester = await User.findById(userId);

    const notification = await Notification.create({
      user: community.creator,
      type: "join",
      from: requester._id,
      message: `${requester.firstname + " " + requester.lastname} requested to join ${community.name}`,
    });

    // Emit to the creator if online
    io.to(`user_${community.creator}`).emit('notify', {
      from: {
        _id: userId,
        firstname: requester.firstname,
        lastname: requester.lastname,
        profilePic: requester.profilePic
      },
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt
    });

    res.status(201).json({ message: 'Join request sent' });

  } catch (err) {
    console.error("Join request error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

//join status
router.get('/:id/status', verifyAccessToken, async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const community = await Community.findById(req.params.id);
    if (community.members.map(m => m.toString()).includes(userId)) {
      return res.status(200).json({ status: "joined" });
    }
    const join = await Join.findOne({ user: req.user._id, community: req.params.id });
    if (!join) {
      return res.status(200).json({ status: "none" });
    }
    return res.status(200).json({ status: join.status });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});


//all requests
router.get('/allRequests', verifyAccessToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const communities = await Community.find({ creator: userId }).select('_id');
    const communityIds = communities.map(c => c._id);
    const pendingRequests = await Join.find({
      community: { $in: communityIds },
      status: 'pending'
    }).populate('user', 'firstname lastname profilePic');
    return res.status(200).json(pendingRequests);
  } catch (err) {
    console.error("Error fetching join requests:", err);
    return res.status(500).json({ message: 'Server error' });
  }
});
//qr upload
router.post('/:id/upload-qr', verifyAccessToken, upload.single('qr'), async (req, res) => {
  try {
    const communityId = req.params.id;
    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }
    community.qrCodeUrl = req.file ? req.file.path : null;
    await community.save();
    res.status(200).json(community);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get community with chat details
router.get('/:id', verifyAccessToken, async (req, res) => {
  try {
    const community = await Community.findById(req.params.id)
      .populate('creator', 'username firstname lastname profilePic _id')
      .populate('members', 'username firstname lastname profilePic _id')
      .populate('moderators', 'username firstname lastname profilePic _id')
      .populate({
        path: 'chatRoom',
        populate: {
          path: 'participants lastMessage',
          select: 'username firstname lastname profilePic content'
        }
      });

    if (!community) {
      return res.status(404).json({ error: 'Community not found' });
    }

    res.status(200).json(community);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle join requests with chat updates
router.post('/accept/:joinRequestId', verifyAccessToken, async (req, res) => {
  try {
    const joinReq = await Join.findById(req.params.joinRequestId).populate('user community');
    if (!joinReq || joinReq.status !== 'pending')
      return res.status(404).json({ message: 'Join request not found or already handled' });

    if (joinReq.community.creator.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    // Add member to community
    joinReq.community.members.push(joinReq.user._id);
    await joinReq.community.save();

    // Update join request status
    joinReq.status = 'joined';
    await joinReq.save();

    // Send notification
    await Notification.create({
      user: joinReq.user._id,
      type: 'join',
      from: req.user._id,
      message: `Your request to join ${joinReq.community.name} was accepted.`,
    });
    const user = await User.findById(req.user._id);
    // Optional: emit socket to the requester
    req.io.to(`user_${joinReq.user._id}`).emit('notify', {
      from: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
      },
      message: `Your request to join ${joinReq.community.name} was accepted.`,
      type: 'join',
      createdAt: new Date(),
    });

    return res.status(200).json({ message: 'Request accepted' });
  } catch (err) {
    console.error('Accept join request error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


// Get all communities for a user with chat previews
router.get('/allCommunities', verifyAccessToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const communities = await Community.find({
      $or: [
        { members: userId },
        { moderators: userId }
      ]
    })
      .populate('creator', 'username profilePic')
      .populate({
        path: 'chatRoom',
        populate: {
          path: 'lastMessage',
          populate: {
            path: 'sender',
            select: 'username profilePic'
          }
        }
      })
      .sort({ updatedAt: -1 });

    res.status(200).json(communities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//get all the members
router.get('/allUsers/:comId', async (res, req) => {
  try {
    const community = await Community.findById(req.params.com_id)
      .populate('members', 'firstname lastname email profilePic _id');
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    res.status(200).json({ members: community.members });
  } catch (err) {
    res.return(500).send("There is an erro fetching the data");
  }
});





// Other routes (request, reject, etc.) remain similar but should also update chat when needed


module.exports = router;