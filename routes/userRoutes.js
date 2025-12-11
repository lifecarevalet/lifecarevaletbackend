const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET;

// ------------------- LOGIN -------------------
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || !(await user.comparePassword(password))) return res.status(401).json({ message: 'Invalid Credentials.' });
        const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token, role: user.role, username: user.username, fullName: user.fullName, pointId: user.pointId });
    } catch (error) {
        res.status(500).json({ message: 'Server error during login' });
    }
});

// ------------------- OWNER: CREATE USER -------------------
router.post('/admin/create-user', protect, authorize(['owner']), async (req, res) => {
    const { username, password, role, managerId, fullName, contactNumber, pointId } = req.body;
    if (role === 'owner' || (role !== 'owner' && !pointId)) { // Point ID must be assigned
        return res.status(400).json({ message: 'Point ID is required for Manager/Driver.' });
    }
    if (role === 'driver' && !managerId) {
        return res.status(400).json({ message: 'Driver must be assigned to a Manager.' });
    }
    try {
        const newUser = new User({ username, password, role, fullName, contactNumber, managerId: role === 'driver' ? managerId : null, pointId });
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
        owner.password = await bcrypt.hash(newPassword, 10);
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
