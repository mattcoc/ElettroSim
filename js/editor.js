/* ElettroSim · Vista, selezione, modifica e gestione di mouse, tocco e tastiera. */
'use strict';
/* ---------- view ---------- */
function stageRect() { return $('#cv').getBoundingClientRect(); }
function toWorld(cx, cy) { const r = stageRect(), v = ui.view; return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z }; }
function zoomAt(f, cx, cy) {
  const v = ui.view, r = stageRect();
  ui.userView = true;
  const nz = clamp(v.z * f, 0.2, 6), px = cx - r.left, py = cy - r.top;
  v.x = px - (px - v.x) * (nz / v.z); v.y = py - (py - v.y) * (nz / v.z); v.z = nz;
  render();
}
function zoomCenter(f) { const r = stageRect(); zoomAt(f, r.left + r.width / 2, r.top + r.height / 2); }
function fitView() {
  const r = stageRect(), SH = sheetDims();
  if (!r.width || !r.height) return;
  let bx = [0, 0, SH.w, SH.h];
  // su schermi stretti (telefono) si inquadra il disegno invece dell’intero foglio, che risulterebbe minuscolo
  if (r.width < 600 && doc.comps.length) {
    bx = [Infinity, Infinity, -Infinity, -Infinity];
    for (const c of doc.comps) { const b = boxW(c); bx = [Math.min(bx[0], b[0]), Math.min(bx[1], b[1]), Math.max(bx[2], b[2]), Math.max(bx[3], b[3])]; }
    bx = [bx[0] - 20, bx[1] - 20, bx[2] + 20, bx[3] + 20];
  }
  const bw = bx[2] - bx[0], bh = bx[3] - bx[1];
  const pad = r.width < 600 ? 12 : 24, z = clamp(Math.min((r.width - pad * 2) / bw, (r.height - pad * 2) / bh), 0.2, 6);
  ui.view.z = z; ui.view.x = (r.width - bw * z) / 2 - bx[0] * z; ui.view.y = (r.height - bh * z) / 2 - bx[1] * z; ui.userView = false;
  render();
}

/* ---------- hit testing ---------- */
function hitTerm(w, rpx) {
  const rr = (rpx || (ui.touch ? 18 : 8)) / ui.view.z;
  let best = null, bd = rr * rr;
  for (const c of doc.comps) for (const t of termsW(c)) {
    const dx = t.x - w.x, dy = t.y - w.y, d2 = dx * dx + dy * dy;
    if (d2 <= bd) { bd = d2; best = { c: c.id, t: t.id, x: t.x, y: t.y, d: t.d }; }
  }
  return best;
}
function shapeHit(c, w) {
  const tol = Math.max(3, 5 / ui.view.z), P = c.props;
  if (c.type === 'shp_line') return segDist(w.x, w.y, [c.x, c.y], [c.x + (+P.dx || 0), c.y + (+P.dy || 0)]).d <= tol;
  const b = boxW(c);
  const inside = w.x >= b[0] - tol && w.x <= b[2] + tol && w.y >= b[1] - tol && w.y <= b[3] + tol;
  if (!inside) return false;
  if (c.type === 'image' || c.type === 'text' || P.fill) return true;
  if (c.type === 'shp_ellipse') {
    const rx = (+P.w || 10) / 2, ry = (+P.h || 10) / 2, dx = (w.x - c.x - rx) / rx, dy = (w.y - c.y - ry) / ry;
    return Math.abs(Math.hypot(dx, dy) - 1) * Math.min(rx, ry) <= tol;
  }
  return w.x - b[0] <= tol * 2 || b[2] - w.x <= tol * 2 || w.y - b[1] <= tol * 2 || b[3] - w.y <= tol * 2;
}
function hitComp(w, simOnly) {
  const m = 2.5;
  for (let i = doc.comps.length - 1; i >= 0; i--) {
    const c = doc.comps[i];
    if (DEF[c.type].shape && c.type !== 'text') continue;
    const b = boxW(c);
    if (w.x >= b[0] - m && w.x <= b[2] + m && w.y >= b[1] - m && w.y <= b[3] + m) return c;
  }
  if (simOnly) return null;
  for (let i = doc.comps.length - 1; i >= 0; i--) { const c = doc.comps[i]; if (DEF[c.type].shape && c.type !== 'text' && shapeHit(c, w)) return c; }
  return null;
}
function hitWire(w) {
  const tol = 6 / ui.view.z;
  let best = null;
  for (const wr of doc.wires) {
    const R = wireRoute(wr); if (!R) continue;
    for (let k = 0; k < R.length - 1; k++) { const h = segDist(w.x, w.y, R[k], R[k + 1]); if (h.d <= tol && (!best || h.d < best.d)) best = { w: wr, k, R, d: h.d, x: h.x, y: h.y }; }
  }
  return best;
}

/* ---------- editing ops ---------- */
function selComps() { return doc.comps.filter(c => ui.sel.has(c.id)); }
function selWires() { return doc.wires.filter(w => ui.sel.has(w.id)); }
function addComp(c) { doc.comps.push(c); touch(); noteRecent(c); return c; }
function clearArmed() { $$('.tile.armed').forEach(t => t.classList.remove('armed')); }
function placeAt(w, keep) {
  const P = ui.place; if (!P) return;
  if (P.block) { insertBlock(P.block, w); if (!keep) { ui.place = null; clearArmed(); setTool('select', true); } commit(); return; }
  const c = mkComp(P.type, w.x, w.y, P.props, doc.comps);
  c.rot = P.rot || 0;
  addComp(c);
  if (P.lib) noteLibRecent(P);
  ui.sel = new Set([c.id]);
  if (!keep) { ui.place = null; clearArmed(); setTool('select', true); }
  commit();
  if (c.type === 'text') setTimeout(() => { const t = $('#pText'); if (t) { t.focus(); t.select(); } }, 30);
}
function insertBlock(bl, w) {
  const cl = JSON.parse(JSON.stringify(bl));
  const dx = snap(w.x) - cl.x0, dy = snap(w.y) - cl.y0;
  const map = new Map();
  for (const c of cl.comps) { if (!DEF[c.type]) continue; const n = uid('c'); map.set(c.id, n); c.id = n; c.x += dx; c.y += dy; doc.comps.push(c); }
  touch();
  for (const x of cl.wires) if (map.has(x.a.c) && map.has(x.b.c)) doc.wires.push({ id: uid('w'), a: { c: map.get(x.a.c), t: x.a.t }, b: { c: map.get(x.b.c), t: x.b.t }, pts: (x.pts || []).map(p => [p[0] + dx, p[1] + dy]), ...(x.color ? { color: x.color } : {}) });
  ui.sel = new Set(map.values());
}
function splitWireAt(hw) {
  const { w, k, R } = hw, a = R[k], b = R[k + 1];
  let p;
  if (a[0] === b[0]) p = [a[0], snap(clamp(hw.y, Math.min(a[1], b[1]), Math.max(a[1], b[1])))];
  else p = [snap(clamp(hw.x, Math.min(a[0], b[0]), Math.max(a[0], b[0]))), a[1]];
  const first = R[0], last = R[R.length - 1];
  if (p[0] === first[0] && p[1] === first[1]) return w.a;
  if (p[0] === last[0] && p[1] === last[1]) return w.b;
  const J = addComp(mkComp('junction', p[0], p[1], null, null));
  const ref = { c: J.id, t: 'j' };
  const pts1 = R.slice(1, k + 1).filter(q => q[0] !== p[0] || q[1] !== p[1]);
  const pts2 = R.slice(k + 1, R.length - 1).filter(q => q[0] !== p[0] || q[1] !== p[1]);
  const i = doc.wires.indexOf(w);
  const extra = w.color ? { color: w.color } : {};
  doc.wires.splice(i, 1, { id: uid('w'), a: w.a, b: ref, pts: pts1, ...extra }, { id: uid('w'), a: ref, b: w.b, pts: pts2, ...extra });
  ui.sel.delete(w.id);
  return ref;
}
const sameRef = (a, b) => a.c === b.c && a.t === b.t;
function finishWire(b) {
  const D = ui.draft; if (!D) return;
  ui.draft = null;
  if (sameRef(D.a, b)) { render(); return; }
  const A = termInfo(D.a), B = termInfo(b);
  const pts = D.pts.filter(p => !(A && p[0] === A.x && p[1] === A.y) && !(B && p[0] === B.x && p[1] === B.y));
  const nw = { id: uid('w'), a: D.a, b, pts };
  if (ui.wireColor && ui.wireColor !== 'auto') nw.color = ui.wireColor;
  doc.wires.push(nw);
  commit();
}
function wireClick(w, dbl) {
  const D = ui.draft, th = hitTerm(w);
  if (th && !(th.c === D.a.c && th.t === D.a.t)) { finishWire({ c: th.c, t: th.t }); return; }
  const hw = hitWire(w);
  if (hw) { finishWire(splitWireAt(hw)); return; }
  const p = [snap(w.x), snap(w.y)], lastP = D.pts[D.pts.length - 1];
  if (dbl || (lastP && lastP[0] === p[0] && lastP[1] === p[1])) {
    if (lastP && lastP[0] === p[0] && lastP[1] === p[1]) D.pts.pop();
    const A = termInfo(D.a);
    if (A && A.x === p[0] && A.y === p[1]) { ui.draft = null; render(); return; }
    const J = addComp(mkComp('junction', p[0], p[1], null, null));
    finishWire({ c: J.id, t: 'j' });
    return;
  }
  D.pts.push(p);
  render();
}
function wiresOf(cid) { return doc.wires.filter(w => w.a.c === cid || w.b.c === cid); }
function coincident(c) {
  const ts = termsW(c); if (!ts.length) return false;
  const p = ts[0];
  return doc.comps.some(o => o.id !== c.id && termsW(o).some(t => t.x === p.x && t.y === p.y));
}
function cleanupJunctions() {
  let changed = true, guard = 0;
  while (changed && guard++ < 500) {
    changed = false;
    for (const J of doc.comps.filter(c => c.type === 'junction')) {
      const ws = wiresOf(J.id);
      if (coincident(J)) continue;
      if (ws.length === 0) { doc.comps.splice(doc.comps.indexOf(J), 1); touch(); ui.sel.delete(J.id); changed = true; break; }
      if (ws.length === 2) {
        const [w1, w2] = ws;
        let R1 = wireRoute(w1), R2 = wireRoute(w2);
        if (!R1 || !R2) continue;
        const A = w1.a.c === J.id ? w1.b : w1.a;
        if (w1.a.c === J.id) R1 = R1.slice().reverse();
        const B = w2.a.c === J.id ? w2.b : w2.a;
        if (w2.b.c === J.id) R2 = R2.slice().reverse();
        doc.wires = doc.wires.filter(w => w !== w1 && w !== w2);
        doc.comps.splice(doc.comps.indexOf(J), 1); touch(); ui.sel.delete(J.id);
        if (!sameRef(A, B)) { const full = simplify([...R1, ...R2.slice(1)]); const nw = { id: uid('w'), a: A, b: B, pts: full.slice(1, -1) }; if (w1.color && w1.color === w2.color) nw.color = w1.color; doc.wires.push(nw); }
        changed = true; break;
      }
    }
  }
}
function deleteSel() {
  if (SIM.on || !ui.sel.size) return;
  const ids = new Set(ui.sel);
  doc.wires = doc.wires.filter(w => !ids.has(w.id) && !ids.has(w.a.c) && !ids.has(w.b.c));
  doc.comps = doc.comps.filter(c => !ids.has(c.id)); touch();
  ui.sel.clear();
  cleanupJunctions();
  commit();
}
function selCenter(cs) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of cs) { const b = boxW(c); x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); }
  return [snap((x0 + x1) / 2), snap((y0 + y1) / 2)];
}
function innerWires(ids) { return doc.wires.filter(w => ids.has(w.a.c) && ids.has(w.b.c)); }
function rotateShape(c, cx, cy) {
  const P = c.props;
  if (c.type === 'shp_line') { const dx = +P.dx || 0, dy = +P.dy || 0; const dx0 = c.x - cx, dy0 = c.y - cy; c.x = cx - dy0; c.y = cy + dx0; P.dx = -dy; P.dy = dx; return; }
  const w = +P.w || 10, h = +P.h || 10;
  const mx = c.x + w / 2 - cx, my = c.y + h / 2 - cy;
  if (c.type === 'shp_rect' || c.type === 'shp_ellipse' || c.type === 'image') { P.w = h; P.h = w; }
  c.x = snap(cx - my - (c.type === 'text' ? 0 : h / 2)); c.y = snap(cy + mx - (c.type === 'text' ? 0 : w / 2));
}
function rotateSel() {
  if (SIM.on) return;
  if (ui.place) { ui.place.rot = ((ui.place.rot || 0) + 1) % 4; render(); return; }
  const cs = selComps(); if (!cs.length) return;
  const ids = new Set(cs.map(c => c.id));
  const [cx, cy] = cs.length === 1 && !DEF[cs[0].type].shape ? [cs[0].x, cs[0].y] : selCenter(cs);
  for (const c of cs) {
    if (DEF[c.type].shape) { if (c.type === 'text') { const dx = c.x - cx, dy = c.y - cy; c.x = cx - dy; c.y = cy + dx; } else rotateShape(c, cx, cy); continue; }
    const dx = c.x - cx, dy = c.y - cy;
    c.x = cx - dy; c.y = cy + dx; c.rot = ((c.rot || 0) + 1) % 4;
  }
  for (const w of innerWires(ids)) w.pts = w.pts.map(p => [cx - (p[1] - cy), cy + (p[0] - cx)]);
  commit({ keepProps: true });
}
function flipSel() {
  if (SIM.on) return;
  const cs = selComps(); if (!cs.length) return;
  const ids = new Set(cs.map(c => c.id));
  const [cx] = cs.length === 1 && !DEF[cs[0].type].shape ? [cs[0].x] : selCenter(cs);
  for (const c of cs) {
    if (DEF[c.type].shape) {
      if (c.type === 'shp_line') { c.x = 2 * cx - c.x; c.props.dx = -(+c.props.dx || 0); }
      else if (c.type !== 'text') c.x = 2 * cx - c.x - (+c.props.w || 0);
      else c.x = 2 * cx - c.x;
      continue;
    }
    c.x = 2 * cx - c.x; c.rot = (4 - (c.rot || 0)) % 4; c.flip = !c.flip;
  }
  for (const w of innerWires(ids)) w.pts = w.pts.map(p => [2 * cx - p[0], p[1]]);
  commit({ keepProps: true });
}
function copySel() {
  const cs = selComps(); if (!cs.length) return false;
  const ids = new Set(cs.map(c => c.id));
  ui.clip = JSON.parse(JSON.stringify({ comps: cs, wires: innerWires(ids) }));
  return true;
}
function pasteClip() {
  if (SIM.on || !ui.clip || !ui.clip.comps.length) return;
  let x0 = Infinity, y0 = Infinity;
  for (const c of ui.clip.comps) { x0 = Math.min(x0, c.x); y0 = Math.min(y0, c.y); }
  const SH = sheetDims();
  let tx = x0 + 20, ty = y0 + 20;
  if (ui.mouse.in && ui.mouse.x > 0 && ui.mouse.y > 0 && ui.mouse.x < SH.w && ui.mouse.y < SH.h) { tx = ui.mouse.x; ty = ui.mouse.y; }
  insertBlock({ comps: ui.clip.comps, wires: ui.clip.wires, x0, y0 }, { x: tx, y: ty });
  commit();
}
function selectAll() { ui.sel = new Set([...doc.comps.map(c => c.id), ...doc.wires.map(w => w.id)]); refreshPanels(); render(); }
function nudge(dx, dy) {
  const cs = selComps(); if (!cs.length) return;
  const ids = new Set(cs.map(c => c.id));
  for (const c of cs) { c.x += dx; c.y += dy; }
  for (const w of innerWires(ids)) w.pts = w.pts.map(p => [p[0] + dx, p[1] + dy]);
  commit({ keepProps: true });
}

/* ---------- tools ---------- */
const SHAPE_TOOLS = { shp_line: 'linea', shp_rect: 'rettangolo', shp_ellipse: 'ellisse' };
function setTool(t, silent) {
  ui.tool = t;
  if (t !== 'place' && !silent) { ui.place = null; clearArmed(); }
  if (t !== 'wire' && ui.draft && !silent) ui.draft = null;
  ui.shapeDraft = null;
  $('#tSelect').classList.toggle('on', t === 'select' && !ui.place);
  $('#tWire').classList.toggle('on', t === 'wire');
  $('#tText').classList.toggle('on', t === 'text');
  $('#tDraw').classList.toggle('on', !!SHAPE_TOOLS[t]);
  updateHint();
  render();
}
function updateHint() {
  const h = $('#hint'); if (!h) return;
  let s = '';
  if (SIM.on) s = SIM.fault ? '' : SIM.paused ? 'Simulazione in pausa: usa Passo per avanzare di 0,1 s.' : 'Clicca pulsanti, interruttori, sensori e selettori per azionarli. I pulsanti restano premuti finché li tieni premuti.';
  else if (ui.place) s = ui.place.block ? `Clicca sul foglio per inserire il blocco “${ui.place.block.name}”. Esc annulla.` : `Clicca sul foglio per posare: ${(ui.place.label || DEF[ui.place.type].label).toLowerCase()}. R ruota, Maiusc per posarne altri, Esc annulla.`;
  else if (ui.draft) s = 'Clicca un altro morsetto o un cavo per collegare. Clic sul foglio aggiunge una curva, doppio clic termina in un nodo libero. Esc annulla.';
  else if (ui.tool === 'wire') s = 'Clicca un morsetto (o un cavo) per iniziare un collegamento.';
  else if (ui.tool === 'text') s = 'Clicca sul foglio per scrivere una nota.';
  else if (SHAPE_TOOLS[ui.tool]) s = `Trascina sul foglio per disegnare un${ui.tool === 'shp_line' ? 'a' : ui.tool === 'shp_rect' ? '' : '’'} ${SHAPE_TOOLS[ui.tool]}. Esc per uscire.`;
  h.textContent = s;
}

/* ---------- pointer handling ---------- */
function onDown(e) {
  const cv = $('#cv');
  ui.touch = e.pointerType === 'touch' || e.pointerType === 'pen';
  cancelLongPress();
  if (ui.touch && !SIM.on && !ui.place && ui.pointers.size === 0) {
    const cx = e.clientX, cy = e.clientY;
    ui.lp = { x: cx, y: cy, t: setTimeout(() => longPress(cx, cy), 480) };
  }
  if (e.pointerType === 'touch') {
    ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ui.pointers.size === 2) {
      cancelLongPress();
      const [p1, p2] = [...ui.pointers.values()];
      ui.pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), cx: (p1.x + p2.x) / 2, cy: (p1.y + p2.y) / 2 };
      ui.drag = null; ui.band = null; ui.shapeDraft = null;
      if (SIM.on) releaseHeld();
      render(); return;
    }
  }
  try { cv.setPointerCapture(e.pointerId); } catch (err) { /* capture unsupported */ }
  const w = toWorld(e.clientX, e.clientY);
  ui.mouse = { x: w.x, y: w.y, in: true };
  if (e.button === 1 || ui.space) { ui.drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: ui.view.x, vy: ui.view.y }; cv.classList.add('c-pan'); return; }
  if (e.button === 2) { if (ui.draft) { ui.draft = null; updateHint(); render(); } else if (!SIM.on && !ui.place) ctxMenu(e.clientX, e.clientY); return; }
  if (e.button !== 0) return;
  if (SIM.on) {
    const c = hitComp(w, true);
    if (c) {
      const a = actFor(c, w);
      if (a && a.mode) { doAct(a.k, a.mode, true); return; }
      if (a && a.coil) toast(`${showName(a.k)} è comandato dal circuito, non a mano.`);
    }
    ui.drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: ui.view.x, vy: ui.view.y };
    return;
  }
  if (ui.place) { placeAt(w, e.shiftKey); return; }
  if (ui.draft) { wireClick(w, e.detail >= 2); updateHint(); return; }
  if (SHAPE_TOOLS[ui.tool]) { const x = snap(w.x), y = snap(w.y); ui.shapeDraft = { type: ui.tool, x0: x, y0: y, x1: x, y1: y }; render(); return; }
  const th = hitTerm(w);
  if (th && (ui.tool === 'select' || ui.tool === 'wire')) { ui.draft = { a: { c: th.c, t: th.t }, pts: [] }; ui.hoverTerm = null; updateHint(); render(); return; }
  if (ui.tool === 'wire') { const hw = hitWire(w); if (hw) { ui.draft = { a: splitWireAt(hw), pts: [] }; updateHint(); render(); } return; }
  if (ui.tool === 'text') { ui.place = { type: 'text' }; placeAt(w, false); return; }
  const hc = hitComp(w);
  if (hc) {
    if (e.shiftKey) { if (ui.sel.has(hc.id)) ui.sel.delete(hc.id); else ui.sel.add(hc.id); refreshPanels(); render(); return; }
    if (!ui.sel.has(hc.id)) { ui.sel = new Set([hc.id]); refreshPanels(); }
    noteRecent(hc);
    const cs = selComps(), ids = new Set(cs.map(c => c.id));
    ui.drag = { kind: 'move', sx: w.x, sy: w.y, dx: 0, dy: 0, orig: new Map(cs.map(c => [c.id, [c.x, c.y]])), wp: new Map(innerWires(ids).map(x => [x.id, x.pts.map(p => p.slice())])) };
    render(); return;
  }
  const hw = hitWire(w);
  if (hw) {
    if (e.shiftKey) { if (ui.sel.has(hw.w.id)) ui.sel.delete(hw.w.id); else ui.sel.add(hw.w.id); }
    else ui.sel = new Set([hw.w.id]);
    refreshPanels(); render(); return;
  }
  if (!e.shiftKey && ui.sel.size) { ui.sel.clear(); refreshPanels(); }
  if (e.pointerType === 'touch') { ui.drag = { kind: 'pan', cx: e.clientX, cy: e.clientY, vx: ui.view.x, vy: ui.view.y }; render(); return; }
  ui.band = { x0: w.x, y0: w.y, x1: w.x, y1: w.y, add: e.shiftKey };
  render();
}
function onMove(e) {
  if (ui.lp && Math.hypot(e.clientX - ui.lp.x, e.clientY - ui.lp.y) > 10) cancelLongPress();
  if (ui.pointers.has(e.pointerId)) {
    ui.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ui.pinch && ui.pointers.size === 2) {
      const [p1, p2] = [...ui.pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), cx = (p1.x + p2.x) / 2, cy = (p1.y + p2.y) / 2;
      ui.view.x += cx - ui.pinch.cx; ui.view.y += cy - ui.pinch.cy;
      if (ui.pinch.d > 0) zoomAt(d / ui.pinch.d, cx, cy);
      ui.pinch = { d, cx, cy }; render(); return;
    }
  }
  const w = toWorld(e.clientX, e.clientY);
  ui.mouse = { x: w.x, y: w.y, in: true };
  $('#stXY').textContent = `x ${snap(w.x)} · y ${snap(w.y)}`;
  const D = ui.drag;
  if (D && D.kind === 'pan') { ui.view.x = D.vx + e.clientX - D.cx; ui.view.y = D.vy + e.clientY - D.cy; ui.userView = true; render(); return; }
  if (D && D.kind === 'move') {
    const dx = snap(w.x - D.sx), dy = snap(w.y - D.sy);
    if (dx !== D.dx || dy !== D.dy) {
      D.dx = dx; D.dy = dy; D.moved = D.moved || dx !== 0 || dy !== 0;
      for (const [id, o] of D.orig) { const c = cmap().get(id); if (c) { c.x = o[0] + dx; c.y = o[1] + dy; } }
      for (const [id, pts] of D.wp) { const x = doc.wires.find(q => q.id === id); if (x) x.pts = pts.map(p => [p[0] + dx, p[1] + dy]); }
      $('#cv').classList.add('c-move');
      render();
    }
    return;
  }
  if (ui.shapeDraft) { ui.shapeDraft.x1 = snap(w.x); ui.shapeDraft.y1 = snap(w.y); render(); return; }
  if (ui.band) { ui.band.x1 = w.x; ui.band.y1 = w.y; render(); return; }
  if (SIM.on) {
    const c = hitComp(w, true), a = c ? actFor(c, w) : null;
    $('#cv').classList.toggle('c-act', !!(a && a.mode));
    hoverInfo(w, c);
    return;
  }
  const prev = ui.hoverTerm;
  ui.hoverTerm = (ui.tool === 'select' || ui.tool === 'wire' || ui.draft) && !ui.place ? hitTerm(w) : null;
  hoverInfo(w, ui.hoverTerm ? null : hitComp(w));
  if (ui.draft || ui.place || !prev !== !ui.hoverTerm || (prev && ui.hoverTerm && (prev.c !== ui.hoverTerm.c || prev.t !== ui.hoverTerm.t))) render();
}
/* ---------- menu contestuale (tasto destro o pressione lunga sul telefono) ---------- */
function cancelLongPress() { if (ui.lp) { clearTimeout(ui.lp.t); ui.lp = null; } }
function longPress(cx, cy) {
  ui.lp = null;
  const D = ui.drag;
  if (D && D.kind === 'move' && D.moved) return;
  ui.drag = null; ui.draft = null; ui.band = null;
  $('#cv').classList.remove('c-pan', 'c-move');
  try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* vibrazione non disponibile */ }
  updateHint();
  ctxMenu(cx, cy);
}
function ctxMenu(cx, cy) {
  const w = toWorld(cx, cy), hc = hitComp(w), hw = hc ? null : hitWire(w);
  const hitId = hc ? hc.id : hw ? hw.w.id : null;
  if (hitId && !ui.sel.has(hitId)) { ui.sel = new Set([hitId]); refreshPanels(); }
  render();
  const anchor = { getBoundingClientRect: () => ({ left: cx, right: cx, top: cy, bottom: cy }) };
  const props = () => { if (window.innerWidth <= 860) { $('#lib').classList.remove('open'); $('#propsPanel').classList.add('open'); } };
  const dup = () => { if (copySel()) { const m = ui.mouse.in; ui.mouse.in = false; pasteClip(); ui.mouse.in = m; } };
  const cs = selComps(), ws = selWires();
  if (hc) {
    menu(anchor, [
      { h: cs.length + ws.length > 1 ? `${cs.length + ws.length} elementi` : (hc.name ? `${DEF[hc.type].label} ${hc.name}` : DEF[hc.type].label) },
      { t: 'Ruota', k: 'R', f: rotateSel }, { t: 'Specchia', k: 'M', f: flipSel },
      { t: 'Duplica', k: 'Ctrl+D', f: dup }, { t: 'Copia', k: 'Ctrl+C', f: () => { if (copySel()) toast('Copiato'); } },
      '-', { t: 'Proprietà…', f: props }, { t: 'Salva come blocco…', f: saveSelAsBlock },
      '-', { t: 'Elimina', k: 'Canc', f: deleteSel },
    ]);
  } else if (hw) {
    menu(anchor, [
      { h: 'Cavo' },
      { t: 'Raddrizza percorso', f: () => { hw.w.pts = []; commit({ keepProps: true }); } },
      { t: 'Colore e proprietà…', f: props },
      '-', { t: 'Elimina', k: 'Canc', f: deleteSel },
    ]);
  } else {
    if (ui.sel.size) { ui.sel.clear(); refreshPanels(); render(); }
    menu(anchor, [
      { t: 'Incolla', k: 'Ctrl+V', dis: !(ui.clip && ui.clip.comps.length), f: () => { ui.mouse = { x: w.x, y: w.y, in: true }; pasteClip(); } },
      { t: 'Seleziona tutto', k: 'Ctrl+A', f: selectAll },
      { t: 'Adatta al foglio', k: '0', f: fitView },
      '-', { t: 'Impostazioni del foglio', f: () => { refreshPanels(); props(); } },
    ]);
  }
}
function finishShape() {
  const S = ui.shapeDraft; ui.shapeDraft = null;
  if (!S) return;
  const dx = S.x1 - S.x0, dy = S.y1 - S.y0;
  let c;
  if (S.type === 'shp_line') { if (!dx && !dy) { render(); return; } c = mkComp('shp_line', S.x0, S.y0, { dx, dy }, null); }
  else {
    const w = Math.max(10, Math.abs(dx)), h = Math.max(10, Math.abs(dy));
    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) { render(); return; }
    c = mkComp(S.type, Math.min(S.x0, S.x1), Math.min(S.y0, S.y1), { w, h }, null);
  }
  addComp(c);
  ui.sel = new Set([c.id]);
  setTool('select', true);
  commit();
}
function onUp(e) {
  cancelLongPress();
  ui.pointers.delete(e.pointerId);
  if (ui.pinch && ui.pointers.size < 2) { ui.pinch = null; return; }
  const D = ui.drag;
  ui.drag = null;
  $('#cv').classList.remove('c-pan', 'c-move');
  if (SIM.on) { releaseHeld(); return; }
  if (ui.shapeDraft) { finishShape(); return; }
  if (D && D.kind === 'move') { if (D.moved) commit({ keepProps: true }); else render(); return; }
  if (ui.band) {
    const b = ui.band; ui.band = null;
    const x0 = Math.min(b.x0, b.x1), x1 = Math.max(b.x0, b.x1), y0 = Math.min(b.y0, b.y1), y1 = Math.max(b.y0, b.y1);
    if (x1 - x0 > 2 || y1 - y0 > 2) {
      for (const c of doc.comps) { const bb = boxW(c); if (bb[0] >= x0 && bb[2] <= x1 && bb[1] >= y0 && bb[3] <= y1) ui.sel.add(c.id); }
      for (const w of doc.wires) { const R = wireRoute(w); if (R && R.every(p => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1)) ui.sel.add(w.id); }
    }
    refreshPanels(); render();
  }
}
function hoverInfo(w, c) {
  const el = $('#stInfo');
  let s = '';
  if (ui.hoverTerm) {
    const hc = cmap().get(ui.hoverTerm.c);
    if (hc) s = `${DEF[hc.type].label}${hc.name ? ' ' + hc.name : ''} · morsetto ${labelOf(hc, ui.hoverTerm.t) || ''}`;
  } else if (c) {
    s = `${DEF[c.type].label}${c.name ? ' · ' + c.name : ''}`;
    if (SIM.on) { const a = actFor(c, w); if (a && a.mode) s += a.mode === 'mom' ? ' · tieni premuto' : ' · clic per azionare'; }
  } else if (SIM.on && SIM.last) {
    const hw = hitWire(w);
    if (hw) {
      const T = SIM.topo, i = T.idx.get(hw.w.a.c + '|' + hw.w.a.t);
      const pots = i == null ? [] : (SIM.last.m.get(T.find(SIM.last.p, i)) || []);
      s = pots.length ? 'Cavo collegato a ' + potNames(pots) : 'Cavo non in tensione';
    }
  }
  el.textContent = s;
}
function onWheel(e) {
  e.preventDefault();
  if (e.shiftKey) { ui.view.x -= e.deltaY; ui.userView = true; render(); return; }
  let d = e.deltaY;
  if (e.deltaMode === 1) d *= 16;
  zoomAt(Math.exp(-d * 0.0015), e.clientX, e.clientY);
}
function onKey(e) {
  const t = e.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'F9') { e.preventDefault(); toggleSim(); return; }
  if (e.key === 'F1') { e.preventDefault(); openHelp(); return; }
  if (typing) { if (e.key === 'Escape') t.blur(); return; }
  if ($('#scrim')) { if (e.key === 'Escape') closeModal(); return; }
  if (e.key === ' ' && !ui.space) { ui.space = true; e.preventDefault(); return; }
  if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); if (CLOUD.user) saveToCloud(); else saveToBrowser(); return; }
  if (SIM.on) {
    if (e.key === 'Escape') stopSim();
    else if (e.key === 'p' || e.key === 'P') togglePause();
    else if (e.key === 'n' || e.key === 'N') stepOnce();
    return;
  }
  if (mod && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); undo(); return; }
  if (mod && (e.key === 'y' || e.key === 'Y' || (e.shiftKey && (e.key === 'z' || e.key === 'Z')))) { e.preventDefault(); redo(); return; }
  if (mod && (e.key === 'c' || e.key === 'C')) { if (copySel()) { e.preventDefault(); toast('Copiato'); } return; }
  if (mod && (e.key === 'x' || e.key === 'X')) { if (copySel()) { e.preventDefault(); deleteSel(); } return; }
  if (mod && (e.key === 'v' || e.key === 'V')) { e.preventDefault(); pasteClip(); return; }
  if (mod && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); if (copySel()) { const m = ui.mouse.in; ui.mouse.in = false; pasteClip(); ui.mouse.in = m; } return; }
  if (mod && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); selectAll(); return; }
  if (mod) return;
  if (e.key === '?') { openHelp(); return; }
  switch (e.key) {
    case 'Escape':
      if (ui.draft) ui.draft = null;
      else if (ui.shapeDraft) ui.shapeDraft = null;
      else if (ui.place) { ui.place = null; clearArmed(); setTool('select', true); }
      else if (ui.tool !== 'select') setTool('select');
      else if (ui.sel.size) { ui.sel.clear(); refreshPanels(); }
      updateHint(); render(); break;
    case 'Delete': case 'Backspace': e.preventDefault(); deleteSel(); break;
    case 'r': case 'R': rotateSel(); break;
    case 'm': case 'M': flipSel(); break;
    case 'w': case 'W': setTool('wire'); break;
    case 'v': case 'V': setTool('select'); break;
    case 't': case 'T': setTool('text'); break;
    case 'l': case 'L': setTool('shp_line'); break;
    case '0': fitView(); break;
    case '+': case '=': zoomCenter(1.2); break;
    case '-': zoomCenter(1 / 1.2); break;
    case 'PageDown': e.preventDefault(); switchPage(Math.min(doc.pages.length - 1, doc.page + 1)); break;
    case 'PageUp': e.preventDefault(); switchPage(Math.max(0, doc.page - 1)); break;
    case 'ArrowLeft': e.preventDefault(); nudge(-G, 0); break;
    case 'ArrowRight': e.preventDefault(); nudge(G, 0); break;
    case 'ArrowUp': e.preventDefault(); nudge(0, -G); break;
    case 'ArrowDown': e.preventDefault(); nudge(0, G); break;
    default: break;
  }
}
