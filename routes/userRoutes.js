const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware');

// 🛑 HELPER FUNCTION: Token Generation
const generateToken = (id, role) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Server configuration error: Missing JWT secret.");
  }
  return jwt.sign({ id, role: role.toLowerCase().trim() }, process.env.JWT_SECRET, { 
    expiresIn: '30d', 
  });
};


// =================================================================================
// 🛑 PUBLIC: USER LOGIN LOGIC (ROBUST VERSION)
const loginUser = async (req, res) => {
    try {
        const { username, password, role } = req.body; 

        // 1. User find
        const user = await User.findOne({ username });

        // 2. Initial Checks
        if (!user || !(await user.matchPassword(password)) || user.role.toLowerCase().trim() !== role.toLowerCase().trim()) { 
            // 401 response aane se login failure ka message fronted pe dikhega
            return res.status(401).json({ message: 'Invalid Credentials (Username/Password/Role).' });
        }

        // 3. Data Populate
        const populatedUser = await User.findById(user._id)
            .select('-password') 
            // ✅ Fix: Populate call ko chota kar rahe hain taaki galti na ho
            .populate('pointId') // sirf ID ki jagah poora Point object le aayenge
            .populate('managerId'); // sirf ID ki jagah poora Manager object le aayenge

        // 4. Final response
        res.json({
            user: populatedUser, 
            token: generateToken(user._id, user.role), 
        });

    } catch (error) {
        // Agar populate fail hua ya koi aur error, toh 500 error jayega
        console.error("Critical Login Server Error:", error);
        // Is 500 response se frontend ko pata chalega ki server se response aaya hai (fail)
        res.status(500).json({ message: 'Internal Server Error during login process. Please check server logs.' });
    }
};
// =================================================================================


// ------------------- PUBLIC ROUTES -------------------
router.post('/login', loginUser); 
// ... (Rest of the routes as before: /admin/register, /admin/create, etc.)

module.exports = router;
