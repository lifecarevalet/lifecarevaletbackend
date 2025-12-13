const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // ✅ FIX: JWT import kiya

// --- ZAROORI IMPORTS: Jo Login Logic Ke Liye Chahiye ---
const asyncHandler = require('express-async-handler');
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware'); 

// ✅ FIX: generateToken utility ko remove kiya aur logic yahan daala
// const generateToken = require('../utils/generateToken'); // <-- Removed!
// ----------------------------------------------------

// --- JWT TOKEN CREATION FUNCTION ---
const createToken = (id) => {
    // Note: JWT_SECRET .env file se aayega
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d', 
    });
};
// ------------------------------------


// 🛑🛑 LOGIN LOGIC 🛑🛑
const loginUser = asyncHandler(async (req, res) => {
    const { username, password, role } = req.body;

    const user = await User.findOne({ username });

    // 1. User/Password check (matchPassword correct hai)
    if (!user || !(await user.matchPassword(password))) { 
        res.status(401).json({ message: 'Invalid Credentials (Username/Password).' });
        return;
    }

    // 2. Role check
    if (user.role !== role) {
         res.status(401).json({ message: `Role mismatch. Account is registered as ${user.role}.` });
        return;
    }

    // 3. Success, ab user data populate karo
    const populatedUser = await User.findById(user._id)
        .select('-password') 
        .populate('pointId', 'name address') 
        .populate('managerId', 'fullName username'); 

    // 4. Final response
    res.json({
        user: populatedUser, 
        // ✅ FIX: createToken ko call kiya
        token: createToken(user._id), 
    });
});


// ------------------- LOGIN ROUTE -------------------
router.post('/login', loginUser); 
// ---------------------------------------------------

// ------------------- ADMIN/MANAGEMENT ROUTES -------------------

// Owner/Manager: Sabhi users ki list
router.get('/admin/users', protect, authorize(['owner', 'manager']), async (req, res) => { 
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

module.exports = router;
