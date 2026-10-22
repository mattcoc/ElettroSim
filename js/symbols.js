/* ElettroSim · Registro dei simboli: disegno, morsetti e comportamento di ogni componente. */
'use strict';
/* ---------- symbol registry ---------- */
const DEF = {};
function def(id, o) { DEF[id] = Object.assign({ id, props: {} }, o); return DEF[id]; }
const T = (id, x, y, d, lab) => ({ id, x, y, d, lab: lab ?? id });
const nkey = c => key(c.name) || ('#' + c.id);

/* ---------- contact primitives ---------- */
function bladeEnd(x, pol, closed) {
  if (pol === 'no') return closed ? [x - 2, -8] : [x - 7.5, -7];
  return closed ? [x + 6, -10.5] : [x - 7.5, -7];
}
function bladeX0(x, pol, closed) { const [x2, y2] = bladeEnd(x, pol, closed); return x + (x2 - x) * (8 / (8 - y2)); }
function contactBody(x, pol, closed, mark, cls) {
  const [x2, y2] = bladeEnd(x, pol, closed);
  let s = ln(x, -20, x, -8) + ln(x, 8, x, 20) + pa(`M${x},8 L${r1(x2)},${r1(y2)}`, cls);
  if (pol === 'nc') s += ln(x, -8, x + 5.5, -8);
  if (mark === 'km') s += pa(`M${x},-8 A2.5,2.5 0 0 0 ${x},-13`);
  if (mark === 'x') s += ln(x - 3, -11, x + 3, -5) + ln(x - 3, -5, x + 3, -11);
  if (mark === 'iso') s += ln(x - 3.5, -8, x + 3.5, -8);
  if (mark === 'sw') s += ci(x, -8, 1.3, 'fill');
  return s;
}
function changeover(closedNO, cls) {
  const tipX = closedNO ? 18.5 : 1.5;
  let s = ln(0, -20, 0, -8) + ln(0, -8, 4.5, -8) + ln(20, -20, 20, -8) + ln(20, -8, 16, -8) + ln(10, 20, 10, 8);
  s += pa(`M10,8 L${tipX},-10`, cls);
  return { s, bx: 10 + (tipX - 10) * (8 / 18) };
}
const HEAD_W = { pb: 1, em: 1, sw: 1, ls: 1, th: 1, ton: 1, toff: 1, tonoff: 1, ind: 1, cap: 1, mag: 1, press: 1, vac: 1, photo: 1, fl: 1, key: 1, lum: 1 };
function head(kind, bx, pressed, y) {
  y = y || 0;
  const off = pressed ? 3 : 0, hx = -13 + off, cls = pressed ? 'act-on' : '';
  const dl = ln(bx, y, hx, y, 'd');
  const box = (inner) => ln(bx, y, -12, y, 'd') + re(-24, y - 6, 12, 12, cls) + inner;
  switch (kind) {
    case 'pb': return dl + pa(`M${hx},${y - 5} L${hx - 3},${y - 5} L${hx - 3},${y + 5} L${hx},${y + 5}`, cls);
    case 'lum': return dl + pa(`M${hx},${y - 5} L${hx - 3},${y - 5} L${hx - 3},${y + 5} L${hx},${y + 5}`, cls) + ci(hx - 8, y, 4, cls) + ln(hx - 10.8, y - 2.8, hx - 5.2, y + 2.8) + ln(hx - 10.8, y + 2.8, hx - 5.2, y - 2.8);
    case 'em': return dl + pa(`M${hx},${y - 6.5} A6.5,6.5 0 0 0 ${hx},${y + 6.5} Z`, cls) + ln(hx + 4, y - 2.5, hx + 6, y) + ln(hx + 4, y + 2.5, hx + 6, y);
    case 'sw': return dl + pa(`M${hx},${y - 5} L${hx - 3},${y - 5} L${hx - 3},${y + 5} L${hx - 6},${y + 5}`, cls);
    case 'key': return dl + ci(hx - 4, y, 3.2, cls) + ln(hx - 7.2, y, hx - 12, y) + ln(hx - 10, y, hx - 10, y + 3);
    case 'ls': return pa(`M${r1(bx)},${y} L${r1(bx - 7)},${y - 4.5} L${r1(bx - 7)},${y + 4.5} Z`, cls);
    case 'th': return box(pa(`M-23,${y + 2.5} h2.5 v-5 h5 v5 h2.5`));
    case 'ind': return box(pa(`M-18,${y - 4} L-14,${y} L-18,${y + 4} L-22,${y} Z`) + ln(-20.5, y, -15.5, y));
    case 'cap': return box(pa(`M-18,${y - 4} L-14,${y} L-18,${y + 4} L-22,${y} Z`) + ln(-19.5, y - 2, -19.5, y + 2) + ln(-16.5, y - 2, -16.5, y + 2));
    case 'mag': return box(pa(`M-18,${y - 4} L-14,${y} L-18,${y + 4} L-22,${y} Z`) + pa(`M-20,${y + 1.5} v-3 h4 v3`));
    case 'press': return box(pa(`M-22,${y + 3} L-14,${y + 3} M-18,${y + 3} L-18,${y - 4} M-20,${y - 2} L-18,${y - 4} L-16,${y - 2}`));
    case 'vac': return box(pa(`M-22,${y + 3} L-14,${y + 3} M-18,${y - 4} L-18,${y + 3} M-20,${y + 1} L-18,${y + 3} L-16,${y + 1}`));
    case 'photo': return box(pa(`M-21,${y - 3} L-16,${y + 1} M-18,${y + 1} L-16,${y + 1} L-16,${y - 1}`) + pa(`M-21,${y} L-16,${y + 4}`));
    case 'fl': return dl + ci(hx - 4.5, y, 4.2, cls) + ln(hx - 11, y + 6.5, hx + 1, y + 6.5) + ln(hx - 9, y + 8.5, hx - 1, y + 8.5);
    case 'ton': return ln(bx, y - 1.6, -10, y - 1.6) + ln(bx, y + 1.6, -10, y + 1.6) + pa(`M-10,${y - 5.5} A5.5,5.5 0 0 0 -10,${y + 5.5}`);
    case 'toff': return ln(bx, y - 1.6, -15, y - 1.6) + ln(bx, y + 1.6, -15, y + 1.6) + pa(`M-15.5,${y - 5.5} A5.5,5.5 0 0 1 -15.5,${y + 5.5}`);
    case 'tonoff': return ln(bx, y - 1.6, -10, y - 1.6) + ln(bx, y + 1.6, -10, y + 1.6) + pa(`M-10,${y - 5.5} A5.5,5.5 0 0 0 -10,${y + 5.5}`) + pa(`M-21,${y - 5.5} A5.5,5.5 0 0 1 -21,${y + 5.5}`) + ln(-15.5, y - 1.6, -10, y - 1.6) + ln(-15.5, y + 1.6, -10, y + 1.6);
    default: return '';
  }
}

/* contact families: form = no | nc | nonc | co */
function contactClosed(c, X, pol, timing, k) {
  k = k || nkey(c);
  let v;
  if (timing) { const t = X.tmr(k); v = t ? !!t[timing] : X.out(k); } else v = X.out(k);
  return pol === 'no' ? v : !v;
}
function contactFamily(base, o) {
  const forms = o.forms || ['no', 'nc', 'nonc', 'co'];
  const FN = { no: 'NA', nc: 'NC', nonc: 'NA+NC', co: 'in scambio' };
  for (const f of forms) {
    const id = base + '_' + f;
    const hasHead = !!o.head;
    const lab = o.lab || 'aux';
    let terms, box, nameAt, links, draw;
    if (f === 'no' || f === 'nc') {
      terms = [T('a', 0, -20, 'n', ''), T('b', 0, 20, 's', '')];
      box = hasHead ? [-25, -20, 9, 20] : [-10, -20, 9, 20];
      nameAt = hasHead ? [-26, 0, 'w'] : [-11, 0, 'w'];
      links = c => [{ a: 'a', b: 'b', on: (c, X) => contactClosed(c, X, f, o.timing) }];
      draw = (c, st) => {
        const closed = st ? st.l0 : f === 'nc';
        return contactBody(0, f, closed, null) + head(o.head, bladeX0(0, f, closed), !!(st && st.act));
      };
    } else if (f === 'nonc') {
      terms = [T('a1', 0, -20, 'n', ''), T('b1', 0, 20, 's', ''), T('a2', 20, -20, 'n', ''), T('b2', 20, 20, 's', '')];
      box = hasHead ? [-25, -20, 29, 20] : [-10, -20, 29, 20];
      nameAt = hasHead ? [-26, 0, 'w'] : [-11, 0, 'w'];
      links = c => [{ a: 'a1', b: 'b1', on: (c, X) => contactClosed(c, X, 'no', o.timing) }, { a: 'a2', b: 'b2', on: (c, X) => contactClosed(c, X, 'nc', o.timing) }];
      draw = (c, st) => {
        const c1 = st ? st.l0 : false, c2 = st ? st.l1 : true;
        return contactBody(0, 'no', c1, null) + contactBody(20, 'nc', c2, null) + ln(bladeX0(0, 'no', c1), 0, bladeX0(20, 'nc', c2), 0, 'd') + head(o.head, bladeX0(0, 'no', c1), !!(st && st.act));
      };
    } else {
      terms = [T('nc', 0, -20, 'n', ''), T('no', 20, -20, 'n', ''), T('c', 10, 20, 's', '')];
      box = hasHead ? [-25, -20, 24, 20] : [-6, -20, 24, 20];
      nameAt = hasHead ? [-26, 0, 'w'] : [-7, 0, 'w'];
      links = c => [{ a: 'c', b: 'nc', on: (c, X) => contactClosed(c, X, 'nc', o.timing) }, { a: 'c', b: 'no', on: (c, X) => contactClosed(c, X, 'no', o.timing) }];
      draw = (c, st) => {
        const onNO = st ? st.l1 : false;
        const ch = changeover(onNO);
        return ch.s + head(o.head, ch.bx, !!(st && st.act));
      };
    }
    def(id, {
      cat: o.cat, label: `${o.label} ${FN[f]}`, prefix: o.prefix, autoNum: !!o.autoNum, desc: o.desc,
      terms, box, nameAt, form: f, labFam: lab, timing: o.timing || null, head: o.head || null,
      draw, sim: { links }, act: o.act || null, follow: o.follow, sensor: !!o.sensor,
    });
    if (o.alias && o.alias[f]) DEF[o.alias[f]] = DEF[id];
  }
}

/* ---------- multipole helpers ---------- */
function polesT(n, y, labs) {
  const t = [];
  for (let i = 0; i < n; i++) {
    t.push(T('a' + (i + 1), i * 20, -y, 'n', labs ? labs[2 * i] : String(2 * i + 1)));
    t.push(T('b' + (i + 1), i * 20, y, 's', labs ? labs[2 * i + 1] : String(2 * i + 2)));
  }
  return t;
}
const nLabs = n => { const l = []; for (let i = 0; i < n; i++) { l.push(String(2 * i + 1), String(2 * i + 2)); } return l; };
const nLabsN = n => { const l = nLabs(n - 1); l.push('N', 'N'); return l; };
function poleLinks(n, onFn) { return c => Array.from({ length: n }, (_, i) => ({ a: 'a' + (i + 1), b: 'b' + (i + 1), on: (c, X) => onFn(c, X, i) })); }

/* ---------- box devices ---------- */
function boxDef(id, o) {
  const w = o.w, h = o.h;
  const terms = [], innerL = [];
  const side = (arr, mk) => (arr || []).forEach((t, i) => { const [tid, lab, pos] = Array.isArray(t) ? t : [t, t]; mk(tid, lab ?? tid, pos, i); });
  side(o.top, (tid, lab, pos, i) => { const x = pos ?? (10 + i * 20); terms.push(T(tid, x, -10, 'n', lab)); innerL.push({ x, y: 6, t: lab }); });
  side(o.bottom, (tid, lab, pos, i) => { const x = pos ?? (10 + i * 20); terms.push(T(tid, x, h + 10, 's', lab)); innerL.push({ x, y: h - 6, t: lab }); });
  side(o.left, (tid, lab, pos, i) => { const y = pos ?? (10 + i * 20); terms.push(T(tid, -10, y, 'w', lab)); innerL.push({ x: 8, y, t: lab, a: 'start' }); });
  side(o.right, (tid, lab, pos, i) => { const y = pos ?? (10 + i * 20); terms.push(T(tid, w + 10, y, 'e', lab)); innerL.push({ x: w - 8, y, t: lab, a: 'end' }); });
  const base = (c, st) => {
    let s = re(0, 0, w, h, st && st.on ? 'box-on' : (st && st.warn ? 'trip' : ''));
    for (const t of terms) {
      if (t.d === 'n') s += ln(t.x, -10, t.x, 0); else if (t.d === 's') s += ln(t.x, h, t.x, h + 10);
      else if (t.d === 'w') s += ln(-10, t.y, 0, t.y); else s += ln(w, t.y, w + 10, t.y);
    }
    return s + (o.art ? o.art(c, st) : '');
  };
  const inner = (c, st) => {
    const out = innerL.map(l => ({ x: l.x, y: l.y, t: l.t, cls: 'lbl-pin', anchor: l.a }));
    const title = typeof o.title === 'function' ? o.title(c, st) : o.title;
    if (title) String(title).split('\n').forEach((t, i, arr) => out.push({ x: o.tx ?? w / 2, y: (o.ty ?? h / 2) + (i - (arr.length - 1) / 2) * 9, t, cls: 'lbl-box' }));
    if (o.inner) out.push(...o.inner(c, st));
    return out;
  };
  return def(id, Object.assign({
    terms, box: [-(o.left && o.left.length ? 10 : 0), -(o.top && o.top.length ? 10 : 0), w + (o.right && o.right.length ? 10 : 0), h + (o.bottom && o.bottom.length ? 10 : 0)],
    nameAt: o.nameAt || [-4, -4, 'w'], termLabels: false, draw: base, inner, boxDev: true,
  }, o, { draw: base, inner, terms, w, h }));
}
/* ================= ALIMENTAZIONI ================= */
function srcSym(n) { let s = ''; for (let i = 0; i < n; i++) { const x = i * 20; s += ln(x, -4.5, x, 0) + ci(x, -8, 3.5); } return s; }
def('src1', {
  cat: 'src', label: 'Alimentazione singola', prefix: 'X', noName: true, showName: false, desc: 'Un morsetto di alimentazione: scegli fase, neutro, terra o polarità.',
  terms: [T('t', 0, 0, 's', '')], box: [-7, -21, 7, 0], nameAt: [-8, -8, 'w'], props: { pot: 'L1' },
  draw: () => srcSym(1), inner: c => [{ x: 0, y: -15.5, t: potTxt(c.props.pot), cls: 'lbl-pot' }],
  sim: { src: c => ({ t: PT[c.props.pot] ?? PT.L1 }) },
});
def('srcArrow', {
  cat: 'src', label: 'Alimentazione da cavo', prefix: 'X', noName: true, showName: false, desc: 'Arrivo di una linea già alimentata (freccia).',
  terms: [T('t', 0, 0, 's', '')], box: [-7, -22, 7, 0], nameAt: [-8, -8, 'w'], props: { pot: 'L1' },
  draw: () => ln(0, -14, 0, 0) + pa('M-4,-12 L0,-6 L4,-12'), inner: c => [{ x: 0, y: -18, t: potTxt(c.props.pot), cls: 'lbl-pot' }],
  sim: { src: c => ({ t: PT[c.props.pot] ?? PT.L1 }) },
});
function multiSrc(id, label, pots, labs, desc) {
  def(id, {
    cat: 'src', label, prefix: 'X', noName: true, showName: false, desc,
    terms: pots.map((p, i) => T(p, i * 20, 0, 's', '')), box: [-7, -21, (pots.length - 1) * 20 + 7, 0], nameAt: [-8, -8, 'w'],
    draw: () => srcSym(pots.length),
    inner: () => pots.map((p, i) => ({ x: i * 20, y: -15.5, t: labs ? labs[i] : potTxt(p), cls: 'lbl-pot' })),
    sim: { src: () => Object.fromEntries(pots.map(p => [p, PT[p]])) },
  });
}
multiSrc('srcLN', 'Fase + neutro', ['L1', 'N'], ['L', 'N'], 'Rete monofase 230 V.');
multiSrc('srcLNPE', 'Fase + neutro + PE', ['L1', 'N', 'PE'], ['L', 'N', 'PE'], 'Rete monofase con conduttore di protezione.');
multiSrc('src3', 'Trifase L1 L2 L3', ['L1', 'L2', 'L3'], null, 'Rete trifase 400 V senza neutro.');
multiSrc('src3pe', 'Trifase + PE', ['L1', 'L2', 'L3', 'PE'], null, 'Rete trifase con conduttore di protezione.');
multiSrc('src3n', 'Trifase + N', ['L1', 'L2', 'L3', 'N'], null, 'Rete trifase con neutro.');
multiSrc('src3npe', 'Trifase + N + PE', ['L1', 'L2', 'L3', 'N', 'PE'], null, 'Rete trifase con neutro e protezione.');
multiSrc('srcdc', 'Continua 24 V', ['P', 'M'], null, 'Alimentazione in corrente continua +24 V / 0 V.');

def('trafo1', {
  cat: 'src', label: 'Trasformatore', prefix: 'T', autoNum: true, desc: 'Trasformatore monofase: quando il primario è alimentato, il secondario diventa una rete separata.',
  terms: [T('p1', 0, -30, 'n', '1'), T('p2', 20, -30, 'n', '2'), T('s1', 0, 30, 's', '3'), T('s2', 20, 30, 's', '4')],
  box: [-3, -30, 23, 30], nameAt: [-5, 0, 'w'], props: { vs: 24 },
  draw: (c, st) => ci(10, -6.5, 9, st && st.on ? 'box-on' : '') + ci(10, 6.5, 9, st && st.on ? 'box-on' : '') + pa('M0,-30 L0,-20 L5.5,-14') + pa('M20,-30 L20,-20 L14.5,-14') + pa('M0,30 L0,20 L5.5,14') + pa('M20,30 L20,20 L14.5,14'),
  sim: {
    sys: () => [['L', 0], ['L', 1]],
    eval: (c, X) => { const on = X.v(c, 'p1', 'p2'); X.dev(c).on = on; X.disp(c, { on }); if (on) X.load(); },
    src: (c, X) => { if (!X.dev(c).on) return null; const p = X.sysPots(c); return { s1: p[0], s2: p[1] }; },
  },
});
def('trafo3', {
  cat: 'src', label: 'Trasformatore trifase', prefix: 'T', autoNum: true, desc: 'Trasformatore trifase triangolo/stella con neutro al secondario.',
  terms: [T('L1', 0, -40, 'n', '1U'), T('L2', 20, -40, 'n', '1V'), T('L3', 40, -40, 'n', '1W'), T('u', 0, 40, 's', '2U'), T('v', 20, 40, 's', '2V'), T('w', 40, 40, 's', '2W'), T('n', 60, 40, 's', '2N')],
  box: [-4, -40, 64, 40], nameAt: [-6, 0, 'w'], props: { vs: 400 },
  draw: (c, st) => {
    const k = st && st.on ? 'box-on' : '';
    return ci(20, -10, 15, k) + ci(20, 10, 15, k) + ln(0, -40, 0, -30) + ln(0, -30, 9, -20) + ln(20, -40, 20, -25) + ln(40, -40, 40, -30) + ln(40, -30, 31, -20)
      + ln(0, 40, 0, 30) + ln(0, 30, 9, 20) + ln(20, 40, 20, 25) + ln(40, 40, 40, 30) + ln(40, 30, 31, 20) + pa('M60,40 L60,10 L35,10')
      + pa('M16,-15 L24,-15 L20,-8 Z') + pa('M20,10 L20,14 M20,10 L17,7 M20,10 L23,7');
  },
  sim: {
    sys: () => [['L', 0], ['L', 1], ['L', 2], ['N']],
    eval: (c, X) => { const d = X.phaseDir(c, ['L1', 'L2', 'L3']); X.dev(c).on = !!d; X.dev(c).dir = d; X.disp(c, { on: !!d }); if (d) X.load(); },
    src: (c, X) => { const D = X.dev(c); if (!D.on) return null; const p = X.sysPots(c); return D.dir > 0 ? { u: p[0], v: p[1], w: p[2], n: p[3] } : { u: p[0], v: p[2], w: p[1], n: p[3] }; },
  },
});
def('diode', {
  cat: 'src', label: 'Diodo', prefix: 'V', autoNum: true, desc: 'Lascia passare la corrente solo dall’anodo (sopra) al catodo.',
  terms: [T('a', 0, -20, 'n', 'A'), T('k', 0, 20, 's', 'K')], box: [-7, -20, 7, 20], nameAt: [-8, 0, 'w'],
  draw: () => ln(0, -20, 0, -5) + ln(0, 5, 0, 20) + pa('M-6,-5 L6,-5 L0,5 Z') + ln(-6, 5, 6, 5),
  sim: { diode: { a: 'a', k: 'k' } },
});
def('led', {
  cat: 'coil', label: 'LED', prefix: 'H', autoNum: true, desc: 'Diodo luminoso: si accende con la giusta polarità (anodo verso il positivo).',
  terms: [T('a', 0, -20, 'n', 'A'), T('k', 0, 20, 's', 'K')], box: [-7, -20, 14, 20], nameAt: [-8, 0, 'w'], props: { color: 'rossa' },
  draw: (c, st) => { const col = LAMP_COL[c.props.color] || LAMP_COL.rossa; return ln(0, -20, 0, -5) + ln(0, 5, 0, 20) + pa('M-6,-5 L6,-5 L0,5 Z', '', st && st.on ? ` style="fill:${col}"` : '') + ln(-6, 5, 6, 5) + pa('M6,-3 L11,-8 M9,-8 L11,-8 L11,-6') + pa('M8,1 L13,-4 M11,-4 L13,-4 L13,-2'); },
  sim: { eval: (c, X) => { const A = X.pots(c, 'a'), K = X.pots(c, 'k'); const on = voltOf(A, K) && Math.max(-1, ...A.map(potLevel)) > Math.min(3, ...K.map(potLevel)); X.disp(c, { on }); if (on) X.load(); } },
});
def('rectb', {
  cat: 'src', label: 'Raddrizzatore a ponte', prefix: 'V', autoNum: true, desc: 'Trasforma la tensione alternata in continua (+ e −).',
  terms: [T('ac1', 0, -30, 'n', '~'), T('ac2', 20, -30, 'n', '~'), T('p', 0, 30, 's', '+'), T('m', 20, 30, 's', '−')], box: [-12, -30, 32, 30], nameAt: [-13, 0, 'w'], termLabels: true,
  draw: (c, st) => pa('M10,-16 L22,-4 L10,8 L-2,-4 Z', st && st.on ? 'box-on' : '') + pa('M0,-30 L0,-10 L4,-10') + pa('M20,-30 L20,-10 L16,-10') + pa('M0,30 L0,2 L4,2') + pa('M20,30 L20,2 L16,2') + pa('M7,-7 L13,-7 L10,-1 Z'),
  sim: {
    eval: (c, X) => { const on = X.v(c, 'ac1', 'ac2'); X.dev(c).on = on; X.disp(c, { on }); if (on) X.load(); },
    src: (c, X) => X.dev(c).on ? { p: PT.P, m: PT.M } : null,
  },
});
boxDef('psu1', {
  cat: 'src', label: 'Alimentatore 230 V / 24 V', prefix: 'G', autoNum: true, desc: 'Alimentatore switching: con L e N alimentati fornisce +24 V e 0 V.',
  w: 60, h: 40, top: [['L', 'L'], ['N', 'N'], ['PE', 'PE']], bottom: [['p', '+'], ['m', '−']], title: '~ / =',
  sim: {
    eval: (c, X) => { const on = X.v(c, 'L', 'N'); X.dev(c).on = on; X.disp(c, { on }); if (on) X.load(); },
    src: (c, X) => X.dev(c).on ? { p: PT.P, m: PT.M } : null,
  },
});
boxDef('psu3', {
  cat: 'src', label: 'Alimentatore trifase / 24 V', prefix: 'G', autoNum: true, desc: 'Alimentatore da rete trifase a 24 V continua.',
  w: 80, h: 40, top: [['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3'], ['PE', 'PE']], bottom: [['p', '+'], ['m', '−']], title: '3~ / =',
  sim: {
    eval: (c, X) => { const on = X.v(c, 'L1', 'L2') || X.v(c, 'L2', 'L3') || X.v(c, 'L1', 'L3'); X.dev(c).on = on; X.disp(c, { on }); if (on) X.load(); },
    src: (c, X) => X.dev(c).on ? { p: PT.P, m: PT.M } : null,
  },
});
def('battery', {
  cat: 'src', label: 'Batteria', prefix: 'G', autoNum: true, desc: 'Sorgente in continua sempre disponibile.',
  terms: [T('p', 0, -20, 'n', '+'), T('m', 0, 20, 's', '−')], box: [-9, -20, 9, 20], nameAt: [-10, 0, 'w'],
  draw: () => ln(0, -20, 0, -6) + ln(0, 6, 0, 20) + ln(-8, -6, 8, -6) + ln(-4, -2, 4, -2) + ln(-8, 2, 8, 2) + ln(-4, 6, 4, 6) + ln(5, -12, 9, -12) + ln(7, -14, 7, -10),
  sim: { src: () => ({ p: PT.P, m: PT.M }) },
});
def('socket', {
  cat: 'src', label: 'Presa elettrica', prefix: 'XS', autoNum: true, desc: 'Presa di corrente: in simulazione mostra se è in tensione.',
  terms: [T('L', -10, -20, 'n', 'L'), T('PE', 0, -20, 'n', 'PE'), T('N', 10, -20, 'n', 'N')], box: [-14, -20, 14, 10], nameAt: [-15, 0, 'w'],
  draw: (c, st) => pa('M-12,4 A12,12 0 0 1 12,4 Z', st && st.on ? 'box-on' : '') + ln(-10, -20, -10, -5) + ln(0, -20, 0, -8) + ln(10, -20, 10, -5) + ln(-12, 4, 12, 4),
  sim: { eval: (c, X) => { const on = X.v(c, 'L', 'N'); X.disp(c, { on }); } },
});

/* ================= FUSIBILI E SEZIONATORI ================= */
const LAMP_COL = { verde: '#22c55e', rossa: '#ef4444', gialla: '#facc15', arancione: '#fb923c', blu: '#3b82f6', bianca: '#f1f5f9' };
function fuseSym(x, blown) {
  return ln(x, -20, x, -9) + ln(x, 9, x, 20) + re(x - 4, -9, 8, 18, blown ? 'blown' : '') + (blown ? ln(x - 4, -9, x + 4, 9, 'blown') + ln(x + 4, -9, x - 4, 9, 'blown') : ln(x, -9, x, 9));
}
const neutralPole = x => ln(x, -20, x, 20) + ln(x - 3, -3, x + 3, -3);
const fuseCfg = [['1', 1, false, 'I'], ['1n', 2, true, 'I+N'], ['2', 2, false, 'II'], ['3', 3, false, 'III'], ['3n', 4, true, 'III+N']];
for (const [sfx, n, withN, txt] of fuseCfg) {
  def('fu' + sfx, {
    cat: 'fuse', label: `Fusibile ${txt}`, prefix: 'F', autoNum: true, desc: 'Interviene sui cortocircuiti. In simulazione, clic per sostituirlo.',
    terms: polesT(n, 20, withN ? nLabsN(n) : nLabs(n)), box: [-6, -20, (n - 1) * 20 + 6, 20], nameAt: [-7, 0, 'w'],
    draw: (c, st) => { let s = ''; for (let i = 0; i < n; i++) s += withN && i === n - 1 ? neutralPole(i * 20) : fuseSym(i * 20, st && st.blown); return s; },
    sim: { links: poleLinks(n, (c, X, i) => (withN && i === n - 1) ? true : !X.S.blown[nkey(c)]) },
    act: 'fuse', protective: 'fuse',
  });
  def('sfu' + sfx, {
    cat: 'fuse', label: `Sezionatore con fusibili ${txt}`, prefix: 'Q', autoNum: true, desc: 'Sezionatore portafusibili: clic per aprire o chiudere, o per sostituire i fusibili intervenuti.',
    terms: polesT(n, 30, withN ? nLabsN(n) : nLabs(n)), box: [-21, -30, (n - 1) * 20 + 6, 30], nameAt: [-22, -10, 'w'], props: { startOn: false },
    draw: (c, st) => {
      const closed = st ? st.l0 : false;
      let s = '<g transform="translate(0,-10)">';
      for (let i = 0; i < n; i++) s += contactBody(i * 20, 'no', closed, 'iso');
      s += head('sw', bladeX0((n - 1) * 20, 'no', closed), false) + '</g>';
      for (let i = 0; i < n; i++) { const x = i * 20; s += withN && i === n - 1 ? ln(x, 10, x, 30) : ln(x, 10, x, 13) + re(x - 4, 13, 8, 12, st && st.blown ? 'blown' : '') + ln(x, 13, x, 25) + ln(x, 25, x, 30); }
      return s;
    },
    sim: { links: poleLinks(n, (c, X, i) => X.out(nkey(c)) && ((withN && i === n - 1) || !X.S.blown[nkey(c)])) },
    act: 'sfu', protective: 'fuse',
  });
}

/* ================= AUTOMATICI, DIFFERENZIALI, TERMICI ================= */
function breakerSym(n, closed, cls, glyph, withN) {
  let s = '';
  for (let i = 0; i < n; i++) s += contactBody(i * 20, 'no', closed, withN && i === n - 1 ? null : 'x', cls);
  return s + ln(-13, 0, bladeX0((n - 1) * 20, 'no', closed), 0, 'd') + re(-23, -5, 10, 10) + glyph;
}
const GLYPH_MT = pa('M-22,2.5 h2.5 v-5 h4 v5 h2.5');
const GLYPH_IA = pa('M-21,3 L-21,-3 L-15,-3');
const brkCfg = [['1', 1, 'I'], ['1n', 2, 'I+N'], ['2', 2, 'II'], ['3', 3, 'III'], ['3n', 4, 'III+N']];
for (const [sfx, n, txt] of brkCfg) {
  const withN = sfx.endsWith('n');
  const mtId = sfx === '3n' ? 'mcb4' : 'mcb' + sfx;
  def(mtId, {
    cat: 'brk', label: `Magnetotermico ${txt}`, prefix: 'Q', autoNum: true, desc: 'Interruttore magnetotermico: clic in simulazione per aprirlo o chiuderlo. Scatta da solo su cortocircuiti e sovraccarichi.',
    terms: polesT(n, 20, withN ? nLabsN(n) : nLabs(n)), box: [-24, -20, (n - 1) * 20 + 6, 20], nameAt: [-25, 0, 'w'], props: { startOn: false },
    draw: (c, st) => breakerSym(n, st ? st.l0 : false, st && st.tripped ? 'blown' : '', GLYPH_MT, withN),
    sim: { links: poleLinks(n, (c, X) => X.out(nkey(c))) }, act: 'latch', protective: 'breaker', thermal: 'mp',
  });
  def('ia' + sfx, {
    cat: 'brk', label: `Interruttore automatico ${txt}`, prefix: 'Q', autoNum: true, desc: 'Interruttore automatico magnetico: scatta sui cortocircuiti.',
    terms: polesT(n, 20, withN ? nLabsN(n) : nLabs(n)), box: [-24, -20, (n - 1) * 20 + 6, 20], nameAt: [-25, 0, 'w'], props: { startOn: false },
    draw: (c, st) => breakerSym(n, st ? st.l0 : false, st && st.tripped ? 'blown' : '', GLYPH_IA, withN),
    sim: { links: poleLinks(n, (c, X) => X.out(nkey(c))) }, act: 'latch', protective: 'breaker',
  });
}
def('mpcb3', {
  cat: 'brk', label: 'Salvamotore', prefix: 'Q', autoNum: true, desc: 'Magnetotermico per motori. I contatti ausiliari si disegnano con la stessa sigla.',
  terms: polesT(3, 30), box: [-24, -30, 46, 30], nameAt: [-25, -10, 'w'], props: { startOn: false },
  draw: (c, st) => {
    const closed = st ? st.l0 : false;
    let s = '<g transform="translate(0,-10)">';
    for (let i = 0; i < 3; i++) s += contactBody(i * 20, 'no', closed, 'x', st && st.tripped ? 'blown' : '');
    s += ln(-13, 0, bladeX0(40, 'no', closed), 0, 'd') + '</g>';
    for (let i = 0; i < 3; i++) { const x = i * 20; s += re(x - 5, 10, 10, 10, st && st.tripped ? 'trip' : '') + pa(`M${x},10 v3 h-3 v4 h3 v3`) + ln(x, 20, x, 30); }
    return s + pa('M-13,-10 L-13,15 L-5,15', 'd') + re(-23, -15, 10, 10) + pa('M-22,-7.5 h2.5 v-5 h4 v5 h2.5');
  },
  sim: { links: poleLinks(3, (c, X) => X.out(nkey(c))) }, act: 'latch', protective: 'breaker', thermal: 'mp',
});
for (const n of [2, 4]) {
  def('rcd' + n, {
    cat: 'brk', label: `Differenziale ${n === 2 ? 'I+N' : 'III+N'}`, prefix: 'Q', autoNum: true, desc: 'Interruttore differenziale (salvavita): scatta anche per guasto verso terra.',
    terms: polesT(n, 20, nLabsN(n)), box: [-28, -20, (n - 1) * 20 + 7, 20], nameAt: [-29, 0, 'w'], props: { startOn: false },
    draw: (c, st) => {
      const closed = st ? st.l0 : false;
      let s = '';
      for (let i = 0; i < n; i++) s += contactBody(i * 20, 'no', closed, i === n - 1 ? null : 'x', st && st.tripped ? 'blown' : '');
      return s + ln(-13, 0, bladeX0((n - 1) * 20, 'no', closed), 0, 'd') + `<ellipse cx="${(n - 1) * 10}" cy="13" rx="${(n - 1) * 10 + 6}" ry="3"/>` + re(-27, -6, 14, 12);
    },
    inner: () => [{ x: -20, y: 0.5, t: 'ΔI', cls: 'lbl-pin' }],
    sim: { links: poleLinks(n, (c, X) => X.out(nkey(c))) }, act: 'latch', protective: 'breaker', rcd: true,
  });
}
def('ol3', {
  cat: 'brk', label: 'Relè termico', prefix: 'F', autoNum: true, desc: 'Protegge il motore dal sovraccarico. Clic in simulazione per farlo scattare o riarmarlo. I contatti 95-96 e 97-98 hanno la stessa sigla.',
  terms: polesT(3, 20), box: [-8, -20, 46, 20], nameAt: [-9, 0, 'w'],
  draw: (c, st) => { let s = ''; for (let i = 0; i < 3; i++) { const x = i * 20; s += ln(x, -20, x, -7) + ln(x, 7, x, 20) + re(x - 6, -7, 12, 14, st && st.act ? 'trip' : '') + pa(`M${x},-7 v4 h-3.5 v6 h3.5 v4`); } return s; },
  sim: { always: [['a1', 'b1'], ['a2', 'b2'], ['a3', 'b3']] }, act: 'latch', thermal: 'ol',
});
for (const n of [2, 4]) {
  def('spd' + n, {
    cat: 'brk', label: `Limitatore di sovratensione ${n === 2 ? 'I+N' : 'III+N'}`, prefix: 'F', autoNum: true, desc: 'Scaricatore di sovratensioni (SPD) verso terra.',
    terms: [...Array.from({ length: n }, (_, i) => T('l' + (i + 1), i * 20, -20, 'n', i === n - 1 ? 'N' : 'L' + (n > 2 ? i + 1 : ''))), T('pe', (n - 1) * 10, 30, 's', 'PE')],
    box: [-6, -20, (n - 1) * 20 + 6, 30], nameAt: [-7, 0, 'w'],
    draw: () => { let s = ''; for (let i = 0; i < n; i++) { const x = i * 20; s += ln(x, -20, x, -8) + re(x - 4, -8, 8, 14) + pa(`M${x - 4},4 L${x + 4},-6`) + ln(x, 6, x, 14); } return s + ln(0, 14, (n - 1) * 20, 14) + ln((n - 1) * 10, 14, (n - 1) * 10, 30); },
  });
}

/* ================= CONTATTORI E INTERRUTTORI ================= */
for (const n of [1, 2, 3, 4]) {
  def('km' + n + 'p', {
    cat: 'km', label: n === 1 ? 'Contattore I (polo)' : `Contattore ${['', '', 'II', 'III', 'IIII'][n]}`, prefix: 'KM', desc: 'Contatti di potenza: si chiudono quando la bobina con la stessa sigla è eccitata.',
    terms: polesT(n, 20), box: [-10, -20, (n - 1) * 20 + 6, 20], nameAt: [-11, 0, 'w'], follow: ['coil', 'coil_k', 'coil_ev'],
    draw: (c, st) => {
      const closed = st ? st.l0 : false; let s = '';
      for (let i = 0; i < n; i++) s += contactBody(i * 20, 'no', closed, 'km');
      if (n > 1) s += ln(bladeX0(0, 'no', closed), 0, bladeX0((n - 1) * 20, 'no', closed), 0, 'd');
      return s;
    },
    sim: { links: poleLinks(n, (c, X) => X.out(nkey(c))) },
  });
  def('sw' + n + 'p', {
    cat: 'km', label: `Interruttore ${['', 'I', 'II', 'III', 'IIII'][n]}`, prefix: 'Q', autoNum: true, desc: 'Interruttore di manovra: clic in simulazione per aprirlo o chiuderlo.',
    terms: polesT(n, 20), box: [-21, -20, (n - 1) * 20 + 6, 20], nameAt: [-22, 0, 'w'], props: { startOn: false },
    draw: (c, st) => { const closed = st ? st.l0 : false; let s = ''; for (let i = 0; i < n; i++) s += contactBody(i * 20, 'no', closed, 'sw'); return s + head('sw', bladeX0((n - 1) * 20, 'no', closed), false); },
    sim: { links: poleLinks(n, (c, X) => X.out(nkey(c))) }, act: 'latch',
  });
}
DEF.sz3 = DEF.sw3p;
def('ilk', {
  cat: 'km', label: 'Interblocco meccanico', prefix: 'IL', noName: true, showName: false, desc: 'Impedisce che i due contattori indicati si chiudano insieme.',
  terms: [], box: [-12, -10, 12, 10], nameAt: [0, -12, 'n'], props: { a: 'KM1', b: 'KM2' },
  draw: () => pa('M-8,-6 L8,-6 L0,7 Z') + ln(-12, -6, -8, -6, 'd') + ln(8, -6, 12, -6, 'd'),
  inner: c => [{ x: 0, y: 14, t: `${c.props.a} ⇄ ${c.props.b}`, cls: 'lbl-pin' }],
});

/* ================= MOTORI ================= */
function rotor(st, R) {
  if (!st || !st.run) return '';
  R = R || 13;
  const dur = st.slow ? 1.8 : 0.9, to = st.dir < 0 ? -360 : 360, k = R / 13, f = v => r1(v * k);
  const anim = REDUCED ? '' : `<animateTransform attributeName="transform" type="rotate" from="0 0 0" to="${to} 0 0" dur="${dur}s" begin="0s" repeatCount="indefinite"/>`;
  const tip = st.dir < 0 ? `M${f(-11)},${f(-7)} l-1.5,5 l4.5,-2.6` : `M${f(11)},${f(-7)} l1.5,5 l-4.5,-2.6`;
  const arc = st.dir < 0 ? `M${f(3.9)},${f(-12.4)} A${R},${R} 0 0 0 ${f(-11)},${f(-7)}` : `M${f(-3.9)},${f(-12.4)} A${R},${R} 0 0 1 ${f(11)},${f(-7)}`;
  return `<g>${pa(arc, 'act-on')}${pa(tip, 'act-on')}${anim}</g>`;
}
const mcirc = (r, st) => ci(0, 0, r, st && st.run ? 'motor-on' : (st && st.two ? 'trip' : ''));
const mInner = (a, b) => (c, st) => [{ x: 0, y: -2.5, t: 'M', cls: 'lbl-in' }, { x: 0, y: 8, t: st && st.run && st.txt ? st.txt : b, cls: 'lbl' }];
function motor3(X, c, U) {
  const d = X.phaseDir(c, U);
  if (d) return { run: true, dir: d, hz: X.hzOf(c, U[0]) };
  return { run: false, two: X.phaseCount(c, U) === 2 };
}
def('m3', {
  cat: 'mot', label: 'Motore trifase', prefix: 'M', autoNum: true, desc: 'Motore asincrono trifase. Il senso di rotazione dipende dall’ordine delle fasi.',
  terms: [T('U1', -20, -30, 'n'), T('V1', 0, -30, 'n'), T('W1', 20, -30, 'n'), T('PE', 40, -30, 'n')], box: [-22, -30, 42, 19], nameAt: [-23, 0, 'w'],
  draw: (c, st) => mcirc(18, st) + pa('M-20,-30 L-20,-24 L-9,-15.6') + ln(0, -30, 0, -18) + pa('M20,-30 L20,-24 L9,-15.6') + pa('M40,-30 L40,0 L18,0') + rotor(st, 14.5),
  inner: mInner('M', '3~'), motor: true,
  sim: { eval: (c, X) => { const r = motor3(X, c, ['U1', 'V1', 'W1']); if (r.run) X.load(); X.disp(c, r); } },
});
def('m6', {
  cat: 'mot', label: 'Motore trifase Y/Δ', prefix: 'M', autoNum: true, desc: 'Motore trifase con 6 morsetti per avviamento stella-triangolo.',
  terms: [T('U1', -20, -40, 'n'), T('V1', 0, -40, 'n'), T('W1', 20, -40, 'n'), T('U2', -20, 40, 's'), T('V2', 0, 40, 's'), T('W2', 20, 40, 's'), T('PE', 40, -40, 'n')],
  box: [-24, -40, 42, 40], nameAt: [-25, 0, 'w'], motor: true,
  draw: (c, st) => mcirc(22, st) + pa('M-20,-40 L-20,-31 L-9.5,-19.8') + ln(0, -40, 0, -22) + pa('M20,-40 L20,-31 L9.5,-19.8') + pa('M-20,40 L-20,31 L-9.5,19.8') + ln(0, 40, 0, 22) + pa('M20,40 L20,31 L9.5,19.8') + pa('M40,-40 L40,0 L22,0') + rotor(st, 18.5),
  inner: mInner('M', '3~'),
  sim: {
    eval: (c, X) => {
      const ph = ['U1', 'V1', 'W1'], en = ['U2', 'V2', 'W2'];
      const dir = X.phaseDir(c, ph);
      const delta = [0, 1, 2].every(i => X.phOf(c, ph[i]) != null && X.phOf(c, en[i]) != null && X.phOf(c, ph[i]) !== X.phOf(c, en[i]));
      const r = en.map(t => X.root(c, t));
      const star = r[0] === r[1] && r[1] === r[2] && !X.pots(c, 'U2').some(p => POTS[p].kind === 'L');
      if (dir && delta) { X.load(); X.disp(c, { run: true, dir, txt: '3~ Δ', mode: 'triangolo', hz: X.hzOf(c, 'U1') }); }
      else if (dir && star) { X.load(); X.disp(c, { run: true, dir, slow: true, txt: '3~ Y', mode: 'stella', hz: X.hzOf(c, 'U1') }); }
      else X.disp(c, { run: false, two: X.phaseCount(c, ph) === 2 && (star || delta) });
    },
  },
});
def('m1', {
  cat: 'mot', label: 'Motore monofase', prefix: 'M', autoNum: true, desc: 'Motore monofase 230 V.',
  terms: [T('a', -10, -30, 'n', 'U1'), T('b', 10, -30, 'n', 'U2'), T('PE', 30, -30, 'n')], box: [-19, -30, 32, 19], nameAt: [-20, 0, 'w'], motor: true,
  draw: (c, st) => mcirc(18, st) + ln(-10, -30, -10, -15) + ln(10, -30, 10, -15) + pa('M30,-30 L30,0 L18,0') + rotor(st, 14.5),
  inner: mInner('M', '1~'),
  sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { run: on, dir: 1 }); } },
});
def('m1c', {
  cat: 'mot', label: 'Motore monofase con condensatore', prefix: 'M', autoNum: true, desc: 'Motore monofase con condensatore di avviamento permanente.',
  terms: [T('a', -10, -30, 'n', 'L'), T('b', 10, -30, 'n', 'N'), T('PE', 30, -30, 'n')], box: [-24, -30, 32, 19], nameAt: [-25, 0, 'w'], motor: true,
  draw: (c, st) => mcirc(18, st) + ln(-10, -30, -10, -15) + ln(10, -30, 10, -15) + pa('M30,-30 L30,0 L18,0') + ln(-21, -6, -21, 6) + ln(-24, -6, -24, 6) + rotor(st, 14.5),
  inner: mInner('M', '1~ C'),
  sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { run: on, dir: c.props.rev ? -1 : 1 }); } }, props: { rev: false },
});
def('mst', {
  cat: 'mot', label: 'Trifase come monofase (Steinmetz)', prefix: 'M', autoNum: true, desc: 'Motore trifase alimentato in monofase con condensatore (collegamento Steinmetz).',
  terms: [T('U1', -20, -30, 'n'), T('V1', 0, -30, 'n'), T('PE', 40, -30, 'n')], box: [-22, -30, 42, 19], nameAt: [-23, 0, 'w'], motor: true, props: { rev: false },
  draw: (c, st) => mcirc(18, st) + pa('M-20,-30 L-20,-24 L-9,-15.6') + ln(0, -30, 0, -18) + pa('M0,-24 L20,-24 L20,-20') + ln(16, -20, 24, -20) + ln(16, -17, 24, -17) + pa('M20,-17 L20,-14 L9,-15.6') + pa('M40,-30 L40,0 L18,0') + rotor(st, 14.5),
  inner: mInner('M', '3~ C'),
  sim: { eval: (c, X) => { const on = X.v(c, 'U1', 'V1'); if (on) X.load(); X.disp(c, { run: on, dir: c.props.rev ? -1 : 1 }); } },
});
function twoSpeed(id, label, desc, dahl) {
  def(id, {
    cat: 'mot', label, prefix: 'M', autoNum: true, desc, motor: true,
    terms: [T('1U', -20, -40, 'n'), T('1V', 0, -40, 'n'), T('1W', 20, -40, 'n'), T('2U', -20, 40, 's'), T('2V', 0, 40, 's'), T('2W', 20, 40, 's'), T('PE', 40, -40, 'n')],
    box: [-24, -40, 42, 40], nameAt: [-25, 0, 'w'],
    draw: (c, st) => mcirc(22, st) + pa('M-20,-40 L-20,-31 L-9.5,-19.8') + ln(0, -40, 0, -22) + pa('M20,-40 L20,-31 L9.5,-19.8') + pa('M-20,40 L-20,31 L-9.5,19.8') + ln(0, 40, 0, 22) + pa('M20,40 L20,31 L9.5,19.8') + pa('M40,-40 L40,0 L22,0') + rotor(st, 18.5),
    inner: mInner('M', dahl ? '3~ Dahl.' : '3~ 2 vel.'),
    sim: {
      eval: (c, X) => {
        const A = ['1U', '1V', '1W'], B = ['2U', '2V', '2W'];
        const dA = X.phaseDir(c, A), dB = X.phaseDir(c, B);
        const rA = A.map(t => X.root(c, t)), floatB = B.every(t => !X.pots(c, t).length);
        const shortA = rA[0] === rA[1] && rA[1] === rA[2];
        let r = { run: false, two: X.phaseCount(c, A) === 2 || X.phaseCount(c, B) === 2 };
        if (dahl) {
          if (dA && floatB && !shortA) r = { run: true, dir: dA, slow: true, txt: 'lenta', mode: 'velocità bassa' };
          else if (dB && shortA) r = { run: true, dir: dB, txt: 'veloce', mode: 'velocità alta' };
        } else {
          if (dA && !dB) r = { run: true, dir: dA, slow: true, txt: 'lenta', mode: 'velocità bassa' };
          else if (dB && !dA) r = { run: true, dir: dB, txt: 'veloce', mode: 'velocità alta' };
          else if (dA && dB) r = { run: false, two: true, mode: 'due avvolgimenti alimentati' };
        }
        if (r.run) X.load();
        X.disp(c, r);
      },
    },
  });
}
twoSpeed('mdahl', 'Motore Dahlander', 'Due velocità con un solo avvolgimento: triangolo (lenta) o doppia stella (veloce).', true);
twoSpeed('m2v', 'Motore a due velocità', 'Due avvolgimenti separati: 1U1V1W lenta, 2U2V2W veloce.', false);
def('mwr', {
  cat: 'mot', label: 'Motore a rotore avvolto', prefix: 'M', autoNum: true, desc: 'Statore U1 V1 W1, rotore K L M collegato a resistenze di avviamento.', motor: true,
  terms: [T('U1', -20, -40, 'n'), T('V1', 0, -40, 'n'), T('W1', 20, -40, 'n'), T('K', -20, 40, 's'), T('L', 0, 40, 's'), T('M', 20, 40, 's'), T('PE', 40, -40, 'n')],
  box: [-24, -40, 42, 40], nameAt: [-25, 0, 'w'],
  draw: (c, st) => mcirc(22, st) + ci(0, 0, 15) + pa('M-20,-40 L-20,-31 L-9.5,-19.8') + ln(0, -40, 0, -22) + pa('M20,-40 L20,-31 L9.5,-19.8') + pa('M-20,40 L-20,31 L-9,12') + ln(0, 40, 0, 15) + pa('M20,40 L20,31 L9,12') + pa('M40,-40 L40,0 L22,0') + rotor(st, 18.5),
  inner: mInner('M', '3~'),
  sim: {
    eval: (c, X) => {
      const d = X.phaseDir(c, ['U1', 'V1', 'W1']);
      if (!d) { X.disp(c, { run: false, two: X.phaseCount(c, ['U1', 'V1', 'W1']) === 2 }); return; }
      X.load();
      const r = ['K', 'L', 'M'].map(t => X.root(c, t));
      const shorted = r[0] === r[1] && r[1] === r[2];
      X.disp(c, shorted ? { run: true, dir: d, txt: 'regime', mode: 'rotore in corto' } : { run: true, dir: d, slow: true, txt: 'avviam.', mode: 'resistenze rotoriche inserite' });
    },
  },
});
def('mdc', {
  cat: 'mot', label: 'Motore c.c. a magneti permanenti', prefix: 'M', autoNum: true, desc: 'Invertendo la polarità cambia il senso di rotazione.', motor: true,
  terms: [T('a', -10, -30, 'n', 'A1'), T('b', 10, -30, 'n', 'A2')], box: [-19, -30, 19, 19], nameAt: [-20, 0, 'w'],
  draw: (c, st) => mcirc(18, st) + ln(-10, -30, -10, -15) + ln(10, -30, 10, -15) + rotor(st, 14.5),
  inner: mInner('M', '='),
  sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { run: on, dir: X.pots(c, 'a').some(p => POTS[p].kind === 'M') ? -1 : 1 }); } },
});
def('mdcx', {
  cat: 'mot', label: 'Motore c.c. ad eccitazione indipendente', prefix: 'M', autoNum: true, desc: 'Gira se armatura (A1-A2) ed eccitazione (F1-F2) sono alimentate.', motor: true,
  terms: [T('a', -10, -30, 'n', 'A1'), T('b', 10, -30, 'n', 'A2'), T('f1', -10, 30, 's', 'F1'), T('f2', 10, 30, 's', 'F2')], box: [-19, -30, 19, 30], nameAt: [-20, 0, 'w'],
  draw: (c, st) => mcirc(18, st) + ln(-10, -30, -10, -15) + ln(10, -30, 10, -15) + ln(-10, 30, -10, 22) + ln(10, 30, 10, 22) + pa('M-10,22 q3,-3 6,0 q3,-3 6,0 q3,-3 6,0 q3,-3 2,0') + rotor(st, 14.5),
  inner: mInner('M', '='),
  sim: {
    eval: (c, X) => {
      const on = X.v(c, 'a', 'b') && X.v(c, 'f1', 'f2');
      if (on) X.load();
      const pa_ = X.pots(c, 'a').some(p => POTS[p].kind === 'M') ? -1 : 1, pf = X.pots(c, 'f1').some(p => POTS[p].kind === 'M') ? -1 : 1;
      X.disp(c, { run: on, dir: pa_ * pf });
    },
  },
});
function stepperMotor(id, label, pins) {
  def(id, {
    cat: 'mot', label, prefix: 'M', autoNum: true, desc: 'Motore passo-passo: gira se collegato alle uscite di un controller passo-passo abilitato.', motor: true,
    terms: pins.map((p, i) => T(p, -((pins.length - 1) * 10) + i * 20, -30, 'n')), box: [-((pins.length - 1) * 10) - 4, -30, (pins.length - 1) * 10 + 4, 19], nameAt: [-((pins.length - 1) * 10) - 6, 0, 'w'],
    draw: (c, st) => mcirc(18, st) + pins.map((p, i) => { const x = -((pins.length - 1) * 10) + i * 20; const ex = clamp(x, -12, 12); return pa(`M${x},-30 L${x},-24 L${ex},${r1(-Math.sqrt(Math.max(0, 324 - ex * ex)))}`); }).join('') + rotor(st, 14.5),
    inner: mInner('M', 'passo'),
    sim: {
      eval: (c, X) => {
        let owner = null, n = new Set();
        for (const p of pins) for (const id of X.pots(c, p)) { const P = POTS[id]; if (P.sys.startsWith('st')) { owner = P.owner; n.add(id); } }
        const on = !!owner && n.size >= 2;
        if (on) X.load();
        const D = owner ? X.devById(owner) : null;
        X.disp(c, { run: on, dir: D && D.dir ? D.dir : 1, slow: true, txt: on ? (D && D.dir < 0 ? '◄ passo' : 'passo ►') : null });
      },
    },
  });
}
stepperMotor('mstepb', 'Motore passo-passo bipolare', ['A+', 'A-', 'B+', 'B-']);
stepperMotor('mstepu', 'Motore passo-passo unipolare', ['A', 'B', 'COM', 'C', 'D']);

/* ================= POTENZA ================= */
def('res1', {
  cat: 'pow', label: 'Resistenza', prefix: 'R', autoNum: true, desc: 'Resistenza di riscaldamento: si colora quando è alimentata.',
  terms: [T('a', 0, -20, 'n', '1'), T('b', 0, 20, 's', '2')], box: [-6, -20, 6, 20], nameAt: [-7, 0, 'w'],
  draw: (c, st) => ln(0, -20, 0, -10) + ln(0, 10, 0, 20) + re(-5, -10, 10, 20, st && st.on ? 'heat' : ''),
  sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { on }); } },
});
def('res3', {
  cat: 'pow', label: 'Resistenza trifase', prefix: 'R', autoNum: true, desc: 'Tre resistenze collegate a stella.',
  terms: [T('U', 0, -30, 'n'), T('V', 20, -30, 'n'), T('W', 40, -30, 'n')], box: [-6, -30, 46, 20], nameAt: [-7, 0, 'w'],
  draw: (c, st) => { let s = ''; for (let i = 0; i < 3; i++) { const x = i * 20; s += ln(x, -30, x, -16) + re(x - 5, -16, 10, 20, st && st.on ? 'heat' : '') + ln(x, 4, x, 12); } return s + ln(0, 12, 40, 12) + ci(20, 12, 1.5, 'fill'); },
  sim: { eval: (c, X) => { const on = X.v(c, 'U', 'V') || X.v(c, 'V', 'W') || X.v(c, 'U', 'W'); if (on) X.load(); X.disp(c, { on }); } },
});
def('autotr3', {
  cat: 'pow', label: 'Autotrasformatore trifase', prefix: 'T', autoNum: true, desc: 'Autotrasformatore per avviamento a tensione ridotta: le uscite seguono le fasi in ingresso.',
  terms: [T('L1', 0, -30, 'n', '1'), T('L2', 20, -30, 'n', '2'), T('L3', 40, -30, 'n', '3'), T('U', 0, 30, 's', '4'), T('V', 20, 30, 's', '5'), T('W', 40, 30, 's', '6')], box: [-8, -30, 48, 30], nameAt: [-9, 0, 'w'],
  draw: () => { let s = ''; for (let i = 0; i < 3; i++) { const x = i * 20; s += ln(x, -30, x, -12) + pa(`M${x},-12 q5,3 0,6 q5,3 0,6 q5,3 0,6 q5,3 0,6`) + ln(x, 12, x, 30) + ln(x, 6, x + 7, 6) + ln(x + 7, 4, x + 7, 8); } return s + ln(7, 18, 47, 18, 'd'); },
  sim: { always: [['L1', 'U'], ['L2', 'V'], ['L3', 'W']] },
});
boxDef('soft', {
  cat: 'pow', label: 'Avviatore statico (soft starter)', prefix: 'U', autoNum: true, desc: 'Con A1-A2 alimentati avvia il motore con una rampa di tensione.',
  w: 60, h: 60, top: [['L1', '1L1'], ['L2', '3L2'], ['L3', '5L3']], bottom: [['T1', '2T1'], ['T2', '4T2'], ['T3', '6T3']], left: [['A1', 'A1', 20], ['A2', 'A2', 40]], props: { t: 3 }, tx: 34,
  title: (c, st) => st && st.run ? `rampa ${Math.round(st.ramp * 100)}%` : 'soft start',
  sim: {
    links: () => [{ a: 'L1', b: 'T1', on: (c, X) => !!X.dev(c).run }, { a: 'L2', b: 'T2', on: (c, X) => !!X.dev(c).run }, { a: 'L3', b: 'T3', on: (c, X) => !!X.dev(c).run }],
    eval: (c, X) => { const D = X.dev(c); D.cmd = X.v(c, 'A1', 'A2'); if (D.cmd) X.load(); },
    tick: (c, X, dt) => {
      const D = X.dev(c); const t = Math.max(0.1, +c.props.t || 3);
      if (D.cmd) { D.run = true; D.ramp = Math.min(1, (D.ramp || 0) + dt / t); } else { D.run = false; D.ramp = 0; }
      X.disp(c, { run: D.run, ramp: D.ramp || 0, on: D.run });
    },
  },
});
function inverter(id, label, inputs, dc) {
  boxDef(id, {
    cat: 'pow', label, prefix: 'U', autoNum: true,
    desc: dc ? 'Variatore per motori in c.c.: FW avanti, RV indietro (collega il contatto tra +24 e FW o RV).' : 'Variatore di frequenza (inverter): FW avanti, RV indietro, frequenza impostabile.',
    w: 80, h: 90, top: inputs, bottom: dc ? [['ap', 'A+', 30], ['am', 'A−', 50]] : [['U', 'U', 30], ['V', 'V', 50], ['W', 'W', 70]],
    left: [['p24', '+24', 20], ['FW', 'FW', 40], ['RV', 'RV', 60], ['COM', 'COM', 80]], props: { hz: 50 },
    title: (c, st) => st && st.run ? `${st.dir < 0 ? '◄ ' : ''}${fmtNum(c.props.hz)} Hz${st.dir > 0 ? ' ►' : ''}` : (dc ? '= / =' : '~ / 3~'), tx: 48,
    sim: {
      sys: dc ? null : () => [['L', 0], ['L', 1], ['L', 2]],
      eval: (c, X) => {
        const D = X.dev(c);
        D.pw = inputs.length === 2 || (inputs.length === 3 && inputs[2][0] === 'PE') ? X.v(c, inputs[0][0], inputs[1][0]) : (X.v(c, 'L1', 'L2') || X.v(c, 'L2', 'L3') || X.v(c, 'L1', 'L3'));
        const fw = X.v(c, 'FW', 'COM'), rv = X.v(c, 'RV', 'COM');
        D.run = D.pw && fw !== rv; D.dir = fw ? 1 : -1;
        if (D.pw) X.load();
        X.disp(c, { on: D.pw, run: D.run, dir: D.dir });
      },
      src: (c, X) => {
        const D = X.dev(c); const out = {};
        if (D.pw) { out.p24 = PT.P; out.COM = PT.M; }
        if (D.run) {
          if (dc) { if (D.dir > 0) { out.ap = PT.P; out.am = PT.M; } else { out.ap = PT.M; out.am = PT.P; } }
          else { const p = X.sysPots(c); POTS[p[0]].hz = POTS[p[1]].hz = POTS[p[2]].hz = +c.props.hz || 50; Object.assign(out, D.dir > 0 ? { U: p[0], V: p[1], W: p[2] } : { U: p[0], V: p[2], W: p[1] }); }
        }
        return out;
      },
    },
  });
}
inverter('inv1', 'Variatore c.a. ingresso monofase', [['L', 'L'], ['N', 'N'], ['PE', 'PE']], false);
inverter('inv3', 'Variatore c.a. trifase', [['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3'], ['PE', 'PE']], false);
inverter('dcdrive', 'Variatore per motori c.c.', [['L', 'L'], ['N', 'N'], ['PE', 'PE']], true);
boxDef('stepdrv', {
  cat: 'pow', label: 'Controller motore passo-passo', prefix: 'U', autoNum: true, desc: 'Alimentato a 24 V: EN abilita, DIR inverte il senso.',
  w: 90, h: 80, top: [['p', '+V', 10], ['m', 'GND', 30]], bottom: [['A+', 'A+', 20], ['A-', 'A−', 40], ['B+', 'B+', 60], ['B-', 'B−', 80]], left: [['EN', 'EN', 20], ['DIR', 'DIR', 40], ['COM', 'COM', 60]],
  title: (c, st) => st && st.run ? (st.dir < 0 ? '◄ passo' : 'passo ►') : 'driver', tx: 55,
  sim: {
    sys: () => [['L', 0], ['L', 1], ['L', 2], ['L', 3]],
    eval: (c, X) => {
      const D = X.dev(c);
      D.pw = X.v(c, 'p', 'm');
      D.run = D.pw && X.hiRel(c, 'EN', 'COM'); D.dir = X.hiRel(c, 'DIR', 'COM') ? -1 : 1;
      if (D.pw) X.load();
      X.disp(c, { on: D.pw, run: D.run, dir: D.dir });
    },
    src: (c, X) => { const D = X.dev(c); if (!D.run) return null; const p = X.sysPots(c); return { 'A+': p[0], 'A-': p[1], 'B+': p[2], 'B-': p[3] }; },
  },
});
/* ================= CONTATTI AUSILIARI E TEMPORIZZATI ================= */
const FOLLOW_COIL = ['coil', 'coil_k', 'coil_ev', 'coil_bist', 'coil_tele', 'coil_ton', 'coil_toff', 'coil_tonoff', 'flasher', 'pulsegen', 'timesw', 'counter', 'mpcb3', 'relay_spst'];
const FOLLOW_TIMER = ['coil_ton', 'coil_toff', 'coil_tonoff'];
contactFamily('aux', { cat: 'aux', label: 'Contatto', prefix: 'KM', follow: FOLLOW_COIL, desc: 'Contatto ausiliario: cambia stato quando l’organo con la stessa sigla è azionato.', alias: { no: 'no', nc: 'nc' } });
contactFamily('ton', { cat: 'aux', label: 'Ritardato all’eccitazione', head: 'ton', timing: 'on', lab: 'timed', prefix: 'KT', follow: FOLLOW_TIMER, desc: 'Commuta dopo il ritardo impostato sul temporizzatore con la stessa sigla.', alias: { no: 'no_ton', nc: 'nc_ton' } });
contactFamily('toff', { cat: 'aux', label: 'Ritardato alla diseccitazione', head: 'toff', timing: 'off', lab: 'timed', prefix: 'KT', follow: FOLLOW_TIMER, desc: 'Commuta subito e torna a riposo dopo il ritardo, a bobina diseccitata.', alias: { no: 'no_toff', nc: 'nc_toff' } });
contactFamily('tonoff', { cat: 'aux', label: 'Ritardato ecc. e diseccit.', head: 'tonoff', timing: 'onoff', lab: 'timed', prefix: 'KT', follow: FOLLOW_TIMER, desc: 'Ritardato sia all’eccitazione sia alla diseccitazione.' });
contactFamily('olc', { cat: 'aux', label: 'Contatto relè termico', head: 'th', lab: 'ol', prefix: 'F', follow: ['ol3'], desc: 'Contatti 95-96 (NC) e 97-98 (NA) del relè termico.', alias: { no: 'ol_no', nc: 'ol_nc' } });

/* ================= AZIONAMENTI ================= */
contactFamily('pb', { cat: 'cmd', label: 'Pulsante', head: 'pb', act: 'mom', prefix: 'S', autoNum: true, desc: 'In simulazione resta premuto finché tieni giù il mouse.' });
contactFamily('em', { cat: 'cmd', label: 'Pulsante a fungo', head: 'em', act: 'latch', prefix: 'S', autoNum: true, desc: 'Fungo di emergenza: resta premuto fino al riarmo (secondo clic).' });
contactFamily('sw', { cat: 'cmd', label: 'Interruttore', head: 'sw', act: 'latch', prefix: 'SA', autoNum: true, desc: 'Interruttore a ritenuta: un clic lo aziona, un altro lo riporta a riposo.' });
contactFamily('key', { cat: 'cmd', label: 'Selettore a chiave', head: 'key', act: 'latch', prefix: 'SA', autoNum: true, desc: 'Selettore a chiave a due posizioni.', forms: ['no', 'nc'] });
contactFamily('ls', { cat: 'cmd', label: 'Finecorsa', head: 'ls', act: 'latch', prefix: 'SQ', autoNum: true, desc: 'Clic per simularne l’azionamento. Se ha la sigla di un sensore di cilindro (es. a1) lo aziona il cilindro.' });
def('pbl', {
  cat: 'cmd', label: 'Pulsante luminoso', prefix: 'S', autoNum: true, desc: 'Pulsante NA con lampada incorporata (X1-X2).',
  terms: [T('a', 0, -20, 'n', '13'), T('b', 0, 20, 's', '14'), T('x1', -30, -20, 'n', 'X1'), T('x2', -30, 20, 's', 'X2')], box: [-38, -20, 9, 20], nameAt: [-39, 0, 'w'],
  draw: (c, st) => {
    const closed = st ? st.l0 : false, on = st && st.lamp, col = LAMP_COL[c.props.color] || LAMP_COL.verde;
    return contactBody(0, 'no', closed, null) + head('pb', bladeX0(0, 'no', closed), !!(st && st.act)) + ln(-30, -20, -30, -6) + ln(-30, 6, -30, 20) + ci(-30, 0, 6, '', on ? ` style="fill:${col}"` : '') + ln(-34.2, -4.2, -25.8, 4.2) + ln(-34.2, 4.2, -25.8, -4.2) + ln(-24, 0, -19, 0, 'd');
  },
  props: { color: 'verde' }, act: 'mom', form: 'no', labFam: null,
  sim: { links: () => [{ a: 'a', b: 'b', on: (c, X) => X.out(nkey(c)) }], eval: (c, X) => { const on = X.v(c, 'x1', 'x2'); if (on) X.load(); X.disp(c, { lamp: on }); } },
});
function selector(id, label, n, startPos) {
  const terms = [];
  for (let i = 0; i < n; i++) terms.push(T('a' + (i + 1), i * 20, -20, 'n', String(i * 10 + 13)), T('b' + (i + 1), i * 20, 20, 's', String(i * 10 + 14)));
  const POSN = n === 2 ? ['I', '0', 'II'] : ['I', 'II', 'III'];
  def(id, {
    cat: 'cmd', label, prefix: 'SA', autoNum: true, desc: `Commutatore a 3 posizioni (${POSN.join('-')}): ogni clic passa alla posizione successiva.`,
    terms, box: [-25, -20, (n - 1) * 20 + 9, 20], nameAt: [-26, 0, 'w'], act: 'pos3', props: { pos: startPos },
    draw: (c, st) => {
      let s = '';
      for (let i = 0; i < n; i++) { const cl = st ? st['l' + i] : false; s += contactBody(i * 20, 'no', cl, null); }
      s += ln(-12, 0, bladeX0((n - 1) * 20, 'no', false), 0, 'd') + pa('M-12,-5 L-15,-5 L-15,5 L-18,5');
      return s;
    },
    inner: (c, st) => { const p = st && st.pos != null ? st.pos : (c.props.pos ?? startPos); return [{ x: -16, y: -12, t: POSN.map((t, i) => i === p ? `[${t}]` : t).join(' '), cls: 'lbl-pin' }]; },
    sim: {
      links: () => Array.from({ length: n }, (_, i) => ({ a: 'a' + (i + 1), b: 'b' + (i + 1), on: (c, X) => { const p = X.posOf(c, startPos); return n === 2 ? (i === 0 ? p === 0 : p === 2) : p === i; } })),
      eval: (c, X) => X.disp(c, { pos: X.posOf(c, startPos) }),
    },
  });
}
selector('sel3', 'Commutatore I-0-II', 2, 1);
selector('sel3b', 'Commutatore I-II-III', 3, 0);

/* ================= SENSORI ================= */
contactFamily('ind', { cat: 'sens', label: 'Sensore induttivo', head: 'ind', act: 'latch', prefix: 'B', autoNum: true, sensor: true, forms: ['no', 'nc'], desc: 'Clic per simulare la presenza di un oggetto metallico.', alias: { no: 'px_no', nc: 'px_nc' } });
contactFamily('cap', { cat: 'sens', label: 'Sensore capacitivo', head: 'cap', act: 'latch', prefix: 'B', autoNum: true, sensor: true, forms: ['no', 'nc'], desc: 'Clic per simulare la presenza di un oggetto.' });
contactFamily('mag', { cat: 'sens', label: 'Sensore magnetico', head: 'mag', act: 'latch', prefix: 'B', autoNum: true, sensor: true, forms: ['no', 'nc'], desc: 'Sensore reed: se ha la sigla di un sensore di cilindro (es. a0) lo aziona il pistone.' });
contactFamily('press', { cat: 'sens', label: 'Pressostato', head: 'press', act: 'latch', prefix: 'BP', autoNum: true, sensor: true, forms: ['no', 'nc'], desc: 'Clic per simulare il raggiungimento della pressione.' });
contactFamily('vac', { cat: 'sens', label: 'Vacuostato', head: 'vac', act: 'latch', prefix: 'BP', autoNum: true, sensor: true, forms: ['no', 'nc'], desc: 'Clic per simulare il raggiungimento del vuoto.' });
contactFamily('fl', { cat: 'sens', label: 'Galleggiante', head: 'fl', act: 'latch', prefix: 'SL', autoNum: true, sensor: true, forms: ['no', 'nc'], desc: 'Interruttore di livello: clic per simulare il livello raggiunto.' });
contactFamily('phrx', { cat: 'sens', label: 'Fotocellula ricevitore', head: 'photo', act: 'beam', prefix: 'B', autoNum: true, sensor: true, forms: ['no', 'nc'], follow: ['phtx'], desc: 'Con l’emettitore della stessa sigla acceso, il contatto è azionato finché il raggio è libero. Clic per interrompere il raggio.' });
def('phtx', {
  cat: 'sens', label: 'Fotocellula emettitore', prefix: 'B', autoNum: true, desc: 'Emettitore: alimentato, invia il raggio al ricevitore con la stessa sigla.',
  terms: [T('a', 0, -20, 'n', '+'), T('b', 0, 20, 's', '−')], box: [-12, -20, 16, 20], nameAt: [-13, 0, 'w'],
  draw: (c, st) => ln(0, -20, 0, -8) + ln(0, 8, 0, 20) + re(-8, -8, 16, 16, st && st.on ? 'box-on' : '') + pa('M-4,-3 L1,2 M-1,2 L1,2 L1,0') + pa('M10,-4 L16,-4 M14,-6 L16,-4 L14,-2') + pa('M10,2 L16,2 M14,0 L16,2 L14,4'),
  sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { on }); X.special(nkey(c), on && !X.S.blocked[nkey(c)]); } },
});

/* ================= BOBINE E SEGNALAZIONI ================= */
function coilSym(variant, on) {
  let s = ln(0, -20, 0, -5) + ln(0, 5, 0, 20) + re(-8, -5, 16, 10, on ? 'coil-on' : '');
  if (variant === 'on') s += re(-16, -5, 8, 10) + ln(-16, -5, -8, 5) + ln(-16, 5, -8, -5);
  if (variant === 'off') s += re(-16, -5, 8, 10, 'fill');
  if (variant === 'onoff') s += re(-16, -5, 8, 10) + ln(-16, -5, -8, 5) + ln(-16, 5, -8, -5) + re(-24, -5, 8, 10, 'fill');
  if (variant === 'tele') s += pa('M-5,3 L-5,-1 L0,-1 L0,3 L5,3 L5,-1');
  if (variant === 'ev') s += ln(-8, 5, 8, -5) + re(-16, -5, 8, 10) + pa('M-14,-3 L-10,3');
  if (variant === 'fl') s += pa('M-2,-4 L-4,1 L1,0 L-1,4', 'act-on');
  if (variant === 'clock') s += ci(-14, 0, 5) + pa('M-14,-3 L-14,0 L-11.5,1.5');
  if (variant === 'pulse') s += pa('M-17,3 L-15,3 L-15,-3 L-13,-3 L-13,3 L-11,3 L-11,-3 L-9,-3');
  return s;
}
function coilDef(id, label, prefix, variant, desc, extra) {
  const wide = variant && variant !== 'tele' && variant !== 'fl';
  return def(id, Object.assign({
    cat: 'coil', label, prefix, autoNum: true, desc, variant, isCoil: true,
    terms: [T('a', 0, -20, 'n', 'A1'), T('b', 0, 20, 's', 'A2')],
    box: variant === 'onoff' ? [-25, -20, 9, 20] : wide ? [-17, -20, 9, 20] : [-9, -20, 9, 20],
    nameAt: variant === 'onoff' ? [-26, 0, 'w'] : wide ? [-18, 0, 'w'] : [-10, 0, 'w'],
    draw: (c, st) => coilSym(variant, st && st.on),
    sim: { eval: (c, X) => { const e = X.v(c, 'a', 'b'); if (e) X.load(); X.drive(nkey(c), e); X.disp(c, { on: e }); } },
  }, extra || {}));
}
coilDef('coil', 'Bobina contattore', 'KM', null, 'Quando è alimentata comanda tutti i contatti con la stessa sigla.');
coilDef('coil_k', 'Bobina relè', 'K', null, 'Relè ausiliario: comanda i contatti con la stessa sigla.');
coilDef('coil_ev', 'Bobina elettrovalvola', 'Y', 'ev', 'Comanda la valvola del cilindro: usa la sigla del pilota (es. A+ o A-).');
function timerTick(c, X, dt, tOn, tOff) {
  const k = nkey(c), S = X.S;
  const e = !!X.dev(c).e;
  const T = S.tm[k] || (S.tm[k] = { onT: 0, offR: 0, was: false, q: false });
  if (e) { T.onT = T.was ? T.onT + dt : 0; T.offR = tOff; } else { T.onT = 0; T.offR = Math.max(0, T.offR - dt); }
  T.was = e;
  const on = e && T.onT >= tOn - 1e-9;
  if (on) T.q = true; else if (!e && T.offR <= 0) T.q = false; else if (e && !on && !T.q) T.q = false;
  X.setTmr(k, { on, off: e || T.offR > 0, onoff: T.q });
  let rem = null;
  if (e && T.onT < tOn) rem = tOn - T.onT; else if (!e && T.offR > 0) rem = T.offR;
  X.disp(c, { on: e, rem: rem == null ? null : Math.round(rem * 10) / 10 });
}
const timerEval = (c, X) => { const e = X.v(c, 'a', 'b'); if (e) X.load(); X.dev(c).e = e; X.drive(nkey(c), e); };
coilDef('coil_ton', 'Temporizzatore all’eccitazione', 'KT', 'on', 'Imposta il ritardo in secondi. Comanda i contatti ritardati con la stessa sigla.', {
  props: { t: 5 }, sim: { eval: timerEval, tick: (c, X, dt) => timerTick(c, X, dt, Math.max(0, +c.props.t || 0), 0) },
});
coilDef('coil_toff', 'Temporizzatore alla diseccitazione', 'KT', 'off', 'I contatti ritardati tornano a riposo dopo il ritardo, a bobina diseccitata.', {
  props: { t: 5 }, sim: { eval: timerEval, tick: (c, X, dt) => timerTick(c, X, dt, 0, Math.max(0, +c.props.t || 0)) },
});
coilDef('coil_tonoff', 'Temporizzatore ecc. e diseccit.', 'KT', 'onoff', 'Ritardo all’eccitazione (t) e alla diseccitazione (t2).', {
  props: { t: 3, t2: 3 }, sim: { eval: timerEval, tick: (c, X, dt) => timerTick(c, X, dt, Math.max(0, +c.props.t || 0), Math.max(0, +c.props.t2 || 0)) },
});
coilDef('coil_tele', 'Teleruttore (relè passo-passo)', 'K', 'tele', 'Ogni impulso sulla bobina cambia lo stato dei contatti.', {
  sim: {
    eval: (c, X) => { const e = X.v(c, 'a', 'b'); if (e) X.load(); X.dev(c).e = e; },
    tick: (c, X) => { const D = X.dev(c), k = nkey(c); if (D.e && !D.was) X.S.lat[k] = !X.S.lat[k]; D.was = D.e; X.special(k, !!X.S.lat[k]); X.disp(c, { on: D.e, st: !!X.S.lat[k] }); },
  },
});
def('coil_bist', {
  cat: 'coil', label: 'Relè bistabile', prefix: 'K', autoNum: true, desc: 'Due bobine: S (A1-A2) aziona i contatti, R (B1-B2) li riporta a riposo. Mantiene lo stato.', isCoil: true,
  terms: [T('s1', 0, -20, 'n', 'A1'), T('s2', 0, 20, 's', 'A2'), T('r1', 20, -20, 'n', 'B1'), T('r2', 20, 20, 's', 'B2')], box: [-9, -20, 29, 20], nameAt: [-10, 0, 'w'],
  draw: (c, st) => coilSym(null, st && st.s) + `<g transform="translate(20,0)">${coilSym(null, st && st.r)}</g>` + ln(8, 0, 12, 0, 'd'),
  inner: () => [{ x: 3, y: -12, t: 'S', cls: 'lbl-pin', anchor: 'start' }, { x: 23, y: -12, t: 'R', cls: 'lbl-pin', anchor: 'start' }],
  sim: {
    eval: (c, X) => { const D = X.dev(c); D.s = X.v(c, 's1', 's2'); D.r = X.v(c, 'r1', 'r2'); if (D.s || D.r) X.load(); },
    tick: (c, X) => { const D = X.dev(c), k = nkey(c); if (D.r) X.S.lat[k] = false; else if (D.s) X.S.lat[k] = true; X.special(k, !!X.S.lat[k]); X.disp(c, { s: D.s, r: D.r }); },
  },
});
function blinkDef(id, label, variant, desc, startOn) {
  coilDef(id, label, 'KT', variant, desc, {
    props: { t: 1, t2: 1 },
    sim: {
      eval: (c, X) => { const e = X.v(c, 'a', 'b'); if (e) X.load(); X.dev(c).e = e; },
      tick: (c, X, dt) => {
        const D = X.dev(c), k = nkey(c), tOn = Math.max(0.05, +c.props.t || 1), tOff = Math.max(0.05, +c.props.t2 || 1);
        if (!D.e) { D.ph = 0; D.q = false; }
        else { D.ph = (D.ph || 0) + dt; const per = tOn + tOff; const x = D.ph % per; D.q = startOn ? x < tOn : x >= tOff; }
        X.special(k, !!D.q); X.disp(c, { on: D.e, q: !!D.q });
      },
    },
  });
}
blinkDef('flasher', 'Relè intermittente', 'fl', 'Alimentato, apre e chiude i contatti ciclicamente (t acceso, t2 spento).', true);
blinkDef('pulsegen', 'Generatore di impulsi', 'pulse', 'Alimentato, genera impulsi: prima la pausa t2, poi l’impulso t.', false);
coilDef('timesw', 'Interruttore orario', 'KT', 'clock', 'Alimentato, chiude i contatti nella fascia oraria impostata (orologio della simulazione).', {
  props: { on: '08:01', off: '08:05' },
  sim: {
    eval: (c, X) => { const e = X.v(c, 'a', 'b'); if (e) X.load(); X.dev(c).e = e; },
    tick: (c, X) => {
      const D = X.dev(c), k = nkey(c);
      const m = s => { const p = String(s || '').split(':'); return ((+p[0] || 0) * 60 + (+p[1] || 0)) % 1440; };
      const a = m(c.props.on), b = m(c.props.off), t = Math.floor(X.S.clock) % 1440;
      const inW = a <= b ? (t >= a && t < b) : (t >= a || t < b);
      X.special(k, !!D.e && inW); X.disp(c, { on: D.e, q: !!D.e && inW });
    },
  },
});
def('counter', {
  cat: 'coil', label: 'Contatore di impulsi', prefix: 'KC', autoNum: true, desc: 'Conta gli impulsi su A1-A2; R1-R2 azzera. I contatti si azionano al raggiungimento del valore impostato.', isCoil: true,
  terms: [T('a', 0, -20, 'n', 'A1'), T('b', 0, 20, 's', 'A2'), T('r1', 20, -20, 'n', 'R1'), T('r2', 20, 20, 's', 'R2')], box: [-9, -20, 29, 20], nameAt: [-10, 0, 'w'], props: { preset: 5 },
  draw: (c, st) => coilSym(null, st && st.on) + `<g transform="translate(20,0)">${coilSym(null, st && st.r)}</g>`,
  inner: (c, st) => [{ x: 10, y: -12, t: `${st && st.n != null ? st.n : 0}/${c.props.preset}`, cls: 'lbl-timer' }, { x: 20, y: 0, t: 'R', cls: 'lbl-pin' }],
  sim: {
    eval: (c, X) => { const D = X.dev(c); D.e = X.v(c, 'a', 'b'); D.r = X.v(c, 'r1', 'r2'); if (D.e) X.load(); },
    tick: (c, X) => {
      const D = X.dev(c), k = nkey(c), S = X.S;
      S.cnt[k] = S.cnt[k] || 0;
      if (D.r) S.cnt[k] = 0; else if (D.e && !D.was) S.cnt[k]++;
      D.was = D.e;
      X.special(k, S.cnt[k] >= (+c.props.preset || 1)); X.disp(c, { on: D.e, r: D.r, n: S.cnt[k] });
    },
  },
});
function lampDraw(c, on) {
  const col = LAMP_COL[c.props.color] || LAMP_COL.verde;
  return ln(0, -20, 0, -7) + ln(0, 7, 0, 20) + (on ? ci(0, 0, 12, 'glow', ` style="fill:${col}"`) : '') + ci(0, 0, 7, '', on ? ` style="fill:${col}"` : '') + ln(-4.95, -4.95, 4.95, 4.95) + ln(-4.95, 4.95, 4.95, -4.95);
}
def('lamp', {
  cat: 'coil', label: 'Lampada di segnalazione', prefix: 'H', autoNum: true, desc: 'Si accende quando è alimentata. Scegli il colore.',
  terms: [T('a', 0, -20, 'n', 'X1'), T('b', 0, 20, 's', 'X2')], box: [-9, -20, 9, 20], nameAt: [-10, 0, 'w'], props: { color: 'verde' },
  draw: (c, st) => lampDraw(c, st && st.on),
  sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { on }); X.drive(nkey(c), on); } }, signal: true,
});
def('lamp_fl', {
  cat: 'coil', label: 'Lampada intermittente', prefix: 'H', autoNum: true, desc: 'Lampeggia quando è alimentata.',
  terms: [T('a', 0, -20, 'n', 'X1'), T('b', 0, 20, 's', 'X2')], box: [-9, -20, 13, 20], nameAt: [-10, 0, 'w'], props: { color: 'arancione' },
  draw: (c, st) => lampDraw(c, st && st.on && st.blink) + pa('M8,-10 L10,-6 L8,-6 L10,-2', 'act-on'),
  sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { on, blink: on && Math.floor(X.S.t * 2) % 2 === 0 }); X.drive(nkey(c), on); } }, signal: true,
});
function soundDef(id, label, desc, art) {
  def(id, {
    cat: 'coil', label, prefix: 'HA', autoNum: true, desc,
    terms: [T('a', 0, -20, 'n', '1'), T('b', 0, 20, 's', '2')], box: [-9, -20, 18, 20], nameAt: [-10, 0, 'w'],
    draw: (c, st) => {
      let s = art;
      if (st && st.on) {
        const a = REDUCED ? '' : '<animate attributeName="opacity" values="1;.15;1" dur=".6s" begin="0s" repeatCount="indefinite"/>';
        s += `<g>${pa('M11,-4 A6,6 0 0 1 11,4', 'wave')}${pa('M14,-7 A10,10 0 0 1 14,7', 'wave')}${a}</g>`;
      }
      return s;
    },
    sim: { eval: (c, X) => { const on = X.v(c, 'a', 'b'); if (on) X.load(); X.disp(c, { on }); X.drive(nkey(c), on); } }, signal: true,
  });
}
soundDef('horn', 'Sirena', 'Segnalazione acustica: in simulazione mostra le onde quando suona.', ln(0, -20, 0, -4) + ln(0, 4, 0, 20) + pa('M-8,4 L8,4 M-8,4 A8,8 0 0 1 8,4'));
soundDef('buzzer', 'Ronzatore (vibratore)', 'Cicalino a vibrazione.', ln(0, -20, 0, -6) + ln(0, 6, 0, 20) + re(-7, -6, 14, 12) + pa('M-4,3 L-2,-3 L0,3 L2,-3 L4,3'));

/* ================= RELÈ ELETTRONICI ================= */
function ssrDef(id, label, ctrlLab, desc) {
  boxDef(id, {
    cat: 'erel', label, prefix: 'K', autoNum: true, desc,
    w: 50, h: 40, top: [['c1', ctrlLab[0], 10], ['c2', ctrlLab[1], 30]], bottom: [['o1', '1', 10], ['o2', '2', 30]], title: 'SSR', tx: 22,
    art: (c, st) => ci(43, 20, 2.5, st && st.on ? 'led-on' : ''),
    sim: {
      links: () => [{ a: 'o1', b: 'o2', on: (c, X) => !!X.dev(c).on }],
      eval: (c, X) => { const on = X.v(c, 'c1', 'c2'); X.dev(c).on = on; if (on) X.load(); X.disp(c, { on }); },
    },
  });
}
ssrDef('ssr_dc', 'Relè statico (SSR) comando c.c.', ['+', '−'], 'Comando 24 V c.c. su + e −: l’uscita 1-2 conduce.');
ssrDef('ssr_ac', 'Relè statico (SSR) comando c.a.', ['A1', 'A2'], 'Comando in alternata su A1-A2: l’uscita 1-2 conduce.');
boxDef('ssr3', {
  cat: 'erel', label: 'Contattore statico', prefix: 'KM', autoNum: true, desc: 'Contattore a semiconduttori: con A1-A2 alimentati collega L1-T1, L2-T2, L3-T3.',
  w: 60, h: 60, top: [['L1', '1L1'], ['L2', '3L2'], ['L3', '5L3']], bottom: [['T1', '2T1'], ['T2', '4T2'], ['T3', '6T3']], left: [['A1', 'A1', 20], ['A2', 'A2', 40]], title: 'SSR 3~', tx: 36,
  sim: {
    links: () => [1, 2, 3].map(i => ({ a: 'L' + i, b: 'T' + i, on: (c, X) => !!X.dev(c).on })),
    eval: (c, X) => { const on = X.v(c, 'A1', 'A2'); X.dev(c).on = on; if (on) X.load(); X.disp(c, { on }); },
  },
});
boxDef('ssr_rev', {
  cat: 'erel', label: 'Contattore statico di inversione', prefix: 'KM', autoNum: true, desc: 'FW collega le fasi dirette, RV scambia L1 e L3. Comando riferito a COM.',
  w: 80, h: 80, top: [['L1', '1L1', 30], ['L2', '3L2', 50], ['L3', '5L3', 70]], bottom: [['T1', '2T1', 30], ['T2', '4T2', 50], ['T3', '6T3', 70]], left: [['FW', 'FW', 30], ['RV', 'RV', 50], ['COM', 'COM', 70]], tx: 50,
  title: (c, st) => st && st.fw ? 'avanti' : st && st.rv ? 'indietro' : 'SSR ⇄',
  sim: {
    links: () => [
      { a: 'L1', b: 'T1', on: (c, X) => !!X.dev(c).fw }, { a: 'L2', b: 'T2', on: (c, X) => !!(X.dev(c).fw || X.dev(c).rv) }, { a: 'L3', b: 'T3', on: (c, X) => !!X.dev(c).fw },
      { a: 'L1', b: 'T3', on: (c, X) => !!X.dev(c).rv }, { a: 'L3', b: 'T1', on: (c, X) => !!X.dev(c).rv },
    ],
    eval: (c, X) => { const f = X.v(c, 'FW', 'COM'), r = X.v(c, 'RV', 'COM'); const D = X.dev(c); D.fw = f && !r; D.rv = r && !f; if (D.fw || D.rv) X.load(); X.disp(c, { on: D.fw || D.rv, fw: D.fw, rv: D.rv }); },
  },
});
function monitorDef(id, label, withN, desc, test) {
  boxDef(id, {
    cat: 'erel', label, prefix: 'K', autoNum: true, desc,
    w: withN ? 80 : 60, h: 40, top: withN ? [['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3'], ['N', 'N']] : [['L1', 'L1'], ['L2', 'L2'], ['L3', 'L3']],
    bottom: [['c', '11', 10], ['nc', '12', 30], ['no', '14', 50]],
    title: (c, st) => st && st.ok ? 'OK' : (st ? 'ALLARME' : label.split(' ')[1] || 'relè'),
    sim: {
      links: () => [{ a: 'c', b: 'no', on: (c, X) => !!X.dev(c).ok }, { a: 'c', b: 'nc', on: (c, X) => !X.dev(c).ok }],
      eval: (c, X) => { const ok = test(c, X) && (!withN || X.pots(c, 'N').some(p => POTS[p].kind === 'N')); X.dev(c).ok = ok; X.disp(c, { ok, on: ok, warn: !ok }); X.drive(nkey(c), ok); },
    },
  });
}
monitorDef('mon_phn', 'Relè mancanza fase + N', true, 'Contatto 11-14 chiuso con le tre fasi e il neutro presenti.', (c, X) => X.phaseCount(c, ['L1', 'L2', 'L3']) === 3);
monitorDef('mon_ph', 'Relè mancanza fase', false, 'Contatto 11-14 chiuso con le tre fasi presenti.', (c, X) => X.phaseCount(c, ['L1', 'L2', 'L3']) === 3);
monitorDef('mon_seqn', 'Relè sequenza fasi + N', true, 'Contatto 11-14 chiuso se la sequenza è L1-L2-L3 e il neutro è presente.', (c, X) => X.phaseDir(c, ['L1', 'L2', 'L3']) === 1);
monitorDef('mon_seq', 'Relè sequenza fasi', false, 'Contatto 11-14 chiuso se la sequenza delle fasi è corretta.', (c, X) => X.phaseDir(c, ['L1', 'L2', 'L3']) === 1);
monitorDef('mon_ov', 'Relè protezione sovratensione', true, 'Controllo di tensione: 11-14 chiuso con rete presente e tensione regolare.', (c, X) => X.phaseCount(c, ['L1', 'L2', 'L3']) >= 1);
boxDef('relay_spst', {
  cat: 'erel', label: 'Relè SPST', prefix: 'K', autoNum: true, desc: 'Modulo relè: bobina A1-A2, contatto NA 11-14.', isCoil: true,
  w: 40, h: 40, top: [['a', 'A1', 10], ['b', 'A2', 30]], bottom: [['c', '11', 10], ['no', '14', 30]], title: 'K',
  sim: { links: () => [{ a: 'c', b: 'no', on: (c, X) => X.out(nkey(c)) }], eval: (c, X) => { const e = X.v(c, 'a', 'b'); if (e) X.load(); X.drive(nkey(c), e); X.disp(c, { on: e }); } },
});
boxDef('relay_spdt', {
  cat: 'erel', label: 'Relè SPDT', prefix: 'K', autoNum: true, desc: 'Modulo relè: bobina A1-A2, scambio 11-12-14.', isCoil: true,
  w: 60, h: 40, top: [['a', 'A1', 10], ['b', 'A2', 30]], bottom: [['c', '11', 10], ['nc', '12', 30], ['no', '14', 50]], title: 'K',
  sim: { links: () => [{ a: 'c', b: 'no', on: (c, X) => X.out(nkey(c)) }, { a: 'c', b: 'nc', on: (c, X) => !X.out(nkey(c)) }], eval: (c, X) => { const e = X.v(c, 'a', 'b'); if (e) X.load(); X.drive(nkey(c), e); X.disp(c, { on: e }); } },
});
/* ================= LOGICA DIGITALE ================= */
function logicBlock(id, o) {
  const ins = o.inputs || [], outs = o.outputs || ['Q'];
  const n = Math.max(ins.length, outs.length, 1);
  const h = Math.max(40, n * 20);
  const pos = (arr, i) => arr.length === 1 ? h / 2 : (h / arr.length) * i + h / arr.length / 2;
  const lp = (arr) => arr.map((t, i) => [t, o.labels && o.labels[t] !== undefined ? o.labels[t] : t, Math.round(pos(arr, i) / 10) * 10]);
  return boxDef(id, Object.assign({
    cat: o.cat || 'logic', label: o.label, prefix: o.prefix || 'U', autoNum: true, desc: o.desc,
    w: o.w || 40, h, left: lp(ins), right: lp(outs), title: o.sym, props: o.props || {},
    art: (c, st) => (o.inv ? ci((o.w || 40) + 3, h / 2, 3) : '') + (o.art ? o.art(c, st, h) : ''),
    logic: true,
    sim: {
      eval: (c, X) => {
        const D = X.dev(c); D.in = {};
        for (const t of ins) D.in[t] = X.hi(c, t);
        if (o.comb) D.out = { Q: !!o.comb(D.in) };
        if (o.after) o.after(c, X, D);
      },
      tick: (c, X, dt) => {
        const D = X.dev(c);
        if (o.seq) o.seq(c, X, dt, D);
        D.out = D.out || {};
        X.special(nkey(c), !!D.out[outs[0]]);
        X.disp(c, Object.assign({ q: !!D.out[outs[0]], on: !!D.out[outs[0]] }, D.show || {}));
      },
      src: (c, X) => { const D = X.dev(c), r = {}; if (D.out) for (const t of outs) if (D.out[t]) r[t] = PT.P; return r; },
    },
  }, o.extra || {}));
}
const edge = (D, k, v) => { const p = D['p_' + k]; D['p_' + k] = v; return v && !p; };
logicBlock('g_and', { label: 'Porta AND', sym: '&', inputs: ['A', 'B'], comb: I => I.A && I.B, desc: 'Uscita alta se tutti gli ingressi sono alti (+24 V).' });
logicBlock('g_or', { label: 'Porta OR', sym: '≥1', inputs: ['A', 'B'], comb: I => I.A || I.B, desc: 'Uscita alta se almeno un ingresso è alto.' });
logicBlock('g_not', { label: 'Porta NOT (INV)', sym: '1', inputs: ['A'], comb: I => !I.A, inv: true, desc: 'Inverte l’ingresso.' });
logicBlock('g_xor', { label: 'Porta EXOR', sym: '=1', inputs: ['A', 'B'], comb: I => I.A !== I.B, desc: 'Uscita alta se gli ingressi sono diversi.' });
logicBlock('g_nand', { label: 'Porta NAND', sym: '&', inputs: ['A', 'B'], comb: I => !(I.A && I.B), inv: true, desc: 'AND negata.' });
logicBlock('g_nor', { label: 'Porta NOR', sym: '≥1', inputs: ['A', 'B'], comb: I => !(I.A || I.B), inv: true, desc: 'OR negata.' });
logicBlock('l_sr', {
  label: 'Bistabile RS', sym: 'RS', inputs: ['S', 'R'], outputs: ['Q', 'Qn'], labels: { Qn: 'Q̄' }, prefix: 'M', desc: 'S porta Q alto, R lo riporta basso (R prevale). Mantiene lo stato.',
  seq: (c, X, dt, D) => { if (D.in.R) D.q = false; else if (D.in.S) D.q = true; D.out = { Q: !!D.q, Qn: !D.q }; },
});
logicBlock('l_tff', {
  label: 'Divisore binario', sym: 'T', inputs: ['T'], prefix: 'M', desc: 'Ogni fronte di salita su T cambia lo stato dell’uscita.',
  seq: (c, X, dt, D) => { if (edge(D, 'T', D.in.T)) D.q = !D.q; D.out = { Q: !!D.q }; },
});
function timerBlock(id, label, sym, desc, fn, props) {
  logicBlock(id, {
    label, sym, inputs: ['IN'], prefix: 'T', desc, props: props || { t: 3 }, w: 60,
    seq: (c, X, dt, D) => { fn(c, X, dt, D); D.out = { Q: !!D.q }; D.show = { rem: D.rem != null ? Math.round(D.rem * 10) / 10 : null }; if (X.S.resetReq[nkey(c)]) { D.q = false; D.acc = 0; } },
    art: (c, st, h) => '',
    extra: { inner2: true },
  });
  const d = DEF[id]; const oldInner = d.inner;
  d.inner = (c, st) => [...oldInner(c, st), { x: 30, y: d.h - 9, t: st && st.rem != null ? `${fmtNum(st.rem)} s` : `${fmtNum(c.props.t)} s`, cls: 'lbl-timer' }];
}
timerBlock('l_ton', 'Timer ritardo ON (TON)', 'TON', 'Uscita alta dopo t secondi di ingresso alto.', (c, X, dt, D) => {
  const t = Math.max(0, +c.props.t || 0);
  if (D.in.IN) { D.acc = (D.acc || 0) + dt; D.q = D.acc >= t - 1e-9; D.rem = D.q ? null : t - D.acc; } else { D.acc = 0; D.q = false; D.rem = null; }
});
timerBlock('l_tp', 'Timer impulso (TP)', 'TP', 'Sul fronte di salita dà un impulso lungo t secondi.', (c, X, dt, D) => {
  const t = Math.max(0, +c.props.t || 0);
  if (edge(D, 'IN', D.in.IN) && !D.q) { D.q = true; D.acc = 0; }
  if (D.q) { D.acc += dt; D.rem = t - D.acc; if (D.acc >= t) { D.q = false; D.rem = null; } }
});
timerBlock('l_tof', 'Timer ritardo OFF (TOF)', 'TOF', 'Uscita alta con ingresso alto; si spegne t secondi dopo che l’ingresso si abbassa.', (c, X, dt, D) => {
  const t = Math.max(0, +c.props.t || 0);
  if (D.in.IN) { D.q = true; D.acc = 0; D.rem = null; } else if (D.q) { D.acc = (D.acc || 0) + dt; D.rem = t - D.acc; if (D.acc >= t) { D.q = false; D.rem = null; } }
});
timerBlock('l_blink', 'Timer intermittente', 'BLINK', 'Con ingresso alto l’uscita lampeggia (t acceso, t2 spento).', (c, X, dt, D) => {
  const a = Math.max(0.05, +c.props.t || 1), b = Math.max(0.05, +c.props.t2 || 1);
  if (D.in.IN) { D.acc = (D.acc || 0) + dt; D.q = (D.acc % (a + b)) < a; } else { D.acc = 0; D.q = false; }
  D.rem = null;
}, { t: 1, t2: 1 });
logicBlock('l_pulse', {
  label: 'Generatore di impulsi', sym: 'CLK', inputs: [], prefix: 'G', props: { t: 0.5, t2: 0.5 }, w: 50, desc: 'Genera un segnale a onda quadra (t alto, t2 basso).',
  seq: (c, X, dt, D) => { const a = Math.max(0.05, +c.props.t || 0.5), b = Math.max(0.05, +c.props.t2 || 0.5); D.acc = (D.acc || 0) + dt; D.q = (D.acc % (a + b)) < a; D.out = { Q: D.q }; },
});
function counterBlock(id, label, sym, inputs, outputs, desc, fn, props) {
  logicBlock(id, {
    label, sym, inputs, outputs, prefix: 'C', props: props || { preset: 5 }, desc, w: 60, extra: outputs.length >= 4 ? { ty: Math.max(40, Math.max(inputs.length, outputs.length) * 20) / 2 - 10 } : {},
    seq: (c, X, dt, D) => { D.n = D.n || 0; if (X.S.resetReq[nkey(c)]) D.n = 0; fn(c, X, D); D.show = { n: D.n }; },
  });
  const d = DEF[id]; const oldInner = d.inner;
  d.inner = (c, st) => [...oldInner(c, st), { x: 30, y: d.h - 9, t: `${st && st.n != null ? st.n : 0}${c.props.preset != null ? '/' + c.props.preset : ''}`, cls: 'lbl-timer' }];
}
counterBlock('l_ctu', 'Contatore (CTU)', 'CTU', ['CU', 'R'], ['Q'], 'Conta i fronti di salita su CU; Q alta al raggiungimento del valore impostato. R azzera.', (c, X, D) => {
  if (D.in.R) D.n = 0; else if (edge(D, 'CU', D.in.CU)) D.n++;
  D.out = { Q: D.n >= (+c.props.preset || 1) };
});
counterBlock('l_ctud', 'Contatore avanti/indietro', 'CTUD', ['CU', 'CD', 'R'], ['Q'], 'CU conta avanti, CD indietro, R azzera.', (c, X, D) => {
  const u = edge(D, 'CU', D.in.CU), d = edge(D, 'CD', D.in.CD);
  if (D.in.R) D.n = 0; else { if (u) D.n++; if (d) D.n = Math.max(0, D.n - 1); }
  D.out = { Q: D.n >= (+c.props.preset || 1) };
});
const bits4 = n => ({ Q0: !!(n & 1), Q1: !!(n & 2), Q2: !!(n & 4), Q3: !!(n & 8) });
counterBlock('l_cnt4', 'Contatore a 4 bit', 'CTR4', ['CLK', 'R'], ['Q0', 'Q1', 'Q2', 'Q3'], 'Conta in binario da 0 a 15.', (c, X, D) => {
  if (D.in.R) D.n = 0; else if (edge(D, 'CLK', D.in.CLK)) D.n = (D.n + 1) % 16;
  D.out = bits4(D.n);
}, {});
counterBlock('l_cnt4ud', 'Contatore 4 bit avanti/indietro', 'CTR4 ±', ['CU', 'CD', 'R'], ['Q0', 'Q1', 'Q2', 'Q3'], 'Contatore binario a 4 bit in avanti (CU) e indietro (CD).', (c, X, D) => {
  const u = edge(D, 'CU', D.in.CU), d = edge(D, 'CD', D.in.CD);
  if (D.in.R) D.n = 0; else { if (u) D.n = (D.n + 1) % 16; if (d) D.n = (D.n + 15) % 16; }
  D.out = bits4(D.n);
}, {});
counterBlock('l_bcd', 'Contatore decadico (BCD)', 'CTR10', ['CLK', 'R'], ['Q0', 'Q1', 'Q2', 'Q3', 'CO'], 'Conta da 0 a 9 in BCD; CO dà un impulso al passaggio da 9 a 0.', (c, X, D) => {
  let co = false;
  if (D.in.R) D.n = 0; else if (edge(D, 'CLK', D.in.CLK)) { D.n = (D.n + 1) % 10; co = D.n === 0; }
  D.out = Object.assign(bits4(D.n), { CO: co });
}, {});
def('l_in', {
  cat: 'logic', label: 'Ingresso logico (prova)', prefix: 'IN', autoNum: true, desc: 'Interruttore logico: clic per portare l’uscita a 1 (+24 V).',
  terms: [T('Q', 30, 0, 'e', '')], box: [-10, -10, 30, 10], nameAt: [-11, 0, 'w'], act: 'latch',
  draw: (c, st) => re(-10, -9, 30, 18, st && st.q ? 'box-on' : '') + ln(20, 0, 30, 0),
  inner: (c, st) => [{ x: 5, y: 0, t: st && st.q ? '1' : '0', cls: 'lbl-in' }],
  sim: { eval: (c, X) => { const q = X.out(nkey(c)); X.dev(c).q = q; X.disp(c, { q, act: q }); }, src: (c, X) => X.dev(c).q ? { Q: PT.P } : null },
});
def('l_led', {
  cat: 'logic', label: 'Indicatore logico (visualizza)', prefix: 'LED', autoNum: true, desc: 'Si accende se l’ingresso è a 1.',
  terms: [T('A', -20, 0, 'w', '')], box: [-20, -9, 9, 9], nameAt: [0, -11, 'n'], props: { color: 'rossa' },
  draw: (c, st) => ln(-20, 0, -8, 0) + ci(0, 0, 8, '', st && st.on ? ` style="fill:${LAMP_COL[c.props.color] || LAMP_COL.rossa}"` : ''),
  sim: { eval: (c, X) => { const on = X.hi(c, 'A'); X.disp(c, { on }); X.drive(nkey(c), on); } },
});
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', 10: 'abcefg', 11: 'cdefg', 12: 'adef', 13: 'bcdeg', 14: 'adefg', 15: 'aefg' };
function segArt(x, y, lit) {
  const S = { a: [x + 3, y, x + 17, y], b: [x + 18, y + 1, x + 18, y + 14], c: [x + 18, y + 16, x + 18, y + 29], d: [x + 3, y + 30, x + 17, y + 30], e: [x + 2, y + 16, x + 2, y + 29], f: [x + 2, y + 1, x + 2, y + 14], g: [x + 3, y + 15, x + 17, y + 15] };
  return Object.entries(S).map(([k, p]) => `<line x1="${p[0]}" y1="${p[1]}" x2="${p[2]}" y2="${p[3]}" class="${lit.includes(k) ? 'seg-on' : 'seg-off'}"/>`).join('');
}
logicBlock('l_dec7', {
  label: 'Decodificatore BCD / 7 segmenti', sym: 'BCD\n7seg', inputs: ['A', 'B', 'C', 'D'], outputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], labels: { A: '1', B: '2', C: '4', D: '8' }, w: 50, prefix: 'U', desc: 'Converte un numero BCD (1-2-4-8) nei segmenti a…g.',
  seq: (c, X, dt, D) => { const n = (D.in.A ? 1 : 0) + (D.in.B ? 2 : 0) + (D.in.C ? 4 : 0) + (D.in.D ? 8 : 0); const s = SEG[n] || ''; D.out = {}; for (const k of 'abcdefg') D.out[k] = s.includes(k); },
});
def('l_disp7', {
  cat: 'logic', label: 'Display 7 segmenti', prefix: 'DS', autoNum: true, desc: 'Accende i segmenti a…g collegati a 1.',
  terms: 'abcdefg'.split('').map((k, i) => T(k, -10, i * 10, 'w', k)), box: [-10, -6, 40, 66], nameAt: [15, -8, 'n'], termLabels: false,
  draw: (c, st) => re(0, -6, 40, 72) + 'abcdefg'.split('').map((k, i) => ln(-10, i * 10, 0, i * 10)).join('') + segArt(10, 14, st ? st.lit || '' : ''),
  inner: () => 'abcdefg'.split('').map((k, i) => ({ x: 4, y: i * 10, t: k, cls: 'lbl-pin', anchor: 'start' })),
  sim: { eval: (c, X) => { let lit = ''; for (const k of 'abcdefg') if (X.hi(c, k)) lit += k; X.disp(c, { lit }); } },
});
def('l_dispbcd', {
  cat: 'logic', label: 'Display BCD', prefix: 'DS', autoNum: true, desc: 'Mostra la cifra corrispondente agli ingressi 1-2-4-8.',
  terms: [T('A', -10, 0, 'w', '1'), T('B', -10, 20, 'w', '2'), T('C', -10, 40, 'w', '4'), T('D', -10, 60, 'w', '8')], box: [-10, -10, 40, 70], nameAt: [15, -12, 'n'], termLabels: false,
  draw: (c, st) => re(0, -10, 40, 80) + [0, 20, 40, 60].map(y => ln(-10, y, 0, y)).join('') + segArt(10, 15, st ? SEG[st.n] || '' : ''),
  inner: () => [['1', 0], ['2', 20], ['4', 40], ['8', 60]].map(([t, y]) => ({ x: 4, y, t, cls: 'lbl-pin', anchor: 'start' })),
  sim: { eval: (c, X) => { const n = (X.hi(c, 'A') ? 1 : 0) + (X.hi(c, 'B') ? 2 : 0) + (X.hi(c, 'C') ? 4 : 0) + (X.hi(c, 'D') ? 8 : 0); X.disp(c, { n }); } },
});
def('l_presel', {
  cat: 'logic', label: 'Preselettore (contraves)', prefix: 'SP', autoNum: true, desc: 'Imposta una cifra da 0 a 9 sulle uscite 1-2-4-8. In simulazione ogni clic aumenta la cifra.',
  terms: [T('A', 40, 0, 'e', '1'), T('B', 40, 20, 'e', '2'), T('C', 40, 40, 'e', '4'), T('D', 40, 60, 'e', '8')], box: [0, -10, 40, 70], nameAt: [-2, 30, 'w'], termLabels: false, props: { val: 0 }, act: 'digit',
  draw: (c, st) => re(0, -10, 30, 80) + [0, 20, 40, 60].map(y => ln(30, y, 40, y)).join('') + re(6, 18, 18, 24, 'box-on') + pa('M10,12 L15,7 L20,12') + pa('M10,48 L15,53 L20,48'),
  inner: (c, st) => [{ x: 15, y: 30, t: String(st && st.v != null ? st.v : (c.props.val || 0)), cls: 'lbl-in' }, ...[['1', 0], ['2', 20], ['4', 40], ['8', 60]].map(([t, y]) => ({ x: 27, y, t, cls: 'lbl-pin', anchor: 'end' }))],
  sim: { eval: (c, X) => { const v = X.digitOf(c); X.dev(c).v = v; X.disp(c, { v }); }, src: (c, X) => { const v = X.dev(c).v || 0, r = {}; if (v & 1) r.A = PT.P; if (v & 2) r.B = PT.P; if (v & 4) r.C = PT.P; if (v & 8) r.D = PT.P; return r; } },
});
def('netlabel', {
  cat: 'link', label: 'Collegamento (etichetta)', prefix: 'NET', autoNum: true, desc: 'Tutte le etichette con lo stesso nome sono collegate tra loro, anche su fogli diversi.',
  terms: [T('t', 0, 0, 'w', '')], box: [0, -7, 40, 7], nameAt: [0, 0, 'e'], showName: false, termLabels: false, netGroup: 'E',
  draw: () => pa('M0,0 L6,-6 L38,-6 L38,6 L6,6 Z'),
  inner: c => [{ x: 22, y: 0, t: c.name || '?', cls: 'lbl-pin' }],
});

/* ================= LADDER ================= */
function ladContact(id, label, mark, onFn, desc) {
  def(id, {
    cat: 'ladder', label, prefix: 'I0.', ladder: true, desc,
    terms: [T('l', -20, 0, 'w', ''), T('r', 20, 0, 'e', '')], box: [-20, -12, 20, 8], nameAt: [0, -9, 'n'], termLabels: false, follow: ['lad_coil'],
    draw: (c, st) => ln(-20, 0, -5, 0) + ln(5, 0, 20, 0) + ln(-5, -7, -5, 7, st && st.l0 ? 'act-on' : '') + ln(5, -7, 5, 7, st && st.l0 ? 'act-on' : '') + mark,
    sim: { links: () => [{ a: 'l', b: 'r', on: onFn }] },
  });
}
ladContact('lad_no', 'Contatto NA', '', (c, X) => X.out(nkey(c)), 'Conduce quando il bit indicato (es. I0.0, Q0.0, M0.0, T1) è a 1.');
ladContact('lad_nc', 'Contatto NC', ln(-4, 6, 4, -6), (c, X) => !X.out(nkey(c)), 'Conduce quando il bit indicato è a 0.');
ladContact('lad_p', 'Fronte positivo', '<text x="0" y="0.5" font-size="7" text-anchor="middle" dominant-baseline="central" class="stx">P</text>', (c, X) => X.out(nkey(c)) && !X.prev(nkey(c)), 'Conduce per un ciclo quando il bit passa da 0 a 1.');
ladContact('lad_n', 'Fronte negativo', '<text x="0" y="0.5" font-size="7" text-anchor="middle" dominant-baseline="central" class="stx">N</text>', (c, X) => !X.out(nkey(c)) && X.prev(nkey(c)), 'Conduce per un ciclo quando il bit passa da 1 a 0.');
ladContact('lad_fs', 'Primo ciclo (First Scan)', '<text x="0" y="0.5" font-size="6" text-anchor="middle" dominant-baseline="central" class="stx">FS</text>', (c, X) => X.S.scan <= 1, 'Conduce solo nel primo ciclo dopo l’avvio della simulazione.');
DEF.lad_fs.noName = true; DEF.lad_fs.showName = false;
function ladCoil(id, label, mark, desc, ev) {
  def(id, {
    cat: 'ladder', label, prefix: 'Q0.', ladder: true, desc, isCoil: id === 'lad_coil',
    terms: [T('l', -20, 0, 'w', ''), T('r', 20, 0, 'e', '')], box: [-20, -12, 20, 8], nameAt: [0, -9, 'n'], termLabels: false,
    draw: (c, st) => ln(-20, 0, -7, 0) + ln(7, 0, 20, 0) + pa('M-4,-7 A8,8 0 0 0 -4,7', st && st.on ? 'act-on' : '') + pa('M4,-7 A8,8 0 0 1 4,7', st && st.on ? 'act-on' : '') + mark,
    sim: { eval: (c, X) => { const e = X.v(c, 'l', 'r'); X.disp(c, { on: e }); ev(c, X, e); } },
  });
}
ladCoil('lad_coil', 'Bobina (assegna)', '', 'Il bit indicato vale 1 finché il ramo conduce.', (c, X, e) => X.drive(nkey(c), e));
ladCoil('lad_set', 'Bobina SET', '<text x="0" y="0.5" font-size="7" text-anchor="middle" dominant-baseline="central" class="stx">S</text>', 'Porta il bit a 1 e lo mantiene.', (c, X, e) => { if (e) X.S.setReq[nkey(c)] = true; X.S.latchNames.add(nkey(c)); });
ladCoil('lad_reset', 'Bobina RESET', '<text x="0" y="0.5" font-size="7" text-anchor="middle" dominant-baseline="central" class="stx">R</text>', 'Riporta il bit a 0 (azzera anche timer e contatori con quel nome).', (c, X, e) => { if (e) X.S.resetReq[nkey(c)] = true; });
function rail(id, label, pot, desc) {
  def(id, {
    cat: 'ladder', label, prefix: 'R', noName: true, showName: false, desc, props: { rows: 6 },
    terms: [], dynTerms: c => Array.from({ length: clamp(+c.props.rows || 6, 1, 30) }, (_, i) => T('r' + i, 0, i * 40, pot === 'P' ? 'e' : 'w', '')),
    box: c => [-4, -10, 4, (clamp(+c.props.rows || 6, 1, 30) - 1) * 40 + 10], nameAt: [0, -12, 'n'], termLabels: false,
    draw: (c, st) => ln(0, -10, 0, (clamp(+c.props.rows || 6, 1, 30) - 1) * 40 + 10, st && st.on ? 'rail-on' : 'rail'),
    sim: {
      always: c => { const n = clamp(+c.props.rows || 6, 1, 30), a = []; for (let i = 1; i < n; i++) a.push(['r0', 'r' + i]); return a; },
      src: (c, X) => { const on = X.plcRun(); X.disp(c, { on }); return on ? { r0: PT[pot] } : null; },
    },
  });
}
rail('lad_rail_l', 'Barra di alimentazione + (sinistra)', 'P', 'Barra sinistra dello schema ladder: alimentata quando il PLC è in RUN.');
rail('lad_rail_r', 'Barra di ritorno − (destra)', 'M', 'Barra destra dello schema ladder.');

/* ================= GRAFCET ================= */
function stepDef(id, label, initial, macro) {
  def(id, {
    cat: 'grafcet', label, prefix: '', noName: false, grStep: true, initial, desc: initial ? 'Tappa attiva all’avvio della simulazione.' : (macro ? 'Macro-tappa (si comporta come una tappa).' : 'Tappa del GRAFCET: quando è attiva esegue le sue azioni.'),
    terms: [T('in', 0, -30, 'n', ''), T('out', 0, 30, 's', ''), T('act', 30, 0, 'e', '')], box: [-15, -30, 30, 30], nameAt: [0, 0, 'n'], showName: false, termLabels: false,
    draw: (c, st) => {
      const on = st && st.on;
      let s = ln(0, -30, 0, -15) + ln(0, 15, 0, 30) + ln(15, 0, 30, 0) + re(-15, -15, 30, 30, on ? 'step-on' : '');
      if (initial) s += re(-12, -12, 24, 24);
      if (macro) s += ln(-15, -10, 15, -10) + ln(-15, 10, 15, 10);
      if (on) s += ci(0, 9, 2.3, 'fill');
      return s;
    },
    inner: c => [{ x: 0, y: macro ? 0 : -1, t: c.name || '?', cls: 'lbl-in' }],
  });
}
stepDef('gr_init', 'Tappa iniziale', true, false);
stepDef('gr_step', 'Tappa', false, false);
stepDef('gr_macro', 'Macro-tappa', false, true);
def('gr_trans', {
  cat: 'grafcet', label: 'Transizione', prefix: 't', autoNum: true, grTrans: true, desc: 'Scrivi la condizione: * = E, + = O, / = NON, FP( ) e FN( ) fronti, t/X2/5 = tappa 2 attiva da 5 s.',
  terms: [T('in', 0, -10, 'n', ''), T('out', 0, 10, 's', '')], box: c => [-10, -10, 14 + Math.max(10, String(c.props.expr || '').length * 4.6), 10], nameAt: [-11, 0, 'w'], showName: false, termLabels: false, props: { expr: '1' },
  draw: (c, st) => ln(0, -10, 0, 10) + ln(-8, 0, 8, 0, st && st.ok ? 'act-on' : '') + (st && st.ok ? ln(-8, 1.6, 8, 1.6, 'act-on') : ''),
  inner: c => [{ x: 12, y: 0, t: c.props.expr || '1', cls: 'lbl-expr', anchor: 'start' }],
});
def('gr_act', {
  cat: 'grafcet', label: 'Azione', prefix: '', grAct: true, desc: 'Uscita comandata quando la tappa è attiva. Tipi: N continua, S memorizza 1, R azzera, P impulso; ritardo D, limite L, condizione C.',
  terms: [T('in', 0, 0, 'w', ''), T('next', 70, 0, 'e', '')], box: [0, -10, 70, 10], nameAt: [35, 0, 'n'], showName: false, termLabels: false, props: { q: 'N', d: 0, l: 0, cond: '' },
  draw: (c, st) => re(0, -10, 70, 20, st && st.on ? 'step-on' : '') + (c.props.q && c.props.q !== 'N' ? ln(14, -10, 14, 10) : ''),
  inner: c => {
    const q = c.props.q || 'N', lab = [c.name || '?'];
    if (+c.props.d) lab.push(`D=${fmtNum(c.props.d)}s`);
    if (+c.props.l) lab.push(`L=${fmtNum(c.props.l)}s`);
    if (c.props.cond) lab.push(`C:${c.props.cond}`);
    const out = [{ x: q !== 'N' ? 42 : 35, y: 0, t: lab.join(' '), cls: 'lbl-pin' }];
    if (q !== 'N') out.push({ x: 7, y: 0, t: q, cls: 'lbl-pin' });
    return out;
  },
});
function grBar(id, label, n, top, dbl, desc) {
  const terms = [];
  if (top === 1) { terms.push(T('t0', 0, -10, 'n', '')); for (let i = 0; i < n; i++) terms.push(T('b' + i, i * 40, 10, 's', '')); }
  else { for (let i = 0; i < n; i++) terms.push(T('t' + i, i * 40, -10, 'n', '')); terms.push(T('b0', 0, 10, 's', '')); }
  def(id, {
    cat: 'grafcet', label, prefix: 'D', noName: true, showName: false, desc, termLabels: false,
    terms, box: [-4, -10, (n - 1) * 40 + 4, 10], nameAt: [0, -12, 'n'],
    draw: () => { let s = ln(-4, 0, (n - 1) * 40 + 4, 0); if (dbl) s += ln(-4, 3, (n - 1) * 40 + 4, 3); for (const t of terms) s += ln(t.x, t.y, t.x, dbl && t.y > 0 ? 3 : 0); return s; },
    sim: { always: c => terms.slice(1).map(t => [terms[0].id, t.id]) },
  });
}
grBar('gr_div_o', 'Divergenza in O', 2, 1, false, 'Scelta tra due rami: si attiva il ramo la cui transizione è vera.');
grBar('gr_conv_o', 'Convergenza in O', 2, 2, false, 'Riunione di rami alternativi.');
grBar('gr_div_y', 'Divergenza in Y (parallelo)', 2, 1, true, 'Dopo la transizione si attivano tutti i rami insieme.');
grBar('gr_conv_y', 'Convergenza in Y (sincronizzazione)', 2, 2, true, 'La transizione successiva scatta solo se tutti i rami sono attivi.');
grBar('gr_div_o3', 'Divergenza in O a 3 rami', 3, 1, false, 'Scelta tra tre rami.');
grBar('gr_conv_o3', 'Convergenza in O a 3 rami', 3, 2, false, 'Riunione di tre rami.');
grBar('gr_div_y3', 'Divergenza in Y a 3 rami', 3, 1, true, 'Attiva tre rami in parallelo.');
grBar('gr_conv_y3', 'Convergenza in Y a 3 rami', 3, 2, true, 'Sincronizza tre rami.');
def('gr_link_out', {
  cat: 'grafcet', label: 'Uscita link', prefix: 'L', autoNum: true, netGroup: 'G', desc: 'Rinvio: collega questo punto all’ingresso link con lo stesso nome.',
  terms: [T('t', 0, -10, 'n', '')], box: [-10, -10, 10, 14], nameAt: [12, 6, 'e'], termLabels: false,
  draw: () => ln(0, -10, 0, 2) + pa('M-5,2 L5,2 L0,10 Z', 'fill'),
});
def('gr_link_in', {
  cat: 'grafcet', label: 'Link in entrata', prefix: 'L', autoNum: true, netGroup: 'G', desc: 'Arrivo di un rinvio con lo stesso nome.',
  terms: [T('t', 0, 10, 's', '')], box: [-10, -14, 10, 10], nameAt: [12, -6, 'e'], termLabels: false,
  draw: () => ln(0, -2, 0, 10) + pa('M-5,-10 L5,-10 L0,-2 Z', 'fill'),
});

/* ================= PLC E INGRESSI/USCITE ================= */
function plcModule(id, o) {
  const di = o.di || [], dq = o.dq || [];
  const top = [], bottom = [];
  if (o.supply !== false) top.push(['Lp', 'L+'], ['M', 'M']);
  di.forEach(a => top.push(['i_' + a, a]));
  if (o.relay && dq.length) bottom.push(['L1o', '1L']);
  dq.forEach(a => bottom.push(['q_' + a, a]));
  if (o.extraBottom) bottom.push(...o.extraBottom);
  const w = Math.max(top.length, bottom.length, 3) * 20 + 0;
  boxDef(id, {
    cat: 'plc', label: o.label, prefix: o.prefix || 'A', autoNum: true, desc: o.desc, plc: true, cpu: !!o.cpu,
    w, h: 50, top, bottom, title: (c, st) => `${o.title}${o.cpu ? (st ? (st.run ? '\nRUN' : '\nSTOP') : '\nRUN') : ''}`,
    act: o.cpu ? 'run' : null, addr: { di, dq },
    art: (c, st) => (st && st.ins ? di.map((a, i) => st.ins[a] ? ci(10 + (i + (o.supply !== false ? 2 : 0)) * 20, 15, 2.2, 'led-on') : '').join('') : '') + (st && st.outs ? dq.map((a, i) => st.outs[a] ? ci(10 + (i + (o.relay ? 1 : 0)) * 20, 35, 2.2, 'led-on') : '').join('') : ''),
    sim: {
      links: o.relay ? () => dq.map(a => ({ a: 'L1o', b: 'q_' + a, on: (c, X) => X.dev(c).pw && X.plcRun() && X.out(key(a)) })) : null,
      eval: (c, X) => {
        const D = X.dev(c);
        D.pw = o.supply === false ? true : X.v(c, 'Lp', 'M');
        const ins = {}, outs = {};
        for (const a of di) { const h = D.pw && X.hi(c, 'i_' + a); ins[a] = h; X.drive(key(a), h); }
        for (const a of dq) outs[a] = D.pw && X.plcRun() && X.out(key(a));
        if (o.cpu) D.cpuPw = D.pw;
        X.disp(c, { on: D.pw, ins, outs, run: o.cpu ? X.cpuRun(c) : undefined });
      },
      src: o.relay ? null : (c, X) => { const D = X.dev(c), r = {}; if (D.pw && X.plcRun()) for (const a of dq) if (X.out(key(a))) r['q_' + a] = PT.P; return r; },
    },
  });
}
const rng = (p, a, b) => { const r = []; for (let i = a; i <= b; i++) r.push(p + i); return r; };
plcModule('plc_logo', { label: 'Modulo logico LOGO! 8DI/4DO', title: 'LOGO!', prefix: 'A', cpu: true, relay: true, di: rng('I', 1, 8), dq: rng('Q', 1, 4), desc: 'Relè programmabile: ingressi I1…I8, uscite a relè Q1…Q4 (comune 1L). Programmalo con il ladder o il GRAFCET usando questi nomi.' });
plcModule('plc_logo_exp', { label: 'Espansione LOGO! 4DI/4DO', title: 'DM8', prefix: 'A', relay: true, di: rng('I', 9, 12), dq: rng('Q', 5, 8), desc: 'Espansione: ingressi I9…I12, uscite a relè Q5…Q8.' });
plcModule('s7_1200', { label: 'PLC S7-1200 CPU', title: 'S7-1200', prefix: 'A', cpu: true, di: rng('I0.', 0, 7), dq: rng('Q0.', 0, 5), desc: 'CPU con 8 ingressi I0.0…I0.7 e 6 uscite a transistor Q0.0…Q0.5. Clic in simulazione per RUN/STOP.' });
plcModule('s7_1200_io', { label: 'S7-1200 SM 8DI/8DO', title: 'SM 1223', prefix: 'A', di: rng('I1.', 0, 7), dq: rng('Q1.', 0, 7), desc: 'Modulo di espansione: I1.0…I1.7, Q1.0…Q1.7.' });
plcModule('s7_1500', { label: 'PLC CPU S7-1500', title: 'S7-1500', prefix: 'A', cpu: true, desc: 'CPU senza I/O integrati: usa i moduli DI/DO S7-1500. Clic in simulazione per RUN/STOP.' });
plcModule('s7_1500_io', { label: 'S7-1500 DI/DO', title: 'DI8/DQ8', prefix: 'A', di: rng('I0.', 0, 7), dq: rng('Q0.', 0, 7), desc: 'Modulo S7-1500: I0.0…I0.7, Q0.0…Q0.7.' });
plcModule('et200', { label: 'ET-200 interfaccia', title: 'ET 200', prefix: 'A', desc: 'Stazione I/O decentrata (alimentazione L+ / M).' });
plcModule('et200_di', { label: 'ET-200 8DI', title: 'DI 8', prefix: 'A', di: rng('I2.', 0, 7), desc: 'Modulo ingressi I2.0…I2.7.' });
plcModule('et200_do', { label: 'ET-200 8DO', title: 'DQ 8', prefix: 'A', dq: rng('Q2.', 0, 7), desc: 'Modulo uscite Q2.0…Q2.7.' });
def('plc_di', {
  cat: 'plc', label: 'Ingresso digitale PLC', prefix: 'I0.', desc: 'Un ingresso: la sigla è l’indirizzo (es. I0.3). Vale 1 se riceve +24 V.',
  terms: [T('i', -20, 0, 'w', '')], box: [-20, -8, 22, 8], nameAt: [24, 0, 'e'], termLabels: false,
  draw: (c, st) => ln(-20, 0, -8, 0) + pa('M-8,-7 L14,-7 L22,0 L14,7 L-8,7 Z', st && st.on ? 'box-on' : ''),
  inner: c => [{ x: 6, y: 0, t: c.name || '?', cls: 'lbl-pin' }],
  sim: { eval: (c, X) => { const h = X.hi(c, 'i'); X.drive(nkey(c), h); X.disp(c, { on: h }); } },
});
def('plc_do', {
  cat: 'plc', label: 'Uscita digitale PLC', prefix: 'Q0.', desc: 'Un’uscita: la sigla è l’indirizzo (es. Q0.1). Dà +24 V quando il bit è a 1.',
  terms: [T('o', 30, 0, 'e', '')], box: [-2, -8, 30, 8], nameAt: [-4, 0, 'w'], termLabels: false,
  draw: (c, st) => ln(22, 0, 30, 0) + pa('M0,-7 L22,-7 L22,7 L0,7 L-0,7 Z', st && st.on ? 'box-on' : ''),
  inner: c => [{ x: 11, y: 0, t: c.name || '?', cls: 'lbl-pin' }],
  sim: { eval: (c, X) => { const on = X.plcRun() && X.out(nkey(c)); X.dev(c).on = on; X.disp(c, { on }); }, src: (c, X) => X.dev(c).on ? { o: PT.P } : null },
});
boxDef('plc_cpu', {
  cat: 'plc', label: 'CPU PLC', prefix: 'A', autoNum: true, desc: 'CPU generica: alimentala con L+ e M. Clic in simulazione per RUN/STOP.', plc: true, cpu: true, act: 'run',
  w: 60, h: 40, top: [['Lp', 'L+'], ['M', 'M']], title: (c, st) => `CPU\n${st ? (st.run ? 'RUN' : 'STOP') : 'RUN'}`,
  sim: { eval: (c, X) => { const D = X.dev(c); D.pw = X.v(c, 'Lp', 'M'); D.cpuPw = D.pw; X.disp(c, { on: D.pw, run: X.cpuRun(c) }); } },
});
boxDef('plc_pwr', {
  cat: 'plc', label: 'Alimentazione I/O PLC', prefix: 'G', autoNum: true, desc: 'Alimentatore 24 V per ingressi e uscite del PLC.',
  w: 40, h: 30, bottom: [['p', 'L+'], ['m', 'M']], title: 'PS 24V',
  sim: { src: () => ({ p: PT.P, m: PT.M }) },
});
boxDef('arduino', {
  cat: 'plc', label: 'Arduino Uno', prefix: 'A', autoNum: true, desc: 'Pin D2…D13: se un ladder o un GRAFCET comanda il nome del pin (es. D13) è un’uscita, altrimenti è un ingresso. 5V e GND alimentano i sensori.', plc: true,
  w: 280, h: 60, top: [...rng('D', 2, 13).map(p => ['p_' + p, p.slice(1)]), ['V5', '5V'], ['GND', 'GND']], title: 'ARDUINO UNO', ty: 32,
  sim: {
    eval: (c, X) => { const D = X.dev(c); D.out = {}; for (const p of rng('D', 2, 13)) { const k = key(p); if (X.isDriven(k)) D.out[p] = X.out(k); else X.drive(k, X.hi(c, 'p_' + p)); } },
    src: (c, X) => { const D = X.dev(c), r = { V5: PT.P, GND: PT.M }; if (D.out) for (const p in D.out) if (D.out[p]) r['p_' + p] = PT.P; return r; },
  },
});
/* ================= PNEUMATICA ================= */
const VALVES = { mono: '5/2 monostabile', mono42: '4/2 monostabile', bist: '5/2 bistabile', bist42: '4/2 bistabile', c53c: '5/3 centri chiusi', c53e: '5/3 centri in scarico', c53p: '5/3 centri in pressione' };
function pneuNames(c) {
  const n = c.name || 'A', lo = n.toLowerCase(), P = c.props;
  return { plus: P.plus || n + '+', minus: P.minus || n + '-', s0: P.s0 || lo + '0', s1: P.s1 || lo + '1', sm: P.sm || '' };
}
function pneuTick(c, X, dt, single) {
  const D = X.dev(c), N = pneuNames(c), P = c.props;
  const plus = X.out(key(N.plus)), minus = X.out(key(N.minus));
  D.p = D.p || 0;
  let dir;
  const v = single ? 'mono' : (P.valve || 'bist');
  if (v === 'mono' || v === 'mono42') dir = plus ? 1 : -1;
  else if (v === 'bist' || v === 'bist42') { if (plus && !minus) D.mem = 1; else if (minus && !plus) D.mem = -1; dir = D.mem || -1; }
  else { dir = plus && !minus ? 1 : minus && !plus ? -1 : (v === 'c53p' ? 0.5 : 0); }
  const sp = dir > 0 ? (+P.v1 || 50) : (+P.v2 || 50);
  D.p = clamp(D.p + dir * dt * (sp / 100), 0, 1);
  if (N.s0) X.drive(key(N.s0), D.p <= 0.001);
  if (N.s1) X.drive(key(N.s1), D.p >= 0.999);
  if (N.sm) X.drive(key(N.sm), Math.abs(D.p - 0.5) < 0.04);
  X.disp(c, { p: D.p, plus, minus, moving: (dir > 0 && D.p < 1) || (dir < 0 && D.p > 0) });
}
function valveArt(c, st, x, y, single) {
  const N = pneuNames(c), v = single ? 'mono' : (c.props.valve || 'bist');
  const three = v.startsWith('c53');
  const cells = three ? 3 : 2, cw = 16, w = cells * cw;
  const pos = st ? (st.plus && !st.minus ? 0 : st.minus && !st.plus ? (three ? 2 : 1) : (three ? 1 : (v.startsWith('mono') ? 1 : null))) : null;
  let s = '';
  for (let i = 0; i < cells; i++) s += re(x + i * cw, y, cw, 14, pos === i ? 'valve-on' : '');
  s += pa(`M${x + 3},${y + 11} L${x + 13},${y + 3} M${x + 10},${y + 3} L${x + 13},${y + 3} L${x + 13},${y + 6}`);
  s += pa(`M${x + cw + (three ? cw : 0) + 3},${y + 3} L${x + cw + (three ? cw : 0) + 13},${y + 11}`);
  s += re(x - 9, y + 2, 9, 10, st && st.plus ? 'coil-on' : '') + ln(x - 9, y + 12, x, y + 2);
  if (v.startsWith('mono') || single) s += pa(`M${x + w},${y + 7} l3,-3 l3,6 l3,-6 l3,6`);
  else s += re(x + w, y + 2, 9, 10, st && st.minus ? 'coil-on' : '') + ln(x + w, y + 12, x + w + 9, y + 2);
  return { s, labels: [{ x: x - 4.5, y: y + 20, t: N.plus, cls: 'lbl-pin' }, ...(v.startsWith('mono') || single ? [] : [{ x: x + w + 4.5, y: y + 20, t: N.minus, cls: 'lbl-pin' }])] };
}
function cylDef(id, label, opt) {
  def(id, {
    cat: 'pneu', label, prefix: 'A', autoNum: false, desc: opt.desc, pneu: true,
    terms: [], box: [-12, -26, 146, 46], nameAt: [-12, 0, 'w'], props: Object.assign({ valve: opt.single ? 'mono' : 'bist', v1: 50, v2: 50, plus: '', minus: '', s0: '', s1: '', sm: '' }, opt.props || {}),
    draw: (c, st) => {
      const p = st && Number.isFinite(st.p) ? st.p : 0, N = pneuNames(c);
      let s = '';
      if (opt.kind === 'rodless') {
        s += re(0, -8, 120, 16) + re(6 + p * 88, -18, 20, 10, 'piston') + ln(0, 0, 120, 0, 'd');
      } else if (opt.kind === 'rot') {
        const a = p * Math.PI;
        s += ci(40, 0, 16) + ln(40, 0, r1(40 + 14 * Math.cos(Math.PI - a)), r1(-14 * Math.sin(Math.PI - a)), 'rod') + pa('M24,0 A16,16 0 0 1 56,0', 'd');
      } else if (opt.kind === 'grip') {
        const g = 4 + (1 - p) * 10;
        s += re(0, -10, 40, 20) + re(40, -g - 4, 26, 4, 'piston') + re(40, g, 26, 4, 'piston') + ln(66, -g - 4, 66, -g - 12) + ln(66, g + 4, 66, g + 12);
      } else if (opt.kind === 'vac') {
        s += ln(0, 0, 30, 0) + pa('M30,-10 L46,-14 L46,14 L30,10 Z', p > 0.5 ? 'valve-on' : '') + (p > 0.5 ? tx(60, 0, 'vuoto', 6) : '');
      } else if (opt.kind === 'motor') {
        s += ci(30, 0, 14, st && st.moving ? 'motor-on' : '') + pa('M30,-14 L24,-6 L36,-6 Z', 'fill') + (opt.rev ? pa('M30,14 L24,6 L36,6 Z', 'fill') : '') + ln(44, 0, 56, 0) + (st && st.spin ? rotor({ run: true, dir: st.spin }, 9).replace('<g>', '<g transform="translate(30,0)">') : '');
      } else {
        const px = 6 + p * 60;
        s += re(0, -12, 100, 24) + re(px, -11, 4, 22, 'piston') + re(px + 4, -2.5, 72, 5, 'rod');
        if (opt.single) { const x0 = px + 6, st6 = (96 - x0) / 6; let d = `M${r1(x0)},0`; for (let i = 1; i <= 6; i++) d += ` L${r1(x0 + i * st6)},${i === 6 ? 0 : (i % 2 ? -8 : 8)}`; s += pa(d); }
        s += re(4, -20, 8, 6, st && p <= 0.001 ? 'led-on' : '') + re(64, -20, 8, 6, st && p >= 0.999 ? 'led-on' : '');
      }
      s += valveArt(c, st, 30, 26, opt.single).s;
      return s;
    },
    inner: (c, st) => {
      const N = pneuNames(c);
      const v = valveArt(c, st, 30, 26, opt.single);
      const out = [...v.labels];
      if (!opt.kind) out.push({ x: 8, y: -24, t: N.s0, cls: 'lbl-pin' }, { x: 68, y: -24, t: N.s1, cls: 'lbl-pin' });
      if (opt.kind === 'rodless') out.push({ x: 6, y: -22, t: N.s0, cls: 'lbl-pin' }, { x: 104, y: -22, t: N.s1, cls: 'lbl-pin' });
      return out;
    },
    sim: { tick: (c, X, dt) => { pneuTick(c, X, dt, opt.single); if (opt.kind === 'motor') { const D = X.dev(c); const N = pneuNames(c); const a = X.out(key(N.plus)), b = opt.rev && X.out(key(N.minus)); X.disp(c, { spin: a && !b ? 1 : b && !a ? -1 : 0, moving: a !== !!b }); } } },
  });
}
cylDef('cyl_se', 'Cilindro a semplice effetto', { single: true, desc: 'Esce quando il pilota (es. A+) è eccitato, rientra con la molla. Sensori a0 (dentro) e a1 (fuori).' });
cylDef('cyl_de', 'Cilindro a doppio effetto', { desc: 'Comandato da elettrovalvola: A+ esce, A- rientra. Sensori a0 e a1. Scegli il tipo di valvola nelle proprietà.' });
cylDef('cyl_rl', 'Cilindro senza stelo', { kind: 'rodless', desc: 'Il carrello si sposta lungo il cilindro: A+ verso destra, A- verso sinistra.' });
cylDef('cyl_rlm', 'Cilindro senza stelo magnetico', { kind: 'rodless', desc: 'Versione a trascinamento magnetico.' });
cylDef('cyl_rot', 'Attuatore rotante', { kind: 'rot', desc: 'Ruota di 180°: A+ in un senso, A- nell’altro.' });
cylDef('clamp', 'Morsetto a semplice effetto', { kind: 'grip', single: true, desc: 'Chiude con A+, si riapre con la molla.' });
cylDef('gripper', 'Pinza a doppio effetto', { kind: 'grip', desc: 'A+ chiude, A- apre.' });
cylDef('vacuum', 'Ventosa', { kind: 'vac', single: true, desc: 'Con A+ fa il vuoto: il sensore a1 segnala il vuoto raggiunto.' });
cylDef('airmotor', 'Motore pneumatico', { kind: 'motor', single: true, desc: 'Gira finché A+ è eccitato.' });
cylDef('airmotor_rev', 'Motore pneumatico reversibile', { kind: 'motor', rev: true, props: { valve: 'c53c' }, desc: 'A+ gira in un senso, A- nell’altro.' });

/* ================= VISTA QUADRO (2D / 3D) ================= */
function fvDef(id, label, w, h, art, o) {
  def(id, Object.assign({
    cat: 'fv', label, prefix: o && o.prefix || 'Q', fv: true, desc: (o && o.desc) || 'Vista frontale del quadro: si collega allo schema tramite la sigla.',
    terms: [], box: [0, 0, w, h], nameAt: [w / 2, h + 9, 's'], props: Object.assign({ style: '2D' }, (o && o.props) || {}),
    draw: (c, st) => `<g class="fv${c.props.style === '3D' ? ' fv3d' : ''}">${art(c, st || {})}</g>`,
  }, o || {}));
}
const fvBody = (w, h, cls) => re(0, 0, w, h, 'fv-body' + (cls ? ' ' + cls : ''), ' rx="2"');
function leverArt(w, h, on, trip) {
  const lx = w / 2 - 5, ly = on ? h / 2 - 16 : h / 2 + 2;
  return fvBody(w, h) + re(w / 2 - 8, h / 2 - 18, 16, 36, 'fv-slot', ' rx="2"') + re(lx, ly, 10, 14, on ? 'fv-on' : 'fv-off', ' rx="1.5"') + (trip ? re(4, 4, w - 8, 5, 'fv-trip') : '');
}
fvDef('fv_brk', 'Interruttore automatico (fronte)', 36, 60, (c, st) => leverArt(36, 60, st.on, st.trip), { act: 'latch', desc: 'Leva dell’interruttore con la stessa sigla: clic per azionarla.' });
fvDef('fv_mcb', 'Magnetotermico (fronte)', 36, 60, (c, st) => leverArt(36, 60, st.on, st.trip) + re(6, 48, 24, 7, 'fv-label'), { act: 'latch' });
fvDef('fv_rcd', 'Differenziale (fronte)', 54, 60, (c, st) => leverArt(54, 60, st.on, st.trip) + ci(10, 50, 4, 'fv-test'), { act: 'latch' });
fvDef('fv_ol', 'Relè termico (fronte)', 54, 40, (c, st) => fvBody(54, 40) + ci(14, 20, 7, st.on ? 'fv-trip' : 'fv-off') + re(30, 12, 16, 16, 'fv-slot', ' rx="2"'), { act: 'latch', prefix: 'F', desc: 'Pulsante di riarmo del relè termico con la stessa sigla.' });
fvDef('fv_km', 'Contattore (fronte)', 54, 70, (c, st) => fvBody(54, 70) + re(14, 22, 26, 22, 'fv-window') + re(18, st.on ? 24 : 36, 18, 6, st.on ? 'fv-on' : 'fv-off') + ci(45, 10, 3, st.on ? 'led-on' : 'fv-led'), { prefix: 'KM', desc: 'Mostra se il contattore con la stessa sigla è chiuso.' });
fvDef('fv_relay', 'Relè (fronte)', 30, 60, (c, st) => fvBody(30, 60) + ci(15, 12, 3, st.on ? 'led-on' : 'fv-led') + re(7, 24, 16, 24, 'fv-window'), { prefix: 'K' });
fvDef('fv_trelay', 'Relè temporizzato (fronte)', 30, 60, (c, st) => fvBody(30, 60) + ci(15, 12, 3, st.on ? 'led-on' : 'fv-led') + ci(15, 36, 9, 'fv-window') + ln(15, 36, 21, 31), { prefix: 'KT' });
fvDef('fv_relay1', 'Relè a 1 canale (fronte)', 20, 60, (c, st) => fvBody(20, 60) + ci(10, 12, 3, st.on ? 'led-on' : 'fv-led') + re(5, 24, 10, 24, 'fv-window'), { prefix: 'K' });
fvDef('fv_motor', 'Motore (vista)', 70, 50, (c, st) => re(0, 8, 46, 34, 'fv-body', ' rx="6"') + re(46, 20, 18, 10, 'fv-slot') + re(8, 0, 18, 8, 'fv-label') + ci(23, 25, 11, st.on ? 'fv-on' : 'fv-window') + (st.on ? rotor({ run: true, dir: st.dir || 1 }, 9).replace('<g>', '<g transform="translate(23,25)">') : ''), { prefix: 'M', desc: 'Motore in vista: la ventola gira quando gira il motore con la stessa sigla.' });
fvDef('fv_pb', 'Pulsante (fronte)', 30, 30, (c, st) => re(0, 0, 30, 30, 'fv-body', ' rx="3"') + ci(15, 15, st.on ? 9 : 11, 'fv-cap', ` style="fill:${LAMP_COL[c.props.color] || LAMP_COL.verde}"`), { act: 'mom', prefix: 'S', props: { color: 'verde' }, desc: 'Pulsante sul quadro: clic per premere il pulsante con la stessa sigla.' });
fvDef('fv_pilot', 'Spia di segnalazione (fronte)', 30, 30, (c, st) => re(0, 0, 30, 30, 'fv-body', ' rx="3"') + (st.on ? ci(15, 15, 13, 'glow', ` style="fill:${LAMP_COL[c.props.color] || LAMP_COL.verde}"`) : '') + ci(15, 15, 10, 'fv-cap', st.on ? ` style="fill:${LAMP_COL[c.props.color] || LAMP_COL.verde}"` : ''), { prefix: 'H', props: { color: 'verde' }, desc: 'Si accende con la lampada della stessa sigla.' });
fvDef('fv_led', 'LED (fronte)', 16, 16, (c, st) => ci(8, 8, 6, 'fv-cap', st.on ? ` style="fill:${LAMP_COL[c.props.color] || LAMP_COL.rossa}"` : '') + ci(8, 8, 7.5, 'fv-ring'), { prefix: 'H', props: { color: 'rossa' } });
fvDef('fv_key', 'Tastiera (fronte)', 60, 76, (c, st) => { let s = fvBody(60, 76); for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++) s += re(6 + k * 17, 6 + r * 17, 14, 14, 'fv-key', ' rx="2"'); return s; }, { prefix: 'T', fixedName: 'T', act: 'key', desc: 'Tastiera: in simulazione ogni tasto preme il pulsante con nome sigla + tasto (con sigla T: T1, T2… T0, T*, T#).' });
fvDef('fv_term', 'Morsettiera (fronte)', 60, 30, (c, st) => { let s = ''; for (let i = 0; i < 6; i++) s += re(i * 10, 0, 9, 30, 'fv-term') + ci(i * 10 + 4.5, 7, 2.5, 'fv-window') + ci(i * 10 + 4.5, 23, 2.5, 'fv-window'); return s; }, { prefix: 'X' });
fvDef('fv_box_s', 'Componente piccolo', 30, 30, () => fvBody(30, 30), { prefix: 'U' });
fvDef('fv_box_m', 'Componente medio', 60, 60, () => fvBody(60, 60), { prefix: 'U' });
fvDef('fv_box_l', 'Componente grande', 100, 80, () => fvBody(100, 80), { prefix: 'U' });

/* ================= CAVI, CONNESSIONI, DISEGNO ================= */
def('term', {
  cat: 'link', label: 'Morsetto', prefix: 'X', autoNum: true, desc: 'Morsetto di collegamento in morsettiera.',
  terms: [T('a', 0, -10, 'n', '1'), T('b', 0, 10, 's', '2')], box: [-5, -10, 5, 10], nameAt: [-6, 0, 'w'], termLabels: false,
  draw: () => ln(0, -10, 0, -3.2) + ci(0, 0, 3.2) + ln(0, 3.2, 0, 10),
  sim: { always: [['a', 'b']] },
});
for (const n of [2, 3, 4]) {
  const terms = [], always = [];
  for (let i = 0; i < n; i++) { terms.push(T('a' + i, i * 20, -10, 'n', String(i + 1)), T('b' + i, i * 20, 10, 's', String(i + 1))); always.push(['a' + i, 'b' + i]); }
  def('term' + n, {
    cat: 'link', label: `Morsettiera ${n} poli`, prefix: 'X', autoNum: true, desc: 'Gruppo di morsetti passanti.',
    terms, box: [-6, -10, (n - 1) * 20 + 6, 10], nameAt: [-7, 0, 'w'], termLabels: false,
    draw: () => { let s = ''; for (let i = 0; i < n; i++) { const x = i * 20; s += ln(x, -10, x, -3.2) + ci(x, 0, 3.2) + ln(x, 3.2, x, 10); } return s + re(-6, -6, (n - 1) * 20 + 12, 12, 'd'); },
    inner: () => Array.from({ length: n }, (_, i) => ({ x: i * 20 + 4, y: -12, t: String(i + 1), cls: 'lbl-pin', anchor: 'start' })),
    sim: { always },
  });
}
def('plug_m', {
  cat: 'link', label: 'Connettore maschio', prefix: 'XP', autoNum: true, desc: 'Spina di un connettore: collega i due lati.',
  terms: [T('a', 0, -20, 'n', ''), T('b', 0, 20, 's', '')], box: [-6, -20, 6, 20], nameAt: [-7, 0, 'w'], termLabels: false,
  draw: () => ln(0, -20, 0, 0) + pa('M-5,0 L5,0 L0,8 Z', 'fill') + ln(0, 8, 0, 20),
  sim: { always: [['a', 'b']] },
});
def('plug_f', {
  cat: 'link', label: 'Connettore femmina', prefix: 'XS', autoNum: true, desc: 'Presa di un connettore: collega i due lati.',
  terms: [T('a', 0, -20, 'n', ''), T('b', 0, 20, 's', '')], box: [-7, -20, 7, 20], nameAt: [-8, 0, 'w'], termLabels: false,
  draw: () => ln(0, -20, 0, -2) + pa('M-6,-2 A6,6 0 0 0 6,-2') + ln(0, 4, 0, 20),
  sim: { always: [['a', 'b']] },
});
def('junction', {
  cat: 'link', label: 'Nodo di giunzione', prefix: 'J', noName: true, showName: false, desc: 'Punto di collegamento tra più cavi.',
  terms: [T('j', 0, 0, null, '')], box: [-4, -4, 4, 4], nameAt: [0, -6, 'n'], termLabels: false, draw: () => '',
});
const SHAPE_COL = { nero: '#1b1f23', rosso: '#d92626', blu: '#2160e0', verde: '#16803d', arancione: '#c2611f', grigio: '#8a96a0', giallo: '#e0b000', bianco: '#ffffff' };
const sc = n => SHAPE_COL[n] || n || '#1b1f23';
def('text', {
  cat: 'draw', label: 'Testo', prefix: 'T', noName: true, showName: false, desc: 'Nota libera sul foglio.', shape: true,
  terms: [], props: { text: 'Testo', size: 12, color: 'nero', bold: false }, nameAt: [0, 0, 'n'],
  box: c => { const sz = +c.props.size || 12; const lines = String(c.props.text || '').split('\n'); const w = Math.max(10, Math.max(...lines.map(l => l.length)) * sz * 0.5); return [-2, -sz * 0.75, w + 2, sz * 0.55 + (lines.length - 1) * sz * 1.2]; },
  draw: () => '',
});
def('shp_line', {
  cat: 'draw', label: 'Linea', prefix: 'D', noName: true, showName: false, desc: 'Linea di disegno (non elettrica).', shape: true,
  terms: [], props: { dx: 60, dy: 0, color: 'nero', lw: 1, dash: false }, nameAt: [0, 0, 'n'],
  box: c => [Math.min(0, +c.props.dx) - 2, Math.min(0, +c.props.dy) - 2, Math.max(0, +c.props.dx) + 2, Math.max(0, +c.props.dy) + 2],
  draw: c => `<line x1="0" y1="0" x2="${+c.props.dx || 0}" y2="${+c.props.dy || 0}" style="stroke:${sc(c.props.color)};stroke-width:${+c.props.lw || 1}${c.props.dash ? ';stroke-dasharray:5 3' : ''}"/>`,
});
for (const [id, label, ell] of [['shp_rect', 'Rettangolo', false], ['shp_ellipse', 'Ellisse', true]]) {
  def(id, {
    cat: 'draw', label, prefix: 'D', noName: true, showName: false, desc: 'Forma di disegno: imposta dimensioni, colore del bordo e riempimento.', shape: true,
    terms: [], props: { w: 80, h: 50, color: 'nero', fill: '', lw: 1, dash: false }, nameAt: [0, 0, 'n'],
    box: c => [-2, -2, (+c.props.w || 10) + 2, (+c.props.h || 10) + 2],
    draw: c => {
      const w = +c.props.w || 10, h = +c.props.h || 10, st = `stroke:${sc(c.props.color)};stroke-width:${+c.props.lw || 1};fill:${c.props.fill ? sc(c.props.fill) : 'none'}${c.props.fill ? ';fill-opacity:.35' : ''}${c.props.dash ? ';stroke-dasharray:5 3' : ''}`;
      return ell ? `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" style="${st}"/>` : `<rect x="0" y="0" width="${w}" height="${h}" style="${st}"/>`;
    },
  });
}
def('image', {
  cat: 'draw', label: 'Immagine', prefix: 'IMG', noName: true, showName: false, desc: 'Immagine importata (PNG, JPG, SVG).', shape: true,
  terms: [], props: { src: '', w: 160, h: 120 }, nameAt: [0, 0, 'n'],
  box: c => [0, 0, +c.props.w || 10, +c.props.h || 10],
  draw: c => c.props.src ? `<image href="${esc(c.props.src)}" x="0" y="0" width="${+c.props.w || 10}" height="${+c.props.h || 10}" preserveAspectRatio="xMidYMid meet"/>` : re(0, 0, +c.props.w || 10, +c.props.h || 10, 'd'),
});
const SHEETS = { A4: { w: 1120, h: 790, label: 'A4 orizzontale' }, A3: { w: 1590, h: 1120, label: 'A3 orizzontale' }, A2: { w: 2240, h: 1590, label: 'A2 orizzontale' }, A4V: { w: 790, h: 1120, label: 'A4 verticale' } };
const OL_LABS = { no: { a: '97', b: '98' }, nc: { a: '95', b: '96' }, nonc: { a1: '97', b1: '98', a2: '95', b2: '96' }, co: { c: '95', nc: '96', no: '98' } };
const WIRE_COL = { auto: null, nero: '#1b1f23', marrone: '#7b4a1e', grigio: '#7a8590', blu: '#2160e0', rosso: '#d92626', 'giallo-verde': '#16803d', arancione: '#c2611f' };
