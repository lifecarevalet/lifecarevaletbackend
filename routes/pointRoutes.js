// routes/pointRoutes.js (FINAL UPDATED CODE)

const express = require('express');
const router = express.Router();
const Point = require('../models/Point');
const User = require('../models/User'); // User model import kiya gaya hai
const { protect, authorize } = require('../middleware/authMiddleware');

// ------------------- OWNER: CREATE POINT (Hotel/Location) -------------------
router.post('/admin/create', protect, authorize(['owner']), async (req, res) => {
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
        if (error.code === 11000) return res.status(400).json({ message: 'Point Name already exists.' });
        console.error(error);
        res.status(500).json({ message: 'Error creating location point.', details: error.message });
    }
});

// ------------------- OWNER: GET ALL POINTS -------------------
router.get('/admin/all', protect, authorize(['owner']), async (req, res) => {
    try {
        const ownerId = req.user.id; 
        const points = await Point.find({ ownerId }).select('name'); 
        res.status(200).json({ success: true, points });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching location points.' });
    }
});

// ------------------- OWNER: DELETE POINT -------------------
router.delete('/admin/delete/:id', protect, authorize(['owner']), async (req, res) => {
    const pointId = req.params.id; 
    try {
        // 1. Point ko database se delete karein
        const point = await Point.findByIdAndDelete(pointId);

        if (!point) {
            return res.status(404).json({ message: 'Location not found.' });
        }
        
        // 🔥 FIX: User References ko clean karna (Request 1 Backend)
        // 2. Uss Point ID ko sabhi Users ke 'pointId' aur 'managerId' se hatana (null karna)
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

module.exports = router;
