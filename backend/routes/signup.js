const express = require('express');
const router = express.Router();
const upload = require('../middlewares/multer_middleware');
const authController = require('../controllers/authController');

router.post('/', upload.single('profilePic'), authController.signup);

module.exports = router;
