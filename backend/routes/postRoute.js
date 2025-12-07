const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer_middleware');
const { verifyAccessToken } = require('../controllers/jwtController');
const postController = require('../controllers/postController');

router.post('/create', verifyAccessToken, upload.single('media'), postController.createPost);
router.delete('/delete/:postId', verifyAccessToken, postController.deletePost);
router.get('/getPosts', postController.getPosts);
router.get('/getUserPosts/:userId', verifyAccessToken, postController.getUserPosts);
router.get('/:postId/comments', postController.getComments);
router.post('/:postId/like', verifyAccessToken, postController.likePost);
router.post('/:postId/unlike', verifyAccessToken, postController.unlikePost);
router.get('/:postId/liked', verifyAccessToken, postController.checkLiked);
router.post('/:postId/share', verifyAccessToken, postController.sharePost);
router.post('/:postId/comment', verifyAccessToken, postController.addComment);
router.delete('/comment/:commentId', verifyAccessToken, postController.deleteComment);
router.post('/:postId/comment/:commentId/reply', verifyAccessToken, postController.replyToComment);
router.post('/:postId/comment/:commentId/like', verifyAccessToken, postController.likeComment);
router.post('/:postId/comment/:commentId/unlike', verifyAccessToken, postController.unlikeComment);
router.get('/search/users', postController.searchUsers);
router.get('/searchShare/bonds', verifyAccessToken, postController.searchShareBonds);
router.get('/one/:postId', verifyAccessToken, postController.getOnePost);

module.exports = router;