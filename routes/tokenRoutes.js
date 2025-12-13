const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); // Zaroori
const User = require('../models/User'); // Zaroori
const { protect, authorize } = require('../middleware/authMiddleware'); // Zaroori

// 🛑🛑 TOKEN BANANE KA FUNCTION AB YAHIN DEFINE KIYA GAYA HAI 🛑🛑
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined in the environment variables!");
    throw new Error("Server configuration error: Missing JWT secret.");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d', 
  });
};
// 🛑🛑 TOKEN FUNCTION KHATAM 🛑🛑


// 🛑🛑 LOGIN LOGIC KO SIDHE YAHAN DEFINE KIYA GAYA HAI (BINA asyncHandler KE) 🛑🛑
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

        // Success, ab user data populate karo
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
        // Yahan server crash hone se bach jayega aur sirf 500 error dega
        console.error("Critical Login Server Error:", error);
        res.status(500).json({ message: 'Internal Server Error during login process.' });
    }
};
// 🛑🛑 LOGIN LOGIC YAHAN KHATAM 🛑🛑


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

// ... (Baaki sab userRoutes yahan honge)

module.exports = router;
