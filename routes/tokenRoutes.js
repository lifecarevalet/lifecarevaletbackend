const express = require('express');
const router = express.Router(); 
const Token = require('../models/Token'); 
const User = require('../models/User'); // User model ko yahan import karna zaroori hai
const { protect, authorize } = require('../middleware/authMiddleware'); 

// =================================================================================
// ------------------- TOKEN/CAR IN FUNCTION (Token Creation) -------------------
const createToken = async (req, res) => {
    try {
        const { carNumber, customerName, carModel, pointId, driverId, managerId, customerContact } = req.body;
        
        // 1. Mandatory Fields Check 
        if (!carNumber || !pointId || !driverId) { 
            return res.status(400).json({ message: 'Car Number, Location, and Driver are mandatory fields for Car In.' });
        }
        
        // 2. 🔥 FIX: Driver ID Validation aur Role Check (New Logic)
        const driver = await User.findById(driverId);
        
        if (!driver) {
            return res.status(404).json({ message: 'Selected Driver not found.' });
        }
        
        // Agar select kiya gaya ID 'driver' role ka nahi hai, toh rok do
        if (driver.role.toLowerCase() !== 'driver') {
            return res.status(400).json({ message: `User '${driver.fullName}' is not a Driver. Cannot assign.` });
        }
        
        // 3. Data Construction
        const tokenData = {
            carNumber: carNumber.toUpperCase().trim(),
            pointId, 
            driverId, // Validated driver ID
            // Agar Manager token bana raha hai, toh woh khud 'assignedManager' hoga.
            // Agar Driver token bana raha hai, toh woh apne Manager ko assign kar dega.
            managerId: managerId || (req.user.role === 'manager' ? req.user.id : driver.managerId), 
            customerName: customerName || 'N/A', 
            customerContact: customerContact || '',
            carModel: carModel || '',
            inTime: new Date(),
            status: 'Parked', 
        };
        
        // 4. Token Create
        const newToken = await Token.create(tokenData);

        // 5. Response mein populated data bhejo
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
        // Validation aur Cast Error Handling
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

// 1. POST /api/tokens/in (Car In / Token Create)
// 🔥 FIX: authorize(['manager', 'driver']) - Manager aur Driver dono ko permission
router.post('/in', protect, authorize(['manager', 'driver']), createToken);


// 2. GET /api/tokens/admin/all (Token List)
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


// ... (Optional: Out route aur doosre routes yahan aa sakte hain)


module.exports = router;
