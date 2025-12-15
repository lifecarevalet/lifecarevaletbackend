const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken'); 
const User = require('../models/User'); // Assuming User model is imported
const { protect, authorize } = require('../middleware/authMiddleware'); // Middleware import

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
            return res.status(401).json({ message: 'Invalid credentials or role mismatch.' });
        }

        const populatedUser = await User.findById(user._id)
            .select('-password') 
            .populate('pointId', 'name address') 
            .populate('managerId', 'fullName username'); 

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


// ------------------- PUBLIC ROUTES -------------------
router.post('/login', loginUser); 


// =================================================================================
// ------------------- ADMIN: REGISTER NEW MANAGER/DRIVER -------------------
// POST /api/users/admin/register  <--- MANAGER/DRIVER CREATE ROUTE
router.post('/admin/register', protect, authorize(['admin']), async (req, res) => {
    try {
        const { username, password, role, fullName, contactNumber, pointId, managerId } = req.body;
        
        // 1. Role validation 
        const cleanedRole = role.toLowerCase().trim();
        if (!['manager', 'driver'].includes(cleanedRole)) {
            return res.status(400).json({ message: 'Invalid role for registration. Only Manager and Driver allowed.' });
        }

        // 2. Check if user already exists
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists.' });
        }
        
        // 3. Create user
        const user = await User.create({
            username,
            password,
            role: cleanedRole, 
            fullName,
            contactNumber,
            // FIX: PointId aur ManagerId ko sirf tabhi include karein jab woh body mein hain
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
});
// =================================================================================


// =================================================================================
// ------------------- ADMIN: GET ALL USERS LIST (for dashboard) -------------------
// GET /api/users/admin/all 
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    try {
        const users = await User.find().select('_id username role fullName contactNumber pointId managerId'); 
        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('Fetching all users error:', error);
        res.status(500).json({ message: 'Error fetching all users.', details: error.message });
    }
});
// =================================================================================


// =================================================================================
// ------------------- OWNER/MANAGER: Filtered users ki list -------------------
// GET /api/users/admin/users 
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
// =================================================================================

module.exports = router;
