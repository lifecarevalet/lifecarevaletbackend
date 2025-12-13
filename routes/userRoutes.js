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
      role: user.role === 'owner' ? 'admin' : user.role, // 🔥 OWNER → ADMIN
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

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 🔥 OWNER ko ADMIN treat karo
    const dbRole = user.role === 'owner' ? 'admin' : user.role;
    const selectedRole = role === 'owner' ? 'admin' : role;

    // ❌ Role mismatch ONLY for manager / driver
    if (
      (selectedRole === 'manager' && dbRole !== 'manager') ||
      (selectedRole === 'driver' && dbRole !== 'driver')
    ) {
      return res.status(401).json({
        message: `Role mismatch. Account is registered as ${dbRole}`,
      });
    }

    const populatedUser = await User.findById(user._id)
      .select('-password')
      .populate('pointId', 'name address')
      .populate('managerId', 'fullName username');

    res.json({
      user: populatedUser,
      token: createToken(user),
    });
  })
);
// =============================================


// ============== ADMIN ROUTE ==================
router.get(
  '/admin/users',
  protect,
  authorize(['admin']),
  asyncHandler(async (req, res) => {
    const users = await User.find({ role: { $ne: 'admin' } })
      .select('-password')
      .populate('managerId', 'fullName username')
      .populate('pointId', 'name address');

    res.json(users);
  })
);
// =============================================

module.exports = router;