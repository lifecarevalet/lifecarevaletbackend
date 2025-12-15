const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware');

// 🛑 HELPER FUNCTION: Token Generation
const generateToken = (id, role) => { // <-- role yahan lena zaroori hai
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not defined in the environment variables!");
    throw new Error("Server configuration error: Missing JWT secret.");
  }
  return jwt.sign({ id, role: role.toLowerCase().trim() }, process.env.JWT_SECRET, { // <-- role ko lowercase karke token mein daalo
    expiresIn: '30d', 
  });
};

const loginUser = async (req, res) => {
    try {
        const { username, password, role } = req.body; // frontend se aaya role

        const user = await User.findOne({ username });

        // Database user ka role (user.role) frontend se aaye role (role) se match hona chahiye
        if (!user || !(await user.matchPassword(password)) || user.role.toLowerCase().trim() !== role.toLowerCase().trim()) { 
            return res.status(401).json({ message: 'Invalid credentials or role mismatch.' });
        }

        const populatedUser = await User.findById(user._id)
            .select('-password') 
            .populate('pointId', 'name address') 
            .populate('managerId', 'fullName username'); 

        // Token generate karte waqt database se sahi role bhejte hain
        res.json({
            user: populatedUser, 
            token: generateToken(user._id, user.role), // <-- user.role bhej rahe hain
        });
    } catch (error) {
        console.error("Critical Login Server Error:", error);
        res.status(500).json({ message: 'Internal Server Error during login process.' });
    }
};

router.post('/login', loginUser); 
// ... (Baaki saare userRoutes yahaan honge)

module.exports = router;
