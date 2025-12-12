// routes/pointRoutes.js
const express = require('express');
const router = express.Router();
const Point = require('../models/Point');
const { protect, authorize } = require('../middleware/authMiddleware');

// ------------------- OWNER: CREATE POINT (Hotel/Location) -------------------
router.post('/admin/create', protect, authorize(['owner']), async (req, res) => {
    try {
        const { name, address } = req.body;
        
        // Owner ID automatically JWT token se liya gaya
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
        // Owner sirf woh points dekhega jo usne banaye hain (optional filter)
        const ownerId = req.user.id; 
        const points = await Point.find({ ownerId }).select('name'); 
        res.status(200).json({ success: true, points });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching location points.' });
    }
});

module.exports = router;
