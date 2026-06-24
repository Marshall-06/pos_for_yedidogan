'use strict';

const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

/* ══════════════════════════════════════════════════════
   AUTH MIDDLEWARE
   authenticate  → Bearer tokeni barlap req.user goýýar
   authorize(...)→ rugsat berlen rollary barlaýar
   requireAdmin  → diňe admin
══════════════════════════════════════════════════════ */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(ApiError.unauthorized('Token gerek'));
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (e) {
    next(ApiError.unauthorized('Token nädogry ýa-da möhleti geçen'));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (roles.length && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Bu amal üçin rugsat ýok'));
    }
    next();
  };
}

const requireAdmin = authorize('admin');

module.exports = { authenticate, authorize, requireAdmin };
