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
    // ... (Login logic is correct)
};

// ------------------- PUBLIC ROUTES -------------------
router.post('/login', loginUser); 


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
        
        const user = await User.create({
            username,
            password,
            role: cleanedRole, 
            fullName,
            contactNumber,
            // FIX: PointId aur ManagerId ko undefined bhejte hain agar woh body mein nahi hain
            pointId: pointId || undefined, 
            managerId: managerId || undefined, 
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
        console.error('User registration error:', error);
        res.status(500).json({ message: 'Error registering user.', details: error.message });
    }
};
// =================================================================================


// ------------------- ADMIN/MANAGEMENT ROUTES -------------------

// 1. POST /api/users/admin/register (Original route)
router.post('/admin/register', protect, authorize(['admin']), registerUser); 

// 2. POST /api/users/admin/create (FIX for URL Mismatch)
router.post('/admin/create', protect, authorize(['admin']), registerUser); // <-- YEH NAYA ROUTE HAI

// ... (Baaki sab userRoutes yahan honge jaise /admin/all, /admin/users)

// GET /api/users/admin/all 
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    // ... (Code as before)
});

// GET /api/users/admin/users 
router.get('/admin/users', protect, authorize(['admin', 'manager']), async (req, res) => { 
    // ... (Code as before)
});


module.exports = router;
