// routes/userRoutes.js (FINAL UPDATED CODE WITH FIXES)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// ------------------- LOGIN -------------------
// ... (No change in this section)

// ------------------- OWNER/MANAGER: CREATE USER -------------------
// ... (No change in this section - logic is already correct for auto-assignment)

// ------------------- OWNER: UPDATE/DELETE (CUD functions here...) 
// ... (No change in UPDATE/DELETE/RESET PASSWORD sections)

// 🔥 CRITICAL FIX: User List Endpoint (Issue 1 & 2)
router.get('/admin/users', protect, authorize(['owner', 'manager']), async (req, res) => { // <--- FIX 5: Allowed 'manager' role
    try {
        // Owner ke alawa sabhi users ko fetch kiya
        const users = await User.find({ role: { $ne: 'owner' } })
            .select('-password')
            // 🔥 FIX 6: Populate Manager info with username (for client-side dropdown)
            .populate('managerId', 'fullName username') 
            // 🔥 FIX 7: Populate Point info with name and address (for manager/driver assignment)
            .populate('pointId', 'name address'); 
            
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users.' });
    }
});

module.exports = router;
