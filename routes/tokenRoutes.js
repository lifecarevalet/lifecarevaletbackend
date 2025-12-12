// routes/tokenRoutes.js (FINAL UPDATED CODE)

const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
// const Counter = require('../models/Counter'); // <-- Counter model ab zaroori nahi hai
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware');

// getNextSequenceValue function ko hata diya gaya hai

// --- POST: CAR IN (TOKEN GENERATE) ---
router.post('/in', protect, authorize(['manager', 'driver']), async (req, res) => {
    // Front-end se 'selectedDriverId' aana chahiye jab Manager kisi aur driver ke liye token bana raha ho.
    const { carNumber, customerName, selectedDriverId } = req.body; 
    const { id: currentUserId } = req.user; 

    // Final driver ID: agar Manager ne chuna hai, toh woh, warna current user ID
    const finalDriverId = selectedDriverId || currentUserId;

    try {
        const userDetails = await User.findById(finalDriverId).select('managerId pointId role');
        if (!userDetails || !userDetails.pointId) {
            return res.status(400).json({ message: 'Selected Driver is not assigned to a valid Point.' });
        }

        const pointId = userDetails.pointId; // Location ID

        // 🔥 FIX: Token Number Reset Per Point (Request 8)
        // 1. Is pointId ke liye sabse bada (highest) token number dhoondhe
        const lastToken = await Token.findOne({ pointId })
            .sort({ tokenNumber: -1 }) // Bade se chota sort
            .select('tokenNumber');

        // 2. Naya token number calculate karein (agar koi token nahi hai, toh 1)
        const nextTokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1; 

        const newToken = new Token({
            tokenNumber: nextTokenNumber, // ✅ FIX: Calculated Token Number
            carNumber, 
            customerName, 
            driverId: finalDriverId, 
            driverRole: userDetails.role || 'driver', 
            managerId: userDetails.managerId || null,
            pointId: pointId
        });
        await newToken.save();

        // Populate details for popup response
        await newToken.populate('driverId', 'fullName username');
        await newToken.populate('pointId', 'name');

        res.status(201).json({
            message: 'Token generated successfully',
            token: newToken
        });
    } catch (error) {
         if (error.code === 11000) return res.status(400).json({ message: 'Duplicate Token Number for this point. Please try again.' });
        console.error('Token Error:', error);
        res.status(500).json({ message: 'Error generating token.' });
    }
});

// --- POST: CAR OUT (MARK TOKEN AS COMPLETED) ---
router.post('/out/:id', protect, authorize(['owner', 'manager', 'driver']), async (req, res) => {
    const tokenId = req.params.id;
    const { id: currentUserId, role: currentUserRole } = req.user;
    try {
        const token = await Token.findById(tokenId);
        if (!token || token.outTime !== null) return res.status(404).json({ message: 'Token not found or already OUT.' });

        let isAuthorized = false;

        // 1. Owner can mark any car out (Global Access)
        if (currentUserRole === 'owner') {
            isAuthorized = true;
        }
        // 2. Khud ka token (Driver)
        else if (token.driverId.toString() === currentUserId.toString()) {
            isAuthorized = true;
        }
        // 3. Manager aur uska driver
        else if (currentUserRole === 'manager') {
            const driverUser = await User.findById(token.driverId).select('managerId');
            if (driverUser && driverUser.managerId && driverUser.managerId.toString() === currentUserId.toString()) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) return res.status(403).json({ message: 'Forbidden access.' });

        token.outTime = Date.now();
        await token.save();
        res.json({ message: 'Car marked OUT successfully.', token });
    } catch (error) {
        res.status(500).json({ message: 'Server error during token out.' });
    }
});

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
