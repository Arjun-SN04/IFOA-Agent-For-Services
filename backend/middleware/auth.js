const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET env var is required — set it in .env');
if (JWT_SECRET.length < 16) throw new Error('JWT_SECRET must be at least 16 characters — use a strong random secret');

// Paths that mustChangePassword users may still access (to complete the forced change)
const ALLOWED_WHEN_MUST_CHANGE = ['/update-credentials', '/me', '/link-registration'];

module.exports = function authMiddleware(req, res, next) {
  // Primary: Authorization header
  const header = req.headers.authorization;
  let token = null;

  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.query && req.query.token) {
    // Fallback: ?token= query param used only for Excel export downloads.
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    // Explicit algorithm pinning prevents algorithm-substitution attacks
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded;

    // ── Server-side mustChangePassword enforcement ────────────────────────────
    // If the flag is embedded in the token, reject ALL requests except the
    // two endpoints needed to complete the forced password change.
    // This prevents any client-side bypass (back button, direct URL, curl, etc.)
    if (decoded.mustChangePassword) {
      const isAllowed = ALLOWED_WHEN_MUST_CHANGE.some(p => req.path.endsWith(p));
      if (!isAllowed) {
        return res.status(403).json({
          message: 'You must set a new password before accessing this resource.',
          mustChangePassword: true,
        });
      }
    }

    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
