'use strict';

/* ══════════════════════════════════════════════════════
   INVOICE — "Faktura Düzmek" sahypasynyň logikasy
   Setir goşmak, netto/jem hasaplamalar, haryt saýlaýjy
   modal (bazadan), barkod skan we çap formasy.
══════════════════════════════════════════════════════ */

const MODES = ['Ters','Göni','Ters+Göni','Aýlaw','Beýleki'];

let rid = 0;
const rows = new Map();

/* ══ INIT ════════════════════════════════════════════════ */
(function(){
  const t = new Date();
  document.getElementById('f-date').value = t.toISOString().split('T')[0];
  document.getElementById('foot-date').textContent =
    t.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});
  addRow(); addRow(); addRow();

  document.getElementById('f-date').addEventListener('change',function(){
    const d = new Date(this.value+'T12:00:00');
    document.getElementById('foot-date').textContent =
      d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});
  });
})();

/* ══ ITEM PICKER MODAL (bazadan haryt saýlamak) ══ */
async function openItemPicker(){
  document.getElementById('item-modal-overlay').classList.add('open');
  document.getElementById('item-search').value = '';
  const list = document.getElementById('item-list');
  list.innerHTML = `<div class="item-empty">Ýüklenýär…</div>`;
  try{ await refreshItems(''); }
  catch(e){ list.innerHTML = `<div class="item-empty">Serwere birikip bolmady: ${escapeHtml(e.message)}</div>`; return; }
  renderItemList();
  setTimeout(()=>document.getElementById('item-search').focus(), 50);
}
function closeItemPicker(){
  document.getElementById('item-modal-overlay').classList.remove('open');
}

function renderItemList(){
  const q = (document.getElementById('item-search').value||'').trim().toLowerCase();
  const list = document.getElementById('item-list');
  const filtered = ITEM_DB.filter(it=>{
    if(!q) return true;
    return (it.name||'').toLowerCase().includes(q)
      || String(it.plu||'').toLowerCase().includes(q)
      || (it.barcode||'').toLowerCase().includes(q);
  });

  if(filtered.length === 0){
    list.innerHTML = `<div class="item-empty">Haryt tapylmady — "Harytlar Bazasy" sahypasyndan goşuň.</div>`;
    return;
  }

  list.innerHTML = filtered.map(it=>`
    <div class="item-card" onclick="pickItem('${it.id}')">
      <div class="ic-info">
        <div class="ic-name">${escapeHtml(it.name||'(adsyz)')}</div>
        <div class="ic-meta">PLU ${escapeHtml(String(it.plu||'—'))} · ${it.gram||0}g · ${it.mm||0}mm · ${escapeHtml(it.barcode||'barkodsuz')}</div>
      </div>
      <button class="ic-pick" onclick="event.stopPropagation();pickItem('${it.id}')">Saýla</button>
    </div>
  `).join('');
}

// Bazadan haryt saýlananda — faktura tablisasyna täze setir goşulýar
function pickItem(id){
  const it = findItem(id);
  if(!it) return;
  addRow({
    plu: it.plu, name: it.name, code: it.code, width: it.mm,
    tare: parseFloat(it.tare)||0, box_qty: 2
  });
  closeItemPicker();
}

/* ══ ADD ROW ═════════════════════════════════════════════ */
function addRow(p){
  const id = ++rid;
  rows.set(id,{
    plu:   p?.plu   || '',
    name:  p?.name  || '',
    code:  p?.code  || '',
    width: p?.width || '',
    mode:  p?.mode  || 'Ters',
    gross: p?.gross || 0,
    tare:  p?.tare  || 0,
    self:    p?.self    || '',
    label:   p?.label   || '',
    shop:    p?.shop    || '',
    box_qty: p?.box_qty || 2
  });
  const tb = document.getElementById('tbody');
  const tr = document.createElement('tr');
  tr.id = 'row-'+id; tr.dataset.id = id;
  tr.innerHTML = rowHTML(id, tb.rows.length+1, p);
  tb.appendChild(tr);
  renumber();
  recalc(id);
  return id;
}

function rowHTML(id, n, p){
  const r = p || {};
  const modeOpts = MODES.map(m=>`<option value="${m}"${(r.mode||'Ters')===m?' selected':''}>${m}</option>`).join('');
  return `
  <td class="rn" id="rn-${id}">${n}</td>
  <td><input class="ci w-plu mn" id="plu-${id}" value="${r.plu||''}" placeholder="21025"
       oninput="setf(${id},'plu',this.value)"/></td>
  <td class="tl"><input class="ci tl w-name" id="name-${id}" value="${r.name||''}" placeholder="Harydyň ady…"
       oninput="setf(${id},'name',this.value)"/></td>
  <td><input class="ci w-code" id="code-${id}" value="${r.code||''}" placeholder="S22"
       oninput="setf(${id},'code',this.value)"/></td>
  <td><input class="ci w-width mn" id="width-${id}" value="${r.width||''}" placeholder="140"
       oninput="setf(${id},'width',this.value)"/></td>
  <td>
    <select class="mode-sel" id="mode-${id}" onchange="setf(${id},'mode',this.value)">
      ${modeOpts}
    </select>
  </td>
  <td><input class="ci w-med mn" type="number" min="0" step="1" id="gross-${id}"
       value="${r.gross>0?Math.round(r.gross):''}" placeholder="0"
       oninput="onGross(${id},this.value)"/></td>
  <td><input class="ci w-med mn" type="number" min="0" step="1" id="tare-${id}"
       value="${r.tare>0?Math.round(r.tare):''}" placeholder="0"
       oninput="onTare(${id},this.value)"/></td>
  <td><span class="cc" id="net-${id}">—</span></td>
  <td><input class="ci w-sm" id="self-${id}" value="${r.self||''}" placeholder="—"
       oninput="setf(${id},'self',this.value)"/></td>
  <td><input class="ci w-sm" id="label-${id}" value="${r.label||''}" placeholder="—"
       oninput="setf(${id},'label',this.value)"/></td>
  <td><input class="ci w-sm" id="shop-${id}" value="${r.shop||''}" placeholder="0"
       oninput="setf(${id},'shop',this.value)"/></td>
  <td><input class="ci w-num mn" type="number" min="1" step="1" id="bqty-${id}"
       value="${r.box_qty||2}" placeholder="2"
       oninput="setf(${id},'box_qty',parseInt(this.value)||2)"/></td>
  <td><button class="btn-del" onclick="delRow(${id})" title="Poz">✕</button></td>`;
}

/* ══ HANDLERS ════════════════════════════════════════════ */
function setf(id,f,v){ const r=rows.get(id); if(r) r[f]=v; }

function onGross(id,v){
  const r=rows.get(id); if(!r) return;
  r.gross=parseFloat(v)||0; recalc(id);
}
function onTare(id,v){
  const r=rows.get(id); if(!r) return;
  r.tare=parseFloat(v)||0; recalc(id);
}

/* ══ RECALC: Netto = Brutto − Gilza(Tare) ══ */
function recalc(id){
  const r=rows.get(id); if(!r) return;
  // Netto = Brutto (arassa, gilzasyz) + Gilza/Tara
  const net = r.gross + r.tare;
  const el = document.getElementById('net-'+id);
  if(el) el.textContent = r.gross>0 ? fg(net) : '—';
  totals();
}

/* Agram formatlaýjy — gram (bütin san) */
function fg(n){ return String(Math.round(Number(n)||0)); }

/* ══ TOTALS ══════════════════════════════════════════════ */
function totals(){
  let sg=0, st=0, sn=0;
  document.querySelectorAll('#tbody tr').forEach(tr=>{
    const id=parseInt(tr.dataset.id);
    const r=rows.get(id); if(!r) return;
    sg += r.gross;
    st += r.tare;
    sn += r.gross + r.tare;
  });
  document.getElementById('tfoot').innerHTML=`
    <tr class="tf">
      <td colspan="6"></td>
      <td class="tfl">Brutto:</td>
      <td class="tfv">${fg(sg)} g</td>
      <td class="tfl">+Gilza:</td>
      <td class="tfl"></td>
      <td class="tfv">+${fg(st)} g</td>
      <td class="tfl">NETTO JEMI:</td>
      <td class="tfv big">${fg(sn)} g</td>
    </tr>`;
}

/* ══ DELETE / RENUMBER ═══════════════════════════════════ */
function delRow(id){
  const tr=document.getElementById('row-'+id);
  if(tr) tr.remove();
  rows.delete(id);
  renumber(); totals();
}
function renumber(){
  document.querySelectorAll('#tbody tr').forEach((tr,i)=>{
    const el=document.getElementById('rn-'+tr.dataset.id);
    if(el) el.textContent=i+1;
  });
}

/* ══ CLEAR ALL ═══════════════════════════════════════════ */
function clearAll(){
  if(!confirm('Ähli setirleri pozmak isleýärsiňizmi?')) return;
  document.getElementById('tbody').innerHTML='';
  document.getElementById('tfoot').innerHTML='';
  rows.clear(); rid=0;
  addRow(); addRow(); addRow();
}

/* ══ SAVE ════════════════════════════════════════════════ */
async function saveInvoice(){
  const items=[];
  document.querySelectorAll('#tbody tr').forEach(tr=>{
    const id=parseInt(tr.dataset.id);
    const r=rows.get(id); if(!r) return;
    if(!r.plu && !r.name) return;  // boş setirleri goşmaýarys
    items.push({
      plu:r.plu, name:r.name, code:r.code, width:String(r.width||''),
      mode:r.mode, gross:r.gross, tare:r.tare,
      self:r.self, label:r.label, shop:r.shop, boxQty:r.box_qty
    });
  });

  if(items.length===0){ alert('Iň bolmanda bir haryt setiri giriziň!'); return; }

  const data={
    fakturaNo: document.getElementById('f-num').value,
    zawod:     document.getElementById('f-zawod').value,
    sklad:     document.getElementById('f-sklad').value,
    date:      document.getElementById('f-date').value,
    issued:    document.getElementById('f-issued').value,
    received:  document.getElementById('f-recv').value,
    items
  };

  const b=document.querySelector('.btn-save');
  const o=b.innerHTML;
  try{
    await API.invoices.create(data);
    b.innerHTML='✓ Saklandy'; b.style.cssText='background:#1e6b45;color:#fff';
    setTimeout(()=>{b.innerHTML=o;b.style.cssText=''},1800);
  }catch(e){alert('Ýalňyşlyk: '+e.message)}
}

/* ══ BARCODE SKAN (faktura sahypasynda) ══════════════════
   Diňe Enter basylanda işleýär (skaner hem Enter iberýär).
   Barkod ITEM_DB-den gözlenýär.
══════════════════════════════════════════════════════ */
(function(){
  const inp   = document.getElementById('bc-in');
  const flash = document.getElementById('bc-flash');
  const chips = document.getElementById('bc-chips');
  if(!inp) return;

  function showFlash(msg,type){
    flash.textContent=msg; flash.className='bc-flash '+type;
    clearTimeout(flash._t);
    flash._t=setTimeout(()=>{ flash.className='bc-flash'; },2400);
  }

  function emptyPluRow(){
    for(const tr of document.querySelectorAll('#tbody tr')){
      const id=parseInt(tr.dataset.id);
      const el=document.getElementById('plu-'+id);
      if(el && !el.value.trim()) return id;
    }
    return null;
  }

  function fillRow(tid, res, product){
    const r = rows.get(tid); if(!r) return;

    const pluEl = document.getElementById('plu-'+tid);
    if(pluEl){ pluEl.value = res.plu; r.plu = res.plu; }

    if(product){
      const nameEl  = document.getElementById('name-'+tid);
      const codeEl  = document.getElementById('code-'+tid);
      const widthEl = document.getElementById('width-'+tid);
      const tareEl  = document.getElementById('tare-'+tid);

      if(nameEl  && product.name)  { nameEl.value  = product.name;               r.name  = product.name; }
      if(codeEl  && product.code)  { codeEl.value  = product.code;               r.code  = product.code; }
      if(widthEl && product.mm)    { widthEl.value = product.mm;                 r.width = product.mm; }
      if(tareEl  && product.tare)  { tareEl.value  = String(Math.round(+product.tare)); r.tare  = +product.tare; }
    }

    let grossVal = res.gross > 0 ? res.gross : (product && product.gram ? (+product.gram) : 0);
    if(grossVal > 0){
      const gEl = document.getElementById('gross-'+tid);
      if(gEl){ gEl.value = String(Math.round(grossVal)); r.gross = grossVal; }
    }

    recalc(tid);

    const tr = document.getElementById('row-'+tid);
    if(tr){
      tr.style.transition = 'background .15s';
      tr.style.background = 'rgba(200,168,75,.22)';
      setTimeout(()=>{ tr.style.background=''; }, 1000);
    }

    const nEl = document.getElementById('name-'+tid);
    if(nEl && !nEl.value.trim()) nEl.focus();
    else {
      const gEl = document.getElementById('gross-'+tid);
      if(gEl && !gEl.value) gEl.focus();
    }
  }

  function apply(code){
    code = code.trim(); if(!code) return;

    const dbItem = findItemByBarcode(code);

    let res;
    if(dbItem){
      res = {fmt:'DB', plu: dbItem.plu, gross: dbItem.gram ? (+dbItem.gram) : 0};
    } else {
      res = parseBC(code);
    }
    if(!res){ showFlash('✗ Format nädogry','err'); return; }

    const product = dbItem || findItemByPlu(res.plu) || null;

    document.getElementById('bp-plu').textContent = res.plu || '—';
    document.getElementById('bp-net').textContent = res.gross > 0 ? Math.round(res.gross)+' gr.' : '—';
    document.getElementById('bp-fmt').textContent = res.fmt;
    chips.style.display = 'flex';

    let tid = emptyPluRow();
    if(tid === null){ addRow(); tid = emptyPluRow(); }
    if(tid === null){ showFlash('✗ Ýalňyşlyk','err'); return; }

    if(product){
      fillRow(tid, res, product);
      showFlash('✓ '+product.name, 'ok');
    } else {
      fillRow(tid, res, null);
      showFlash('⚠ PLU '+res.plu+' — bazada ýok, "Harytlar Bazasy"-dan goşuň', 'err');
    }

    inp.value = '';
  }

  inp.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ e.preventDefault(); apply(this.value); }
  });
})();

/* ══════════════════════════════════════════════════════
   ÇAP FORMASY — suratdaky gorizontal grid gurluşy
   15 sütun (rulon ýerleri) × N setir.
   - "Sany" = rulon sany (näçe rulon çap etmeli)
   - Her öýjük = 1 rulon (netto agramy)
   - Doldurma ýokardan aşak, sütün-sütün
   - S.B öýjüginde gram/kg saýlaýjy (başda gram)
   - Aşaky sary hatar = her sütündäki rulon sany
   Diňe BIRINJI doly girizilen haryt çap edilýär.
══════════════════════════════════════════════════════ */
let pfState = null;  // çap öňünden görnüşiniň ýagdaýy (unit çalşanda gaýtadan çyzmak üçin)

function buildPrintForma(){
  const num    = document.getElementById('f-num').value    || '—';
  const zawod  = document.getElementById('f-zawod').value  || '';
  const issued = document.getElementById('f-issued').value || '';
  const recv   = document.getElementById('f-recv').value   || '';
  const date   = document.getElementById('f-date').value;

  let dateStr = '—';
  if(date){
    const d = new Date(date+'T12:00:00');
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const yy = String(d.getFullYear()).slice(-2);
    dateStr = `${dd}.${mm}.${yy}`;
  }

  // Faktura tablisasyndaky ÄHLI doly setirler — her setir = bir agram (öýjük)
  const items = [];
  document.querySelectorAll('#tbody tr').forEach(tr=>{
    const id = parseInt(tr.dataset.id);
    const r  = rows.get(id); if(!r) return;
    if(!r.plu && !r.name) return;
    const net = r.gross + r.tare;   // Netto = Brutto + Gilza
    items.push({...r, net});
  });

  if(items.length === 0){
    alert('Haryt ýok — ilki haryt giriziň!');
    return false;
  }

  const it = items[0];                       // header maglumaty (PLU/ady/ini) birinji setirden
  const weights      = items.map(x=>x.net);  // her setiriň netto agramy = bir öýjük
  const grossWeights = items.map(x=>x.gross||0); // brutto agramlar (jem üçin)
  const tareWeights  = items.map(x=>x.tare||0);  // gilza agramlar (jem üçin)

  const COLS = 15;

  // "1 blokda" = her öýjükdäki rulon sany (default 2, çap etmezden öň üýtgedip bolýar).
  const pbEl = document.getElementById('print-perblock');
  let perBlock = pbEl ? (parseInt(pbEl.value) || 0) : 0;
  if(perBlock <= 0) perBlock = parseInt(it.box_qty) || 2;
  perBlock = Math.max(1, perBlock);

  // Her agram (setir) = 1 öýjük. Öýjükler ýokardan aşak, sütün-sütün dolýar.
  const blocks = weights.length;
  const bqty   = blocks * perBlock;    // jemi rulon = öýjük sany × 1 blokdaky rulon

  // Grid setirlerini öýjük sanyna görä giňeldýäris
  const ROWS = Math.max(10, Math.ceil(blocks / COLS));

  // Unit çalşylanda gaýtadan çyzmak üçin ýagdaýy saklaýarys
  pfState = { it, weights, grossWeights, tareWeights, bqty, perBlock, blocks, COLS, ROWS };

  const gramVal = it.gross > 0 ? Math.round(it.gross)+' gr.' : '';
  const iniVal  = it.width ? it.width+' mm' : '';
  const colNumCells = Array.from({length:COLS},(_,i)=>`<td>${i+1}</td>`).join('');

  const formaBlock = `
  <div class="pf-copy">
  <div class="pf-title-bar">
    <span class="pf-title-txt">Ammar çykyş fakturasy</span>
    <span class="pf-title-num">№ ${num}</span>
    ${zawod ? `<span class="pf-title-zawod">${zawod}</span>` : ''}
  </div>

  <table class="pf-grid">
    <colgroup>
      <col style="width:40px"/>
      ${Array(COLS).fill('<col/>').join('')}
      <col style="width:64px"/>
    </colgroup>
    <thead>
      <tr>
        <td class="th-sb">
          <select class="pf-unit pf-unit-sel" onchange="renderPfValues(this)">
            <option value="gr" selected>gr.</option>
            <option value="kg">kg</option>
          </select>
        </td>
        <td class="th-plu" colspan="2">${it.plu||''}</td>
        <td class="th-alyjy-lbl">Alyjy</td>
        <td class="th-ady" colspan="6">${it.name||''}</td>
        <td class="th-gr" colspan="2">${gramVal}</td>
        <td class="th-mm" colspan="2">${iniVal}</td>
        <td class="th-lik">3lik</td>
        <td class="th-sene" colspan="2">${dateStr}</td>
      </tr>
      <tr class="pf-colnum-row">
        <td class="td-net-lbl">NET</td>
        ${colNumCells}
        <td class="td-jemi-lbl pf-jemi-lbl">Jemi, gr</td>
      </tr>
    </thead>
    <tbody class="pf-body"></tbody>
  </table>

  <div class="pf-footer">
    <div><span class="flbl pf-brutto-lbl">Brutto, gr:</span><span class="fval pf-brutto">0</span></div>
    <div><span class="flbl pf-gilza-lbl">Gilza, gr:</span><span class="fval pf-gilza">0</span></div>
    <div><span class="flbl pf-netto-lbl">Netto, gr:</span><span class="fval pf-netto">0</span></div>
    <div><span class="flbl">Jemi rulon:</span><span class="fval pf-rulon">${bqty||0}</span></div>
  </div>

  <div class="pf-sigs">
    <div class="pf-sig">
      <div class="pf-sig-name">Tabşyran:&nbsp;${issued}</div>
      <div class="pf-sig-line"></div>
    </div>
    <div class="pf-sig">
      <div class="pf-sig-name">Kabul eden:&nbsp;${recv}</div>
      <div class="pf-sig-line"></div>
    </div>
  </div>
  </div>`;

  // Bir A4 listde iki sany meňzeş faktura nusgasy
  document.getElementById('pf-wrap').innerHTML = formaBlock + formaBlock;
  renderPfValues();
  return true;
}

/* Grid öýjüklerini saýlanan birlikde (gr/kg) gaýtadan çyzýar */
function renderPfValues(srcSel){
  if(!pfState) return;
  const { weights, grossWeights, tareWeights, bqty, perBlock, blocks, COLS, ROWS } = pfState;
  const unit = srcSel ? srcSel.value
             : (document.querySelector('.pf-unit') ? document.querySelector('.pf-unit').value : 'gr');
  // Iki nusganyň birlik saýlawjysyny sazlaşdyrýarys
  document.querySelectorAll('.pf-unit').forEach(s=>{ s.value = unit; });
  // Agramlar gramda saklanýar; gr -> bütin gram, kg -> gram/1000
  const fmt = (g)=> unit === 'gr' ? String(Math.round(g)) : (g/1000).toFixed(2);

  // Doldurma: ýokardan aşak, sütün gutaranda indiki sütüne geçýär.
  // Her öýjük = bir agram (setir); öýjük = perBlock rulony aňladýar.
  const grid = Array.from({length:ROWS}, ()=> new Array(COLS).fill(null)); // öýjükdäki agram (gram) ýa-da null
  let placed = 0;
  outer:
  for(let ci=0; ci<COLS; ci++){
    for(let ri=0; ri<ROWS; ri++){
      if(placed >= blocks) break outer;
      grid[ri][ci] = weights[placed];
      placed++;
    }
  }

  let dataRows = '';
  for(let r=0; r<ROWS; r++){
    let rowCells = 0;
    let rowWeight = 0;
    const cells = grid[r].map(w=>{
      const on = w !== null;
      if(on){ rowCells++; rowWeight += w; }
      // Öýjükde şol setiriň agramy (bir rulonyň agramy)
      return `<td class="td-cell${on?' filled':''}">${on ? fmt(w) : ''}</td>`;
    }).join('');
    const rowSum = rowWeight * perBlock;
    dataRows += `<tr class="pf-data-row">
      <td class="td-rn">${r+1}</td>
      ${cells}
      <td class="td-jemi-val${rowCells?' filled':''}">${rowCells ? fmt(rowSum) : ''}</td>
    </tr>`;
  }

  // Sary hatar — diňe haryt (agram) bar bolan sütünleriň aşagynda rulon sany görkezilýär;
  // boş sütünler boş galýar. Baha = şol sütündäki öýjük sany × perBlock, çap etmezden öň
  // el bilen üýtgedip bolýar. Soňky öýjük = jemi rulon (agramly öýjüklerden).
  const saryCells = Array.from({length:COLS}, (_,ci)=>{
    let filledInCol = 0;
    for(let ri=0; ri<ROWS; ri++){ if(grid[ri][ci] !== null) filledInCol++; }
    if(filledInCol === 0) return `<td></td>`;
    return `<td><input class="pf-sary-in" type="number" min="0" step="1" value="${perBlock}"/></td>`;
  }).join('');
  const saryRow = `<tr class="pf-sary-row">
    <td class="td-sary-empty"></td>
    ${saryCells}
    <td>${bqty || 0}</td>
  </tr>`;

  const bodyHTML = dataRows + saryRow;
  const totalNetto  = weights.reduce((s,w)=>s+w, 0) * perBlock;
  const totalBrutto = (grossWeights||[]).reduce((s,w)=>s+w, 0) * perBlock;
  const totalGilza  = (tareWeights||[]).reduce((s,w)=>s+w, 0) * perBlock;
  const unitLbl = unit === 'gr' ? 'gr' : 'kg';

  // Ähli nusgalara birmeňzeş ýazýarys
  document.querySelectorAll('.pf-body').forEach(b=>{ b.innerHTML = bodyHTML; });
  document.querySelectorAll('.pf-jemi-lbl').forEach(e=>{ e.textContent   = 'Jemi, ' + unit; });
  document.querySelectorAll('.pf-brutto-lbl').forEach(e=>{ e.textContent = 'Brutto, ' + unitLbl + ':'; });
  document.querySelectorAll('.pf-brutto').forEach(e=>{ e.textContent     = fmt(totalBrutto); });
  document.querySelectorAll('.pf-gilza-lbl').forEach(e=>{ e.textContent  = 'Gilza, ' + unitLbl + ':'; });
  document.querySelectorAll('.pf-gilza').forEach(e=>{ e.textContent      = fmt(totalGilza); });
  document.querySelectorAll('.pf-netto-lbl').forEach(e=>{ e.textContent  = 'Netto, ' + unit + ':'; });
  document.querySelectorAll('.pf-netto').forEach(e=>{ e.textContent      = fmt(totalNetto); });
}

/* Çap düwmesi — öňünden görnüşi açýar (göni çap etmeýär) */
function openPrint(){
  if(buildPrintForma()){
    document.getElementById('print-preview').classList.add('open');
  }
}
function closePrintPreview(){
  document.getElementById('print-preview').classList.remove('open');
}
function doPrint(){
  window.print();
}
