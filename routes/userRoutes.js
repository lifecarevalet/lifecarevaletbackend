const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken'); // Assuming JWT is used for token generation
const { protect, authorize } = require('../middleware/authMiddleware');

// FIX: Agar aapne jwt install nahi kiya hai toh: npm install jsonwebtoken

// =================================================================================
// --- HELPER FUNCTION: Token Generation (Agar aapka token kahi aur generate nahi ho raha) ---
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '1d', // Token valid for 1 day
    });
};
// =================================================================================


// =================================================================================
// ------------------- PUBLIC: USER LOGIN -------------------
// POST /api/users/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Please provide username and password.' });
        }

        const user = await User.findOne({ username });

        // 1. Check if user exists
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        // 2. Check password
        // FIX: matchPassword method User.js model mein define hona chahiye
        if (await user.matchPassword(password)) {
            // Success: Token generation
            const token = generateToken(user._id, user.role);

            // Response mein zaroori details bhejte hain
            res.json({
                _id: user._id,
                username: user.username,
                role: user.role,
                fullName: user.fullName,
                contactNumber: user.contactNumber,
                pointId: user.pointId,
                managerId: user.managerId,
                token: token,
                message: 'Login successful.'
            });
        } else {
            // Password match nahi hua
            res.status(401).json({ message: 'Invalid credentials.' });
        }
    } catch (error) {
        // Log the error to the console
        console.error('Login process error:', error); 
        // FIX: Agar error database se hai, toh 500 bhejte hain
        res.status(500).json({ message: 'Server error during login process.', details: error.message });
    }
});
// =================================================================================


// =================================================================================
// ------------------- PROTECTED: GET CURRENT USER DETAILS -------------------
// GET /api/users/me
router.get('/me', protect, async (req, res) => {
    try {
        // req.user authMiddleware se aata hai (jismein id aur role hota hai)
        const user = await User.findById(req.user.id).select('-password'); // Password nahi bhejte
        
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (error) {
        console.error('Fetch user details error:', error);
        res.status(500).json({ message: 'Error fetching user details.' });
    }
});
// =================================================================================

// ... (Baaki routes jaise /admin/list, /admin/update, etc. yahan aayenge)

module.exports = router;
