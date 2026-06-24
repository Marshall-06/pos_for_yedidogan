'use strict';

const { sequelize, Invoice, InvoiceItem } = require('../model');
const ApiError = require('../utils/ApiError');

/* ══════════════════════════════════════════════════════
   INVOICE SERVICE — faktura döretmek/okamak
   net = gross + tare (Brutto arassa + Gilza; serwerde hasaplanýar)
══════════════════════════════════════════════════════ */
function normalizeItem(it) {
  const gross = parseFloat(it.gross) || 0;
  const tare = parseFloat(it.tare) || 0;
  return {
    plu: it.plu != null ? String(it.plu) : null,
    name: it.name != null ? String(it.name) : null,
    code: it.code != null ? String(it.code) : null,
    width: it.width != null ? String(it.width) : null,
    mode: it.mode != null ? String(it.mode) : null,
    gross,
    tare,
    net: gross + tare,
    self: it.self != null ? String(it.self) : null,
    label: it.label != null ? String(it.label) : null,
    shop: it.shop != null ? String(it.shop) : null,
    boxQty: parseInt(it.boxQty, 10) || parseInt(it.box_qty, 10) || 1,
  };
}

async function create(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (items.length === 0) throw ApiError.badRequest('Fakturada iň bolmanda bir setir bolmaly');

  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.create(
      {
        fakturaNo: data.fakturaNo || data.faktura_no || null,
        zawod: data.zawod || null,
        sklad: data.sklad || null,
        date: data.date || null,
        issued: data.issued || null,
        received: data.received || data.recv || null,
      },
      { transaction: t }
    );

    const rows = items.map((it) => ({ ...normalizeItem(it), invoiceId: invoice.id }));
    await InvoiceItem.bulkCreate(rows, { transaction: t });

    return Invoice.findByPk(invoice.id, {
      include: [{ model: InvoiceItem, as: 'items' }],
      transaction: t,
    });
  });
}

async function list() {
  return Invoice.findAll({
    order: [['id', 'DESC']],
    include: [{ model: InvoiceItem, as: 'items' }],
  });
}

async function getById(id) {
  const invoice = await Invoice.findByPk(id, {
    include: [{ model: InvoiceItem, as: 'items' }],
  });
  if (!invoice) throw ApiError.notFound('Faktura tapylmady');
  return invoice;
}

async function remove(id) {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) throw ApiError.notFound('Faktura tapylmady');
  await invoice.destroy(); // InvoiceItem CASCADE bilen pozulýar
  return { id: Number(id) };
}

module.exports = { create, list, getById, remove };
