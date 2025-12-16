const express = require('express');
const router = express.Router(); 
// 🔥 ZAROORI CHECK: Confirm karein ki yeh path aapke Model files tak sahi hai
const Token = require('../models/Token'); 
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware'); 

// =================================================================================
// ------------------- TOKEN/CAR IN FUNCTION (Token Creation) -------------------
const createToken = async (req, res) => {
    try {
        const { carNumber, customerName, carModel, pointId, driverId, managerId, customerContact } = req.body;
        
        // 1. 🔥 Manager/Driver ki Location Auto-Assign
        let finalPointId = pointId; 
        
        // Agar logged-in user Manager/Driver hai, toh uska pointId use karo
        if ((req.user.role === 'manager' || req.user.role === 'driver') && req.user.pointId) {
            finalPointId = req.user.pointId;
        }

        // 2. Mandatory Fields Check
        if (!carNumber || !finalPointId || !driverId) { 
            // Ab yeh error sirf tab aayega jab frontend se driverId na mile (jo ki HTML fix se theek ho gaya hai)
            return res.status(400).json({ message: 'Car Number, Location, and Driver are mandatory fields for Car In.' });
        }
        
        // 3. Driver ID Validation aur Role Check
        const driver = await User.findById(driverId);
        
        if (!driver) {
            return res.status(404).json({ message: 'Selected Driver not found.' });
        }
        
        if (driver.role.toLowerCase() !== 'driver') {
            return res.status(400).json({ message: `User '${driver.fullName}' is not a Driver. Cannot assign.` });
        }
        
        // 4. Data Construction
        const tokenData = {
            carNumber: carNumber.toUpperCase().trim(),
            pointId: finalPointId, // Auto-assigned Point ID
            driverId, 
            // Manager ID: Agar logged-in user Manager hai toh khud ka ID, varna driver ka manager ID
            managerId: req.user.role === 'manager' ? req.user.id : driver.managerId, 
            customerName: customerName || 'N/A', 
            customerContact: customerContact || '',
            carModel: carModel || '',
            inTime: new Date(),
            status: 'Parked', 
        };
        
        // 5. Token Create
        const newToken = await Token.create(tokenData);

        // 6. Response
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
        if (error.name === 'ValidationError' || error.name === 'CastError') {
             console.error('Token creation client error:', error);
             return res.status(400).json({ message: 'Invalid data provided.' });
        }
        
        console.error('Token creation critical error:', error);
        res.status(500).json({ message: 'Internal Server Error: Could not create token.', details: error.message });
    }
};
// =================================================================================


// ------------------- TOKEN ROUTES -------------------

// 1. POST /api/tokens/in (Car In / Token Create) - Manager aur Driver dono ko permission
router.post('/in', protect, authorize(['manager', 'driver']), createToken);


// 2. GET /api/tokens/admin/all (Token List)
router.get('/admin/all', protect, authorize(['admin', 'manager', 'driver']), async (req, res) => {
    try {
        let query = {};

        // Manager/Driver scope: Sirf apne point ke tokens dikhenge
        if ((req.user.role === 'manager' || req.user.role === 'driver') && req.user.pointId) {
            query.pointId = req.user.pointId;
        }
        
        // Driver specific: Driver sirf woh tokens dekhe jahan woh assigned hai
        if (req.user.role === 'driver') {
            query.driverId = req.user.id;
        }
        
        // Note: Agar Manager hai, toh woh saare tokens dekhega jismein uska pointId match karta hai.

        const tokens = await Token.find(query)
            .populate('pointId', 'name address') 
            .populate('driverId', 'fullName username') 
            .populate('managerId', 'fullName username') 
            .sort({ tokenNumber: 1 });

        res.status(200).json({ success: true, tokens });
    } catch (error) {
        console.error('Fetching tokens error:', error);
        res.status(500).json({ message: 'Error fetching tokens data.', details: error.message });
    }
});

// 3. POST /api/tokens/out/:id (Car OUT)
router.post('/out/:id', protect, authorize(['manager', 'driver']), async (req, res) => {
    try {
        const token = await Token.findById(req.params.id);

        if (!token) {
            return res.status(404).json({ message: 'Token not found.' });
        }

        // Status check
        if (token.status === 'Completed') {
            return res.status(400).json({ message: 'Car is already marked as OUT.' });
        }

        token.outTime = new Date();
        token.status = 'Completed'; 
        await token.save();

        res.status(200).json({ message: 'Car marked OUT successfully.' });

    } catch (error) {
        console.error('Car OUT error:', error);
        res.status(500).json({ message: 'Internal Server Error during Car OUT process.' });
    }
});


module.exports = router;
