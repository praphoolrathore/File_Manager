const jwt = require('jsonwebtoken');

// Protects a route. Expected header:  Authorization: Bearer <token>
// On success it sets req.user = { id } and calls next().
// On failure it stops the request with 401 and the route handler never runs.
const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Pinning the algorithm stops "alg: none" and algorithm-swapping tricks.
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // The id comes ONLY from the signed token, never from the request body or URL.
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Token expired, please log in again' : 'Invalid token';
    return res.status(401).json({ message });
  }
};

module.exports = authMiddleware;