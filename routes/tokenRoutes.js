// routes/tokenRoutes.js (FINAL UPDATED CODE WITH FIXES)

const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware');

// --- POST: CAR IN (TOKEN GENERATE) ---
router.post('/in', protect, authorize(['manager', 'driver']), async (req, res) => {
    // 🔥 FIX 1: Frontend se laneNumber ko destructure kiya
    // Front-end se 'selectedDriverId' aana chahiye jab Manager kisi aur driver ke liye token bana raha ho.
    const { carNumber, customerName, selectedDriverId, laneNumber, pointId: frontendPointId } = req.body; // <--- laneNumber added
    const { id: currentUserId } = req.user; 

    // Final driver ID: agar Manager ne chuna hai, toh woh, warna current user ID
    const finalDriverId = selectedDriverId || currentUserId;

    try {
        const userDetails = await User.findById(finalDriverId).select('managerId pointId role');
        if (!userDetails || !userDetails.pointId) {
            return res.status(400).json({ message: 'Selected Driver is not assigned to a valid Point.' });
        }

        const pointId = userDetails.pointId; // Location ID

        // Token Number Reset Per Point 
        const lastToken = await Token.findOne({ pointId })
            .sort({ tokenNumber: -1 }) 
            .select('tokenNumber');

        // Naya token number calculate karein 
        const nextTokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1; 

        const newToken = new Token({
            tokenNumber: nextTokenNumber, 
            carNumber, 
            customerName, 
            laneNumber, // <--- FIX 2: Lane Number ko save kiya
            driverId: finalDriverId, 
            driverRole: userDetails.role || 'driver', 
            managerId: userDetails.managerId || null,
            pointId: pointId
        });
        const savedToken = await newToken.save(); // Save kiya

        // 🔥 FIX 3: Populate details for popup response
        const populatedToken = await savedToken
            .populate('driverId', 'fullName username')
            .populate('pointId', 'name');

        // 🔥 FIX 4: Response structure change (for client-side compatibility)
        res.status(201).json(populatedToken); 
        
    } catch (error) {
         if (error.code === 11000) return res.status(400).json({ message: 'Duplicate Token Number for this point. Please try again.' });
        console.error('Token Error:', error);
        res.status(500).json({ message: 'Error generating token.' });
    }
});

// --- POST: CAR OUT (MARK TOKEN AS COMPLETED) ---
// ... (No change in this section)

// --- GET: DATA VIEW (As per Role) ---
router.get('/data', protect, authorize(['owner', 'manager', 'driver']), async (req, res) => {
    const { id: currentUserId, role: currentUserRole } = req.user;
    let query = {};
    try {
        if (currentUserRole === 'driver') {
            query.driverId = currentUserId;
        } else if (currentUserRole === 'manager') {
            const managedDrivers = await User.find({ managerId: currentUserId }).select('_id');
            const driverIds = managedDrivers.map(d => d._id);
            driverIds.push(currentUserId);
            query.driverId = { $in: driverIds };
        }

        const tokens = await Token.find(query)
                                  .populate('driverId', 'fullName username')
                                  .populate('pointId', 'name address')
                                  .sort({ inTime: -1 });
        res.json(tokens);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching token data.' });
    }
});

module.exports = router;
