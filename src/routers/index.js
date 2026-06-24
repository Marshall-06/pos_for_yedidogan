'use strict';

const { Router } = require('express');
const authRouter    = require('./auth.router');
const userRouter    = require('./user.router');
const itemRouter    = require('./item.router');
const invoiceRouter = require('./invoice.router');

const router = Router();

/* ══════════════════════════════════════════════════════
   API marşrutlarynyň merkezi ýygyndysy
   /api/auth      → registrasiýa / giriş / me
   /api/users     → ulanyjy dolandyryş (admin)
   /api/items     → harytlar bazasy
   /api/invoices  → fakturalar (admin)
══════════════════════════════════════════════════════ */
router.use('/auth',     authRouter);
router.use('/users',    userRouter);
router.use('/items',    itemRouter);
router.use('/invoices', invoiceRouter);

/* API saglygy barlag */
router.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Label Zawod API işleýär ✓' });
});

module.exports = router;
