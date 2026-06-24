'use strict';

require('dotenv').config();

/* ══════════════════════════════════════════════════════
   CONFIG — daşky gurşaw (env) sazlamalary bir ýerde
══════════════════════════════════════════════════════ */
const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  corsOrigin: process.env.CORS_ORIGIN || '*',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5433,
    name: process.env.DB_NAME || 'label_zawod',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    logging: String(process.env.DB_LOGGING).toLowerCase() === 'true',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};

module.exports = config;
