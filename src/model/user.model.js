'use strict';

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/* ══════════════════════════════════════════════════════
   USER — ulanyjy (admin / user)
   "code" parol hökmünde ulanylýar, codeHash görnüşinde saklanýar.
══════════════════════════════════════════════════════ */
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
      set(v) { this.setDataValue('email', String(v).trim().toLowerCase()); },
    },
    name: { type: DataTypes.STRING, allowNull: true },
    codeHash: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      allowNull: false,
      defaultValue: 'user',
    },
  },
  {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['codeHash'] } },
    scopes: { withCode: { attributes: { include: ['codeHash'] } } },
  }
);

module.exports = User;
