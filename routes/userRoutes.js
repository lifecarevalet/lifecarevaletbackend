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
// ------------------- ADMIN: MANAGER/DRIVER REGISTER FUNCTION -------------------
const registerUser = async (req, res) => {
    try {
        const { username, password, role, fullName, contactNumber, pointId, managerId } = req.body;
        
        const cleanedRole = role.toLowerCase().trim();
        if (!['manager', 'driver'].includes(cleanedRole)) {
            return res.status(400).json({ message: 'Invalid role for registration. Only Manager and Driver allowed.' });
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists.' });
        }
        
        // 🔥 CRITICAL FIX: Empty strings ko null/undefined mein convert karna
        const finalPointId = (pointId === '' || pointId === null) ? undefined : pointId;
        const finalManagerId = (managerId === '' || managerId === null) ? undefined : managerId;
        
        const user = await User.create({
            username,
            password,
            role: cleanedRole, 
            fullName,
            contactNumber,
            pointId: finalPointId, // Fixed value
            managerId: finalManagerId, // Fixed value
        });

        const userResponse = await User.findById(user._id).select('-password');

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
        // Agar Cast Error (100% sambhavna) hai, toh yeh pakad lega aur server crash nahi hoga
        console.error('User registration error:', error);
        res.status(500).json({ message: 'Error registering user.', details: error.message });
    }
};
// =================================================================================


// ------------------- ROUTES (Final Set) -------------------
router.post('/login', loginUser); 

// ADMIN: Manager/Driver Creation Routes (Duplicate to handle frontend URL mismatch)
router.post('/admin/register', protect, authorize(['admin']), registerUser); 
router.post('/admin/create', protect, authorize(['admin']), registerUser); // <-- FIX for frontend URL

// ADMIN: GET ALL USERS (for dashboard)
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('_id username role fullName contactNumber pointId managerId'); 
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Fetching all users error:', error);
        res.status(500).json({ message: 'Error fetching all users.', details: error.message });
    }
});

// OWNER/MANAGER: Filtered users ki list
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
