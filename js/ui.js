/* ElettroSim · Stili del foglio, messaggi, finestre, menu, libreria dei componenti e schede dei fogli. */
'use strict';
/* ---------- sheet styles (shared by page and exports) ---------- */
const SHEET_CSS = `.sheet text{font-family:"IBM Plex Sans Condensed","Arial Narrow",Arial,sans-serif;fill:#1b1f23}
.sheet .bg{fill:#fff}.sheet .frame{fill:none;stroke:#3d4852;stroke-width:1}.sheet .frame-t{font-size:9px;fill:#3d4852}
.sheet .tb-l{font-size:6.5px;fill:#5d6a75;letter-spacing:.04em;text-transform:uppercase}.sheet .tb-v{font-size:10px}.sheet .tb-title{font-size:15px;font-weight:600}
.sym line,.sym path,.sym circle,.sym rect,.sym ellipse,.sym polyline,.sym polygon{fill:none;stroke:#1b1f23;stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}
.sym .d{stroke-dasharray:3 2.2}.sym .fill{fill:#1b1f23}.sym .coil-on{fill:#f6b4b4}.sym .blown{stroke:#d12e2e}.sym .trip{fill:#f9d0d0}
.sym .motor-on,.sym .box-on,.sym .valve-on{fill:#dcecf9}.sym .heat{fill:#fbcf9f}.sym .step-on{fill:#d4f0dc}.sym .led-on{fill:#22c55e;stroke:#15803d}
.sym .glow{stroke:none!important;opacity:.33}.sym .act-on{stroke:#c2611f}.sym .wave{stroke:#c2611f}
.sym .rail{stroke-width:2.4}.sym .rail-on{stroke:#d92626;stroke-width:2.4}.sym .piston{fill:#9aa6b0}.sym .rod{fill:#d5dbe0}
.sym .seg-on{stroke:#e11d48;stroke-width:3.2}.sym .seg-off{stroke:#edf0f2;stroke-width:3.2}
.sym .fv-body{fill:#e6eaed;stroke:#7d8992}.sym .fv3d .fv-body{fill:#dde3e7;filter:drop-shadow(2.5px 2.5px 0 #98a4ad)}.sym .fv-slot{fill:#c3cbd1}
.sym .fv-on{fill:#16a34a;stroke:#0f6b31}.sym .fv-off{fill:#69747d;stroke:#4b555d}.sym .fv-trip{fill:#f59e0b;stroke:#b26b00}.sym .fv-label{fill:#fff}
.sym .fv-test{fill:#facc15}.sym .fv-window{fill:#f6f8f9}.sym .fv-led{fill:#cdd4d9}.sym .fv-cap{stroke:#4b555d}.sym .fv-ring{stroke:#9aa5ae}.sym .fv-key{fill:#f6f8f9}.sym .fv-term{fill:#d8dee3}
.sym.sel line,.sym.sel path,.sym.sel circle,.sym.sel rect,.sym.sel ellipse,.sym.sel polygon{stroke:#c2611f}
.sheet .stx{fill:#1b1f23;stroke:none}
.wire{fill:none;stroke:#1b1f23;stroke-width:1.2;stroke-linejoin:round;stroke-linecap:round}.wire.pe{stroke:#16803d;stroke-dasharray:6 3}.wire.sel{stroke:#c2611f!important;stroke-width:2.2}
.sim .wire{stroke:#c3cad0}.sim .wire.pe{stroke:#16803d;stroke-width:1.5;stroke-dasharray:6 3}.sim .wire.live{stroke:#d92626;stroke-width:1.9}.sim .wire.neu{stroke:#2160e0;stroke-width:1.9}
.sim .wire.short{stroke:#c026d3;stroke-width:3;animation:esblink .5s steps(2) infinite}@keyframes esblink{50%{opacity:.3}}
.dot{fill:#1b1f23;stroke:none}.sim .dot.live{fill:#d92626}.sim .dot.neu{fill:#2160e0}.sim .dot.dead{fill:#c3cad0}.sim .dot.pe{fill:#16803d}.sim .dot.short{fill:#c026d3}
.sheet .uncon{fill:#fff;stroke:#d06a6a;stroke-width:.9}.hot{fill:none;stroke:#c2611f;stroke-width:1.6}.hot-fill{fill:#c2611f;opacity:.18}
.selbox{fill:none;stroke:#c2611f;stroke-width:1;stroke-dasharray:4 3}.band{fill:rgba(194,97,31,.07);stroke:#c2611f;stroke-width:1;stroke-dasharray:4 3}
.draft{fill:none;stroke:#c2611f;stroke-width:1.5;stroke-dasharray:5 3}.ghost{opacity:.5}
.lbl{font-size:8.5px}.lbl-name{font-size:9.5px;font-weight:600}.lbl-term{font-size:6.6px;fill:#4a5560!important}.lbl-pot{font-size:8px;font-weight:600}
.lbl-in{font-size:10px;font-weight:600}.lbl-timer{font-size:7.5px;fill:#a15c00!important;font-weight:600}.lbl-pin{font-size:6.6px;fill:#39434c!important}
.lbl-box{font-size:9px;font-weight:600}.lbl-expr{font-size:8.5px;font-style:italic}.wnum{font-size:7px;fill:#2160e0!important}.xref{font-size:6px;fill:#5d6a75!important}`;

/* ---------- toasts, modals, menus ---------- */
function toast(msg, kind) {
  const box = $('#toasts'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast' + (kind === 'err' ? ' err' : '');
  el.textContent = msg;
  box.appendChild(el);
  while (box.children.length > 3) box.firstChild.remove();
  setTimeout(() => el.remove(), kind === 'err' ? 4200 : 2600);
}
function closeModal() { const m = $('#scrim'); if (m) m.remove(); }
function modal(title, bodyHTML, footHTML, wide) {
  closeModal();
  const s = document.createElement('div');
  s.className = 'scrim'; s.id = 'scrim';
  s.innerHTML = `<div class="modal${wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}"><header><h2>${esc(title)}</h2><button class="btn ico" data-x title="Chiudi"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header><div class="mb">${bodyHTML}</div>${footHTML ? `<footer>${footHTML}</footer>` : ''}</div>`;
  s.addEventListener('pointerdown', e => { if (e.target === s) closeModal(); });
  s.querySelector('[data-x]').onclick = closeModal;
  document.body.appendChild(s);
  return s;
}
function confirmBox(title, text, okLabel, onOk) {
  const m = modal(title, `<p class="note" style="font-size:13px">${esc(text)}</p>`, `<button class="pbtn" data-c>Annulla</button><button class="pbtn primary" data-ok>${esc(okLabel)}</button>`);
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-ok]').onclick = () => { closeModal(); onOk(); };
}
function promptBox(title, label, value, okLabel, onOk) {
  const m = modal(title, `<div class="f"><label for="pbIn">${esc(label)}</label><input id="pbIn" type="text" value="${esc(value)}" autocomplete="off"></div>`, `<button class="pbtn" data-c>Annulla</button><button class="pbtn primary" data-ok>${esc(okLabel)}</button>`);
  const inp = m.querySelector('#pbIn');
  const ok = () => { const v = inp.value.trim(); if (!v) { inp.focus(); return; } closeModal(); onOk(v); };
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-ok]').onclick = ok;
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
  setTimeout(() => { inp.focus(); inp.select(); }, 20);
}
function openHelp() {
  const m = modal('Come si usa ElettroSim', `
    <ol class="steps">
      <li><div><b>Posa i componenti</b>Cerca un simbolo nella libreria <span class="m">Componenti</span>: cliccalo e poi clicca sul foglio, oppure trascinalo. Tieni premuto Maiusc per posarne altri uguali.</div></li>
      <li><div><b>Collega i morsetti</b>Clicca su un morsetto (il pallino all’estremità del simbolo) e poi su un altro. Clic sul foglio aggiunge una curva, Esc annulla.</div></li>
      <li><div><b>Dai le sigle</b>Seleziona un elemento e scrivi la sigla nel pannello <span class="m">Proprietà</span>. Elementi con la stessa sigla lavorano insieme: la bobina KM1 muove tutti i contatti KM1.</div></li>
      <li><div><b>Verifica e simula</b>Premi <span class="m">Verifica</span> per trovare errori, poi <span class="m">Simula</span> e clicca pulsanti, interruttori e sensori per azionarli.</div></li>
    </ol>
    <h3 class="mh3">Scorciatoie da tastiera</h3>
    <dl class="keys two">
      <dt><kbd>V</kbd></dt><dd>Seleziona</dd><dt><kbd>W</kbd></dt><dd>Cavo</dd>
      <dt><kbd>T</kbd></dt><dd>Testo</dd><dt><kbd>L</kbd></dt><dd>Linea</dd>
      <dt><kbd>R</kbd></dt><dd>Ruota</dd><dt><kbd>M</kbd></dt><dd>Specchia</dd>
      <dt><kbd>Canc</kbd></dt><dd>Elimina</dd><dt><kbd>Esc</kbd></dt><dd>Annulla l’azione in corso</dd>
      <dt><kbd>Ctrl</kbd>+<kbd>Z</kbd></dt><dd>Annulla</dd><dt><kbd>Ctrl</kbd>+<kbd>Y</kbd></dt><dd>Ripeti</dd>
      <dt><kbd>Ctrl</kbd>+<kbd>C</kbd> / <kbd>V</kbd></dt><dd>Copia, incolla</dd><dt><kbd>Ctrl</kbd>+<kbd>D</kbd></dt><dd>Duplica</dd>
      <dt><kbd>Ctrl</kbd>+<kbd>S</kbd></dt><dd>Salva nel browser</dd><dt><kbd>Frecce</kbd></dt><dd>Sposta la selezione</dd>
      <dt><kbd>Rotella</kbd></dt><dd>Zoom</dd><dt><kbd>0</kbd></dt><dd>Adatta al foglio</dd>
      <dt><kbd>Spazio</kbd>+trascina</dt><dd>Sposta la vista</dd><dt><kbd>Pag↑</kbd> <kbd>Pag↓</kbd></dt><dd>Cambia foglio</dd>
      <dt><kbd>F9</kbd></dt><dd>Avvia / ferma la simulazione</dd><dt><kbd>P</kbd> <kbd>N</kbd></dt><dd>Pausa, passo</dd>
    </dl>
    <p class="note">Su tablet e telefono: due dita per zoomare, un dito sul foglio vuoto per spostare la vista, tieni premuto un elemento per aprire il suo menu (anche il tasto destro del mouse lo apre). Il lavoro viene salvato automaticamente in questo browser.</p>`,
    '<button class="pbtn" data-ex>Apri un esempio</button><button class="pbtn primary" data-c>Ho capito</button>', true);
  m.querySelector('[data-c]').onclick = closeModal;
  m.querySelector('[data-ex]').onclick = () => { closeModal(); $('#bEx').click(); };
  LS.set('elettrosim.seenHelp', '1');
}
let openMenuEl = null;
function closeMenu() { if (openMenuEl) { openMenuEl.remove(); openMenuEl = null; } }
function menu(anchor, items) {
  closeMenu();
  const m = document.createElement('div');
  m.className = 'menu';
  m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : it.h ? `<div class="mh">${esc(it.h)}</div>` : `<button data-i="${i}"${it.dis ? ' disabled' : ''}>${esc(it.t)}${it.k ? `<span class="kbd">${esc(it.k)}</span>` : ''}</button>`).join('');
  document.body.appendChild(m);
  const r = anchor.getBoundingClientRect();
  m.style.left = Math.max(8, Math.min(r.left, window.innerWidth - m.offsetWidth - 8)) + 'px';
  const top = r.bottom + 6;
  if (top + m.offsetHeight > window.innerHeight - 8) m.style.top = Math.max(8, r.top - m.offsetHeight - 6) + 'px'; else m.style.top = top + 'px';
  m.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (!b || b.disabled) return; const it = items[+b.dataset.i]; closeMenu(); it.f(); });
  openMenuEl = m;
  setTimeout(() => document.addEventListener('pointerdown', function h(ev) { if (!m.contains(ev.target)) { closeMenu(); document.removeEventListener('pointerdown', h, true); } }, true), 0);
}

/* ---------- previews ---------- */
function compSVG(c) {
  const d = DEF[c.type];
  if (c.type === 'junction') return `<circle class="dot" cx="${c.x}" cy="${c.y}" r="2.4"/>`;
  if (c.type === 'text') { const sz = clamp(+c.props.size || 12, 6, 80); return `<text x="${c.x}" y="${c.y}" font-size="${sz}" dominant-baseline="central" style="fill:${sc(c.props.color)}">${esc(String(c.props.text || '').split('\n')[0])}</text>`; }
  if (d.shape) return `<g class="shape" transform="translate(${c.x},${c.y})">${d.draw(c)}</g>`;
  let s = `<g class="sym" transform="${tfStr(c)}">${d.draw(c, null)}</g>`;
  if (d.inner) for (const it of d.inner(c, null)) { const [x, y] = tfP(c, it.x, it.y); s += `<text class="${it.cls || 'lbl'}" x="${r1(x)}" y="${r1(y)}" text-anchor="${it.anchor || 'middle'}" dominant-baseline="central">${esc(it.t)}</text>`; }
  return s;
}
function previewSVG(type, props, rot) {
  if (type === 'junction') return '<svg viewBox="-10 -10 20 20" class="sheet"><circle class="dot" cx="0" cy="0" r="2.6"/><g class="sym"><line x1="-9" y1="0" x2="9" y2="0"/><line x1="0" y1="0" x2="0" y2="9"/></g></svg>';
  if (type === 'text') return '<svg viewBox="0 0 40 24" class="sheet"><text x="20" y="16" text-anchor="middle" font-size="14">Abc</text></svg>';
  if (type === 'image') return '<svg viewBox="0 0 40 30" class="sheet"><g class="sym"><rect x="4" y="3" width="32" height="24" rx="2"/><path d="M8 23l8-9 6 6 4-4 6 7"/><circle cx="27" cy="10" r="2.5"/></g></svg>';
  const c = mkComp(type, 0, 0, props);
  c.rot = rot || 0;
  if (c.type === 'lad_rail_l' || c.type === 'lad_rail_r') c.props.rows = 2;
  const b = boxW(c), pad = 6;
  return `<svg viewBox="${r1(b[0] - pad)} ${r1(b[1] - pad - 4)} ${r1(b[2] - b[0] + 2 * pad)} ${r1(b[3] - b[1] + 2 * pad + 4)}" preserveAspectRatio="xMidYMid meet" class="sheet">${compSVG(c)}</svg>`;
}
function blockSVG(bl) {
  const M = new Map(bl.comps.filter(c => DEF[c.type]).map(c => [c.id, c]));
  if (!M.size) return '<svg viewBox="0 0 10 10"></svg>';
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, s = '';
  for (const c of M.values()) { const b = boxW(c); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); s += compSVG(c); }
  const tp = r => { const c = M.get(r.c); if (!c) return null; const t = termsW(c).find(t => t.id === r.t); return t; };
  for (const w of bl.wires) { const A = tp(w.a), B = tp(w.b); if (!A || !B) continue; const R = routePts([A.x, A.y], A.d, w.pts || [], [B.x, B.y], B.d); s = `<polyline class="wire" points="${R.map(p => p.join(',')).join(' ')}"/>` + s; }
  return `<svg viewBox="${x0 - 6} ${y0 - 6} ${x1 - x0 + 12} ${y1 - y0 + 12}" preserveAspectRatio="xMidYMid meet" class="sheet">${s}</svg>`;
}

/* ---------- library ---------- */
const CATS = [
  ['src', 'Alimentazioni'], ['fuse', 'Fusibili e sezionatori'], ['brk', 'Automatici e protezioni'], ['km', 'Contattori e interruttori'], ['mot', 'Motori'], ['pow', 'Potenza e variatori'],
  ['aux', 'Contatti ausiliari e temporizzati'], ['cmd', 'Comandi manuali'], ['sens', 'Sensori'], ['coil', 'Bobine e segnalazioni'], ['erel', 'Relè elettronici'],
  ['logic', 'Logica digitale'], ['ladder', 'Ladder'], ['grafcet', 'GRAFCET'], ['plc', 'PLC e ingressi/uscite'], ['pneu', 'Pneumatica'], ['fv', 'Vista quadro 2D/3D'], ['link', 'Cavi e connessioni'], ['draw', 'Disegno'],
];
const LIB_EXTRA = {
  src: [['src1', { pot: 'L1' }, 'Fase L1'], ['src1', { pot: 'L2' }, 'Fase L2'], ['src1', { pot: 'L3' }, 'Fase L3'], ['src1', { pot: 'N' }, 'Neutro N'], ['src1', { pot: 'PE' }, 'Terra PE'], ['src1', { pot: 'P' }, '+24 V'], ['src1', { pot: 'M' }, '0 V']],
  ladder: [['l_ton'], ['l_tof'], ['l_tp'], ['l_ctu'], ['l_ctud']],
  pneu: [['coil_ev'], ['mag_no'], ['ls_no']],
  plc: [['lad_rail_l'], ['lad_rail_r']],
};
const LIB_SKIP = new Set(['src1']);
let LIB = [];
function buildLIB() {
  LIB = CATS.map(([cat, name]) => {
    const items = (LIB_EXTRA[cat] || []).map(x => [x[0], x[1] || null, x[2] || null]);
    for (const id of Object.keys(DEF)) { const d = DEF[id]; if (d.id !== id || d.cat !== cat || LIB_SKIP.has(id)) continue; if (!items.some(x => x[0] === id && !x[1])) items.push([id, null, null]); }
    return { cat: name, code: cat, items };
  });
}
function loadBlocks() { try { const b = JSON.parse(LS.get('elettrosim.blocks') || '[]'); return Array.isArray(b) ? b.filter(x => x && Array.isArray(x.comps)) : []; } catch (e) { return []; } }
function saveBlocks(b) { if (!LS.set('elettrosim.blocks', JSON.stringify(b))) toast('Il browser non permette di salvare i blocchi.', 'err'); cloudSaveBlocks(b); }
let libOpen = null;
function buildLibrary() {
  const box = $('#libList');
  if (libOpen === null) libOpen = new Set([0, 3, 7]);
  else libOpen = new Set($$('details.cat', box).filter(d => d.open).map(d => +d.dataset.g));
  let html = '';
  LIB.forEach((g, gi) => {
    html += `<details class="cat" ${libOpen.has(gi) ? 'open' : ''} data-g="${gi}"><summary><span class="t">${esc(g.cat)}</span><span class="n">${g.items.length}</span></summary><div class="tiles">`;
    g.items.forEach((it, ii) => {
      const [type, props, label] = it, d = DEF[type];
      const lab = label || d.label;
      html += `<div class="tile" role="button" tabindex="0" data-g="${gi}" data-i="${ii}" title="${esc(d.desc || lab)}" data-q="${esc((lab + ' ' + g.cat + ' ' + (d.prefix || '')).toLowerCase())}">${previewSVG(type, props, 0)}<span>${esc(lab)}</span></div>`;
    });
    html += '</div></details>';
  });
  html = '<div id="libRecent"></div>' + html;
  const B = loadBlocks(), bg = LIB.length;
  html += `<details class="cat" ${libOpen.has(bg) || B.length ? 'open' : ''} data-g="${bg}"><summary><span class="t">I miei blocchi</span><span class="n">${B.length}</span></summary>`;
  html += B.length ? `<div class="tiles">${B.map(b => `<div class="tile blk" role="button" tabindex="0" data-blk="${esc(b.id)}" title="${esc(b.name)}" data-q="${esc((b.name + ' blocco').toLowerCase())}">${blockSVG(b)}<span>${esc(b.name)}</span><button class="xdel" data-delblk="${esc(b.id)}" title="Elimina il blocco" aria-label="Elimina il blocco ${esc(b.name)}">×</button></div>`).join('')}</div>` : '<p class="empty" style="padding:0 12px 12px">Seleziona più elementi sul foglio e scegli “Salva come blocco” per riusarli qui.</p>';
  html += '</details>';
  html += '<p class="libnone" id="libNone" hidden>Nessun componente trovato. Prova con un’altra parola, ad esempio “relè” o “lampada”.</p>';
  box.innerHTML = html;
  bindTiles(box);
  renderRecent();
  $$('[data-delblk]', box).forEach(b => {
    b.addEventListener('pointerdown', e => e.stopPropagation());
    b.onclick = e => { e.stopPropagation(); const id = b.dataset.delblk; const bl = loadBlocks().find(x => x.id === id); confirmBox('Eliminare il blocco?', `Il blocco “${bl ? bl.name : ''}” verrà rimosso dalla libreria.`, 'Elimina', () => { saveBlocks(loadBlocks().filter(x => x.id !== id)); buildLibrary(); }); };
  });
  filterLib();
}
function bindTiles(box) {
  $$('.tile', box).forEach(el => {
    el.addEventListener('pointerdown', libDown);
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); armTile(el); } });
  });
}
function loadRecent() { try { const r = JSON.parse(LS.get('elettrosim.recent') || '[]'); return Array.isArray(r) ? r.filter(x => Array.isArray(x) && DEF[x[0]]) : []; } catch (e) { return []; } }
function noteLibRecent(P) {
  const it = [P.type, P.props || null, P.label || null], k = JSON.stringify(it);
  const R = [it, ...loadRecent().filter(x => JSON.stringify(x) !== k)].slice(0, 6);
  LS.set('elettrosim.recent', JSON.stringify(R));
  renderRecent();
}
function renderRecent() {
  const box = $('#libRecent'); if (!box) return;
  const R = loadRecent(), sc = box.parentElement, h0 = box.offsetHeight;
  box.innerHTML = R.length ? `<details class="cat recent" open data-g="r"><summary><span class="t">Usati di recente</span><span class="n">${R.length}</span></summary><div class="tiles">${R.map(([type, props, label], i) => { const lab = label || DEF[type].label; return `<div class="tile" role="button" tabindex="0" data-r="${i}" title="${esc(DEF[type].desc || lab)}" data-q="">${previewSVG(type, props, 0)}<span>${esc(lab)}</span></div>`; }).join('')}</div></details>` : '';
  bindTiles(box);
  filterLib();
  if (sc && sc.scrollTop > 0) sc.scrollTop += box.offsetHeight - h0;
}
function filterLib() {
  const q = ($('#libq').value || '').trim().toLowerCase();
  $('#libqX').hidden = !q;
  let total = 0;
  $$('details.cat', $('#libList')).forEach(d => {
    if (d.dataset.g === 'r') { d.hidden = !!q; return; }
    let any = 0;
    $$('.tile', d).forEach(t => { const ok = !q || t.dataset.q.includes(q); t.hidden = !ok; if (ok) any++; });
    d.hidden = !!q && !any;
    if (q && any) d.open = true;
    total += any;
  });
  const n = $('#libNone'); if (n) n.hidden = !q || total > 0;
}
function tileItem(el) {
  if (el.dataset.blk) { const bl = loadBlocks().find(b => b.id === el.dataset.blk); return bl ? { block: bl } : null; }
  if (el.dataset.r != null) { const it = loadRecent()[+el.dataset.r]; return it ? { type: it[0], props: it[1], label: it[2], rot: 0, lib: true } : null; }
  const it = LIB[+el.dataset.g].items[+el.dataset.i];
  return { type: it[0], props: it[1] || null, label: it[2] || null, rot: 0, lib: true };
}
function blurSearch() { const a = document.activeElement; if (a && a.id === 'libq') a.blur(); }
function armTile(el) {
  if (SIM.on) return;
  const item = tileItem(el); if (!item) return;
  if (item.type === 'image') { $('#imgIn').click(); return; }
  const was = el.classList.contains('armed');
  clearArmed();
  if (was) { ui.place = null; setTool('select'); return; }
  el.classList.add('armed');
  blurSearch();
  ui.place = item; ui.draft = null; ui.tool = 'select';
  ['#tSelect', '#tWire', '#tText', '#tDraw'].forEach(s => $(s).classList.remove('on'));
  updateHint(); render();
  if (window.innerWidth <= 860) $('#lib').classList.remove('open');
}
function libDown(e) {
  if (SIM.on || e.button !== 0) return;
  ui.libDrag = { el: e.currentTarget, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
  e.preventDefault();
}
function libMove(e) {
  const L = ui.libDrag; if (!L || e.pointerId !== L.id) return;
  if (!L.moved && Math.hypot(e.clientX - L.x, e.clientY - L.y) > 6) {
    const it = tileItem(L.el);
    if (!it || it.type === 'image') return;
    L.moved = true; ui.place = it; ui.draft = null; blurSearch();
    if (window.innerWidth <= 860) $('#lib').classList.remove('open');
  }
  if (L.moved) {
    const r = stageRect(), w = toWorld(e.clientX, e.clientY);
    ui.mouse = { x: w.x, y: w.y, in: e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom };
    render();
  }
}
function libUp(e) {
  const L = ui.libDrag; if (!L || e.pointerId !== L.id) return;
  ui.libDrag = null;
  if (!L.moved) { armTile(L.el); return; }
  const r = stageRect();
  if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) placeAt(toWorld(e.clientX, e.clientY), false);
  else { ui.place = null; render(); }
}
function saveSelAsBlock() {
  const cs = selComps();
  if (!cs.length) { toast('Seleziona prima gli elementi da salvare come blocco.'); return; }
  promptBox('Salva come blocco', 'Nome del blocco', cs.find(c => c.name) ? cs.find(c => c.name).name : 'Blocco', 'Salva', name => {
    const ids = new Set(cs.map(c => c.id));
    let x0 = Infinity, y0 = Infinity;
    for (const c of cs) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); }
    const B = loadBlocks();
    B.push({ id: uid('b'), name, comps: JSON.parse(JSON.stringify(cs)), wires: JSON.parse(JSON.stringify(innerWires(ids))), x0, y0 });
    saveBlocks(B); buildLibrary();
    toast(`Blocco “${name}” aggiunto alla libreria.`);
  });
}
function importImage(file) {
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { toast('Immagine troppo grande (massimo 3 MB).', 'err'); return; }
  const r = new FileReader();
  r.onload = () => {
    const src = String(r.result), img = new Image();
    img.onload = () => {
      const k = Math.min(1, 240 / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
      const w = Math.max(10, Math.round((img.naturalWidth || 160) * k)), h = Math.max(10, Math.round((img.naturalHeight || 120) * k));
      const st = stageRect(), cw = toWorld(st.left + st.width / 2, st.top + st.height / 2);
      const c = addComp(mkComp('image', cw.x - w / 2, cw.y - h / 2, { src, w, h }, null));
      ui.sel = new Set([c.id]); setTool('select', true); commit();
    };
    img.onerror = () => toast('Formato di immagine non riconosciuto.', 'err');
    img.src = src;
  };
  r.onerror = () => toast('Impossibile leggere l’immagine.', 'err');
  r.readAsDataURL(file);
}

/* ---------- pages ---------- */
function renderTabs() {
  const el = $('#tabs'); if (!el) return;
  el.innerHTML = doc.pages.map((p, i) => `<button class="tab${i === doc.page ? ' on' : ''}" data-pg="${i}" title="${esc(p.name)}">${esc(p.name)}${i === doc.page && !SIM.on ? '<span class="tmenu" data-pmenu title="Opzioni del foglio">⋯</span>' : ''}</button>`).join('') + (SIM.on ? '' : '<button class="tab add" id="pgAdd" title="Nuovo foglio">+</button>');
  $$('[data-pg]', el).forEach(b => {
    b.onclick = e => { if (e.target.closest('[data-pmenu]')) { pageMenu(b, +b.dataset.pg); return; } switchPage(+b.dataset.pg); };
    b.ondblclick = () => { if (!SIM.on) renamePage(+b.dataset.pg); };
    b.oncontextmenu = e => { e.preventDefault(); if (!SIM.on) pageMenu(b, +b.dataset.pg); };
  });
  const a = $('#pgAdd'); if (a) a.onclick = addPage;
}
function pageMenu(anchor, i) {
  menu(anchor, [
    { t: 'Rinomina…', f: () => renamePage(i) },
    { t: 'Duplica foglio', f: () => dupPage(i) },
    { t: 'Sposta a sinistra', dis: i === 0, f: () => movePage(i, -1) },
    { t: 'Sposta a destra', dis: i === doc.pages.length - 1, f: () => movePage(i, 1) },
    '-',
    { t: 'Elimina foglio', dis: doc.pages.length < 2, f: () => delPage(i) },
  ]);
}
function switchPage(i) {
  if (i === doc.page || i < 0 || i >= doc.pages.length) return;
  doc.page = i; ui.sel.clear(); ui.draft = null; ui.hoverTerm = null;
  renderTabs(); refreshPanels(); render();
}
function addPage() { if (SIM.on) return; doc.pages.push(newPage(`Foglio ${doc.pages.length + 1}`)); doc.page = doc.pages.length - 1; ui.sel.clear(); renderTabs(); commit(); }
function renamePage(i) { promptBox('Rinomina foglio', 'Nome del foglio', doc.pages[i].name, 'Rinomina', v => { doc.pages[i].name = v.slice(0, 40); renderTabs(); commit({ keepProps: true }); }); }
function dupPage(i) {
  const src = doc.pages[i], map = new Map();
  const comps = JSON.parse(JSON.stringify(src.comps)).map(c => { const n = uid('c'); map.set(c.id, n); c.id = n; return c; });
  const wires = JSON.parse(JSON.stringify(src.wires)).map(w => ({ ...w, id: uid('w'), a: { c: map.get(w.a.c), t: w.a.t }, b: { c: map.get(w.b.c), t: w.b.t } }));
  doc.pages.splice(i + 1, 0, { id: uid('p'), name: (src.name + ' (copia)').slice(0, 40), comps, wires });
  doc.page = i + 1; ui.sel.clear(); touch(); renderTabs(); commit();
}
function movePage(i, d) { const j = i + d; if (j < 0 || j >= doc.pages.length) return; const p = doc.pages.splice(i, 1)[0]; doc.pages.splice(j, 0, p); doc.page = j; touch(); renderTabs(); commit({ keepProps: true }); }
function delPage(i) {
  if (doc.pages.length < 2) return;
  const go = () => { doc.pages.splice(i, 1); doc.page = clamp(doc.page >= i ? doc.page - 1 : doc.page, 0, doc.pages.length - 1); ui.sel.clear(); touch(); renderTabs(); commit(); };
  if (doc.pages[i].comps.length) confirmBox('Eliminare il foglio?', `Il foglio “${doc.pages[i].name}” e tutto il suo contenuto verranno eliminati.`, 'Elimina', go); else go();
}
