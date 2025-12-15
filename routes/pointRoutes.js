const express = require('express');
const router = express.Router();
const Point = require('../models/Point');
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware'); // protect aur authorize middleware

// =================================================================================
// ------------------- ADMIN/OWNER: CREATE POINT (Hotel/Location) -------------------
// POST /api/points/admin/create
// FIX: authorize(['admin']) ko authorize(['admin', 'owner']) mein badla gaya hai
router.post('/admin/create', protect, authorize(['admin', 'owner']), async (req, res) => {
    try {
        const { name, address } = req.body; 
        const ownerId = req.user.id; 

        const point = await Point.create({ name, address, ownerId });

        res.status(201).json({ 
            success: true, 
            point: point, 
            message: `Location '${point.name}' created. ID: ${point._id}` 
        });
    } catch (error) {
        // Mongoose Validation Errors 
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ message: messages.join(', ') });
        }

        // Unique Index Error (Point Name already exists)
        if (error.code === 11000) return res.status(400).json({ message: 'Location Name already exists.' });

        console.error('Point creation error:', error);
        res.status(500).json({ message: 'Error creating location point.', details: error.message });
    }
});
// =================================================================================


// =================================================================================
// ------------------- ADMIN/OWNER: GET ALL POINTS -------------------
// GET /api/points/admin/all
router.get('/admin/all', protect, authorize(['admin', 'owner']), async (req, res) => {
    try {
        const ownerId = req.user.id; 
        const points = await Point.find({ ownerId }).select('name address'); 
        res.status(200).json({ success: true, points });
    } catch (error) {
        console.error('Fetching points error:', error);
        res.status(500).json({ message: 'Error fetching location points.' });
    }
});
// =================================================================================


// =================================================================================
// ------------------- ADMIN/OWNER: DELETE POINT -------------------
// DELETE /api/points/admin/delete/:id
router.delete('/admin/delete/:id', protect, authorize(['admin', 'owner']), async (req, res) => {
    const pointId = req.params.id; 
    try {
        // 1. Point को database से delete करें
        const point = await Point.findByIdAndDelete(pointId);

        if (!point) {
            return res.status(404).json({ message: 'Location not found.' });
        }

        // 2. Uss Point ID को सभी Users (Manager/Driver) के 'pointId' और 'managerId' से हटाना (null करना)
        await User.updateMany( 
            { pointId: pointId },
            { $set: { pointId: null, managerId: null } }
        );

        res.status(200).json({ message: 'Location deleted successfully.' });
    } catch (error) {
        console.error('Point deletion error:', error);
        res.status(500).json({ message: 'Error deleting location point.' });
    }
});
// =================================================================================

module.exports = router;
