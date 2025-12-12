Const express = require('express');
const router = express.Router();
const Token = require('../models/Token');
const Counter = require('../models/Counter');
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware');

const getNextSequenceValue = async (sequenceName) => {
    const sequenceDocument = await Counter.findByIdAndUpdate(
        { _id: sequenceName },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return sequenceDocument.seq;
};

// --- POST: CAR IN (TOKEN GENERATE) ---
router.post('/in', protect, authorize(['manager', 'driver']), async (req, res) => {
    const { carNumber, customerName } = req.body;
    const { id: driverId, role: driverRole } = req.user; 

    try {
        const userDetails = await User.findById(driverId).select('managerId pointId');
        if (!userDetails || !userDetails.pointId) {
            return res.status(400).json({ message: 'User is not assigned to a valid Point.' });
        }

        const nextTokenNumber = await getNextSequenceValue('tokenid');

        const newToken = new Token({
            tokenNumber: nextTokenNumber, 
            carNumber, 
            customerName, 
            driverId, 
            driverRole,
            managerId: userDetails.managerId || null,
            pointId: userDetails.pointId // Point ID assigned
        });
        await newToken.save();

        const ownerDetails = [
            { name: "Irshad Bloch", contact: "8320678237" },
            { name: "Akhtar Bloch", contact: "9099090197" }
        ];

        res.status(201).json({
            message: 'Token generated successfully',
            token: { ...newToken._doc, ownerDetails: ownerDetails }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error generating token.' });
    }
});

// --- POST: CAR OUT (MARK TOKEN AS COMPLETED) ---
// 🔥 FIX 1: Authorization list mein 'owner' role add kiya
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
        // NOTE: Fix 2: Owner ki check ko sabse pehle add kiya gaya hai

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
