'use strict';

const ApiError = require('../utils/ApiError');

/* ══════════════════════════════════════════════════════
   NOT FOUND — näbelli marşrut üçin 404
══════════════════════════════════════════════════════ */
module.exports = (req, res, next) => {
  next(ApiError.notFound(`Marşrut tapylmady: ${req.method} ${req.originalUrl}`));
};
