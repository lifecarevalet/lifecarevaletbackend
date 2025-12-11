const express = require('express');
const router = express.Router();
const Point = require('../models/Point');
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize(['owner']));

// CREATE NEW POINT
router.post('/', async (req, res) => {
    const { name, address } = req.body;
    const ownerId = req.user.id; 
    if (!name || !address) {
        return res.status(400).json({ message: 'Point name and address are required.' });
    }
    try {
        const newPoint = new Point({ name, address, ownerId });
        await newPoint.save();
        res.status(201).json({ message: 'Point created successfully', point: newPoint });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Point name already exists.' });
        res.status(500).json({ message: 'Error creating point.', error });
    }
});

// FETCH ALL POINTS
router.get('/', async (req, res) => {
    try {
        const points = await Point.find({}); 
        res.json(points);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching points.' });
    }
});

// DELETE POINT
router.delete('/:id', async (req, res) => {
    const pointId = req.params.id;
    try {
        const deletedPoint = await Point.findByIdAndDelete(pointId);
        if (!deletedPoint) return res.status(404).json({ message: 'Point not found.' });

        // Users ko unassign karna
        await User.updateMany({ pointId: pointId }, { $set: { pointId: null } });
        
        res.json({ message: 'Point deleted successfully. Users unassigned.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting point.', error });
    }
});

module.exports = router;
