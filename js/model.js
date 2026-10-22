/* ElettroSim · Documento, fogli, geometria dei componenti, percorsi dei cavi e topologia. */
'use strict';
function today() { try { return new Date().toLocaleDateString('it-IT'); } catch (e) { return ''; } }
function newMeta() { return { title: 'Nuovo schema', author: '', school: '', date: today(), sheet: 'A4', num: '1', of: '1', dash: true, grid: true, tb: true, xref: false, wnum: false, clock: '08:00' }; }
function wrapDoc(d) {
  if (!Object.getOwnPropertyDescriptor(d, 'comps')) {
    Object.defineProperty(d, 'comps', { get() { return this.pages[this.page].comps; }, set(v) { this.pages[this.page].comps = v; }, enumerable: false, configurable: true });
    Object.defineProperty(d, 'wires', { get() { return this.pages[this.page].wires; }, set(v) { this.pages[this.page].wires = v; }, enumerable: false, configurable: true });
  }
  return d;
}
function newPage(name) { return { id: uid('p'), name: name || 'Foglio 1', comps: [], wires: [] }; }
function newDoc() { return wrapDoc({ v: 2, meta: newMeta(), pages: [newPage('Foglio 1')], page: 0 }); }

let doc = newDoc();
const ui = {
  tool: 'select', place: null, sel: new Set(), hoverTerm: null, mouse: { x: 0, y: 0, in: false },
  drag: null, draft: null, band: null, view: { x: 0, y: 0, z: 1 }, clip: null, recent: {}, recentN: 0,
  space: false, pointers: new Map(), pinch: null, libDrag: null, userView: false, shapeDraft: null,
};

let CM = null, PIDX = null;
function touch() { CM = null; PIDX = null; }
function allComps() { return doc.pages.flatMap(p => p.comps); }
function cmap() { if (!CM) { CM = new Map(); PIDX = new Map(); doc.pages.forEach((p, i) => p.comps.forEach(c => { CM.set(c.id, c); PIDX.set(c.id, i); })); } return CM; }
function pageOf(id) { cmap(); return PIDX.get(id); }

function rotV(x, y, r) { r = ((r % 4) + 4) % 4; for (let i = 0; i < r; i++) { const t = x; x = -y; y = t; } return [x, y]; }
function tfP(c, x, y) { if (c.flip) x = -x; const [rx, ry] = rotV(x, y, c.rot || 0); return [c.x + rx, c.y + ry]; }
const DIRV = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };
function vToDir(x, y) { return x > 0.5 ? 'e' : x < -0.5 ? 'w' : y < 0 ? 'n' : 's'; }
function tfD(c, d) { if (!d) return null; let [x, y] = DIRV[d]; if (c.flip) x = -x; [x, y] = rotV(x, y, c.rot || 0); return vToDir(x, y); }
function tfStr(c) { return `translate(${c.x},${c.y}) rotate(${(c.rot || 0) * 90}) scale(${c.flip ? -1 : 1},1)`; }
function termsOf(c) { const d = DEF[c.type]; return d.dynTerms ? d.dynTerms(c) : (d.terms || []); }
function labelOf(c, tid) {
  if (c.labels && c.labels[tid] != null) return c.labels[tid];
  const d = DEF[c.type];
  if (d.labFam === 'ol' && OL_LABS[d.form]) return OL_LABS[d.form][tid] ?? '';
  const t = termsOf(c).find(t => t.id === tid);
  return t ? t.lab : '';
}
function termsW(c) {
  return termsOf(c).map(t => { const [x, y] = tfP(c, t.x, t.y); return { id: t.id, x: Math.round(x) || 0, y: Math.round(y) || 0, d: tfD(c, t.d), lab: labelOf(c, t.id) }; });
}
function termInfo(ref) {
  const c = cmap().get(ref.c); if (!c) return null;
  const t = termsOf(c).find(t => t.id === ref.t); if (!t) return null;
  const [x, y] = tfP(c, t.x, t.y);
  return { x: Math.round(x) || 0, y: Math.round(y) || 0, d: tfD(c, t.d), c };
}
function boxLocal(c) { const d = DEF[c.type]; return typeof d.box === 'function' ? d.box(c) : d.box; }
function boxW(c) {
  const b = boxLocal(c);
  if (DEF[c.type].shape) return [c.x + b[0], c.y + b[1], c.x + b[2], c.y + b[3]];
  const P = [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]].map(p => tfP(c, p[0], p[1]));
  return [Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))];
}

function simplify(R) {
  const A = [];
  for (const p of R) { const l = A[A.length - 1]; if (!l || l[0] !== p[0] || l[1] !== p[1]) A.push([p[0], p[1]]); }
  let i = 1;
  while (i < A.length - 1) { const a = A[i - 1], b = A[i], c = A[i + 1]; if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) A.splice(i, 1); else i++; }
  return A;
}
function routePts(a, da, mids, b, db) {
  const P = [a, ...mids, b], R = [a], n = P.length;
  let prev = null;
  for (let i = 0; i < n - 1; i++) {
    const p = P[i], q = P[i + 1];
    if (p[0] === q[0] || p[1] === q[1]) { R.push(q); prev = p[0] === q[0] ? 'v' : 'h'; continue; }
    const first = i === 0, last = i === n - 2;
    const fv = first && da ? (da === 'n' || da === 's') : null;
    const lv = last && db ? (db === 'n' || db === 's') : null;
    let startV;
    if (fv !== null) {
      if (lv !== null && lv === fv) {
        if (fv) { const m = snap((p[1] + q[1]) / 2); R.push([p[0], m], [q[0], m], q); prev = 'v'; }
        else { const m = snap((p[0] + q[0]) / 2); R.push([m, p[1]], [m, q[1]], q); prev = 'h'; }
        continue;
      }
      startV = fv;
    } else if (lv !== null) startV = !lv;
    else if (prev) startV = prev === 'h';
    else startV = Math.abs(q[1] - p[1]) > Math.abs(q[0] - p[0]);
    R.push(startV ? [p[0], q[1]] : [q[0], p[1]], q);
    prev = startV ? 'h' : 'v';
  }
  return simplify(R);
}
function wireRoute(w) {
  const A = termInfo(w.a), B = termInfo(w.b);
  if (!A || !B) return null;
  return routePts([A.x, A.y], A.d, w.pts || [], [B.x, B.y], B.d);
}
function segDist(px, py, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  let t = L ? ((px - a[0]) * dx + (py - a[1]) * dy) / L : 0;
  t = Math.max(0, Math.min(1, t));
  const x = a[0] + t * dx, y = a[1] + t * dy;
  return { d: Math.hypot(px - x, py - y), x, y };
}

function nextName(prefix, comps) {
  const used = new Set(), P = key(prefix);
  for (const c of comps) { const k = key(c.name); if (k.startsWith(P)) { const n = k.slice(P.length); if (/^\d+$/.test(n)) used.add(+n); } }
  let i = P.endsWith('.') ? 0 : 1; while (used.has(i)) i++;
  return prefix + i;
}
function noteRecent(c) { if (c && c.name) ui.recent[c.type] = { name: c.name, n: ++ui.recentN }; }
function defaultName(c, comps) {
  const d = DEF[c.type];
  if (d.noName) return '';
  if (d.fixedName) return d.fixedName;
  if (d.grStep) { const used = new Set(comps.filter(o => DEF[o.type].grStep).map(o => key(o.name))); let i = 0; while (used.has(String(i))) i++; return String(i); }
  if (d.autoNum || (d.prefix && d.prefix.endsWith('.'))) {
    if (d.prefix.endsWith('.') && d.follow) { const r = recentOf(d.follow, comps); if (r) return r; }
    return nextName(d.prefix, comps);
  }
  if (d.grAct) return recentOf(['coil', 'coil_ev', 'lad_coil', 'coil_k'], comps) || 'KM1';
  return recentOf(d.follow || [], comps) || d.prefix + '1';
}
function recentOf(types, comps) {
  let best = null;
  for (const t of types) { const r = ui.recent[t]; if (r && comps.some(o => key(o.name) === key(r.name)) && (!best || r.n > best.n)) best = r; }
  if (best) return best.name;
  for (const t of types) { const o = comps.find(o => o.type === t && o.name); if (o) return o.name; }
  return null;
}
function assignLabels(c, comps) {
  const d = DEF[c.type];
  if (!c.autoLab || !(d.labFam === 'aux' || d.labFam === 'timed')) return;
  const k = key(c.name), used = new Set();
  for (const o of comps) {
    if (o.id === c.id) continue;
    const od = DEF[o.type];
    if (!(od.labFam === 'aux' || od.labFam === 'timed') || key(o.name) !== k) continue;
    for (const t of termsOf(o)) { const l = String(labelOf(o, t.id)); if (/^\d\d$/.test(l)) used.add(+l[0]); }
  }
  const timed = d.labFam === 'timed';
  const pick = start => { for (let i = 0; i < 9; i++) { const g = ((start - 1 + i) % 9) + 1; if (!used.has(g)) { used.add(g); return g; } } return start; };
  const f = d.form;
  if (f === 'no') { const s = pick(timed ? 6 : 1); c.labels = { a: s + (timed ? '7' : '3'), b: s + (timed ? '8' : '4') }; }
  else if (f === 'nc') { const s = pick(timed ? 5 : 1); c.labels = { a: s + (timed ? '5' : '1'), b: s + (timed ? '6' : '2') }; }
  else if (f === 'nonc') { const s = pick(timed ? 6 : 1), t = pick(timed ? 5 : 2); c.labels = { a1: s + (timed ? '7' : '3'), b1: s + (timed ? '8' : '4'), a2: t + (timed ? '5' : '1'), b2: t + (timed ? '6' : '2') }; }
  else if (f === 'co') { const s = pick(timed ? 5 : 1); c.labels = timed ? { c: s + '5', nc: s + '6', no: s + '8' } : { c: s + '1', nc: s + '2', no: s + '4' }; }
}
function mkComp(type, x, y, props, comps) {
  const d = DEF[type];
  const c = { id: uid('c'), type, x: snap(x), y: snap(y), rot: 0, flip: false, name: '', labels: {}, props: JSON.parse(JSON.stringify(d.props || {})) };
  if (props) Object.assign(c.props, JSON.parse(JSON.stringify(props)));
  if (d.labFam === 'aux' || d.labFam === 'timed') c.autoLab = true;
  if (comps) { c.name = defaultName(c, comps); assignLabels(c, comps); }
  return c;
}

/* ---------- topology over all pages ---------- */
const DUMMYX = { dev: () => ({}), plcRun: () => false, out: () => false, sysPots: () => [], S: {} };
function linksOf(c) { const s = DEF[c.type].sim; if (!s || !s.links) return []; return s.links(c) || []; }
function alwaysOf(c) { const s = DEF[c.type].sim; if (!s || !s.always) return []; return typeof s.always === 'function' ? s.always(c) : s.always; }
function buildTopo() {
  cmap();
  const idx = new Map(), comps = [];
  let n = 0;
  const pos = new Map();
  doc.pages.forEach((pg, pi) => {
    for (const c of pg.comps) {
      comps.push(c);
      for (const t of termsW(c)) { idx.set(c.id + '|' + t.id, n); const k = pi + ':' + t.x + ',' + t.y; if (!pos.has(k)) pos.set(k, []); pos.get(k).push(n); n++; }
    }
  });
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (p, i) => { while (p[i] !== i) { p[i] = p[p[i]]; i = p[i]; } return i; };
  const uni = (p, a, b) => { if (a == null || b == null) return; a = find(p, a); b = find(p, b); if (a !== b) p[a] = b; };
  for (const arr of pos.values()) for (let i = 1; i < arr.length; i++) uni(parent, arr[0], arr[i]);
  for (const pg of doc.pages) for (const w of pg.wires) uni(parent, idx.get(w.a.c + '|' + w.a.t), idx.get(w.b.c + '|' + w.b.t));
  const labels = new Map();
  const I = (c, tid) => idx.get(c.id + '|' + tid);
  const dyn = [], srcs = [], evals = [], ticks = [], diodes = [];
  for (const c of comps) {
    const d = DEF[c.type];
    if (d.netGroup && c.name) { const k = d.netGroup + ':' + key(c.name); const t = termsOf(c)[0]; if (t) { if (labels.has(k)) uni(parent, labels.get(k), I(c, t.id)); else labels.set(k, I(c, t.id)); } }
    const s = d.sim; if (!s) continue;
    for (const [a, b] of alwaysOf(c)) uni(parent, I(c, a), I(c, b));
    linksOf(c).forEach((L, li) => dyn.push({ c, i: I(c, L.a), j: I(c, L.b), on: L.on, li, prot: !!d.protective }));
    if (s.src) srcs.push(c);
    if (s.eval) evals.push(c);
    if (s.tick) ticks.push(c);
    if (s.diode) diodes.push({ c, a: I(c, s.diode.a), k: I(c, s.diode.k) });
  }
  return { idx, n, parent, find, uni, dyn, srcs, evals, ticks, diodes, comps, I };
}
function staticNets(topo) {
  const p = topo.parent.slice();
  const m = new Map();
  for (const c of topo.srcs) {
    let r = null;
    try { r = DEF[c.type].sim.src(c, DUMMYX); } catch (e) { r = null; }
    if (!r) continue;
    for (const tid in r) { const i = topo.I(c, tid); if (i == null || r[tid] == null) continue; const root = topo.find(p, i); const a = m.get(root) || []; if (!a.includes(r[tid])) a.push(r[tid]); m.set(root, a); }
  }
  return { p, m };
}

/* ---------- connection info for drawing (current page) ---------- */
function connInfo(pg) {
  pg = pg || doc.pages[doc.page];
  const wc = new Map();
  for (const w of pg.wires) { const a = w.a.c + '|' + w.a.t, b = w.b.c + '|' + w.b.t; wc.set(a, (wc.get(a) || 0) + 1); wc.set(b, (wc.get(b) || 0) + 1); }
  const groups = new Map();
  for (const c of pg.comps) for (const t of termsW(c)) {
    const pk = t.x + ',' + t.y;
    let g = groups.get(pk); if (!g) { g = { x: t.x, y: t.y, br: 0, keys: [] }; groups.set(pk, g); }
    const k = c.id + '|' + t.id;
    g.br += (wc.get(k) || 0) + (c.type === 'junction' ? 0 : 1) + (DEF[c.type].netGroup && c.name ? 1 : 0); g.keys.push(k);
  }
  return { wc, groups };
}
