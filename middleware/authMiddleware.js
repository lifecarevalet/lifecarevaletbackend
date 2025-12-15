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

    // FIX 1: Hum yahaan role ko clean (lowercase/trim) karte hain taaki aage Role Mismatch na ho
    if (decoded.role) {
      decoded.role = decoded.role.toLowerCase().trim();
    }
    
    // Aapke purane code se owner to admin logic
    if (decoded.role === 'owner') {
      decoded.role = 'admin'; // Isse 'owner' ko 'admin' ki permissions mil jayengi
    }

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
    // FIX 2: req.user.role ab 'protect' middleware se already cleaned (lowercase) aayega
    const userRole = req.user.role; 

    // allowedRoles (jaise ['admin']) mein check karte hain
    if (!userRole || !allowedRoles.includes(userRole)) { // Agar userRole defined nahi hai ya allowed roles mein nahi hai
      return res
        .status(403)
        .json({ message: 'Forbidden: Role mismatch' });
    }
    next();
  };
};
