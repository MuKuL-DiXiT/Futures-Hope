const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
    console.log('Logout request received');
    res.clearCookie('refreshToken', {
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
        path:'/'
    });

    res.clearCookie('accessToken', {
        httpOnly: true,
        sameSite: 'Lax',
        secure: process.env.NODE_ENV === 'production',
        path:'/'
    });


    if (req.session) {
        if (typeof req.logout === 'function') {
            try {
                req.logout(() => {});
            } catch (e) {
                console.error('Error during req.logout():', e);
            }
        }

        req.session.destroy((err) => {
            // Clear common session cookie names (default is 'connect.sid')
            res.clearCookie('connect.sid');
            res.clearCookie('sid');

            if (err) {
                console.error('Error destroying session during logout:', err);
                return res.status(500).json({ message: 'Failed to logout' });
            }

            return res.status(200).json({ message: 'Logout successful' });
        });
    } else {
        // No server session — just respond OK
        return res.status(200).json({ message: 'Logout successful' });
    }
});

module.exports = router;
