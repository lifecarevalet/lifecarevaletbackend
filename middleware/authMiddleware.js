exports.authorize = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const userRole = req.user.role;

        // ✅ Admin & Owner SAME
        if (
            allowedRoles.includes('admin') &&
            (userRole === 'admin' || userRole === 'owner')
        ) {
            return next();
        }

        // ✅ Normal strict role check (manager / driver)
        if (allowedRoles.includes(userRole)) {
            return next();
        }

        return res
            .status(403)
            .json({ message: 'Forbidden: Role mismatch' });
    };
};