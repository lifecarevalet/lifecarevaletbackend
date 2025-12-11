const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
// Make sure this path is correct:
const { protect, authorize } = require('../middleware/authMiddleware'); 

// 🚨 IMPORTANT: JWT_SECRET ko process.env se direct use karna zyada bharosemand hai.
// const JWT_SECRET = process.env.JWT_SECRET; // Is line ko delete ya comment kar dein

// ------------------- LOGIN -------------------
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });

        // 1. Check if user exists AND if password comparison passes
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid Credentials.' });
        }
        
        // 2. Token Generation (Use process.env.JWT_SECRET directly)
        const token = jwt.sign(
            { id: user._id, role: user.role, username: user.username },
            process.env.JWT_SECRET, // Use direct environment variable
            { expiresIn: '1d' }
        );
        
        // 3. Success Response
        res.json({ token, role: user.role, username: user.username, fullName: user.fullName, pointId: user.pointId });
    } catch (error) {
        console.error('Login Error:', error); // Log the actual error for debugging
        res.status(500).json({ message: 'Server error during login' });
    }
});

// ------------------- OWNER: CREATE USER -------------------
router.post('/admin/create-user', protect, authorize(['owner']), async (req, res) => {
    const { username, password, role, managerId, fullName, contactNumber, pointId } = req.body;
    if (role === 'manager' || role === 'driver') { // Point ID is required for Manager/Driver
        if (!pointId) return res.status(400).json({ message: 'Point ID is required for Manager/Driver.' });
    }
    if (role === 'driver' && !managerId) {
        return res.status(400).json({ message: 'Driver must be assigned to a Manager.' });
    }
    
    try {
        // Password hashing is handled by UserSchema.pre('save')
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
        
        // Hashing is handled by pre('save') hook, but we manually hash here to avoid issues if 'password' isn't marked as modified
        owner.password = newPassword; // The pre-save hook should hash this
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
