export const allError = (err, res) => {
    if (err.name === 'ValidationError') return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message).join(', ') });
    if (err.name === 'CastError') return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
    if (err.code === 11000) return res.status(409).json({ success: false, message: `${Object.keys(err.keyPattern)[0]} already exists` });
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, message: 'Invalid token' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, message: 'Token expired' });
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'File size too large' });
    if (err.name === 'MulterError' && err.code === 'LIMIT_FILE_COUNT') return res.status(400).json({ success: false, message: 'Too many files' });
    if (err.name === 'MulterError' && err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ success: false, message: 'Unexpected file field' });
    if (err.name === 'MulterError') return res.status(400).json({ success: false, message: err.message });
    if (err.name === 'MongoNetworkError') return res.status(503).json({ success: false, message: 'Database connection error' });
    if (err.name === 'MongoServerError') return res.status(500).json({ success: false, message: 'Database server error' });
    if (err.name === 'RateLimitError') return res.status(429).json({ success: false, message: 'Too many requests, please try again later' });
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' });
};

