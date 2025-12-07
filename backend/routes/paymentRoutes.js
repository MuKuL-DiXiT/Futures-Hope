const router = require('express').Router();
const { verifyAccessToken } = require('../controllers/jwtController');
const upload = require('../middlewares/multer_middleware');
const paymentController = require('../controllers/paymentController');

router.post('/', verifyAccessToken, upload.single('screenShot'), paymentController.createPayment);
router.get('/verified', verifyAccessToken, paymentController.getVerified);
router.get('/unverified', verifyAccessToken, paymentController.getUnverified);
router.patch('/verify/:paymentId', verifyAccessToken, paymentController.verifyPayment);

module.exports = router;