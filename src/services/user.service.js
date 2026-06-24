'use strict';

const { User } = require('../model');
const ApiError = require('../utils/ApiError');
const { hashCode } = require('../utils/password');
const { publicUser } = require('./auth.service');

/* ══════════════════════════════════════════════════════
   USER SERVICE — ulanyjy dolandyryş (diňe admin)
══════════════════════════════════════════════════════ */
async function list() {
  const users = await User.findAll({ order: [['id', 'ASC']] });
  return users.map(publicUser);
}

async function create({ email, name, code, role }) {
  if (!email || !code) throw ApiError.badRequest('Email we kod hökmany');
  const r = role === 'admin' ? 'admin' : 'user';

  const exists = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (exists) throw ApiError.conflict('Bu email eýýäm bar');

  const codeHash = await hashCode(code);
  const user = await User.create({ email, name, codeHash, role: r });
  return publicUser(user);
}

async function remove(id, requesterId) {
  const user = await User.findByPk(id);
  if (!user) throw ApiError.notFound('Ulanyjy tapylmady');

  if (Number(id) === Number(requesterId)) {
    throw ApiError.badRequest('Özüňi pozup bilmeýärsiň');
  }
  // Iň soňky admin galmaly
  if (user.role === 'admin') {
    const adminCount = await User.count({ where: { role: 'admin' } });
    if (adminCount <= 1) throw ApiError.badRequest('Iň bolmanda bir admin galmaly');
  }

  await user.destroy();
  return { id: Number(id) };
}

module.exports = { list, create, remove };
