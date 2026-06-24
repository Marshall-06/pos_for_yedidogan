'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/* ══════════════════════════════════════════════════════
   INVOICE — faktura (çykyş resminamasy) başlygy
══════════════════════════════════════════════════════ */
const Invoice = sequelize.define(
  'Invoice',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    fakturaNo: { type: DataTypes.STRING, allowNull: true },
    zawod: { type: DataTypes.STRING, allowNull: true },
    sklad: { type: DataTypes.STRING, allowNull: true },
    date: { type: DataTypes.DATEONLY, allowNull: true },
    issued: { type: DataTypes.STRING, allowNull: true },   // Tabşyran
    received: { type: DataTypes.STRING, allowNull: true },  // Kabul eden
  },
  { tableName: 'invoices' }
);

module.exports = Invoice;
