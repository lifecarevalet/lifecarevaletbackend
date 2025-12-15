const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); // User model
const { protect, authorize } = require('../middleware/authMiddleware'); // Middleware

// =================================================================================
// 🛑 HELPER FUNCTION: Token Generation (Role is cleaned and included)
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

        // User, Password, aur Role Match check (case-insensitive)
        if (!user || !(await user.matchPassword(password)) || user.role.toLowerCase().trim() !== role.toLowerCase().trim()) { 
            return res.status(401).json({ message: 'Invalid Credentials (Username/Password/Role).' });
        }

        // Data Populate (Point aur Manager details)
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
// ------------------- ADMIN: MANAGER/DRIVER REGISTER FUNCTION -------------------
const registerUser = async (req, res) => {
    try {
        // Sirf woh fields extract karein jo non-ObjectId hain aur required hain
        const { username, password, role, fullName, contactNumber } = req.body;
        
        // ObjectId fields bhi body se nikaal rahe hain, lekin unhe create mein use nahi karenge
        const { pointId, managerId } = req.body; 

        const cleanedRole = role.toLowerCase().trim();
        if (!['manager', 'driver'].includes(cleanedRole)) {
            return res.status(400).json({ message: 'Invalid role for registration. Only Manager and Driver allowed.' });
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists.' });
        }
        
        // 🔥 CRITICAL FIX: pointId aur managerId ko yahaan se hata diya gaya hai.
        // Agar woh empty string aate hain, toh server crash nahi hoga aur woh default: null ho jayenge.
        const user = await User.create({
            username,
            password,
            role: cleanedRole, 
            fullName,
            contactNumber,
            // pointId aur managerId ko sirf tabhi shamil karein jab woh valid ObjectId hon,
            // Varna unhe yahaan se hata dein.
            ...(pointId && pointId !== '' && { pointId }),
            ...(managerId && managerId !== '' && { managerId }),
        });
        
        // 🛑 NOTE: Upar wala code (spread operator) bhi Mongoose Cast error de sakta hai.
        // Sabse safe tareeka neeche diya gaya hai:

        /* --- SABSE SAFE LOGIC --- */
        const createData = {
            username,
            password,
            role: cleanedRole, 
            fullName,
            contactNumber,
        };
        // Sirf tabhi shamil karein jab value valid lage (front-end ki galti se bachne ke liye)
        if (pointId && pointId.length === 24) createData.pointId = pointId; 
        if (managerId && managerId.length === 24) createData.managerId = managerId;
        
        const safeUser = await User.create(createData);
        /* --- SABSE SAFE LOGIC KHATAM --- */

        const userResponse = await User.findById(safeUser._id).select('-password');

        res.status(201).json({ 
            success: true, 
            user: userResponse, 
            message: `${role} '${fullName}' created successfully.` 
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: messages.join(', ') });
        }
        // Agar ab bhi 500 aara hai, toh iska matlab hai ki yahi error hai
        console.error('User registration error:', error);
        res.status(500).json({ message: 'Error registering user. Please check data fields.' });
    }
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

// ... (Other routes like update/delete should be here)

module.exports = router;
