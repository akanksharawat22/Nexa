const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pulsechat_jwt_secret_dev_key_2026';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { userId, username }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token' });
  }
};

module.exports = {
  authMiddleware,
  JWT_SECRET
};
