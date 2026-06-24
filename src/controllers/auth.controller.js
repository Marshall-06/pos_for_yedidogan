'use strict';

const asyncHandler = require('../utils/asyncHandler');
const authService = require('../services/auth.service');

/* ══════════════════════════════════════════════════════
   AUTH CONTROLLER
══════════════════════════════════════════════════════ */
const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  res.status(201).json({ success: true, data: result });
});

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.json({ success: true, data: result });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.me(req.user.id);
  res.json({ success: true, data: user });
});

module.exports = { register, login, me };
