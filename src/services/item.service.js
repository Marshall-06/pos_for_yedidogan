'use strict';

const { Op } = require('sequelize');
const { Item } = require('../model');
const ApiError = require('../utils/ApiError');
const { generateEan13FromPlu } = require('../utils/barcode');

/* ══════════════════════════════════════════════════════
   ITEM SERVICE — Harytlar Bazasy (CRUD + CSV import)
   Barkod hemişe PLU esasynda awtomatiki döredilýär.
══════════════════════════════════════════════════════ */
function normalize(data) {
  return {
    plu: String(data.plu || '').trim(),
    name: String(data.name || '').trim(),
    gram: parseInt(data.gram, 10) || 0,
    mm: parseInt(data.mm, 10) || 0,
    code: data.code != null ? String(data.code).trim() : null,
    tare: parseFloat(data.tare) || 0,
  };
}

async function list(search) {
  const where = {};
  if (search) {
    const q = `%${search}%`;
    where[Op.or] = [
      { plu: { [Op.iLike]: q } },
      { name: { [Op.iLike]: q } },
      { barcode: { [Op.iLike]: q } },
    ];
  }
  return Item.findAll({ where, order: [['id', 'ASC']] });
}

async function getById(id) {
  const item = await Item.findByPk(id);
  if (!item) throw ApiError.notFound('Haryt tapylmady');
  return item;
}

async function create(data) {
  const n = normalize(data);
  if (!n.plu || !n.name) throw ApiError.badRequest('PLU we ady hökmany');

  const exists = await Item.findOne({ where: { plu: n.plu } });
  if (exists) throw ApiError.conflict(`PLU ${n.plu} eýýäm bar`);

  n.barcode = generateEan13FromPlu(n.plu, n.gram);
  return Item.create(n);
}

async function update(id, data) {
  const item = await getById(id);
  const n = normalize({ ...item.toJSON(), ...data });
  if (!n.plu || !n.name) throw ApiError.badRequest('PLU we ady hökmany');

  // PLU üýtgän bolsa başga harytda gaýtalanmasyn
  if (n.plu !== item.plu) {
    const dup = await Item.findOne({ where: { plu: n.plu } });
    if (dup && dup.id !== item.id) throw ApiError.conflict(`PLU ${n.plu} eýýäm bar`);
  }
  n.barcode = generateEan13FromPlu(n.plu, n.gram);
  await item.update(n);
  return item;
}

async function remove(id) {
  const item = await getById(id);
  await item.destroy();
  return { id: Number(id) };
}

/* CSV/Excel import — PLU boýunça birleşdirýär (upsert) */
async function bulkUpsert(rows) {
  let added = 0;
  let updated = 0;
  for (const raw of rows) {
    const n = normalize(raw);
    if (!n.plu || !n.name) continue;
    n.barcode = generateEan13FromPlu(n.plu, n.gram);

    const existing = await Item.findOne({ where: { plu: n.plu } });
    if (existing) {
      await existing.update(n);
      updated += 1;
    } else {
      await Item.create(n);
      added += 1;
    }
  }
  return { added, updated };
}

module.exports = { list, getById, create, update, remove, bulkUpsert };
