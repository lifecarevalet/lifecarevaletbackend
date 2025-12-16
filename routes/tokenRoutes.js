// tokenRoutes.js file

const express = require('express');
const router = express.Router(); 
const Token = require('../models/Token'); 
const User = require('../models/User'); // User model import zaroori hai
const { protect, authorize } = require('../middleware/authMiddleware'); 

// ... (createToken function pura upar diya gaya hai, woh bilkul sahi hai)

const createToken = async (req, res) => {
    try {
        const { carNumber, customerName, carModel, pointId, driverId, managerId, customerContact } = req.body;
        
        let finalPointId = pointId; 
        
        if (req.user.role === 'manager' && req.user.pointId) {
            finalPointId = req.user.pointId;
        }

        // 🔥 FINAL CHECK: Agar driverId ""/undefined hai, toh yahan ruk jayega
        if (!carNumber || !finalPointId || !driverId) { 
            return res.status(400).json({ message: 'Car Number, Location, and Driver are mandatory fields for Car In.' });
        }
        
        // ... (Baaki Driver Validation aur Token Creation Logic)

        const driver = await User.findById(driverId);
        
        if (!driver) {
            return res.status(404).json({ message: 'Selected Driver not found.' });
        }
        
        if (driver.role.toLowerCase() !== 'driver') {
            return res.status(400).json({ message: `User '${driver.fullName}' is not a Driver. Cannot assign.` });
        }

        // ... (Rest of the Token Creation Logic)

        const tokenData = {
            carNumber: carNumber.toUpperCase().trim(),
            pointId: finalPointId, 
            driverId, 
            managerId: req.user.role === 'manager' ? req.user.id : driver.managerId, 
            customerName: customerName || 'N/A', 
            customerContact: customerContact || '',
            carModel: carModel || '',
            inTime: new Date(),
            status: 'Parked', 
        };
        
        const newToken = await Token.create(tokenData);

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
        // ... (Error Handling Logic)
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

// ... (Rest of the routes)

router.post('/in', protect, authorize(['manager', 'driver']), createToken);
// ...

module.exports = router;
