const express = require('express');
const router = express.Router();

// --- ZAROORI IMPORTS: Jo Login Logic Ke Liye Chahiye ---
const asyncHandler = require('express-async-handler'); // Error handling ke liye
const User = require('../models/User'); // User model se baat karne ke liye
const generateToken = require('../utils/generateToken'); // Token banane ke liye
const { protect, authorize } = require('../middleware/authMiddleware'); // Middleware ke liye
// ----------------------------------------------------

// 🛑🛑 LOGIN LOGIC KO SIDHE YAHAN DEFINE KIYA GAYA HAI 🛑🛑
const loginUser = asyncHandler(async (req, res) => {
    const { username, password, role } = req.body;

    // 1. User ko Username se dhoondo
    const user = await User.findOne({ username });

    // Agar user nahi mila, ya password match nahi hua
    if (!user || !(await user.matchPassword(password))) { 
        res.status(401).json({ message: 'Invalid Credentials (Username/Password).' });
        return;
    }

    // Agar role match nahi hua
    if (user.role !== role) {
         res.status(401).json({ message: `Role mismatch. Account is registered as ${user.role}.` });
        return;
    }

    // 2. Success, ab user data populate karo
    const populatedUser = await User.findById(user._id)
        .select('-password') 
        .populate('pointId', 'name address') 
        .populate('managerId', 'fullName username'); 
        
    // 3. Final response
    res.json({
        user: populatedUser, 
        token: generateToken(user._id), 
    });
});
// 🛑🛑 LOGIN LOGIC YAHAN KHATAM 🛑🛑


// ------------------- LOGIN ROUTE -------------------
// POST /api/users/login 
router.post('/login', loginUser); // <-- Ab loginUser function seedhe yahan define hai
// ---------------------------------------------------

// ------------------- ADMIN/MANAGEMENT ROUTES -------------------

// Owner/Manager: Sabhi users ki list
router.get('/admin/users', protect, authorize(['owner', 'manager']), async (req, res) => { 
    try {
        // NOTE: Yahan User model ko use karne ke liye, aapko top par 'const User = require('../models/User');' import karna zaroori hai.
        const users = await User.find({ role: { $ne: 'owner' } })
            .select('-password')
            .populate('managerId', 'fullName username') 
            .populate('pointId', 'name address'); 

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users.' });
    }
});

// ... (Baaki sab userRoutes jaise POST /admin/create, PUT /admin/update-user, etc. yahan honge)

module.exports = router;
