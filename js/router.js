'use strict';

/* ══════════════════════════════════════════════════════
   ROUTER — SPA sahypa geçişi (navigation)
   Sahypalary görkezýär/gizleýär we hash bilen sinhronizasiýa.
══════════════════════════════════════════════════════ */

const PAGES = ['inventory', 'invoice', 'admin'];
const ADMIN_PAGES = ['invoice', 'admin'];

function navigate(page){
  if(!PAGES.includes(page)) page = 'inventory';

  // Diňe admin sahypalary — ulanyjy bolsa Harytlar Bazasyna gaýtarylýar
  if(ADMIN_PAGES.includes(page) && !(typeof isAdmin === 'function' && isAdmin())){
    page = 'inventory';
  }

  PAGES.forEach(p=>{
    const sec = document.getElementById('page-'+p);
    if(sec) sec.style.display = (p === page) ? '' : 'none';
  });

  document.querySelectorAll('.sb-link').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  if(location.hash !== '#'+page){
    history.replaceState(null, '', '#'+page);
  }

  // Sahypa açylanda degişli maglumaty serwerden täzeden çyz
  if(page === 'inventory') renderInventory();
  if(page === 'invoice'   && typeof refreshItems === 'function') refreshItems().catch(()=>{});
  if(page === 'admin'     && typeof renderUsers  === 'function') renderUsers();

  window.scrollTo({top:0});
}

// Hash üýtgände (yza/öňe düwmeleri) — sinhronla
window.addEventListener('hashchange', ()=>{
  navigate((location.hash || '#inventory').slice(1));
});

// Başlangyç navigasiýany auth.js (boot) dolandyrýar — token barlanandan soň
// setGuestMode() ýa-da enterAdmin() çagyrylyp, navigate() işledilýär.
