'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/* ══════════════════════════════════════════════════════
   ITEM — haryt (Harytlar Bazasy)
══════════════════════════════════════════════════════ */
const Item = sequelize.define(
  'Item',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    plu: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    gram: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },     // Brutto agram (g)
    mm: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },       // Ini / Width (mm)
    code: { type: DataTypes.STRING, allowNull: true },                        // Kod
    tare: { type: DataTypes.DECIMAL(10, 3), allowNull: false, defaultValue: 0 }, // Gilza/Tara (kg)
    barcode: { type: DataTypes.STRING, allowNull: true },                     // EAN-13
  },
  {
    tableName: 'items',
    indexes: [{ fields: ['plu'] }, { fields: ['barcode'] }],
  }
);

module.exports = Item;
