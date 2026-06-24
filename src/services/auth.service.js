'use strict';

const { User } = require('../model');
const ApiError = require('../utils/ApiError');
const { hashCode, compareCode } = require('../utils/password');
const { signToken } = require('../utils/jwt');

/* ══════════════════════════════════════════════════════
   AUTH SERVICE
   Taýýar admin ÝOK — ilkinji registrasiýa eden ulanyjy
   awtomatiki admin bolýar (bootstrap). Soňkular adaty "user".
══════════════════════════════════════════════════════ */

function publicUser(u) {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}

async function register({ email, name, code }) {
  if (!email || !code) throw ApiError.badRequest('Email we kod hökmany');

  const exists = await User.findOne({ where: { email: String(email).toLowerCase() } });
  if (exists) throw ApiError.conflict('Bu email eýýäm bar');

  // Boş bazada ilkinji ulanyjy admin bolýar
  const total = await User.count();
  const role = total === 0 ? 'admin' : 'user';

  const codeHash = await hashCode(code);
  const user = await User.create({ email, name, codeHash, role });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return { token, user: publicUser(user) };
}

async function login({ email, code }) {
  if (!email || !code) throw ApiError.badRequest('Email we kod hökmany');

  const user = await User.scope('withCode').findOne({
    where: { email: String(email).toLowerCase() },
  });
  if (!user) throw ApiError.unauthorized('Email ýa-da kod nädogry');

  const ok = await compareCode(code, user.codeHash);
  if (!ok) throw ApiError.unauthorized('Email ýa-da kod nädogry');

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return { token, user: publicUser(user) };
}

async function me(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw ApiError.notFound('Ulanyjy tapylmady');
  return publicUser(user);
}

module.exports = { register, login, me, publicUser };
