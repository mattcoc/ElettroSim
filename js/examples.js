/* ElettroSim · Schemi di esempio. */
'use strict';
/* ---------- examples ---------- */
function exBuilder(d) {
  let P = d.pages[0];
  const all = () => d.pages.flatMap(p => p.comps);
  const A = (type, x, y, name, o) => {
    o = o || {};
    const c = mkComp(type, x, y, o.props || null, null);
    c.name = name || ''; c.rot = o.rot || 0;
    P.comps.push(c);
    if (o.labels) { c.labels = o.labels; c.autoLab = false; } else if (c.autoLab) assignLabels(c, all());
    return c;
  };
  const W = (c1, t1, c2, t2, pts, color) => { const w = { id: uid('w'), a: { c: c1.id, t: t1 }, b: { c: c2.id, t: t2 }, pts: pts || [] }; if (color) w.color = color; P.wires.push(w); };
  return {
    A, W, J: (x, y) => A('junction', x, y, ''), Wj: (c, t, j) => W(c, t, j, 'j'), jj: (a, b) => W(a, 'j', b, 'j'),
    Tx: (x, y, text, size) => { const c = A('text', x, y, ''); Object.assign(c.props, { text, size: size || 11 }); return c; },
    page: name => { P = newPage(name); d.pages.push(P); return P; },
    name: n => { P.name = n; },
  };
}
function buildExample(id) {
  const d = newDoc();
  const { A, W, J, Wj, jj, Tx, page, name } = exBuilder(d);
  if (id === 'diretto') {
    d.meta.title = 'Avviamento diretto con autoritenuta';
    name('Schema');
    const X1 = A('src3pe', 100, 90), Q1 = A('mpcb3', 100, 150, 'Q1'), KM1 = A('km3p', 100, 240, 'KM1'), M1 = A('m3', 120, 330, 'M1');
    ['1', '2', '3'].forEach((n, i) => { W(X1, ['L1', 'L2', 'L3'][i], Q1, 'a' + n); W(Q1, 'b' + n, KM1, 'a' + n); W(KM1, 'b' + n, M1, ['U1', 'V1', 'W1'][i]); });
    W(X1, 'PE', M1, 'PE');
    const L = A('src1', 330, 80, '', { props: { pot: 'L1' } }), Q2 = A('mcb1', 330, 120, 'Q2'), Q1a = A('aux_no', 330, 180, 'Q1');
    const S1 = A('pb_nc', 330, 240, 'S1'), S2 = A('pb_no', 330, 300, 'S2'), K1 = A('aux_no', 380, 300, 'KM1'), C1 = A('coil', 330, 380, 'KM1');
    const N = A('src1', 330, 450, '', { props: { pot: 'N' }, rot: 2 });
    const K2 = A('aux_no', 450, 240, 'KM1'), Q1b = A('aux_nc', 520, 240, 'Q1');
    const H1 = A('lamp', 450, 380, 'H1', { props: { color: 'verde' } }), H2 = A('lamp', 520, 380, 'H2', { props: { color: 'rossa' } });
    const J1 = J(450, 140), JN = J(330, 430), JH = J(450, 430);
    W(L, 't', Q2, 'a1'); W(Q2, 'b1', Q1a, 'a'); W(Q1a, 'b', S1, 'a'); W(S1, 'b', S2, 'a'); W(S2, 'b', C1, 'a');
    W(K1, 'a', S1, 'b'); W(K1, 'b', S2, 'b');
    Wj(C1, 'b', JN); W(JN, 'j', N, 't');
    W(J1, 'j', Q2, 'b1'); Wj(K2, 'a', J1); Wj(Q1b, 'a', J1);
    W(K2, 'b', H1, 'a'); W(Q1b, 'b', H2, 'a');
    Wj(H1, 'b', JH); Wj(H2, 'b', JH); jj(JH, JN);
    Tx(60, 490, 'Circuito di potenza', 12);
    Tx(300, 510, 'Circuito di comando: S2 marcia, S1 arresto, H1 motore in moto, H2 salvamotore aperto. Chiudi prima Q1 e Q2.', 11);
    page('Fronte quadro');
    A('shp_rect', 80, 80, '', { props: { w: 420, h: 250, color: 'grigio', fill: '', lw: 1.5 } });
    Tx(90, 70, 'Quadro di comando (vista frontale)', 11);
    A('fv_mcb', 110, 110, 'Q2'); A('fv_brk', 170, 110, 'Q1'); A('fv_km', 230, 105, 'KM1'); A('fv_motor', 400, 110, 'M1');
    A('fv_pb', 120, 240, 'S2', { props: { color: 'verde' } }); A('fv_pb', 180, 240, 'S1', { props: { color: 'rossa' } });
    A('fv_pilot', 260, 240, 'H1', { props: { color: 'verde' } }); A('fv_pilot', 320, 240, 'H2', { props: { color: 'rossa' } });
    Tx(80, 370, 'Ogni elemento è collegato allo schema tramite la sigla: in simulazione puoi azionare interruttori e pulsanti anche da qui.', 11);
  } else if (id === 'inversione') {
    d.meta.title = 'Inversione di marcia con interblocco';
    name('Schema');
    const X1 = A('src3pe', 100, 80), Q1 = A('mcb3', 100, 120, 'Q1', { props: { startOn: true } });
    const KM1 = A('km3p', 100, 220, 'KM1'), KM2 = A('km3p', 200, 220, 'KM2'), F1 = A('ol3', 100, 300, 'F1'), M1 = A('m3', 120, 380, 'M1');
    ['L1', 'L2', 'L3'].forEach((p, i) => W(X1, p, Q1, 'a' + (i + 1)));
    const j1 = J(100, 160), j2 = J(120, 170), j3 = J(140, 180);
    [j1, j2, j3].forEach((j, i) => { W(Q1, 'b' + (i + 1), j, 'j'); W(j, 'j', KM1, 'a' + (i + 1)); });
    W(j1, 'j', KM2, 'a3'); W(j2, 'j', KM2, 'a2'); W(j3, 'j', KM2, 'a1');
    const j4 = J(100, 250), j5 = J(120, 260), j6 = J(140, 270);
    [j4, j5, j6].forEach((j, i) => { W(KM1, 'b' + (i + 1), j, 'j'); W(j, 'j', F1, 'a' + (i + 1)); W(KM2, 'b' + (i + 1), j, 'j'); });
    ['U1', 'V1', 'W1'].forEach((t, i) => W(F1, 'b' + (i + 1), M1, t));
    W(X1, 'PE', M1, 'PE', [[160, 90], [280, 90], [280, 340], [160, 340]]);
    const L = A('src1', 380, 80, '', { props: { pot: 'L1' } }), F2 = A('fu1', 380, 120, 'F2'), F1c = A('olc_nc', 380, 180, 'F1');
    const S0 = A('pb_nc', 380, 240, 'S0'), S1 = A('pb_no', 380, 300, 'S1');
    const K1h = A('aux_no', 430, 300, 'KM1', { labels: { a: '13', b: '14' } }), K2i = A('aux_nc', 380, 360, 'KM2', { labels: { a: '21', b: '22' } }), C1 = A('coil', 380, 420, 'KM1');
    const S2 = A('pb_no', 520, 300, 'S2'), K2h = A('aux_no', 570, 300, 'KM2', { labels: { a: '13', b: '14' } }), K1i = A('aux_nc', 520, 360, 'KM1', { labels: { a: '21', b: '22' } }), C2 = A('coil', 520, 420, 'KM2');
    const K1l = A('aux_no', 660, 240, 'KM1', { labels: { a: '23', b: '24' } }), K2l = A('aux_no', 730, 240, 'KM2', { labels: { a: '23', b: '24' } }), F1l = A('olc_no', 820, 240, 'F1');
    const H1 = A('lamp', 660, 420, 'H1', { props: { color: 'verde' } }), H2 = A('lamp', 730, 420, 'H2', { props: { color: 'blu' } }), H3 = A('lamp', 820, 420, 'H3', { props: { color: 'rossa' } });
    const N = A('src1', 380, 490, '', { props: { pot: 'N' }, rot: 2 });
    const JA = J(430, 260), JB = J(520, 260), JN = J(380, 460), JT = J(660, 140), JT2 = J(730, 140), JN2 = J(520, 460), JN3 = J(660, 460), JN4 = J(730, 460);
    W(L, 't', F2, 'a1'); W(F2, 'b1', F1c, 'a'); W(F1c, 'b', S0, 'a'); W(S0, 'b', S1, 'a');
    Wj(S0, 'b', JA); Wj(K1h, 'a', JA); jj(JA, JB); Wj(S2, 'a', JB); Wj(K2h, 'a', JB);
    W(S1, 'b', K2i, 'a'); W(K1h, 'b', S1, 'b'); W(K2i, 'b', C1, 'a');
    W(S2, 'b', K1i, 'a'); W(K2h, 'b', S2, 'b'); W(K1i, 'b', C2, 'a');
    Wj(C1, 'b', JN); W(JN, 'j', N, 't'); Wj(C2, 'b', JN2); jj(JN2, JN);
    W(JT, 'j', F2, 'b1'); Wj(K1l, 'a', JT); jj(JT2, JT); Wj(K2l, 'a', JT2); Wj(F1l, 'a', JT2);
    W(K1l, 'b', H1, 'a'); W(K2l, 'b', H2, 'a'); W(F1l, 'b', H3, 'a');
    Wj(H1, 'b', JN3); jj(JN3, JN2); Wj(H2, 'b', JN4); jj(JN4, JN3); Wj(H3, 'b', JN4);
    Tx(380, 540, 'S1 avanti, S2 indietro, S0 arresto. Gli NC 21-22 impediscono di chiudere KM1 e KM2 insieme.', 11);
  } else if (id === 'stella') {
    d.meta.title = 'Avviamento stella-triangolo';
    name('Schema');
    const X1 = A('src3pe', 100, 80), Q1 = A('mpcb3', 100, 130, 'Q1'), KM1 = A('km3p', 100, 210, 'KM1'), M1 = A('m6', 120, 320, 'M1');
    const KM3 = A('km3p', 240, 320, 'KM3'), KM2 = A('km3p', 100, 450, 'KM2');
    ['L1', 'L2', 'L3'].forEach((p, i) => { W(X1, p, Q1, 'a' + (i + 1)); W(Q1, 'b' + (i + 1), KM1, 'a' + (i + 1)); });
    const ja = J(100, 250), jb = J(120, 260), jc = J(140, 270);
    [ja, jb, jc].forEach((j, i) => { W(KM1, 'b' + (i + 1), j, 'j'); W(j, 'j', M1, ['U1', 'V1', 'W1'][i]); W(j, 'j', KM3, 'a' + (i + 1)); });
    const jd = J(140, 380), je = J(100, 390), jf = J(120, 400);
    W(M1, 'W2', jd, 'j'); W(jd, 'j', KM2, 'a3'); W(M1, 'U2', je, 'j'); W(je, 'j', KM2, 'a1'); W(M1, 'V2', jf, 'j'); W(jf, 'j', KM2, 'a2');
    Wj(KM3, 'b1', jd); Wj(KM3, 'b2', je); Wj(KM3, 'b3', jf);
    W(KM2, 'b1', KM2, 'b2'); W(KM2, 'b2', KM2, 'b3');
    W(X1, 'PE', M1, 'PE');
    const L = A('src1', 380, 80, '', { props: { pot: 'L1' } }), F2 = A('fu1', 380, 120, 'F2'), Qa = A('aux_no', 380, 180, 'Q1');
    const S0 = A('pb_nc', 380, 240, 'S0'), S1 = A('pb_no', 380, 300, 'S1'), K1h = A('aux_no', 430, 300, 'KM1', { labels: { a: '13', b: '14' } }), C1 = A('coil', 380, 480, 'KM1');
    const KT = A('coil_ton', 460, 480, 'KT1', { props: { t: 5 } }), KTnc = A('ton_nc', 560, 370, 'KT1'), K3i = A('aux_nc', 560, 420, 'KM3', { labels: { a: '21', b: '22' } }), C2 = A('coil', 560, 480, 'KM2');
    const KTno = A('ton_no', 660, 370, 'KT1'), K2i = A('aux_nc', 660, 420, 'KM2', { labels: { a: '21', b: '22' } }), C3 = A('coil', 660, 480, 'KM3');
    const N = A('src1', 380, 550, '', { props: { pot: 'N' }, rot: 2 });
    const J1 = J(380, 340), J2 = J(460, 340), J3 = J(560, 340), J4 = J(660, 340), N1 = J(380, 530), N2 = J(460, 530), N3 = J(560, 530), N4 = J(660, 530);
    W(L, 't', F2, 'a1'); W(F2, 'b1', Qa, 'a'); W(Qa, 'b', S0, 'a'); W(S0, 'b', S1, 'a');
    W(K1h, 'a', S0, 'b'); W(K1h, 'b', S1, 'b');
    Wj(S1, 'b', J1); W(J1, 'j', C1, 'a'); jj(J1, J2); jj(J2, J3); jj(J3, J4);
    W(J2, 'j', KT, 'a'); W(J3, 'j', KTnc, 'a'); W(KTnc, 'b', K3i, 'a'); W(K3i, 'b', C2, 'a');
    W(J4, 'j', KTno, 'a'); W(KTno, 'b', K2i, 'a'); W(K2i, 'b', C3, 'a');
    Wj(C1, 'b', N1); Wj(KT, 'b', N2); Wj(C2, 'b', N3); Wj(C3, 'b', N4);
    jj(N4, N3); jj(N3, N2); jj(N2, N1); W(N1, 'j', N, 't');
    Tx(380, 600, 'S1 avvia in stella (KM1 + KM2). Dopo 5 s KT1 passa a triangolo (KM1 + KM3).', 11);
    Tx(150, 480, 'Centro stella', 10);
  } else if (id === 'plc') {
    d.meta.title = 'PLC S7-1200: marcia e arresto';
    name('Cablaggio');
    const X1 = A('src3pe', 60, 120), Q1 = A('mcb3', 60, 170, 'Q1', { props: { startOn: true } }), KM1 = A('km3p', 60, 240, 'KM1'), M1 = A('m3', 80, 330, 'M1');
    ['1', '2', '3'].forEach((n, i) => { W(X1, ['L1', 'L2', 'L3'][i], Q1, 'a' + n); W(Q1, 'b' + n, KM1, 'a' + n); W(KM1, 'b' + n, M1, ['U1', 'V1', 'W1'][i]); });
    W(X1, 'PE', M1, 'PE');
    const CPU = A('s7_1200', 240, 260, 'A1'), DC = A('srcdc', 250, 220);
    W(DC, 'P', CPU, 'Lp'); W(DC, 'M', CPU, 'M');
    const P1 = A('src1', 290, 140, '', { props: { pot: 'P' } }), S1 = A('pb_no', 290, 190, 'S1');
    const P2 = A('src1', 360, 140, '', { props: { pot: 'P' } }), S0 = A('pb_nc', 360, 190, 'S0');
    W(P1, 't', S1, 'a'); W(S1, 'b', CPU, 'i_I0.0'); W(P2, 't', S0, 'a'); W(S0, 'b', CPU, 'i_I0.1');
    const C1 = A('coil', 250, 370, 'KM1'), H1 = A('lamp', 330, 370, 'H1', { props: { color: 'verde' } });
    const M0a = A('src1', 250, 420, '', { props: { pot: 'M' }, rot: 2 }), M0b = A('src1', 330, 420, '', { props: { pot: 'M' }, rot: 2 });
    W(CPU, 'q_Q0.0', C1, 'a'); W(CPU, 'q_Q0.1', H1, 'a'); W(C1, 'b', M0a, 't'); W(H1, 'b', M0b, 't');
    Tx(60, 480, 'S1 marcia (I0.0), S0 arresto NC (I0.1). Il programma ladder è nel foglio “Programma”. Clic sulla CPU per passare da RUN a STOP.', 11);
    page('Programma');
    A('lad_rail_l', 100, 100, '', { props: { rows: 3 } }); A('lad_rail_r', 420, 100, '', { props: { rows: 3 } });
    const I0 = A('lad_no', 120, 100, 'I0.0'), I1 = A('lad_no', 160, 100, 'I0.1'), Q0 = A('lad_coil', 400, 100, 'Q0.0');
    W(I1, 'r', Q0, 'l');
    const Q0s = A('lad_no', 120, 140, 'Q0.0');
    W(Q0s, 'r', I0, 'r');
    const Q0b = A('lad_no', 120, 180, 'Q0.0'), Q1c = A('lad_coil', 400, 180, 'Q0.1');
    W(Q0b, 'r', Q1c, 'l');
    Tx(100, 240, 'Segmento 1: marcia con autoritenuta. I0.0 avvia; I0.1 è un contatto NA perché il pulsante S0 è NC (a riposo l’ingresso vale 1).', 11);
    Tx(100, 258, 'Segmento 2: la lampada H1 (Q0.1) segnala il motore in marcia.', 11);
  } else if (id === 'plcinv') {
    d.meta.title = 'PLC S7-1200: inversione di marcia';
    name('Cablaggio');
    // circuito di potenza: KM1 avanti, KM2 indietro (L1 e L3 scambiate), relè termico F1
    const X1 = A('src3pe', 80, 80), Q1 = A('mcb3', 80, 120, 'Q1', { props: { startOn: true } });
    const KM1 = A('km3p', 80, 220, 'KM1'), KM2 = A('km3p', 180, 220, 'KM2'), F1 = A('ol3', 80, 300, 'F1'), M1 = A('m3', 100, 380, 'M1');
    ['L1', 'L2', 'L3'].forEach((p, i) => W(X1, p, Q1, 'a' + (i + 1)));
    const j1 = J(80, 160), j2 = J(100, 170), j3 = J(120, 180);
    [j1, j2, j3].forEach((j, i) => { W(Q1, 'b' + (i + 1), j, 'j'); W(j, 'j', KM1, 'a' + (i + 1)); });
    W(j1, 'j', KM2, 'a3'); W(j2, 'j', KM2, 'a2'); W(j3, 'j', KM2, 'a1');
    const j4 = J(80, 250), j5 = J(100, 260), j6 = J(120, 270);
    [j4, j5, j6].forEach((j, i) => { W(KM1, 'b' + (i + 1), j, 'j'); W(j, 'j', F1, 'a' + (i + 1)); W(KM2, 'b' + (i + 1), j, 'j'); });
    ['U1', 'V1', 'W1'].forEach((t, i) => W(F1, 'b' + (i + 1), M1, t));
    W(X1, 'PE', M1, 'PE', [[140, 90], [260, 90], [260, 340], [140, 340]]);
    // PLC alimentato a 24 V c.c.
    const CPU = A('s7_1200', 560, 330, 'A1');
    const T = id => termsW(CPU).find(t => t.id === id);
    const DC = A('srcdc', T('Lp').x, T('Lp').y - 60);
    W(DC, 'P', CPU, 'Lp'); W(DC, 'M', CPU, 'M');
    // ingressi: pulsanti e contatti di ritorno, alimentati dal +24 V
    const ins = [
      ['I0.0', 'pb_no', 'S1'], ['I0.1', 'pb_nc', 'S0'], ['I0.2', 'olc_no', 'F1'],
      ['I0.3', 'aux_no', 'KM1', { a: '13', b: '14' }], ['I0.4', 'pb_no', 'S2'], ['I0.5', 'aux_no', 'KM2', { a: '13', b: '14' }],
    ];
    // percorsi dei fili sfalsati: nessun tratto orizzontale si sovrappone o si incrocia con un altro
    const lanes = (items, y0, dy) => {
      const L = items.filter(it => it.x < it.tx).sort((a, b) => a.x - b.x), R = items.filter(it => it.x > it.tx).sort((a, b) => b.x - a.x);
      [L, R].forEach(g => g.forEach((it, k) => { it.ym = y0 + dy * k; }));
    };
    const inItems = ins.map(([addr, type, nm, labels], i) => ({ addr, type, nm, labels, x: 470 + i * 70, tx: T('i_' + addr).x }));
    lanes(inItems, T('i_I0.0').y - 14, -10);
    for (const it of inItems) {
      const P = A('src1', it.x, 140, '', { props: { pot: 'P' } }), dev = A(it.type, it.x, 200, it.nm, it.labels ? { labels: it.labels } : null);
      W(P, 't', dev, 'a'); W(dev, 'b', CPU, 'i_' + it.addr, it.ym != null ? [[it.x, it.ym], [it.tx, it.ym]] : []);
    }
    // uscite: le bobine hanno anche l'interblocco elettrico con i contatti NC 21-22
    const outs = [['Q0.0', 'coil', 'KM1', 'KM2'], ['Q0.1', 'coil', 'KM2', 'KM1'], ['Q0.2', 'lamp', 'H1', 'verde'], ['Q0.3', 'lamp', 'H2', 'rossa'], ['Q0.4', 'lamp', 'H3', 'bianca'], ['Q0.5', 'lamp', 'H4', 'gialla']];
    const outItems = outs.map(([addr, type, nm, extra], i) => ({ addr, type, nm, extra, x: 450 + i * 80, tx: T('q_' + addr).x }));
    lanes(outItems, T('q_Q0.0').y + 14, 10);
    for (const { addr, type, nm, extra, x, tx, ym } of outItems) {
      const route = ym != null ? [[tx, ym], [x, ym]] : [];
      let y = 450, dev;
      if (type === 'coil') {
        const ilk = A('aux_nc', x, y, extra, { labels: { a: '21', b: '22' } });
        W(CPU, 'q_' + addr, ilk, 'a', route);
        dev = A(type, x, y + 70, nm); W(ilk, 'b', dev, 'a'); y += 70;
      } else {
        dev = A(type, x, y + 35, nm, { props: { color: extra } }); W(CPU, 'q_' + addr, dev, 'a', route); y += 35;
      }
      const M = A('src1', x, 580, '', { props: { pot: 'M' }, rot: 2 });
      W(dev, 'b', M, 't');
    }
    Tx(60, 640, 'Ingressi: S1 avanti (I0.0), S0 arresto NC (I0.1), F1 97-98 relè termico (I0.2), KM1 13-14 (I0.3), S2 indietro (I0.4), KM2 13-14 (I0.5).', 11);
    Tx(60, 660, 'Uscite: KM1 (Q0.0), KM2 (Q0.1), H1 verde pronto (Q0.2), H2 rossa avanti (Q0.3), H3 bianca indietro (Q0.4), H4 gialla termico (Q0.5).', 11);
    Tx(60, 680, 'Il programma ladder è nel foglio “Programma”. Clic sulla CPU per passare da RUN a STOP, clic su F1 per far scattare il termico.', 11);
    page('Programma');
    A('lad_rail_l', 100, 100, '', { props: { rows: 8 } }); A('lad_rail_r', 520, 100, '', { props: { rows: 8 } });
    // una riga: contatti in serie da x=120 (passo 40) e bobina sulla barra destra
    const rung = (y, contacts, coil) => {
      const cs = contacts.map(([type, addr], i) => A(type, 120 + i * 40, y, addr));
      W(cs[cs.length - 1], 'r', A('lad_coil', 500, y, coil), 'l');
    };
    // Segmento 1: marcia avanti con autoritenuta e interblocco
    const a0 = A('lad_no', 120, 100, 'I0.0');
    const a1 = A('lad_no', 220, 100, 'I0.1'); A('lad_nc', 260, 100, 'I0.2'); const kb = A('lad_nc', 300, 100, 'Q0.1');
    W(kb, 'r', A('lad_coil', 500, 100, 'Q0.0'), 'l');
    A('lad_no', 120, 140, 'Q0.0'); const s2 = A('lad_no', 160, 140, 'I0.3');
    W(a0, 'r', a1, 'l'); W(s2, 'r', a1, 'l', [[190, 140], [190, 100]]);
    // Segmento 2: marcia indietro
    const b0 = A('lad_no', 120, 180, 'I0.4');
    const b1 = A('lad_no', 220, 180, 'I0.1'); A('lad_nc', 260, 180, 'I0.2'); const kc = A('lad_nc', 300, 180, 'Q0.0');
    W(kc, 'r', A('lad_coil', 500, 180, 'Q0.1'), 'l');
    A('lad_no', 120, 220, 'Q0.1'); const t2 = A('lad_no', 160, 220, 'I0.5');
    W(b0, 'r', b1, 'l'); W(t2, 'r', b1, 'l', [[190, 220], [190, 180]]);
    // Segmenti 3-6: segnalazioni
    rung(260, [['lad_nc', 'Q0.0'], ['lad_nc', 'Q0.1'], ['lad_nc', 'I0.2']], 'Q0.2');
    rung(300, [['lad_no', 'Q0.0']], 'Q0.3');
    rung(340, [['lad_no', 'Q0.1']], 'Q0.4');
    rung(380, [['lad_no', 'I0.2']], 'Q0.5');
    const cm = [[100, 'Seg. 1 · KM1 marcia avanti'], [180, 'Seg. 2 · KM2 marcia indietro'], [260, 'Seg. 3 · L_VERDE pronto'], [300, 'Seg. 4 · L_ROSSA avanti'], [340, 'Seg. 5 · L_BIANCA indietro'], [380, 'Seg. 6 · L_GIALLA termico']];
    for (const [y, t] of cm) Tx(540, y, t, 10);
    Tx(100, 440, 'Tabella dei simboli', 12);
    const sym = [['P_AVANTI', 'I0.0', 'pulsante marcia avanti (NA)'], ['P_STOP', 'I0.1', 'pulsante di arresto (NC: a riposo vale 1)'], ['TERMICA', 'I0.2', 'contatto 97-98 del relè termico (NA: vale 1 se scatta)'],
      ['SICUREZZA_KM1', 'I0.3', 'contatto 13-14 di KM1 (conferma chiusura)'], ['P_INDIETRO', 'I0.4', 'pulsante marcia indietro (NA)'], ['SICUREZZA_KM2', 'I0.5', 'contatto 13-14 di KM2'],
      ['KM1', 'Q0.0', 'bobina KM1 (avanti)'], ['KM2', 'Q0.1', 'bobina KM2 (indietro)'], ['L_VERDE', 'Q0.2', 'pronto'], ['L_ROSSA', 'Q0.3', 'marcia avanti'], ['L_BIANCA', 'Q0.4', 'marcia indietro'], ['L_GIALLA', 'Q0.5', 'intervento termico']];
    sym.forEach(([n, a, c], i) => Tx(100, 470 + i * 20, `${a}   ${n} – ${c}`, 10));
  } else if (id === 'grafcet') {
    d.meta.title = 'GRAFCET: ciclo A+ A−';
    name('GRAFCET');
    const s0 = A('gr_init', 120, 100, '0');
    A('gr_trans', 120, 140, '', { props: { expr: 'S1*a0' } });
    A('gr_step', 120, 180, '1'); A('gr_act', 150, 180, 'A+');
    A('gr_trans', 120, 220, '', { props: { expr: 'a1' } });
    A('gr_step', 120, 260, '2'); A('gr_act', 150, 260, 'A-');
    const t3 = A('gr_trans', 120, 300, '', { props: { expr: 'a0' } });
    W(t3, 'out', s0, 'in', [[120, 330], [70, 330], [70, 50], [120, 50]]);
    A('cyl_de', 340, 130, 'A');
    A('fv_pb', 360, 250, 'S1', { props: { color: 'verde' } });
    Tx(400, 266, '← S1: avvio ciclo', 11);
    Tx(60, 390, 'Premi S1: il cilindro A esce (A+). Quando arriva al sensore a1 rientra (A−); su a0 il ciclo torna alla tappa 0.', 11);
    Tx(60, 408, 'Le transizioni leggono i nomi dei sensori (a0, a1) e dei pulsanti; le azioni comandano i piloti della valvola (A+, A−).', 11);
  } else if (id === 'logica') {
    d.meta.title = 'Porte logiche e contatore';
    name('Logica');
    const IN1 = A('l_in', 100, 90, 'IN1'), IN2 = A('l_in', 100, 130, 'IN2');
    const AND = A('g_and', 200, 80, 'U1'), OR = A('g_or', 200, 160, 'U2'), XOR = A('g_xor', 200, 240, 'U3');
    const J1 = J(150, 90), J2 = J(170, 130), J1b = J(150, 170), J2b = J(170, 190);
    W(IN1, 'Q', J1, 'j'); W(J1, 'j', AND, 'A'); W(IN2, 'Q', J2, 'j'); W(J2, 'j', AND, 'B');
    jj(J1, J1b); W(J1b, 'j', OR, 'A'); jj(J2, J2b); W(J2b, 'j', OR, 'B');
    W(J1b, 'j', XOR, 'A'); W(J2b, 'j', XOR, 'B');
    const L1 = A('l_led', 300, 100, 'AND', { props: { color: 'verde' } }), L2 = A('l_led', 300, 180, 'OR', { props: { color: 'gialla' } }), L3 = A('l_led', 300, 260, 'XOR', { props: { color: 'rossa' } });
    W(AND, 'Q', L1, 'A'); W(OR, 'Q', L2, 'A'); W(XOR, 'Q', L3, 'A');
    const G1 = A('l_pulse', 420, 80, 'G1', { props: { t: 0.5, t2: 0.5 } }), C1 = A('l_bcd', 520, 80, 'C1'), DS = A('l_dispbcd', 640, 90, 'DS1');
    W(G1, 'Q', C1, 'CLK');
    ['Q0', 'Q1', 'Q2', 'Q3'].forEach((q, i) => W(C1, q, DS, 'ABCD'[i]));
    Tx(100, 340, 'Clic su IN1 e IN2 per cambiare gli ingressi: i LED mostrano AND, OR ed EXOR.', 11);
    Tx(420, 220, 'G1 genera impulsi: il contatore C1 conta da 0 a 9 e il display mostra la cifra.', 11);
  } else if (id === 'inverter') {
    d.meta.title = 'Motore con variatore di frequenza';
    name('Schema');
    const X1 = A('src3pe', 210, 80), Q1 = A('mcb3', 210, 130, 'Q1', { props: { startOn: true } }), U1 = A('inv3', 200, 200, 'U1', { props: { hz: 35 } }), M1 = A('m3', 250, 370, 'M1');
    ['L1', 'L2', 'L3'].forEach((p, i) => { W(X1, p, Q1, 'a' + (i + 1)); W(Q1, 'b' + (i + 1), U1, p); });
    const JP = J(270, 170);
    W(X1, 'PE', JP, 'j'); W(JP, 'j', U1, 'PE'); W(JP, 'j', M1, 'PE');
    W(U1, 'U', M1, 'U1'); W(U1, 'V', M1, 'V1'); W(U1, 'W', M1, 'W1');
    const S1 = A('sel3', 110, 240, 'S1');
    W(U1, 'p24', S1, 'a2'); W(S1, 'a1', S1, 'a2');
    W(S1, 'b1', U1, 'FW', [[110, 300], [170, 300], [170, 240]]);
    W(S1, 'b2', U1, 'RV', [[130, 280], [160, 280], [160, 260]]);
    Tx(60, 440, 'Il commutatore S1 sceglie il senso: I = avanti (FW), II = indietro (RV), 0 = fermo.', 11);
    Tx(60, 458, 'La frequenza di uscita si imposta nelle proprietà del variatore U1.', 11);
  }
  return d;
}
const EXAMPLES = [
  ['diretto', 'Avviamento diretto con autoritenuta'],
  ['inversione', 'Inversione di marcia con interblocco'],
  ['stella', 'Avviamento stella-triangolo'],
  ['plc', 'PLC S7-1200: marcia e arresto in ladder'],
  ['plcinv', 'PLC S7-1200: inversione di marcia in ladder'],
  ['grafcet', 'GRAFCET: ciclo A+ A− con cilindro'],
  ['logica', 'Porte logiche e contatore'],
  ['inverter', 'Motore con variatore di frequenza'],
];
function loadExample(id) { const ex = EXAMPLES.find(e => e[0] === id); loadDoc(buildExample(id), `Esempio aperto: ${ex ? ex[1] : ''}.`); }
