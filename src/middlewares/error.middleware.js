'use strict';

const config = require('../config');
const ApiError = require('../utils/ApiError');

/* ══════════════════════════════════════════════════════
   ERROR MIDDLEWARE — ähli ýalňyşlary bir görnüşde gaýtarýar
══════════════════════════════════════════════════════ */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Serwer ýalňyşlygy';
  let details = err.details;

  // Sequelize ýalňyşlyklary
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Bu maglumat eýýäm bar (gaýtalanýan meýdan)';
    details = err.errors ? err.errors.map((e) => e.message) : undefined;
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Maglumat barlagy şowsuz';
    details = err.errors ? err.errors.map((e) => e.message) : undefined;
  }

  if (statusCode >= 500) console.error(err);

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(config.env === 'development' && statusCode >= 500 ? { stack: err.stack } : {}),
  });
}

module.exports = errorHandler;
