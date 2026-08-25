// middleware/auth.js
import jwt from 'jsonwebtoken';
import User from '../model/user_model.js';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

export const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password -verification.otp');

        if (!user) return res.status(401).json({ success: false, message: 'User not found' });

        if (!user.is_active || user.is_deleted) return res.status(403).json({ success: false, message: 'Account is inactive or deleted' });

        req.user = user;
        next();
    } 
    catch (error) { return res.status(401).json({ success: false, message: 'Invalid or expired token' }); }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
        if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        next();
    };
};