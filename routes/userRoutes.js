const express = require('express');
const router = express.Router(); 
const jwt = require('jsonwebtoken'); 
// 🔥 ZAROORI CHECK: Confirm karein ki yeh path aapke User model tak sahi hai
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
// 🛑 PUBLIC: USER LOGIN LOGIC (FIXED: Safe Population)
const loginUser = async (req, res) => {
    try {
        const { username, password, role } = req.body; 
        const user = await User.findOne({ username });

        if (!user || !(await user.matchPassword(password)) || user.role.toLowerCase().trim() !== role.toLowerCase().trim()) { 
            return res.status(401).json({ message: 'Invalid Credentials (Username/Password/Role).' });
        }

        let query = User.findById(user._id).select('-password');
        
        if (user.pointId) {
            query = query.populate('pointId');
        }
        if (user.managerId) {
            query = query.populate('managerId');
        }

        const populatedUser = await query.exec(); 

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


// ------------------- ADMIN: MANAGER/DRIVER REGISTER FUNCTION -------------------
const registerUser = async (req, res) => {
    try {
        const { username, password, fullName, pointId } = req.body;
        const contactNumber = req.body.contactNumber; 
        const managerId = req.body.managerId; 
        const role = req.body.role || 'manager'; 

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and Password are required fields.' });
        }
        
        const cleanedRole = role.toLowerCase().trim();
        if (!['manager', 'driver'].includes(cleanedRole)) {
            return res.status(400).json({ message: 'Invalid role for registration. Only Manager and Driver allowed.' });
        }

        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User with this username already exists.' });
        }
        
        const createData = {
            username,
            password,
            role: cleanedRole, 
            fullName: fullName || '', 
            contactNumber: contactNumber || '', 
        };
        
        if (pointId && pointId.length === 24) createData.pointId = pointId; 
        if (managerId && managerId.length === 24) createData.managerId = managerId;
        
        const user = await User.create(createData);

        const userResponse = await User.findById(user._id).select('-password');

        res.status(201).json({ 
            success: true, 
            user: userResponse, 
            message: `${role} created successfully.` 
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


// ------------------- PUBLIC ROUTES -------------------
router.post('/login', loginUser); 

// ------------------- ADMIN/MANAGEMENT ROUTES -------------------

// 1. POST /api/users/admin/:path (Manager Create FIX - handles multiple paths)
router.post('/admin/:path', protect, authorize(['admin']), (req, res, next) => {
    const validPaths = ['create', 'register', 'create-user']; 
    
    if (validPaths.includes(req.params.path.toLowerCase())) {
        return next(); 
    } else {
        return res.status(404).json({ 
            message: `Error: Invalid URL Path for User Creation. Received path: ${req.params.path}`,
        });
    }
}, registerUser); 


// 2. 🔥 FIX: GET /api/users/admin/all (Comprehensive All Users List)
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find()
            .select('_id username role fullName contactNumber pointId managerId')
            .populate('pointId', 'name address') 
            .populate('managerId', 'fullName username'); 
            
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Fetching all users error:', error);
        res.status(500).json({ message: 'Error fetching all users.', details: error.message });
    }
});

// 3. 🔥 FIX: GET /api/users/admin/users (Filtered List - for Admin Dashboard)
router.get('/admin/users', protect, authorize(['admin', 'manager']), async (req, res) => { 
    try {
        // Exclude 'owner' role if it exists, list managers and drivers
        const users = await User.find({ role: { $ne: 'owner' } }) 
            .select('-password')
            .populate('managerId', 'fullName username') 
            .populate('pointId', 'name address'); 

        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users.' });
    }
});


// 4. GET /api/users/drivers (Driver List Fix for Token Form)
router.get('/drivers', protect, authorize(['admin', 'manager']), async (req, res) => {
    try {
        let query = { role: 'driver' }; 

        if (req.user.role === 'manager' && req.user.pointId) {
            query.pointId = req.user.pointId;
        }

        const drivers = await User.find(query)
            .select('_id fullName username pointId managerId')
            .populate('pointId', 'name');

        res.status(200).json(drivers);
    } catch (error) {
        console.error('Fetching drivers error:', error);
        res.status(500).json({ message: 'Error fetching drivers list.' });
    }
});

// ... (Other routes like GET /:id, PUT /:id, DELETE /:id here)

module.exports = router;
