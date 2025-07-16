const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
    res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production'
    });

    res.clearCookie('accessToken', {
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production'
    });



    res.status(200).json({ message: 'Logout successful' });
});

module.exports = router;
