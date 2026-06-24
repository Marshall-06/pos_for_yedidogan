'use strict';

/* ══════════════════════════════════════════════════════
   asyncHandler — async controller-lerdäki ýalňyşlary
   awtomatiki next() arkaly error middleware-e geçirýär.
══════════════════════════════════════════════════════ */
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
