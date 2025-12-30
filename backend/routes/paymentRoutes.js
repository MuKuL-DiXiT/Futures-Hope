const router = require('express').Router();
const { verifyAccessToken } = require('../controllers/jwtController');
const paymentController = require('../controllers/paymentController');

router.post('/', verifyAccessToken, paymentController.createPayment);
router.post('/create-order', verifyAccessToken, paymentController.createOrder);
router.post('/verify-payment', verifyAccessToken, paymentController.verifyPayment);

module.exports = router;