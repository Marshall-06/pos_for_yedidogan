'use strict';

const { Sequelize } = require('sequelize');
const config = require('./index');

/* ══════════════════════════════════════════════════════
   DATABASE — Sequelize/PostgreSQL birikmesi
══════════════════════════════════════════════════════ */
const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'postgres',
  logging: config.db.logging ? console.log : false,
  define: {
    underscored: true,   // sütün atlary snake_case
    timestamps: true,
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

module.exports = sequelize;
