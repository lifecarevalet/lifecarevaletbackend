const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler');

const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

// ================= JWT TOKEN =================
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role, // 🔥 VERY IMPORTANT
    },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};
// =============================================


// ================= LOGIN =====================
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password, role } = req.body;

    const user = await User.findOne({ username });

    // Username / password check
    if (!user || !(await user.matchPassword(password))) {
      return res
        .status(401)
        .json({ message: 'Invalid credentials' });
    }

    // 🔐 ROLE LOGIC (ADMIN & OWNER SAME)
    const adminOwnerGroup = ['admin', 'owner'];

    if (
      adminOwnerGroup.includes(role) &&
      adminOwnerGroup.includes(user.role)
    ) {
      // ✅ allowed
    } else if (user.role !== role) {
      return res.status(401).json({
        message: `Role mismatch. Account is registered as ${user.role}`,
      });
    }

    // Populate data
    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('pointId', 'name address')
      .populate('managerId', 'fullName username');

    // Final response
    res.json({
      user: populatedUser,
      token: createToken(user),
    });
  })
);
// =============================================


// ============== ADMIN / OWNER ROUTE ==========
router.get(
  '/admin/users',
  protect,
  authorize(['admin']), // 🔥 owner automatically allowed
  asyncHandler(async (req, res) => {
    const users = await User.find({ role: { $ne: 'owner' } })
      .select('-password')
      .populate('managerId', 'fullName username')
      .populate('pointId', 'name address');

    res.json(users);
  })
);
// =============================================

module.exports = router;