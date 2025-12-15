const express = require('express');
const router = express.Router();
const Token = require('../models/Token'); // Assuming you have a Token/Parking model
const { protect, authorize } = require('../middleware/authMiddleware');

// =================================================================================
// ------------------- ADMIN/MANAGER: GET ALL TOKENS (for dashboard) -------------------
// GET /api/tokens/admin/all ya /api/tokens/data (jo bhi aapka frontend call karta hai)
router.get('/admin/all', protect, authorize(['admin', 'manager']), async (req, res) => {
    try {
        let query = {};
        
        // Agar user Manager hai, toh sirf uske point ke tokens dekhenge
        if (req.user.role === 'manager' && req.user.pointId) {
            query.pointId = req.user.pointId;
        }

        const tokens = await Token.find(query)
            .populate('pointId', 'name address') // Location ka naam laate hain
            .populate('assignedManager', 'fullName username') // Manager ka naam laate hain
            .sort({ tokenNumber: 1 });

        res.status(200).json({ success: true, tokens });
    } catch (error) {
        console.error('Fetching tokens error:', error);
        res.status(500).json({ message: 'Error fetching tokens data.', details: error.message });
    }
});
// =================================================================================

// ... (Baaki entry/exit routes yahan honge)

module.exports = router;
