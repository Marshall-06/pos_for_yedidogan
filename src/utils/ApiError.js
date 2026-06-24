'use strict';

/* ══════════════════════════════════════════════════════
   ApiError — status koduny göterýän ýalňyşlyk klasy
══════════════════════════════════════════════════════ */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg, details) { return new ApiError(400, msg || 'Nädogry haýyş', details); }
  static unauthorized(msg) { return new ApiError(401, msg || 'Awtorizasiýa gerek'); }
  static forbidden(msg) { return new ApiError(403, msg || 'Rugsat ýok'); }
  static notFound(msg) { return new ApiError(404, msg || 'Tapylmady'); }
  static conflict(msg) { return new ApiError(409, msg || 'Konflikt'); }
}

module.exports = ApiError;
