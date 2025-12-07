const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../controllers/jwtController');
const upload = require('../middlewares/multer_middleware');
const communityController = require('../controllers/communityController');

router.get('/communityDataBase', communityController.getCommunityDatabase);
router.post('/', verifyAccessToken, upload.single('profilePic'), communityController.createCommunity);
router.post('/:id/join', verifyAccessToken, communityController.joinRequest);
router.get('/:id/status', verifyAccessToken, communityController.joinStatus);
router.get('/allRequests', verifyAccessToken, communityController.allRequests);
router.post('/:id/upload-qr', verifyAccessToken, upload.single('qr'), communityController.uploadQr);
router.get('/:id', verifyAccessToken, communityController.getCommunity);
router.post('/accept/:joinRequestId', verifyAccessToken, communityController.acceptJoin);
router.get('/allCommunities', verifyAccessToken, communityController.getAllCommunities);
router.get('/allUsers/:comId', communityController.getAllUsers);

module.exports = router;