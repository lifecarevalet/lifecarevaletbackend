const jwt = require('jsonwebtoken');

// Middleware to check for token and attach user info (id, role) to req.user
exports.protect = (req, res, next) => {
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

    // FIX 1: Role ko lowercase aur trim karna zaroori hai
    if (decoded.role) {
      decoded.role = decoded.role.toLowerCase().trim();
    }
    
    // 🔥 OWNER -> ADMIN logic hata di gayi hai!

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ message: 'Not authorized, invalid or expired token' });
  }
};

// Middleware to authorize roles
exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role; 

    // Ab allowedRoles.includes() se check karenge
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res
        .status(403)
        .json({ message: 'Forbidden: Role mismatch' });
    }
    next();
  };
};
