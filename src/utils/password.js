'use strict';

const bcrypt = require('bcryptjs');

/* ══════════════════════════════════════════════════════
   PASSWORD — "kod" (parol) hash/barlag
   Kod hiç wagt açyk saklanmaýar — diňe hash bazada durýar.
══════════════════════════════════════════════════════ */
const SALT_ROUNDS = 10;

async function hashCode(code) {
  return bcrypt.hash(String(code), SALT_ROUNDS);
}

async function compareCode(code, hash) {
  return bcrypt.compare(String(code), hash);
}

module.exports = { hashCode, compareCode };
