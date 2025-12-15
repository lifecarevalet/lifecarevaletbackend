const express = require('express');
const router = express.Router(); 
const Token = require('../models/Token'); 
const User = require('../models/User'); // User model import zaroori hai
const { protect, authorize } = require('../middleware/authMiddleware'); 

// =================================================================================
// ------------------- TOKEN/CAR IN FUNCTION (Token Creation) -------------------
const createToken = async (req, res) => {
    try {
        // Form se aaye hue fields
        const { carNumber, customerName, carModel, pointId, driverId, managerId, customerContact } = req.body;
        
        // 1. 🔥 FIX: Auto-Assign Location (Point ID)
        let finalPointId = pointId; // Pehle form se aayi hui value use karo
        
        // Agar logged-in user Manager hai, aur uske paas pointId hai, toh usi ko use karo.
        // Isse "Location Mandatory" error theek ho jayega agar form se khaali value aayi hai.
        if (req.user.role === 'manager' && req.user.pointId) {
            finalPointId = req.user.pointId;
        }

        // 2. Mandatory Fields Check (Ab finalPointId ko check kar rahe hain)
        if (!carNumber || !finalPointId || !driverId) { 
            return res.status(400).json({ message: 'Car Number, Location, and Driver are mandatory fields for Car In.' });
        }
        
        // 3. Driver ID Validation aur Role Check
        const driver = await User.findById(driverId);
        
        if (!driver) {
            return res.status(404).json({ message: 'Selected Driver not found.' });
        }
        
        // Agar select kiya gaya ID 'driver' role ka nahi hai
        if (driver.role.toLowerCase() !== 'driver') {
            return res.status(400).json({ message: `User '${driver.fullName}' is not a Driver. Cannot assign.` });
        }
        
        // 4. Data Construction (Manager ID Logic)
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

        // 6. Response mein populated data bhejo
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
        // Error Handling
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

// 1. POST /api/tokens/in (Car In / Token Create) - Manager aur Driver dono ko permission
router.post('/in', protect, authorize(['manager', 'driver']), createToken);


// 2. GET /api/tokens/admin/all (Token List)
router.get('/admin/all', protect, authorize(['admin', 'manager']), async (req, res) => {
    try {
        let query = {};

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

module.exports = router;
