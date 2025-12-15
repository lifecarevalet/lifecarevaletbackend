const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware');

// =================================================================================
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


// =================================================================================
// 🛑 PUBLIC: USER LOGIN LOGIC 
const loginUser = async (req, res) => {
    try {
        const { username, password, role } = req.body; 
        const user = await User.findOne({ username });

        if (!user || !(await user.matchPassword(password)) || user.role.toLowerCase().trim() !== role.toLowerCase().trim()) { 
            return res.status(401).json({ message: 'Invalid Credentials (Username/Password/Role).' });
        }

        const populatedUser = await User.findById(user._id)
            .select('-password') 
            .populate('pointId') 
            .populate('managerId'); 

        res.json({
            user: populatedUser, 
            token: generateToken(user._id, user.role), 
        });
    } catch (error) {
        console.error("Critical Login Server Error:", error);
        res.status(500).json({ message: 'Internal Server Error during login process. Please check server logs.' });
    }
};
// =================================================================================


// =================================================================================
// ------------------- ADMIN: MANAGER/DRIVER REGISTER FUNCTION (TESTING) -------------------
const registerUser = async (req, res) => {
    // 🔥 TESTING CODE: Hum yahan turant success bhej rahe hain
    // Agar frontend ko yeh message milta hai, toh iska matlab hai ki
    // URL Sahi Hai aur problem is function ke andar ke code mein thi.
    
    // Agar "Could not connect" error aaye, toh iska matlab hai ki
    // frontend galat URL par bhej raha hai (404) ya server so raha hai (Timeout).
    return res.status(200).json({ 
        success: true,
        test_message: 'TESTING: Route Sahi Hua. Ab hum asali code check karenge.', 
        data: req.body // yeh dikhayega ki frontend se kya data aaya
    });
    
    /*
    // ASALI CODE (Jo humne pehle dala tha, ab comment kar diya gaya hai)
    try {
        // ... Original Manager Registration code yahan aayega ...
    } catch (error) {
        // ...
    }
    */
};
// =================================================================================


// ------------------- PUBLIC ROUTES -------------------
router.post('/login', loginUser); 

// ------------------- ADMIN/MANAGEMENT ROUTES -------------------

// 1. ADMIN: Manager/Driver Creation Routes (Duplicate to handle frontend URL mismatch)
router.post('/admin/register', protect, authorize(['admin']), registerUser); 
router.post('/admin/create', protect, authorize(['admin']), registerUser); 

// 2. ADMIN: GET ALL USERS (for dashboard)
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('_id username role fullName contactNumber pointId managerId'); 
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Fetching all users error:', error);
        res.status(500).json({ message: 'Error fetching all users.', details: error.message });
    }
});

// 3. OWNER/MANAGER: Filtered users ki list
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

module.exports = router;
