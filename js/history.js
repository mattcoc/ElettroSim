/* ElettroSim · Annulla/Ripeti, salvataggio automatico e validazione dei documenti. */
'use strict';
/* ---------- history & persistence ---------- */
const hist = { stack: [], i: -1 };
let saveTimer = null;
function snapshot() { return JSON.stringify(doc); }
function resetHistory() { hist.stack = [snapshot()]; hist.i = 0; updUndo(); }
function commit(opts) {
  touch();
  const s = snapshot();
  if (hist.stack[hist.i] === s) { if (!(opts && opts.keepProps)) refreshPanels(); render(); return; }
  hist.stack = hist.stack.slice(0, hist.i + 1);
  hist.stack.push(s);
  if (hist.stack.length > 200) hist.stack.shift();
  hist.i = hist.stack.length - 1;
  updUndo(); scheduleSave();
  if (!(opts && opts.keepProps)) refreshPanels(); else refreshCheckBadge();
  render();
}
function undo() { if (SIM.on || hist.i <= 0) return; hist.i--; restore(hist.stack[hist.i]); }
function redo() { if (SIM.on || hist.i >= hist.stack.length - 1) return; hist.i++; restore(hist.stack[hist.i]); }
function restore(s) {
  doc = wrapDoc(JSON.parse(s)); touch();
  if (doc.page >= doc.pages.length) doc.page = 0;
  for (const id of [...ui.sel]) if (!cmap().has(id) && !doc.wires.some(w => w.id === id)) ui.sel.delete(id);
  ui.draft = null;
  updUndo(); scheduleSave(); renderTabs(); refreshPanels(); render();
}
function updUndo() { const u = $('#bUndo'), r = $('#bRedo'); if (u) u.disabled = hist.i <= 0; if (r) r.disabled = hist.i >= hist.stack.length - 1; }
const LS = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
};
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { const ok = LS.set('elettrosim.current', snapshot()); const el = $('#stSave'); if (el) el.textContent = ok ? 'Salvato automaticamente nel browser' : 'Schema troppo grande per il salvataggio automatico: scarica il file'; }, 500);
  cloudSchedule();
  coopSchedule();
}

function validateComp(c, ids) {
  if (!c || !DEF[c.type] || ids.has(c.id)) return null;
  const n = { id: String(c.id || uid('c')), type: c.type, x: snap(+c.x || 0), y: snap(+c.y || 0), rot: ((+c.rot || 0) % 4 + 4) % 4, flip: !!c.flip, name: String(c.name ?? ''), labels: c.labels && typeof c.labels === 'object' ? c.labels : {}, props: Object.assign(JSON.parse(JSON.stringify(DEF[c.type].props || {})), c.props || {}) };
  if (DEF[c.type].shape) { n.x = Math.round(+c.x || 0); n.y = Math.round(+c.y || 0); }
  if (c.autoLab) n.autoLab = true;
  if (c.showName != null) n.showName = !!c.showName;
  ids.add(n.id);
  return n;
}
function validateDoc(d) {
  if (!d || typeof d !== 'object') throw new Error('Il file non contiene uno schema di ElettroSim.');
  let pages;
  if (Array.isArray(d.pages)) pages = d.pages;
  else if (Array.isArray(d.comps) && Array.isArray(d.wires)) pages = [{ name: 'Foglio 1', comps: d.comps, wires: d.wires }];
  else throw new Error('Il file non contiene uno schema di ElettroSim.');
  const out = { v: 2, meta: Object.assign(newMeta(), d.meta && typeof d.meta === 'object' ? d.meta : {}), pages: [], page: 0 };
  if (!SHEETS[out.meta.sheet]) out.meta.sheet = 'A4';
  const ids = new Set();
  for (const p of pages) {
    if (!p) continue;
    const pg = { id: String(p.id || uid('p')), name: String(p.name || `Foglio ${out.pages.length + 1}`), comps: [], wires: [] };
    for (const c of (Array.isArray(p.comps) ? p.comps : [])) { const n = validateComp(c, ids); if (n) pg.comps.push(n); }
    const terms = new Set();
    for (const c of pg.comps) for (const t of termsOf(c)) terms.add(c.id + '|' + t.id);
    const wids = new Set();
    for (const w of (Array.isArray(p.wires) ? p.wires : [])) {
      if (!w || !w.a || !w.b) continue;
      const a = { c: String(w.a.c), t: String(w.a.t) }, b = { c: String(w.b.c), t: String(w.b.t) };
      if (!terms.has(a.c + '|' + a.t) || !terms.has(b.c + '|' + b.t) || (a.c === b.c && a.t === b.t)) continue;
      const id = w.id && !wids.has(w.id) ? String(w.id) : uid('w');
      wids.add(id);
      const pts = Array.isArray(w.pts) ? w.pts.filter(q => Array.isArray(q) && q.length === 2).map(q => [snap(+q[0] || 0), snap(+q[1] || 0)]) : [];
      const nw = { id, a, b, pts };
      if (w.color && WIRE_COL[w.color] !== undefined) nw.color = w.color;
      pg.wires.push(nw);
    }
    out.pages.push(pg);
  }
  if (!out.pages.length) out.pages.push(newPage('Foglio 1'));
  out.page = clamp(+d.page || 0, 0, out.pages.length - 1);
  return wrapDoc(out);
}
function loadDoc(d, msg) {
  if (SIM.on) stopSim();
  if (COOP.room) coopLeave(true);
  doc = validateDoc(d); touch();
  setCloudId(null);
  ui.sel.clear(); ui.draft = null; ui.place = null;
  resetHistory(); scheduleSave(); renderTabs(); refreshPanels(); fitView(); render();
  if (msg) toast(msg);
}
const SIM = { on: false, paused: false, S: null, topo: null, disp: {}, last: null, timer: null, lastT: 0, speed: 1, fault: null, sig: '', claimed: new Set(), outClaimed: new Set(), manual: [], sysPots: {}, held: null, gr: null, cpus: [] };

function claimsOf(c) {
  const d = DEF[c.type], k = nkey(c), out = [];
  if (d.isCoil || d.signal || d.logic || d.monitorDev || c.type === 'phtx' || c.type === 'lad_coil' || c.type === 'lad_set' || c.type === 'lad_reset' || d.cat === 'erel') out.push(k);
  if (c.type === 'coil_bist' || c.type === 'counter') out.push(k);
  if (d.plc && d.addr) d.addr.di.forEach(a => out.push(key(a)));
  if (c.type === 'plc_di') out.push(k);
  if (c.type === 'arduino') for (let i = 2; i <= 13; i++) out.push('D' + i);
  if (d.pneu) { const N = pneuNames(c); [N.s0, N.s1, N.sm].filter(Boolean).forEach(n => out.push(key(n))); }
  if (d.grAct) out.push(k);
  if (d.grStep && c.name) out.push('X' + key(c.name));
  return out;
}
function outClaimsOf(c) {
  const d = DEF[c.type];
  if (c.type === 'lad_coil' || c.type === 'lad_set' || d.grAct || d.logic || d.isCoil) return [nkey(c)];
  return [];
}
