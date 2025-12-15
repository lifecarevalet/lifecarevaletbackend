const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// 🛑 HELPER FUNCTION: Token Generation
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined in the environment variables!");
    throw new Error("Server configuration error: Missing JWT secret.");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', 
  });
};

// 🛑 LOGIN LOGIC
const loginUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        const user = await User.findOne({ username });

        // Invalid Credentials check
        if (!user || !(await user.matchPassword(password))) { 
            return res.status(401).json({ message: 'Invalid Credentials (Username/Password).' });
        }

        // Role mismatch check
        if (user.role !== role) {
            return res.status(401).json({ message: `Role mismatch. Account is registered as ${user.role}.` });
        }

        // Success
        const populatedUser = await User.findById(user._id)
            .select('-password') 
            .populate('pointId', 'name address') 
            .populate('managerId', 'fullName username'); 

        // Final response
        res.json({
            user: populatedUser, 
            token: generateToken(user._id), 
        });
    } catch (error) {
        console.error("Critical Login Server Error:", error);
        res.status(500).json({ message: 'Internal Server Error during login process.' });
    }
};

// ------------------- PUBLIC ROUTES -------------------
router.post('/login', loginUser); 

// ------------------- ADMIN/MANAGEMENT ROUTES -------------------

// 1. Owner/Admin: Sabhi users ki list (Dashboard ke liye)
// GET /api/users/admin/all (Yeh Missing Route tha)
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('_id username role fullName contactNumber pointId managerId'); 
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Fetching all users error:', error);
        res.status(500).json({ message: 'Error fetching all users.', details: error.message });
    }
});


// 2. Owner/Manager: Filtered users ki list
// GET /api/users/admin/users 
router.get('/admin/users', protect, authorize(['admin', 'manager']), async (req, res) => { 
    try {
        const users = await User.find({ role: { $ne: 'owner' } })
            .select('-password')
            .populate('managerId', 'fullName username') 
            .populate('pointId', 'name address'); 

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users.' });
    }
});

// ... (Baaki sab userRoutes jaise update/delete yahan aayenge)

module.exports = router;
