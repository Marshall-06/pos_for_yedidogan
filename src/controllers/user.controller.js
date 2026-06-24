'use strict';

const asyncHandler = require('../utils/asyncHandler');
const userService = require('../services/user.service');

/* ══════════════════════════════════════════════════════
   USER CONTROLLER (diňe admin)
══════════════════════════════════════════════════════ */
const list = asyncHandler(async (req, res) => {
  const users = await userService.list();
  res.json({ success: true, data: users });
});

const create = asyncHandler(async (req, res) => {
  const user = await userService.create(req.body);
  res.status(201).json({ success: true, data: user });
});

const remove = asyncHandler(async (req, res) => {
  const result = await userService.remove(req.params.id, req.user.id);
  res.json({ success: true, data: result });
});

module.exports = { list, create, remove };
