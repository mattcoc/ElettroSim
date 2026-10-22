/* ElettroSim · Motore di simulazione: reti, passo di calcolo, comandi manuali e GRAFCET. */
'use strict';
/* ---------- tensione nominale dei carichi ----------
   Come in CADe SIMU: un carico con tensione nominale impostata si brucia se riceve più del 20% in più
   e non funziona se riceve più del 20% in meno. Senza tensione nominale funziona con qualsiasi tensione. */
const RATED = {};
function initRated() {
  for (const [id, d] of Object.entries(DEF)) {
    if (d.id !== id || !d.sim || typeof d.sim.eval !== 'function') continue;
    const src = String(d.sim.eval);
    if (!src.includes('X.load()')) continue;
    const pairs = new Set([...src.matchAll(/X\.v\(c, '([^']+)', '([^']+)'\)/g)].map(m => m[1] + '|' + m[2]).filter(p => !/(^|\|)(FW|RV|COM)(\||$)/.test(p)));
    if (!pairs.size && !/X\.v\(c, inputs/.test(src)) continue;
    RATED[id] = pairs;
    d.props = Object.assign({ vn: '' }, d.props);
  }
}
const VN_OPTS = [['', 'Qualsiasi (non controllare)'], ['12', '12 V'], ['24', '24 V'], ['48', '48 V'], ['110', '110 V'], ['230', '230 V'], ['400', '400 V']];
function ratedOK(c, X, a, b, A, B) {
  const vn = +c.props.vn, P = RATED[c.type];
  if (!vn || !P || (P.size && !P.has(a + '|' + b))) return true;
  const D = X.dev(c);
  if (D.burnt) { X.disp(c, { burnt: true }); return false; }
  const v = voltsOf(A, B);
  if (v == null || !v) return true;
  const msg = SIM.S.vmsg || (SIM.S.vmsg = {}), nm = c.name || DEF[c.type].label;
  if (v > vn * 1.2) {
    D.burnt = true; X.disp(c, { burnt: true });
    if (!msg[c.id]) { msg[c.id] = 1; setTimeout(() => toast(`${nm} si è bruciato: riceve ${fmtV(v)} V ma la sua tensione nominale è ${fmtV(vn)} V.`, 'err'), 0); }
    return false;
  }
  if (v < vn * 0.8) {
    X.disp(c, { low: true, lowV: v });
    if (!msg[c.id]) { msg[c.id] = 1; setTimeout(() => toast(`${nm} non funziona: riceve ${fmtV(v)} V ma ne servono ${fmtV(vn)}.`), 0); }
    return false;
  }
  return true;
}
/* ---------- context ---------- */
function makeX() {
  const S = SIM.S, T = SIM.topo;
  const net = i => { if (i == null || !SIM.cur) return []; return SIM.cur.m.get(T.find(SIM.cur.p, i)) || []; };
  const X = {
    S,
    pots: (c, tid) => net(T.I(c, tid)),
    root: (c, tid) => { const i = T.I(c, tid); return i == null || !SIM.cur ? -1 - Math.random() : T.find(SIM.cur.p, i); },
    v: (c, a, b) => { const A = X.pots(c, a), B = X.pots(c, b); return voltOf(A, B) && ratedOK(c, X, a, b, A, B); },
    hi: (c, tid) => isHi(X.pots(c, tid)),
    hiRel: (c, a, b) => voltOf(X.pots(c, a), X.pots(c, b)),
    phRaw: (c, tid) => X.pots(c, tid).find(p => POTS[p].kind === 'L' && POTS[p].ph != null),
    phOf: (c, tid) => { const p = X.phRaw(c, tid); return p == null ? null : POTS[p].sys + ':' + POTS[p].ph; },
    phaseCount: (c, tids) => new Set(tids.map(t => X.phOf(c, t)).filter(Boolean)).size,
    phaseDir: (c, tids) => {
      const ps = tids.map(t => X.phRaw(c, t));
      if (ps.some(p => p == null)) return 0;
      const sys = POTS[ps[0]].sys;
      if (ps.some(p => POTS[p].sys !== sys)) return 0;
      const ix = ps.map(p => POTS[p].ph);
      if (new Set(ix).size !== 3 || ix.some(v => v > 2)) return 0;
      return ((ix[1] - ix[0] + 3) % 3 === 1) ? 1 : -1;
    },
    hzOf: (c, tid) => { const p = X.phRaw(c, tid); return p != null && POTS[p].hz ? POTS[p].hz : 50; },
    out: k => !!S.out[k], prev: k => !!S.prevOut[k], tmr: k => S.tmr[k] || null,
    setTmr: (k, o) => { S.tmr[k] = o; },
    drive: (k, v) => { SIM.drv.set(k, !!SIM.drv.get(k) || !!v); },
    special: (k, v) => { SIM.spec.set(k, SIM.spec.has(k) ? (SIM.spec.get(k) || !!v) : !!v); },
    dev: c => S.dev[c.id] || (S.dev[c.id] = {}),
    devById: id => S.dev[id] || (S.dev[id] = {}),
    disp: (c, o) => { SIM.nd[c.id] = Object.assign(SIM.nd[c.id] || {}, o); },
    load: () => { SIM.loadCount++; },
    sysPots: c => SIM.sysPots[c.id] || [],
    posOf: (c, start) => { const k = nkey(c); return S.pos[k] != null ? S.pos[k] : (c.props.pos != null ? +c.props.pos : start); },
    digitOf: c => { const k = nkey(c); return S.digit[k] != null ? S.digit[k] : (+c.props.val || 0) % 10; },
    cpuRun: c => S.run[nkey(c)] !== false,
    plcRun: () => { if (!SIM.cpus.length) return true; return SIM.cpus.some(c => S.dev[c.id] && S.dev[c.id].cpuPw && S.run[nkey(c)] !== false); },
    isDriven: k => SIM.outClaimed.has(k),
  };
  return X;
}
function manOn(k) { const S = SIM.S; return !!(S.man[k] || S.held[k] || (S.rel[k] || 0) > 0); }

/* ---------- nets ---------- */
function evalNets(X, forceOpen) {
  const T = SIM.topo, p = T.parent.slice();
  for (const L of T.dyn) {
    if (L.i == null || L.j == null) continue;
    if (forceOpen && L.prot && forceOpen.has(nkey(L.c))) continue;
    let on = false;
    try { on = !!L.on(L.c, X); } catch (e) { on = false; }
    if (on) T.uni(p, L.i, L.j);
  }
  const srcList = [];
  for (const c of T.srcs) {
    let r = null;
    try { r = DEF[c.type].sim.src(c, X); } catch (e) { r = null; }
    if (r) for (const tid in r) { const i = T.I(c, tid); if (i != null && r[tid] != null) srcList.push([i, r[tid]]); }
  }
  const potsMap = () => {
    const m = new Map();
    for (const [i, pot] of srcList) { const root = T.find(p, i); const a = m.get(root); if (!a) m.set(root, [pot]); else if (!a.includes(pot)) a.push(pot); }
    return m;
  };
  let m = potsMap();
  if (T.diodes.length) {
    const done = new Set();
    for (let it = 0; it < 8; it++) {
      let ch = false;
      for (const D of T.diodes) {
        if (done.has(D) || D.a == null || D.k == null) continue;
        const ra = T.find(p, D.a), rk = T.find(p, D.k);
        if (ra === rk) { done.add(D); continue; }
        const A = m.get(ra) || [], K = m.get(rk) || [];
        const aL = A.length ? Math.max(...A.map(potLevel)) : 1, kL = K.length ? Math.min(...K.map(potLevel)) : 1;
        if (aL > kL) { T.uni(p, D.a, D.k); done.add(D); ch = true; }
      }
      if (!ch) break;
      m = potsMap();
    }
  }
  const shorts = [];
  for (const [r, a] of m) if (a.length > 1 && hasConflict(a)) shorts.push({ r, a });
  return { p, m, shorts };
}
function energizedCount(N) { let n = 0; for (const a of N.m.values()) if (a.length) n++; return n; }

/* ---------- start / stop ---------- */
function startSim() {
  if (SIM.on) return;
  ui.draft = null; ui.place = null; ui.band = null; ui.drag = null; ui.hoverTerm = null; ui.shapeDraft = null;
  $$('.tile.armed').forEach(t => t.classList.remove('armed'));
  resetPots();
  SIM.topo = buildTopo();
  SIM.sysPots = {};
  for (const c of SIM.topo.comps) {
    const s = DEF[c.type].sim;
    if (s && s.sys) { const nm = c.name || DEF[c.type].label, kn = c.type === 'stepdrv' ? ['A+', 'A−', 'B+', 'B−'] : ['L1', 'L2', 'L3', 'N']; SIM.sysPots[c.id] = s.sys(c).map(([kind, ph], i) => mkPot(`${nm}:${kind === 'N' ? 'N' : kn[i]}`, (c.type === 'stepdrv' ? 'st' : 'sys_') + c.id, kind, ph, c.id)); }
  }
  VSYS.vc = clamp(+doc.meta.vc || 400, 1, 100000); VSYS.vdc = clamp(+doc.meta.vdc || 24, 0.1, 100000); VSYS.own = {};
  POTS[PT.P].name = `+${fmtV(VSYS.vdc)}V`;
  for (const c of SIM.topo.comps) {
    if (c.type === 'trafo1') VSYS.own[c.id] = { ll: +c.props.vs || 24, ln: +c.props.vs || 24 };
    else if (c.type === 'trafo3') { const vs = +c.props.vs || 400; VSYS.own[c.id] = { ll: vs, ln: vLN(vs) }; }
    else if (DEF[c.type].sim && DEF[c.type].sim.sys && c.type !== 'stepdrv') VSYS.own[c.id] = { ll: VSYS.vc, ln: vLN(VSYS.vc) };
  }
  SIM.claimed = new Set(); SIM.outClaimed = new Set();
  for (const c of SIM.topo.comps) { claimsOf(c).forEach(k => SIM.claimed.add(k)); outClaimsOf(c).forEach(k => SIM.outClaimed.add(k)); }
  SIM.cpus = SIM.topo.comps.filter(c => DEF[c.type].cpu);
  SIM.S = { man: {}, held: {}, rel: {}, blown: {}, trip: {}, lat: {}, cnt: {}, tm: {}, pos: {}, digit: {}, blocked: {}, run: {}, two: {}, dev: {}, out: {}, prevOut: {}, tmr: {}, setReq: {}, resetReq: {}, latchNames: new Set(), t: 0, scan: 0, clock: parseClock(doc.meta.clock) };
  for (const c of SIM.topo.comps) { const d = DEF[c.type]; if ((d.act === 'latch' || d.act === 'sfu') && c.props.startOn) { SIM.S.man[nkey(c)] = true; SIM.S.out[nkey(c)] = true; } }
  SIM.gr = buildGrafcet();
  SIM.on = true; SIM.paused = false; SIM.fault = null; SIM.sig = ''; SIM.lastT = performance.now();
  document.body.classList.add('simulating');
  step(0);
  SIM.timer = setInterval(tick, 25);
  updateModeUI(); buildSimPanel(); render();
  const iss = verify().filter(i => i.lv !== 'info');
  if (iss.length) toast(`Simulazione avviata con ${iss.length} avvisi nella verifica dello schema.`);
}
function stopSim() {
  if (!SIM.on) return;
  clearInterval(SIM.timer); SIM.timer = null;
  SIM.on = false; SIM.S = null; SIM.disp = {}; SIM.last = null; SIM.cur = null; SIM.fault = null; SIM.held = null; SIM.paused = false;
  resetPots();
  document.body.classList.remove('simulating');
  $('#banner').hidden = true;
  $('#stInfo').textContent = '';
  $('#cv').classList.remove('c-act');
  updateModeUI(); refreshPanels(); render();
}
function parseClock(s) { const p = String(s || '08:00').split(':'); return ((+p[0] || 0) * 60 + (+p[1] || 0)) % 1440; }
function fmtClock(m) { m = Math.floor(m) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
function tick() {
  const t = performance.now();
  let dt = (t - SIM.lastT) / 1000; SIM.lastT = t;
  if (!(dt > 0)) dt = 0; if (dt > 0.1) dt = 0.1;
  if (SIM.paused) return;
  step(dt * SIM.speed);
}

/* ---------- one simulation step ---------- */
function step(dt) {
  if (!SIM.on || SIM.fault) return;
  const S = SIM.S;
  S.t += dt; S.scan++; S.clock = (S.clock + dt) % 1440;
  if (dt > 0) for (const k in S.rel) if (S.rel[k] > 0) S.rel[k]--;
  const X = makeX();
  SIM.drv = new Map(); SIM.spec = new Map(); SIM.nd = {}; SIM.loadCount = 0;
  const tripped = new Set();
  let N = evalNets(X, tripped);
  let guard = 0;
  while (N.shorts.length && guard < 8) {
    guard++;
    let best = null;
    const pe = N.shorts.some(s => s.a.some(p => POTS[p].kind === 'PE'));
    const cands = [...new Set(SIM.topo.dyn.filter(L => L.prot && !tripped.has(nkey(L.c)) && (() => { try { return L.on(L.c, X); } catch (e) { return false; } })()).map(L => nkey(L.c)))];
    for (const k of cands) {
      const N2 = evalNets(X, new Set([...tripped, k]));
      if (N2.shorts.length >= N.shorts.length) continue;
      const isRcd = allComps().some(c => nkey(c) === k && DEF[c.type].rcd);
      const score = (N.shorts.length - N2.shorts.length) * 100000 + (pe && isRcd ? 50000 : 0) + energizedCount(N2);
      if (!best || score > best.score) best = { k, score };
    }
    if (!best) break;
    tripName(best.k, pe && allComps().some(c => nkey(c) === best.k && DEF[c.type].rcd) ? 'guasto verso terra' : 'cortocircuito');
    tripped.add(best.k);
    N = evalNets(X, tripped);
  }
  SIM.cur = N;
  if (N.shorts.length) {
    const names = [...new Set(N.shorts[0].a.map(p => POTS[p].name))].join(' e ');
    SIM.fault = { names };
    SIM.last = N;
    computeDisp(X);
    showFault(); render(); updateSimPanel();
    return;
  }
  S.setReq = {}; S.resetReq = {};
  for (const c of SIM.topo.evals) { try { DEF[c.type].sim.eval(c, X); } catch (e) { console.warn('eval', c.type, e); } }
  grafcetStep(X, dt);
  for (const c of SIM.topo.ticks) { try { DEF[c.type].sim.tick(c, X, dt); } catch (e) { console.warn('tick', c.type, e); } }
  for (const k of new Set([...Object.keys(S.setReq), ...Object.keys(S.resetReq)])) { if (S.resetReq[k]) S.lat[k] = false; else if (S.setReq[k]) S.lat[k] = true; }
  for (const k of S.latchNames) X.special(k, !!S.lat[k]);
  for (const c of SIM.topo.comps) {
    const d = DEF[c.type];
    if (!d.motor) continue;
    const ds = SIM.nd[c.id];
    if (ds && ds.two) { S.two[c.id] = (S.two[c.id] || 0) + dt; if (S.two[c.id] >= 3) { S.two[c.id] = 0; tripThermalFor(c, X); } }
    else S.two[c.id] = 0;
  }
  const names = new Set([...Object.keys(S.out), ...SIM.drv.keys(), ...SIM.spec.keys(), ...Object.keys(S.man), ...Object.keys(S.held)]);
  for (const c of SIM.topo.comps) names.add(nkey(c));
  const out = {};
  for (const k of names) out[k] = SIM.spec.has(k) ? SIM.spec.get(k) : SIM.drv.has(k) ? SIM.drv.get(k) : (SIM.claimed.has(k) ? false : manOn(k));
  for (const c of SIM.topo.comps) {
    if (c.type !== 'ilk') continue;
    const a = key(c.props.a), b = key(c.props.b);
    if (out[a] && out[b]) { if (S.out[a]) out[b] = false; else if (S.out[b]) out[a] = false; else { out[a] = false; out[b] = false; } }
  }
  S.prevOut = S.out; S.out = out;
  SIM.last = N; SIM.loads = SIM.loadCount;
  computeDisp(X);
  const sig = JSON.stringify(SIM.disp);
  if (sig !== SIM.sig) { SIM.sig = sig; render(); updateSimPanel(); }
  else if (Math.floor(S.t * 4) !== Math.floor((S.t - dt) * 4)) updateSimPanel();
}
function computeDisp(X) {
  const S = SIM.S, disp = {};
  const motorsByName = new Map();
  for (const c of SIM.topo.comps) if (DEF[c.type].motor && SIM.nd[c.id]) motorsByName.set(nkey(c), SIM.nd[c.id]);
  for (const c of SIM.topo.comps) {
    const d = DEF[c.type], k = nkey(c);
    // durante un cortocircuito il calcolo si interrompe: si conserva l’ultimo stato visualizzato
    const o = Object.assign({}, SIM.fault && SIM.disp[c.id] || {}, SIM.nd[c.id] || {});
    const L = linksOf(c);
    L.forEach((l, i) => { let v = false; try { v = !!l.on(c, X); } catch (e) { v = false; } o['l' + i] = v; });
    if (L.length) o.closed = o.l0;
    if (d.act === 'mom' || d.act === 'latch' || (d.head && d.act)) o.act = !!S.out[k];
    if (d.protective) { o.tripped = !!S.trip[k]; o.blown = !!S.blown[k]; }
    if (c.type === 'ol3') o.act = !!S.out[k];
    if (d.fv) {
      o.on = !!S.out[k]; o.trip = !!S.trip[k];
      if (c.type === 'fv_motor') { const m = motorsByName.get(k); o.on = !!(m && m.run); o.dir = m ? m.dir : 1; }
    }
    disp[c.id] = o;
  }
  if (SIM.gr) for (const st of SIM.gr.steps) { disp[st.c.id] = Object.assign(disp[st.c.id] || {}, { on: SIM.gr.active.has(st.c.id) }); }
  if (SIM.gr) for (const tr of SIM.gr.trans) disp[tr.c.id] = Object.assign(disp[tr.c.id] || {}, { ok: !!tr.ok });
  if (SIM.gr) for (const a of SIM.gr.acts) disp[a.c.id] = Object.assign(disp[a.c.id] || {}, { on: !!a.on });
  SIM.disp = disp;
}
function compsByKey(k) { return allComps().filter(c => nkey(c) === k); }
function showName(k) { const c = compsByKey(k)[0]; return c && c.name ? ((doc.meta.dash !== false && !DEF[c.type].ladder) ? '-' : '') + c.name : 'senza sigla'; }
function tripName(k, why) {
  const S = SIM.S;
  for (const c of compsByKey(k)) { const d = DEF[c.type]; if (d.protective === 'fuse') S.blown[k] = true; else if (d.protective === 'breaker') S.man[k] = false; }
  S.held[k] = false; S.rel[k] = 0; S.trip[k] = why;
  toast(`${showName(k)} è intervenuto: ${why}.`, 'err');
}
function tripThermalFor(motor, X) {
  const S = SIM.S;
  const roots = new Set(termsOf(motor).map(t => X.root(motor, t.id)));
  const done = new Set();
  for (const c of SIM.topo.comps) {
    const d = DEF[c.type]; if (!d.thermal) continue;
    if (!termsOf(c).some(t => roots.has(X.root(c, t.id)))) continue;
    const k = nkey(c); if (done.has(k)) continue; done.add(k);
    const ol = d.thermal === 'ol';
    if (ol ? S.man[k] : !S.man[k]) continue;
    S.man[k] = ol; S.trip[k] = 'sovraccarico (motore su 2 fasi)';
    toast(`${showName(k)} è scattato: il motore ${motor.name ? '-' + motor.name : ''} girava su 2 fasi.`, 'err');
  }
}
function showFault() {
  const b = $('#banner');
  b.hidden = false;
  b.innerHTML = `<div><b>Cortocircuito tra ${esc(SIM.fault.names)}</b><small>Nessuna protezione a monte può interromperlo. Il tratto in corto lampeggia in viola: ferma la simulazione e correggi lo schema.</small></div><button class="pbtn" id="bFaultStop" style="margin-left:auto;flex:none">Ferma</button>`;
  $('#bFaultStop').onclick = () => stopSim();
}

/* ---------- manual actions ---------- */
const DEVICE_ACTS = new Set(['fuse', 'sfu', 'pos3', 'digit', 'beam', 'run', 'key']);
function actFor(c, w) {
  const k = nkey(c), d = DEF[c.type];
  if (d.act && DEVICE_ACTS.has(d.act)) {
    if (d.act === 'key' && w) {
      const lx = w.x - c.x, ly = w.y - c.y, col = Math.floor((lx - 6) / 17), row = Math.floor((ly - 6) / 17);
      if (col < 0 || col > 2 || row < 0 || row > 3) return null;
      const lab = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'][row * 3 + col];
      return { mode: 'mom', k: key((c.name || 'K') + lab) };
    }
    return { mode: d.act, k };
  }
  if (SIM.claimed.has(k)) return { coil: true, k };
  if (d.act) return { mode: d.act, k };
  for (const o of allComps()) if (nkey(o) === k && DEF[o.type].act && !DEVICE_ACTS.has(DEF[o.type].act)) return { mode: DEF[o.type].act, k };
  return null;
}
function doAct(k, mode, down) {
  if (!SIM.on || SIM.fault) return;
  const S = SIM.S;
  if (mode === 'mom') {
    if (down) { S.held[k] = true; SIM.held = k; }
    else { if (!S.held[k]) return; S.held[k] = false; S.rel[k] = 3; if (SIM.held === k) SIM.held = null; }
  } else if (!down) return;
  else if (mode === 'latch') { S.man[k] = !S.man[k]; delete S.trip[k]; }
  else if (mode === 'fuse' || mode === 'sfu') {
    if (S.blown[k]) { S.blown[k] = false; delete S.trip[k]; toast(`Fusibili ${showName(k)} sostituiti.`); }
    else if (mode === 'sfu') S.man[k] = !S.man[k];
    else toast(`Il fusibile ${showName(k)} è integro.`);
  }
  else if (mode === 'pos3') { const c = compsByKey(k)[0]; const start = c && c.type === 'sel3' ? 1 : 0; const cur = S.pos[k] != null ? S.pos[k] : (c && c.props.pos != null ? +c.props.pos : start); S.pos[k] = (cur + 1) % 3; }
  else if (mode === 'digit') { const c = compsByKey(k)[0]; const cur = S.digit[k] != null ? S.digit[k] : ((c && +c.props.val) || 0); S.digit[k] = (cur + 1) % 10; }
  else if (mode === 'beam') { S.blocked[k] = !S.blocked[k]; toast(S.blocked[k] ? `Raggio di ${showName(k)} interrotto.` : `Raggio di ${showName(k)} libero.`); }
  else if (mode === 'run') { S.run[k] = S.run[k] === false; toast(`${showName(k)} in ${S.run[k] === false ? 'STOP' : 'RUN'}.`); }
  step(0);
}
function releaseHeld() { if (SIM.on && SIM.held) doAct(SIM.held, 'mom', false); }

/* ---------- GRAFCET ---------- */
function grParse(src) {
  const s = String(src ?? '').trim();
  if (!s) return { t: 'const', v: true };
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    const m = /^[tT]\/([A-Za-z0-9_.]+)\/(\d+(?:[.,]\d+)?)\s*s?/.exec(s.slice(i));
    if (m) { toks.push({ k: 'tim', step: m[1], sec: parseFloat(m[2].replace(',', '.')) }); i += m[0].length; continue; }
    const fm = /^(FP|FN|RE|FE)\s*\(/i.exec(s.slice(i));
    if (fm) { toks.push({ k: 'fn', f: /^(FP|RE)$/i.test(fm[1]) ? 'FP' : 'FN' }); i += fm[0].length; continue; }
    const nm = /^[A-Za-z0-9_.]+/.exec(s.slice(i));
    if (nm) {
      const w = nm[0], W = w.toUpperCase();
      if (W === 'AND') toks.push({ k: 'and' }); else if (W === 'OR') toks.push({ k: 'or' }); else if (W === 'NOT') toks.push({ k: 'not' });
      else toks.push({ k: 'name', v: w });
      i += w.length; continue;
    }
    if ('*&·'.includes(ch)) toks.push({ k: 'and' });
    else if ('+|'.includes(ch)) toks.push({ k: 'or' });
    else if ('!/_¬'.includes(ch)) toks.push({ k: 'not' });
    else if (ch === '↑') toks.push({ k: 'fn1', f: 'FP' });
    else if (ch === '↓') toks.push({ k: 'fn1', f: 'FN' });
    else if (ch === '(') toks.push({ k: '(' }); else if (ch === ')') toks.push({ k: ')' });
    else throw new Error(`carattere non valido "${ch}"`);
    i++;
  }
  let p = 0;
  const peek = () => toks[p], eat = k => { if (!toks[p] || toks[p].k !== k) throw new Error('espressione incompleta'); return toks[p++]; };
  function expr() { let a = term(); while (peek() && peek().k === 'or') { p++; a = { t: 'or', a, b: term() }; } return a; }
  function term() { let a = fac(); while (peek() && (peek().k === 'and' || ['name', 'not', '(', 'fn', 'tim', 'fn1'].includes(peek().k))) { if (peek().k === 'and') p++; a = { t: 'and', a, b: fac() }; } return a; }
  function fac() {
    const t = peek(); if (!t) throw new Error('espressione incompleta');
    if (t.k === 'not') { p++; return { t: 'not', a: fac() }; }
    if (t.k === '(') { p++; const e = expr(); eat(')'); return e; }
    if (t.k === 'fn') { p++; const e = expr(); eat(')'); return { t: 'edge', f: t.f, a: e, prev: false }; }
    if (t.k === 'fn1') { p++; return { t: 'edge', f: t.f, a: fac(), prev: false }; }
    if (t.k === 'tim') { p++; return { t: 'tim', step: t.step, sec: t.sec }; }
    if (t.k === 'name') { p++; if (t.v === '1') return { t: 'const', v: true }; if (t.v === '0') return { t: 'const', v: false }; return { t: 'name', k: key(t.v) }; }
    throw new Error('espressione non valida');
  }
  const e = expr();
  if (p < toks.length) throw new Error('espressione non valida');
  return e;
}
function grEval(n, X, G) {
  switch (n.t) {
    case 'const': return n.v;
    case 'name': return X.out(n.k);
    case 'not': return !grEval(n.a, X, G);
    case 'and': { const a = grEval(n.a, X, G), b = grEval(n.b, X, G); return a && b; }
    case 'or': { const a = grEval(n.a, X, G), b = grEval(n.b, X, G); return a || b; }
    case 'edge': { const v = grEval(n.a, X, G); const r = n.f === 'FP' ? v && !n.prev : !v && n.prev; n.prev = v; return r; }
    case 'tim': { const st = G.byName.get(key(n.step).replace(/^X/, '')); return !!st && G.active.has(st.c.id) && (G.stepT[st.c.id] || 0) >= n.sec - 1e-9; }
    default: return false;
  }
}
function buildGrafcet() {
  const T = SIM.topo, p = T.parent;
  const R = (c, tid) => { const i = T.I(c, tid); return i == null ? null : T.find(p, i); };
  const steps = [], trans = [], acts = [];
  for (const c of T.comps) { const d = DEF[c.type]; if (d.grStep) steps.push({ c }); else if (d.grTrans) trans.push({ c }); else if (d.grAct) acts.push({ c }); }
  if (!steps.length) return null;
  for (const tr of trans) {
    const ri = R(tr.c, 'in'), ro = R(tr.c, 'out');
    tr.up = steps.filter(s => R(s.c, 'out') === ri);
    tr.down = steps.filter(s => R(s.c, 'in') === ro);
    try { tr.ast = grParse(tr.c.props.expr); tr.err = null; } catch (e) { tr.ast = { t: 'const', v: false }; tr.err = e.message; }
  }
  const stepByAct = new Map(steps.map(s => [R(s.c, 'act'), s]));
  for (let it = 0; it < 10; it++) for (const a of acts) {
    if (a.step) continue;
    const r = R(a.c, 'in');
    if (stepByAct.has(r)) { a.step = stepByAct.get(r); continue; }
    const prevA = acts.find(o => o !== a && o.step && R(o.c, 'next') === r);
    if (prevA) a.step = prevA.step;
  }
  for (const a of acts) { try { a.cond = a.c.props.cond ? grParse(a.c.props.cond) : null; } catch (e) { a.cond = null; a.err = e.message; } }
  const G = { steps, trans, acts, active: new Set(steps.filter(s => DEF[s.c.type].initial).map(s => s.c.id)), stepT: {}, fresh: new Set(), byName: new Map(steps.map(s => [key(s.c.name), s])) };
  for (const id of G.active) { G.stepT[id] = 0; G.fresh.add(id); }
  for (const a of acts) if ((a.c.props.q || 'N') === 'S' || (a.c.props.q || 'N') === 'R') SIM.S.latchNames.add(nkey(a.c));
  return G;
}
function grafcetStep(X, dt) {
  const G = SIM.gr; if (!G) return;
  const run = X.plcRun();
  const fired = [];
  for (const tr of G.trans) {
    const v = grEval(tr.ast, X, G);
    tr.ok = run && tr.up.length > 0 && tr.up.every(s => G.active.has(s.c.id)) && v;
    if (tr.ok) fired.push(tr);
  }
  const fresh = new Set();
  if (fired.length) {
    const off = new Set(), on = new Set();
    for (const tr of fired) { tr.up.forEach(s => off.add(s.c.id)); tr.down.forEach(s => on.add(s.c.id)); }
    for (const id of off) G.active.delete(id);
    for (const id of on) { G.active.add(id); G.stepT[id] = 0; fresh.add(id); }
  }
  for (const id of G.active) if (!fresh.has(id) && !G.fresh.has(id)) G.stepT[id] = (G.stepT[id] || 0) + dt;
  const justOn = new Set([...fresh, ...G.fresh]);
  G.fresh = new Set();
  for (const s of G.steps) if (s.c.name) X.special('X' + key(s.c.name), G.active.has(s.c.id));
  for (const a of G.acts) {
    const k = nkey(a.c), q = a.c.props.q || 'N';
    const act = run && a.step && G.active.has(a.step.c.id);
    const t = a.step ? (G.stepT[a.step.c.id] || 0) : 0;
    const cond = a.cond ? grEval(a.cond, X, G) : true;
    const D = +a.c.props.d || 0, L = +a.c.props.l || 0;
    let on = act && cond && t >= D - 1e-9 && (!L || t < L);
    if (q === 'P') on = act && cond && justOn.has(a.step.c.id);
    a.on = on;
    if (q === 'S') { if (on) X.S.setReq[k] = true; }
    else if (q === 'R') { if (on) X.S.resetReq[k] = true; }
    else X.drive(k, on);
  }
}
