const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res
      .status(401)
      .json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ message: 'Token invalid or expired' });
  }
};

exports.authorize = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.user.role;

    // 🔥 ADMIN & OWNER SAME
    if (
      allowedRoles.includes('admin') &&
      (userRole === 'admin' || userRole === 'owner')
    ) {
      return next();
    }

    // Normal strict check
    if (allowedRoles.includes(userRole)) {
      return next();
    }

    return res
      .status(403)
      .json({ message: 'Forbidden: Role mismatch' });
  };
};