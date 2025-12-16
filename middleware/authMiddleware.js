const jwt = require('jsonwebtoken');
// 🔥 ZAROORI FIX: User Model ko require karein, path check karein
const User = require('../models/User'); 
const mongoose = require('mongoose');

// Middleware to check for token and attach user info (id, role, pointId) to req.user
exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 1. User ko ID se database se fetch karein (pointId data ke saath)
    let user = await User.findById(decoded.id)
        .select('-password')
        .populate('pointId')
        .exec();

    if (!user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    // 2. User object ko request mein attach karein
    // user.role ab populated pointId ke saath available hoga
    req.user = user; 
    
    // 3. User object ko simplify karein taaki route handlers asani se use kar saken
    // req.user mein sirf woh data rakhe, jo routes ko chahiye.
    req.user = {
        id: user._id,
        role: user.role.toLowerCase().trim(),
        pointId: user.pointId ? user.pointId._id : null, // Point ID as string
        fullName: user.fullName,
        username: user.username
    };

    // Agar user Manager ya Driver hai, toh hume unki location ki ID chahiye.
    if (user.pointId && user.pointId._id) {
        req.user.pointId = user.pointId._id;
    }
    
    next();
  } catch (err) {
    // Agar crash ho raha hai toh error yahin aayega
    console.error('Token verification/Middleware error:', err);
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

// Middleware to authorize roles (Yeh code sahi hai)
exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role; 

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: 'Forbidden: Role mismatch' });
    }
    next();
  };
};
