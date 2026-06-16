const jwt = require('jsonwebtoken');

const auth = (roles = []) => {
    return (req, res, next) => {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                ...decoded,
                branch_id: decoded.branch_id || null
            };

            // Developer bypass: developer has access to everything
            if (req.user.role === 'developer' || req.user.email?.toLowerCase() === 'farhanjaved357@gmail.com') {
                return next();
            }

            // Optional: Check Roles
            if (roles.length > 0) {
                // Hierarchical checks
                const hasAccess = roles.some(role => {
                    if (role === req.user.role) return true;
                    if (role === 'branch_admin' && req.user.role === 'super_admin') return true;
                    if (role === 'view_only' && (req.user.role === 'super_admin' || req.user.role === 'branch_admin')) return true;
                    return false;
                });

                if (!hasAccess) {
                    return res.status(403).json({ error: 'Access forbidden. Insufficient permissions.' });
                }
            }

            next();
        } catch (ex) {
            res.status(400).json({ error: 'Invalid token.' });
        }
    };
};

module.exports = auth;
