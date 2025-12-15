const express = require('express');
const router = express.Router(); 
const Token = require('../models/Token'); 
const { protect, authorize } = require('../middleware/authMiddleware'); 

// =================================================================================
// ------------------- TOKEN/CAR IN FUNCTION (Token Creation) -------------------
const createToken = async (req, res) => {
    try {
        const { carNumber, customerName, carModel, pointId, driverId, managerId, customerContact } = req.body;
        
        // Mandatory Fields Check 
        if (!carNumber || !pointId || !driverId) { 
            return res.status(400).json({ message: 'Car Number, Location, and Driver are mandatory fields for Car In.' });
        }
        
        // Data Construction (Default values aur cleanup)
        const tokenData = {
            carNumber: carNumber.toUpperCase().trim(),
            pointId, 
            driverId,
            managerId: managerId || req.user.id, // Agar managerId nahi aayi, toh logged-in user ko manager maan lo
            customerName: customerName || 'N/A', 
            customerContact: customerContact || '',
            carModel: carModel || '',
            inTime: new Date(),
            status: 'Parked', 
        };
        
        // Token Create
        const newToken = await Token.create(tokenData);

        // Response mein populated data bhejo
        const populatedToken = await Token.findById(newToken._id)
            .populate('pointId', 'name')
            .populate('driverId', 'fullName username')
            .populate('managerId', 'fullName username')
            .select('-__v'); 

        res.status(201).json({ 
            success: true, 
            token: populatedToken, 
            message: `✅ Token generated for ${carNumber}.` 
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
             const messages = Object.values(error.errors).map(val => val.message);
             return res.status(400).json({ message: `Validation Error: ${messages.join(', ')}` });
        }
        if (error.name === 'CastError') {
             return res.status(400).json({ message: 'Invalid ID provided for Point, Driver, or Manager.' });
        }
        
        console.error('Token creation critical error:', error);
        res.status(500).json({ message: 'Internal Server Error: Could not create token.', details: error.message });
    }
};
// =================================================================================


// ------------------- TOKEN ROUTES -------------------

// 1. POST /api/tokens/in (Car In / Token Create) - Yehi route aapka frontend call kar raha hai
router.post('/in', protect, authorize(['manager', 'driver']), createToken);


// 2. GET /api/tokens/admin/all (Token List - Jo aapne bheja tha)
router.get('/admin/all', protect, authorize(['admin', 'manager']), async (req, res) => {
    try {
        let query = {};

        // Agar user Manager hai, toh sirf uske point ke tokens dekhenge
        if (req.user.role === 'manager' && req.user.pointId) {
            query.pointId = req.user.pointId;
        }

        const tokens = await Token.find(query)
            .populate('pointId', 'name address') 
            .populate('assignedManager', 'fullName username') 
            .sort({ tokenNumber: 1 });

        res.status(200).json({ success: true, tokens });
    } catch (error) {
        console.error('Fetching tokens error:', error);
        res.status(500).json({ message: 'Error fetching tokens data.', details: error.message });
    }
});


// ... (Optional: You might need a /out route later)


module.exports = router;
