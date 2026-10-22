/* ElettroSim · Disegno del foglio in SVG. */
'use strict';
/* ---------- drawing ---------- */
function textAt(x, y, side, txt, cls, dy) {
  dy = dy || 0;
  let anchor = 'middle', yy = y, base = 'central';
  if (side === 'w') anchor = 'end'; else if (side === 'e') anchor = 'start';
  else if (side === 'n') { yy = y - 3; base = 'auto'; } else if (side === 's') { yy = y + 8; base = 'auto'; }
  return `<text class="${cls}" x="${r1(x)}" y="${r1(yy + dy)}" text-anchor="${anchor}" dominant-baseline="${base}">${esc(txt)}</text>`;
}
function fmtNum(v) { const n = +v; return Number.isFinite(n) ? String(Math.round(n * 10) / 10).replace('.', ',') : '0'; }
function sheetDims() { return SHEETS[doc.meta.sheet] || SHEETS.A4; }
function colOf(x) { const SH = sheetDims(), m = 14, cw = (SH.w - 2 * m) / 8; return clamp(Math.floor((x - m) / cw) + 1, 1, 8); }
function frameSVG(SH, pageIdx) {
  const m = 14, W = SH.w, H = SH.h, M = doc.meta;
  let s = `<rect class="frame" x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}"/><line class="frame" x1="${m}" y1="${m + 13}" x2="${W - m}" y2="${m + 13}"/>`;
  const cw = (W - 2 * m) / 8;
  for (let i = 0; i < 8; i++) { if (i) s += `<line class="frame" x1="${r1(m + i * cw)}" y1="${m}" x2="${r1(m + i * cw)}" y2="${m + 13}"/>`; s += `<text class="frame-t" x="${r1(m + i * cw + cw / 2)}" y="${m + 9.5}" text-anchor="middle">${i + 1}</text>`; }
  if (M.tb === false) return s;
  const tw = 410, th = 70, tx0 = W - m - tw, ty = H - m - th;
  s += `<rect x="${tx0}" y="${ty}" width="${tw}" height="${th}" fill="#fff" class="frame"/><line class="frame" x1="${tx0}" y1="${ty + 36}" x2="${tx0 + tw}" y2="${ty + 36}"/><line class="frame" x1="${tx0 + 300}" y1="${ty}" x2="${tx0 + 300}" y2="${ty + th}"/><line class="frame" x1="${tx0 + 130}" y1="${ty + 36}" x2="${tx0 + 130}" y2="${ty + th}"/>`;
  const cell = (x, y, l, v, cls) => `<text class="tb-l" x="${x + 5}" y="${y + 9}">${l}</text><text class="${cls || 'tb-v'}" x="${x + 5}" y="${y + (cls ? 28 : 26)}">${esc(v)}</text>`;
  const pg = doc.pages[pageIdx] || doc.pages[0];
  s += cell(tx0, ty, doc.pages.length > 1 ? `Titolo · ${esc(pg.name)}` : 'Titolo', M.title || '', 'tb-title');
  s += cell(tx0 + 300, ty, 'Foglio', doc.pages.length > 1 ? `${pageIdx + 1} di ${doc.pages.length}` : `${M.num || 1} di ${M.of || 1}`);
  s += cell(tx0, ty + 36, 'Disegnato da', M.author || '') + cell(tx0 + 130, ty + 36, 'Scuola / classe', M.school || '') + cell(tx0 + 300, ty + 36, 'Data', M.date || '');
  return s;
}
function sheetSVG(o) {
  o = o || {};
  const exp = !!o.exp, simOn = SIM.on && !exp;
  const pageIdx = o.page != null ? o.page : doc.page;
  const pg = doc.pages[pageIdx];
  const SH = sheetDims();
  const topo = o.topo || (simOn && SIM.topo ? SIM.topo : buildTopo());
  const conn = connInfo(pg);
  let netOf;
  if (simOn && SIM.last) { const L = SIM.last; netOf = i => i == null ? [] : (L.m.get(topo.find(L.p, i)) || []); }
  else { const sn = staticNets(topo); netOf = i => i == null ? [] : (sn.m.get(topo.find(sn.p, i)) || []); }
  let s = `<g class="sheet${simOn ? ' sim' : ''}">`;
  s += `<rect class="bg" x="0" y="0" width="${SH.w}" height="${SH.h}"${exp ? '' : ' filter="url(#shadow)"'}/>`;
  if (!exp && !simOn && doc.meta.grid !== false) s += `<rect x="0" y="0" width="${SH.w}" height="${SH.h}" fill="url(#gridp)"/>`;
  s += frameSVG(SH, pageIdx);
  const shapes = pg.comps.filter(c => DEF[c.type].shape && c.type !== 'text');
  for (const c of shapes) s += `<g class="shape${!exp && ui.sel.has(c.id) ? ' sel' : ''}" transform="translate(${c.x},${c.y})">${DEF[c.type].draw(c)}</g>`;
  const wnum = doc.meta.wnum && !simOn ? netNumbers(topo) : null;
  for (const w of pg.wires) {
    const R = wireRoute(w); if (!R) continue;
    const pots = netOf(topo.idx.get(w.a.c + '|' + w.a.t));
    let cls = 'wire', style = '';
    if (simOn) cls += ' ' + netClass(pots);
    else { if (w.color && WIRE_COL[w.color]) style = ` style="stroke:${WIRE_COL[w.color]}${w.color === 'giallo-verde' ? ';stroke-dasharray:6 3' : ''}"`; else if (pots.length && pots.every(p => POTS[p].kind === 'PE')) cls += ' pe'; }
    if (!exp && ui.sel.has(w.id)) cls += ' sel';
    s += `<polyline class="${cls}"${style} points="${R.map(p => p[0] + ',' + p[1]).join(' ')}"/>`;
    if (wnum) { const num = wnum.get(topo.find(wnum.p, topo.idx.get(w.a.c + '|' + w.a.t))); if (num) { let best = 0, bi = 0; for (let k = 0; k < R.length - 1; k++) { const L = Math.abs(R[k + 1][0] - R[k][0]) + Math.abs(R[k + 1][1] - R[k][1]); if (L > best) { best = L; bi = k; } } if (best >= 20) { const mx = (R[bi][0] + R[bi + 1][0]) / 2, my = (R[bi][1] + R[bi + 1][1]) / 2; s += `<text class="wnum" x="${mx + (R[bi][0] === R[bi + 1][0] ? 3 : 0)}" y="${my - (R[bi][1] === R[bi + 1][1] ? 2 : 0)}"${R[bi][0] === R[bi + 1][0] ? '' : ' text-anchor="middle"'}>${num}</text>`; } } }
  }
  for (const c of pg.comps) {
    const d = DEF[c.type];
    if (d.shape || c.type === 'junction') continue;
    const st = simOn ? SIM.disp[c.id] : null;
    const sel = !exp && ui.sel.has(c.id);
    s += `<g class="sym${sel ? ' sel' : ''}" transform="${tfStr(c)}">${d.draw(c, st)}</g>`;
    if (st && (st.burnt || st.low)) {
      const b = boxW(c), col = st.burnt ? '#c0262d' : '#a15c00';
      s += `<g class="vwarn" style="pointer-events:none"><rect x="${b[0] - 3}" y="${b[1] - 3}" width="${b[2] - b[0] + 6}" height="${b[3] - b[1] + 6}" rx="3" style="fill:${st.burnt ? 'rgba(192,38,45,.10)' : 'rgba(161,92,0,.08)'};stroke:${col};stroke-width:1;stroke-dasharray:3 2"/>`
        + (st.burnt ? `<path d="M${b[0]} ${b[1]}L${b[2]} ${b[3]}M${b[2]} ${b[1]}L${b[0]} ${b[3]}" style="stroke:${col};stroke-width:1.4;fill:none;opacity:.8"/>` : '')
        + `<text x="${(b[0] + b[2]) / 2}" y="${b[1] - 6}" text-anchor="middle" style="font-size:7px;font-weight:600;fill:${col}">${st.burnt ? 'BRUCIATO' : `${fmtV(st.lowV)} V: TENSIONE BASSA`}</text></g>`;
    }
  }
  for (const g of conn.groups.values()) {
    if (g.br >= 3) { let cls = 'dot'; if (simOn) cls += ' ' + netClass(netOf(topo.idx.get(g.keys[0]))); s += `<circle class="${cls}" cx="${g.x}" cy="${g.y}" r="2.4"/>`; }
  }
  s += labelsSVG(pg, simOn, exp);
  if (doc.meta.xref) s += xrefSVG(pg, pageIdx);
  if (!exp) s += overlaySVG(conn);
  return s + '</g>';
}
function netNumbers(topo) {
  const p = topo.parent.slice(), map = new Map();
  let n = 1;
  for (const pg of doc.pages) for (const w of pg.wires) { const r = topo.find(p, topo.idx.get(w.a.c + '|' + w.a.t)); if (!map.has(r)) map.set(r, n++); }
  map.p = p;
  return map;
}
function labelsSVG(pg, simOn, exp) {
  let s = '';
  const dash = doc.meta.dash !== false;
  for (const c of pg.comps) {
    const d = DEF[c.type];
    if (c.type === 'junction') continue;
    if (c.type === 'text') {
      const sel = !exp && ui.sel.has(c.id), sz = clamp(+c.props.size || 12, 6, 80);
      const lines = String(c.props.text || '').split('\n');
      s += `<text class="txt" x="${c.x}" y="${c.y}" font-size="${sz}" dominant-baseline="central" style="fill:${sel ? '#c2611f' : sc(c.props.color)}${c.props.bold ? ';font-weight:600' : ''}">${lines.map((l, i) => `<tspan x="${c.x}" dy="${i ? sz * 1.2 : 0}">${esc(l) || ' '}</tspan>`).join('')}</text>`;
      continue;
    }
    if (d.shape) continue;
    const st = simOn ? SIM.disp[c.id] : null;
    const show = c.showName != null ? c.showName : d.showName !== false;
    if (show && c.name && d.nameAt) {
      const [ax, ay] = tfP(c, d.nameAt[0], d.nameAt[1]);
      const side = tfD(c, d.nameAt[2]);
      s += textAt(ax, ay, side, (dash && !d.ladder && !d.grAct && !d.plcAddr ? '-' : '') + c.name, 'lbl-name');
      if (d.variant === 'on' || d.variant === 'off' || d.variant === 'onoff') {
        const t = st && st.rem != null ? `${fmtNum(st.rem)} s` : (d.variant === 'onoff' ? `${fmtNum(c.props.t)}/${fmtNum(c.props.t2)} s` : `${fmtNum(c.props.t)} s`);
        s += textAt(ax, ay, side, t, 'lbl-timer', side === 'n' ? -10 : 10);
      }
    }
    if (d.termLabels !== false) {
      for (const t of termsW(c)) {
        if (!t.lab) continue;
        let x = t.x + 3, y = t.y, a = 'start';
        if (t.d === 'n') y = t.y + 7.5; else if (t.d === 's') y = t.y - 3; else if (t.d === 'w') y = t.y - 3; else if (t.d === 'e') { x = t.x - 3; y = t.y - 3; a = 'end'; }
        s += `<text class="lbl-term" x="${x}" y="${y}" text-anchor="${a}">${esc(t.lab)}</text>`;
      }
    }
    if (d.inner) for (const it of d.inner(c, st)) {
      const [x, y] = tfP(c, it.x, it.y);
      let anchor = it.anchor || 'middle';
      if (anchor !== 'middle' && (c.flip ? 1 : 0) ^ ((c.rot || 0) === 2 ? 1 : 0)) anchor = anchor === 'start' ? 'end' : 'start';
      if (anchor !== 'middle' && ((c.rot || 0) % 2 === 1)) anchor = 'middle';
      s += `<text class="${it.cls || 'lbl'}" x="${r1(x)}" y="${r1(y)}" text-anchor="${anchor}" dominant-baseline="central">${esc(it.t)}</text>`;
    }
  }
  return s;
}
function xrefSVG(pg, pageIdx) {
  let s = '';
  const all = allComps();
  for (const c of pg.comps) {
    const d = DEF[c.type];
    if (!(d.isCoil || d.thermal || d.protective === 'breaker') || !c.name) continue;
    const k = key(c.name);
    const rows = [];
    for (const o of all) {
      if (o.id === c.id || key(o.name) !== k) continue;
      const od = DEF[o.type];
      if (!od.sim || !od.sim.links || od.isCoil) continue;
      const lab = termsOf(o).map(t => labelOf(o, t.id)).filter(Boolean).join('-');
      rows.push(`${lab || od.label} ${pageOf(o.id) + 1}/${colOf(o.x)}`);
    }
    if (!rows.length) continue;
    const b = boxW(c);
    rows.slice(0, 8).forEach((r, i) => { s += `<text class="xref" x="${b[2] + 4}" y="${b[3] - 2 + i * 7}">${esc(r)}</text>`; });
  }
  return s;
}
function overlaySVG(conn) {
  let s = '';
  if (!SIM.on) {
    for (const g of conn.groups.values()) if (g.br <= 1) s += `<circle class="uncon" cx="${g.x}" cy="${g.y}" r="1.9"/>`;
    for (const id of ui.sel) {
      const c = cmap().get(id); if (!c || pageOf(id) !== doc.page) continue;
      const b = boxW(c);
      s += `<rect class="selbox" x="${b[0] - 3}" y="${b[1] - 3}" width="${b[2] - b[0] + 6}" height="${b[3] - b[1] + 6}" rx="2"/>`;
    }
  }
  if (ui.hoverTerm && !SIM.on && !ui.drag && (ui.tool === 'select' || ui.tool === 'wire')) s += `<circle class="hot-fill" cx="${ui.hoverTerm.x}" cy="${ui.hoverTerm.y}" r="6"/><circle class="hot" cx="${ui.hoverTerm.x}" cy="${ui.hoverTerm.y}" r="4.2"/>`;
  if (ui.draft) {
    const A = termInfo(ui.draft.a);
    if (A) {
      const ht = ui.hoverTerm, end = ht ? [ht.x, ht.y] : [snap(ui.mouse.x), snap(ui.mouse.y)];
      const R = routePts([A.x, A.y], A.d, ui.draft.pts, end, ht ? ht.d : null);
      s += `<polyline class="draft" points="${R.map(p => p.join(',')).join(' ')}"/>`;
      for (const p of ui.draft.pts) s += `<circle class="hot" cx="${p[0]}" cy="${p[1]}" r="2"/>`;
    }
  }
  if (ui.band) { const b = ui.band; s += `<rect class="band" x="${Math.min(b.x0, b.x1)}" y="${Math.min(b.y0, b.y1)}" width="${Math.abs(b.x1 - b.x0)}" height="${Math.abs(b.y1 - b.y0)}"/>`; }
  if (ui.shapeDraft) {
    const b = ui.shapeDraft;
    if (b.type === 'shp_line') s += `<line class="draft" x1="${b.x0}" y1="${b.y0}" x2="${b.x1}" y2="${b.y1}"/>`;
    else if (b.type === 'shp_ellipse') s += `<ellipse class="draft" cx="${(b.x0 + b.x1) / 2}" cy="${(b.y0 + b.y1) / 2}" rx="${Math.abs(b.x1 - b.x0) / 2}" ry="${Math.abs(b.y1 - b.y0) / 2}"/>`;
    else s += `<rect class="draft" x="${Math.min(b.x0, b.x1)}" y="${Math.min(b.y0, b.y1)}" width="${Math.abs(b.x1 - b.x0)}" height="${Math.abs(b.y1 - b.y0)}"/>`;
  }
  if (ui.place && ui.mouse.in && !SIM.on) {
    if (ui.place.block) {
      const bl = ui.place.block;
      for (const c0 of bl.comps) { const c = Object.assign({}, c0, { x: c0.x - bl.x0 + snap(ui.mouse.x), y: c0.y - bl.y0 + snap(ui.mouse.y) }); if (!DEF[c.type].shape) s += `<g class="sym ghost" transform="${tfStr(c)}">${DEF[c.type].draw(c, null)}</g>`; }
    } else {
      const c = mkComp(ui.place.type, ui.mouse.x, ui.mouse.y, ui.place.props);
      c.rot = ui.place.rot || 0;
      if (c.type === 'text') s += `<text class="txt ghost" x="${c.x}" y="${c.y}" font-size="12" dominant-baseline="central">Testo</text>`;
      else if (c.type === 'junction') s += `<circle class="dot ghost" cx="${c.x}" cy="${c.y}" r="2.6"/>`;
      else if (DEF[c.type].shape) s += `<g class="shape ghost" transform="translate(${c.x},${c.y})">${DEF[c.type].draw(c)}</g>`;
      else s += `<g class="sym ghost" transform="${tfStr(c)}">${DEF[c.type].draw(c, null)}</g>`;
    }
  }
  return s;
}

let _rp = false;
function render() { if (_rp) return; _rp = true; requestAnimationFrame(() => { _rp = false; drawNow(); }); }
function drawNow() {
  const v = ui.view, vp = $('#vp');
  vp.setAttribute('transform', `translate(${r1(v.x)},${r1(v.y)}) scale(${v.z})`);
  vp.innerHTML = sheetSVG();
  const es = $('#emptyState'); if (es) es.hidden = SIM.on || !!ui.place || doc.comps.length > 0;
  $('#zoomv').textContent = Math.round(v.z * 100) + '%';
  const cv = $('#cv');
  cv.classList.toggle('c-place', !!ui.place && !SIM.on);
  cv.classList.toggle('c-wire', (ui.tool === 'wire' || !!ui.draft || ['shp_line', 'shp_rect', 'shp_ellipse'].includes(ui.tool)) && !SIM.on);
}
