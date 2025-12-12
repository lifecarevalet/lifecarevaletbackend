// routes/userRoutes.js (FINAL UPDATED CODE)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// ------------------- LOGIN -------------------
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid Credentials.' });
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ token, role: user.role, username: user.username, fullName: user.fullName, pointId: user.pointId });
    } catch (error) {
        console.error('Login Error:', error); 
        res.status(500).json({ message: 'Server error during login' });
    }
});

// ------------------- OWNER/MANAGER: CREATE USER -------------------
// 🔥 FIX: authorize(['owner', 'manager']) - Manager ko driver create karne ki ijaazat di gayi
router.post('/admin/create-user', protect, authorize(['owner', 'manager']), async (req, res) => {
    const { username, password, role, managerId, fullName, contactNumber, pointId } = req.body;
    
    // Validation for Manager/Driver
    if (role === 'manager' || role === 'driver') {
        if (!pointId) return res.status(400).json({ message: 'Point ID is required for Manager/Driver.' });
    }

    // Manager role check: Manager sirf Driver hi bana sakta hai
    if (req.user.role === 'manager' && role !== 'driver') {
        return res.status(403).json({ message: 'Forbidden: Managers can only create Drivers.' });
    }
    
    // Determine final managerId and pointId
    let finalManagerId = managerId;
    let finalPointId = pointId;

    if (req.user.role === 'manager') {
        // Manager's own ID will be the managerId for the new driver
        finalManagerId = req.user.id;
        // Manager ka pointId automatically driver ko assign hoga
        const managerUser = await User.findById(req.user.id).select('pointId');
        if (!managerUser || !managerUser.pointId) {
             return res.status(400).json({ message: 'Your Manager profile is not assigned to a Point/Location. Contact Owner.' });
        }
        finalPointId = managerUser.pointId;
    } else if (req.user.role === 'owner' && role === 'driver' && !managerId) {
         // Owner jab driver banata hai, toh managerId zaroori hai
         return res.status(400).json({ message: 'Driver must be assigned to a Manager by Owner.' });
    }


    try {
        const newUser = new User({ 
            username, 
            password, 
            role, 
            fullName, 
            contactNumber, 
            managerId: role === 'driver' ? finalManagerId : null, 
            pointId: finalPointId 
        });
        await newUser.save();
        res.status(201).json({ id: newUser._id, username: newUser.username, role: newUser.role, fullName: newUser.fullName, pointId: newUser.pointId });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: 'Username already exists.' });
        res.status(500).json({ message: 'Error creating user.', error });
    }
});

// ------------------- OWNER: UPDATE/DELETE (CUD functions here...) -------------------

router.put('/admin/update-user/:id', protect, authorize(['owner']), async (req, res) => {
    const userId = req.params.id;
    const updates = req.body;
    try {
        // Password update
        if (updates.password) updates.password = await bcrypt.hash(updates.password, 10);

        const updatedUser = await User.findByIdAndUpdate(userId, { $set: updates }, { new: true, runValidators: true }).select('-password');
        if (!updatedUser) return res.status(404).json({ message: 'User not found.' });
        res.json({ message: 'User updated successfully', user: updatedUser });
    } catch (error) {
        res.status(500).json({ message: 'Error updating user.', error });
    }
});

router.delete('/admin/delete-user/:id', protect, authorize(['owner']), async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findById(userId);
        if (!user || user.role === 'owner') return res.status(404).json({ message: 'User not found or cannot delete owner.' });

        await User.findByIdAndDelete(userId);
        if (user.role === 'manager') {
            // Manager delete hone par uske drivers ko unassign karna
            await User.updateMany({ managerId: userId }, { $set: { managerId: null } });
        }
        res.json({ message: 'User deleted successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting user.', error });
    }
});

router.post('/auth/reset-owner-password', protect, authorize(['owner']), async (req, res) => {
    const ownerId = req.user.id; 
    const { currentPassword, newPassword } = req.body;
    try {
        const owner = await User.findById(ownerId);
        if (!owner || !(await owner.comparePassword(currentPassword))) return res.status(401).json({ message: 'Invalid current password.' });

        owner.password = newPassword; 
        await owner.save();
        res.json({ message: 'Owner password reset successfully.' });
    } catch (error) {
        res.status(500).json({ message: 'Server error during password reset.' });
    }
});

router.get('/admin/users', protect, authorize(['owner']), async (req, res) => {
    try {
        const users = await User.find({ role: { $ne: 'owner' } }).select('-password').populate('managerId', 'fullName').populate('pointId', 'name'); 
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users.' });
    }
});

module.exports = router;
