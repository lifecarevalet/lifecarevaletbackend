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
        res.status(500).json({ message: 'Internal Server Error during login process.' });
    }
};
// =================================================================================


// =================================================================================
// ------------------- ADMIN: MANAGER/DRIVER REGISTER FUNCTION -------------------
const registerUser = async (req, res) => {
    try {
        // Form ke anusaar fields nikalna 
        const { username, password, fullName, pointId } = req.body;
        
        // Agar form se nahi aaye, toh inhein req.body se nikalo, varna default value do
        const contactNumber = req.body.contactNumber; 
        const managerId = req.body.managerId; 
        const role = req.body.role || 'manager'; 

        // 1. Mandatory Fields Check
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and Password are required fields.' });
        }
        
        // 2. Role Validation and Cleaning
        const cleanedRole = role.toLowerCase().trim();
        if (!['manager', 'driver'].includes(cleanedRole)) {
            return res.status(400).json({ message: 'Invalid role for registration. Only Manager and Driver allowed.' });
        }

        // 3. Duplicate User Check
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User with this username already exists.' });
        }
        
        // 4. Safe Data Construction (Robust Validation)
        const createData = {
            username,
            password,
            role: cleanedRole, 
            fullName: fullName || '', 
            contactNumber: contactNumber || '', 
        };
        
        // PointId aur ManagerId ko sirf tabhi shamil karein jab woh valid ObjectId ki length ke hon (24 characters)
        if (pointId && pointId.length === 24) createData.pointId = pointId; 
        if (managerId && managerId.length === 24) createData.managerId = managerId;
        
        // 5. User Create
        const user = await User.create(createData);

        const userResponse = await User.findById(user._id).select('-password');

        res.status(201).json({ 
            success: true, 
            user: userResponse, 
            message: `${role} '${fullName || username}' created successfully.` 
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: messages.join(', ') });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Duplicate key error: User with this username already exists.' });
        }
        
        console.error('User registration error:', error);
        res.status(500).json({ message: 'Internal Server Error: Could not register user.' });
    }
};
// =================================================================================


// ------------------- PUBLIC ROUTES -------------------
router.post('/login', loginUser); 

// ------------------- ADMIN/MANAGEMENT ROUTES (TESTING URL PATH) -------------------

// 🔥 ULTIMATE TEST ROUTE 🔥
// Yeh dekhega ki kya URL /admin/create/ jaisa kuch toh nahi hai
router.post('/admin/:path', protect, authorize(['admin']), (req, res, next) => {
    // URL path ko check karo (jaise 'create' ya 'register')
    const validPaths = ['create', 'register'];
    
    if (validPaths.includes(req.params.path.toLowerCase())) {
        console.log(`✅ TEST SUCCESS: URL path is correct: /admin/${req.params.path}`);
        // Agar sahi hai, toh asali registerUser function par aage badho
        return next();
    } else {
        // Agar URL galat hai, toh yeh message aayega, "Could not connect" nahi.
        return res.status(404).json({ 
            message: `Error: Invalid URL Path for User Creation. Received path: ${req.params.path}`,
            detail: 'Kripya frontend code mein API URL check karein.'
        });
    }
}, registerUser); 


// 🛑 PURANE ROUTES KO COMMENT KIYA GAYA HAI TAAME TEST ROUTE CHALE
/*
router.post('/admin/register', protect, authorize(['admin']), registerUser); 
router.post('/admin/create', protect, authorize(['admin']), registerUser); 
router.post('/register', protect, authorize(['admin']), registerUser); 
*/

// 4. GET /api/users/admin/all (for dashboard)
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('_id username role fullName contactNumber pointId managerId'); 
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Fetching all users error:', error);
        res.status(500).json({ message: 'Error fetching all users.', details: error.message });
    }
});

// 5. GET /api/users/admin/users (Filtered list)
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
