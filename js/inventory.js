'use strict';

/* ══════════════════════════════════════════════════════
   INVENTORY — "Harytlar Bazasy" sahypasynyň logikasy
   Forma (goş / üýtget), CRUD tablisa, barkod görkezme.
══════════════════════════════════════════════════════ */

// Häzir redaktirlenýän harydyň id-si (null = täze goşmak rejimi)
let editingItemId = null;

/* ── Forma elementleri (barkod ýok — ol awtomatiki döreýär) ── */
const IF = {
  plu:  () => document.getElementById('if-plu'),
  name: () => document.getElementById('if-name'),
  gram: () => document.getElementById('if-gram'),
  mm:   () => document.getElementById('if-mm'),
  code: () => document.getElementById('if-code'),
  tare: () => document.getElementById('if-tare'),
};

function clearItemForm(){
  Object.values(IF).forEach(get=>{ const el=get(); if(el) el.value=''; });
}

function cancelEditItem(){
  editingItemId = null;
  clearItemForm();
  document.getElementById('inv-form-title').textContent = '＋ Täze haryt goş';
  document.getElementById('if-submit').textContent = '＋ Bazaa goş';
  document.getElementById('inv-cancel-edit').style.display = 'none';
}

/* Tablisadan "Üýtget" basylanda formany doldurýar */
function startEditItem(id){
  const it = findItem(id);
  if(!it) return;
  editingItemId = id;
  IF.plu().value  = it.plu || '';
  IF.name().value = it.name || '';
  IF.gram().value = it.gram || '';
  IF.mm().value   = it.mm || '';
  IF.code().value = it.code || '';
  IF.tare().value = it.tare || '';

  document.getElementById('inv-form-title').textContent = '✎ Harydy üýtget';
  document.getElementById('if-submit').textContent = '✓ Ýatda sakla';
  document.getElementById('inv-cancel-edit').style.display = '';
  window.scrollTo({top:0, behavior:'smooth'});
}

/* Forma "goş" ýa-da "ýatda sakla" — ikisem şu funksiýa
   (barkod serwerde PLU esasynda awtomatiki döredilýär) */
async function submitItemForm(){
  const plu  = IF.plu().value.trim();
  const name = IF.name().value.trim();
  const gram = IF.gram().value.trim();
  const mm   = IF.mm().value.trim();
  const code = IF.code().value.trim();
  const tare = IF.tare().value.trim();

  if(!plu || !name){
    alert('PLU we harydyň adyny giriziň!');
    return;
  }

  const payload = { plu, name, gram: gram || 0, mm: mm || 0, code, tare: tare || 0 };

  try{
    if(editingItemId) await API.items.update(editingItemId, payload);
    else              await API.items.create(payload);
  }catch(e){
    alert('Ýalňyşlyk: ' + e.message);
    return;
  }

  cancelEditItem();
  renderInventory();
}

/* ══ CRUD tablisany çyzmak (serwerden çekýär) ══ */
async function renderInventory(){
  const tbody = document.getElementById('inv-tbody');
  const countEl = document.getElementById('inv-count');
  const q = (document.getElementById('inv-search').value || '').trim();

  try{
    await refreshItems(q);
  }catch(e){
    countEl.textContent = 0;
    tbody.innerHTML = `<tr><td colspan="9" class="inv-empty">
      Serwere birikip bolmady — backend işleýärmi?<br><small>${escapeHtml(e.message)}</small>
    </td></tr>`;
    return;
  }

  countEl.textContent = ITEM_DB.length;

  if(ITEM_DB.length === 0){
    tbody.innerHTML = `<tr><td colspan="9" class="inv-empty">
      ${q ? 'Gözleg boýunça haryt tapylmady.' : 'Bazada haryt ýok — ýokardaky formadan goşuň.'}
    </td></tr>`;
    return;
  }

  tbody.innerHTML = ITEM_DB.map((it,i)=>{
    const hasBc = !!(it.barcode && it.barcode.trim());
    const bcCell = hasBc
      ? `<span class="inv-bc">${escapeHtml(it.barcode)}</span>`
      : `<span class="inv-bc none">barkodsuz</span>`;
    const bcBtnLabel = hasBc ? 'Barkody görmek' : 'Barkod çykarmak';
    return `
    <tr>
      <td class="mono col-idx" data-label="#">${i+1}</td>
      <td class="mono" data-label="PLU">${escapeHtml(String(it.plu||'—'))}</td>
      <td class="tl" data-label="Ady"><span class="inv-name">${escapeHtml(it.name||'(adsyz)')}</span></td>
      <td data-label="Kod">${escapeHtml(it.code||'—')}</td>
      <td class="mono" data-label="Brutto (g)">${escapeHtml(String(it.gram||0))}</td>
      <td class="mono" data-label="Ini (mm)">${escapeHtml(String(it.mm||0))}</td>
      <td class="mono" data-label="Gilza (g)">${Math.round(Number(it.tare)||0)}</td>
      <td data-label="Barkod">${bcCell}</td>
      <td data-label="Amallar">
        <div class="row-actions">
          <button class="btn btn-sm btn-bc" onclick="showBarcode('${it.id}')">▐║▌ ${bcBtnLabel}</button>
          <button class="btn btn-sm btn-edit admin-only" onclick="startEditItem('${it.id}')">✎ Üýtget</button>
          <button class="btn btn-sm btn-trash admin-only" onclick="removeItem('${it.id}')">✕</button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function removeItem(id){
  const it = findItem(id);
  if(!it) return;
  if(!confirm(`"${it.name}" harydyny bazadan pozmaly my?`)) return;
  try{
    await API.items.remove(it.id);
  }catch(e){
    alert('Ýalňyşlyk: ' + e.message);
    return;
  }
  if(String(editingItemId) === String(id)) cancelEditItem();
  renderInventory();
}

/* ══════════════════════════════════════════════════════
   BARKOD GÖRKEZME / ÇYKARMA
   Barkod bar bolsa görkezýär; ýok bolsa PLU esasynda
   awtomatiki EAN-13 döredip, bazada ýatda saklaýar.
══════════════════════════════════════════════════════ */
function showBarcode(id){
  const it = findItem(id);
  if(!it) return;

  // Barkod serwerde PLU+agram esasynda döredilýär; ýok bolsa ýerli hasaplaýarys
  const code = it.barcode || generateEan13FromPlu(it.plu, it.gram);

  document.getElementById('bc-modal-title').textContent = 'Barkod';
  document.getElementById('bc-label-name').textContent = it.name || '(adsyz)';
  document.getElementById('bc-label-meta').textContent =
    `PLU ${it.plu || '—'}` + (it.code ? ` · Kod ${it.code}` : '') + (it.mm ? ` · ${it.mm}mm` : '');

  renderBarcodeSvg(code);
  document.getElementById('barcode-modal-overlay').classList.add('open');
}

/* Öz EAN-13 SVG çyzgyjymyz — internet/CDN gerek däl */
function renderBarcodeSvg(code){
  const wrap = document.getElementById('bc-svg-wrap');
  const svg = ean13Svg(code);
  wrap.innerHTML = svg || `<div class="bc-fallback">${escapeHtml(code)}</div>`;
}

function closeBarcodeModal(){
  document.getElementById('barcode-modal-overlay').classList.remove('open');
}

/* ══════════════════════════════════════════════════════
   EXCEL (CSV) EXPORT / IMPORT
   Diňe admin. CSV faýly Excel-de göni açylýar.
══════════════════════════════════════════════════════ */
const CSV_HEADERS = ['PLU','Ady','Brutto_g','Ini_mm','Kod','Gilza_g','Barkod'];

async function exportItems(){
  let all = [];
  try{ all = (await API.items.list()) || []; }
  catch(e){ alert('Export başartmady: ' + e.message); return; }
  if(all.length === 0){ alert('Bazada haryt ýok — export ediljek zat ýok.'); return; }
  const rows = [CSV_HEADERS];
  all.forEach(it=>{
    rows.push([
      it.plu || '',
      it.name || '',
      it.gram || 0,
      it.mm || 0,
      it.code || '',
      Number(it.tare || 0),
      it.barcode || generateEan13FromPlu(it.plu, it.gram)
    ]);
  });
  const csv = buildCSV(rows, ',');
  // BOM — Excel türkmen harplaryny dogry okar ýaly
  const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
  downloadBlob(blob, 'harytlar_' + dateStamp() + '.csv');
}

function triggerImport(){
  document.getElementById('import-file').click();
}

function handleImportFile(input){
  const file = input.files && input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e=>{
    try{ importItemsCSV(e.target.result); }
    catch(err){ alert('Import ýalňyşlygy: ' + err.message); }
    input.value = '';
  };
  reader.readAsText(file, 'UTF-8');
}

/* CSV sütünini at boýunça tapmak (dürli atlary goldaýar) */
function findCol(header, names){
  for(const n of names){ const i = header.findIndex(h=>h === n); if(i >= 0) return i; }
  for(const n of names){ const i = header.findIndex(h=>h.includes(n)); if(i >= 0) return i; }
  return -1;
}

async function importItemsCSV(text){
  text = text.replace(/^\uFEFF/, '');
  const delim = detectDelim(text);
  const rows = parseCSV(text, delim);
  if(rows.length < 2){ alert('Faýl boş ýa-da diňe başlyk hatary bar.'); return; }

  const header = rows[0].map(h=>String(h).trim().toLowerCase());
  const col = {
    plu:     findCol(header, ['plu']),
    name:    findCol(header, ['ady','name','ad','haryt']),
    gram:    findCol(header, ['brutto','gram','agram','brutto_g']),
    mm:      findCol(header, ['ini','width','mm','ini_mm']),
    code:    findCol(header, ['kod','code']),
    tare:    findCol(header, ['gilza','tara','tare','gilza_g','gilza_kg']),
    barcode: findCol(header, ['barkod','barcode'])
  };
  if(col.plu < 0 || col.name < 0){
    alert('Sütünler tapylmady. Iň bolmanda "PLU" we "Ady" sütünleri bolmaly.');
    return;
  }

  const get = (cells, c) => (c >= 0 && cells[c] != null) ? String(cells[c]).trim() : '';

  // CSV satyrlaryny serwere iberiljek görnüşe öwürýäris
  const payloadRows = [];
  for(let i = 1; i < rows.length; i++){
    const cells = rows[i];
    if(!cells || cells.join('').trim() === '') continue;
    const plu  = get(cells, col.plu);
    const name = get(cells, col.name);
    if(!plu || !name) continue;

    payloadRows.push({
      plu, name,
      gram: get(cells, col.gram).replace(',', '.') || 0,
      mm:   get(cells, col.mm).replace(',', '.') || 0,
      code: get(cells, col.code),
      tare: get(cells, col.tare).replace(',', '.') || 0
    });
  }

  if(payloadRows.length === 0){ alert('Import ediljek dogry setir tapylmady.'); return; }

  let added = 0, updated = 0;
  try{
    const res = await API.items.import(payloadRows);
    added   = res ? res.added   : 0;
    updated = res ? res.updated : 0;
  }catch(e){
    alert('Import ýalňyşlygy: ' + e.message);
    return;
  }

  renderInventory();
  alert(`Import tamamlandy:\n${added} täze haryt goşuldy\n${updated} haryt täzelendi`);
}

/* Etiketkany çap etmek — diňe barkod etiketkasy çykýar */
function printBarcode(){
  document.body.classList.add('printing-barcode');
  const cleanup = () => {
    document.body.classList.remove('printing-barcode');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  window.print();
}
