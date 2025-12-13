const express = require('express');
const router = express.Router();
// 🔥 FIX: Zaroori imports: login function aur middleware
const { loginUser } = require('../controllers/userController'); 
const { protect, authorize } = require('../middleware/authMiddleware');
// NOTE: Purane imports jaise jwt, bcrypt, User ko yahan ki zarurat nahi hai

// ------------------- LOGIN ROUTE (CRITICAL FIX) -------------------
// POST /api/users/login 
router.post('/login', loginUser); // <-- Yahi line missing thi!
// ------------------------------------------------------------------

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

// ... (Baaki sab userRoutes jaise POST /admin/create, PUT /admin/update-user, etc. yahan honge)

module.exports = router;
