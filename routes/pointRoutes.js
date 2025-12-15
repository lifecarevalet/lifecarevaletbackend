// routes/pointRoutes.js (FINAL UPDATED CODE)

const express = require('express');
const router = express.Router();
const Point = require('../models/Point');
const User = require('../models/User'); 
const { protect, authorize } = require('../middleware/authMiddleware'); // protect aur authorize middleware

// =================================================================================
// ------------------- ADMIN/OWNER: CREATE POINT (Hotel/Location) -------------------
// POST /api/points/admin/create
// FIX: authorize(['owner']) -> authorize(['admin'])
router.post('/admin/create', protect, authorize(['admin']), async (req, res) => {
    try {
        const { name, address } = req.body;

        // OWNER ID को req.user से लें। authMiddleware इसे 'admin' के रूप में सेट करता है।
        const ownerId = req.user.id; 

        const point = await Point.create({ name, address, ownerId });

        res.status(201).json({ 
            success: true, 
            point: point, 
            message: `Location '${point.name}' created. ID: ${point._id}` 
        });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Point Name already exists.' });
        console.error('Point creation error:', error);
        res.status(500).json({ message: 'Error creating location point.', details: error.message });
    }
});
// =================================================================================


// =================================================================================
// ------------------- ADMIN/OWNER: GET ALL POINTS -------------------
// GET /api/points/admin/all
// FIX: authorize(['owner']) -> authorize(['admin'])
router.get('/admin/all', protect, authorize(['admin']), async (req, res) => {
    try {
        // अगर आप OwnerId से filter कर रहे हैं, तो यह सही है:
        const ownerId = req.user.id; 
        const points = await Point.find({ ownerId }).select('name address'); // address भी लिया
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
// FIX: authorize(['owner']) -> authorize(['admin'])
router.delete('/admin/delete/:id', protect, authorize(['admin']), async (req, res) => {
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
