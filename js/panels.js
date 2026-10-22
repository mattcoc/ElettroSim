/* ElettroSim · Pannello proprietà, pannello di simulazione, verifica dello schema e modalità. */
'use strict';
/* ---------- properties panel ---------- */
const ICON = {
  rot: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 11-3-6.2"/><path d="M20 4v5h-5"/></svg>',
  flip: '<svg viewBox="0 0 24 24"><path d="M12 3v18"/><path d="M8 7L3 17h5zM16 7l5 10h-5z"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',
  blk: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h4a2 2 0 012 2v4"/></svg>',
};
function namesList() { return [...new Set(allComps().filter(c => c.name).map(c => c.name))].sort((a, b) => a.localeCompare(b, 'it', { numeric: true })); }
function refreshPanels() {
  document.body.classList.toggle('has-sel', ui.sel.size > 0 && !SIM.on);
  if (SIM.on) { updateSimPanel(); return; }
  renderProps(); refreshCheckBadge(); updateHint();
}
function actsHTML(extra) { return `<div class="acts"><button class="pbtn" data-a="rot">${ICON.rot}Ruota</button><button class="pbtn" data-a="flip">${ICON.flip}Specchia</button><button class="pbtn" data-a="dup">${ICON.copy}Duplica</button>${extra || ''}<button class="pbtn danger" data-a="del">${ICON.del}Elimina</button></div>`; }
function renderProps() {
  const el = $('#props');
  $('#propsTitle').textContent = 'Proprietà';
  const cs = selComps(), ws = selWires();
  if (cs.length === 1 && !ws.length) { el.innerHTML = compPropsHTML(cs[0]); bindCompProps(cs[0]); return; }
  if (cs.length + ws.length > 1) {
    let h = `<div class="sec"><h3>Selezione</h3><p class="note">${cs.length} ${cs.length === 1 ? 'elemento' : 'elementi'} e ${ws.length} ${ws.length === 1 ? 'cavo' : 'cavi'} selezionati.</p>${actsHTML(cs.length ? `<button class="pbtn" data-a="blk">${ICON.blk}Salva come blocco</button>` : '')}</div>`;
    if (ws.length) h += `<div class="sec">${wireColorField(ws)}</div>`;
    el.innerHTML = h; bindActs(el); bindWireColor(el, ws); return;
  }
  if (ws.length === 1) {
    const w = ws[0];
    const nm = r => { const c = cmap().get(r.c); if (!c) return '?'; if (c.type === 'junction') return 'nodo'; return `${c.name || DEF[c.type].label} (${labelOf(c, r.t) || r.t})`; };
    el.innerHTML = `<div class="sec"><h3>Cavo</h3><p class="note">Da ${esc(nm(w.a))} a ${esc(nm(w.b))}.</p>${wireColorField(ws)}<p class="note">Per cambiare percorso, eliminalo e ridisegnalo cliccando i punti di curva.</p><div class="acts"><button class="pbtn" data-a="straight">Raddrizza percorso</button><button class="pbtn danger" data-a="del">${ICON.del}Elimina</button></div></div>`;
    bindActs(el, w); bindWireColor(el, ws); return;
  }
  el.innerHTML = docPropsHTML(); bindDocProps();
}
function wireColorField(ws) {
  const cur = ws.every(w => (w.color || 'auto') === (ws[0].color || 'auto')) ? (ws[0].color || 'auto') : '';
  return `<div class="f"><label for="wCol">Colore del cavo</label><select id="wCol">${cur ? '' : '<option value="" selected>—</option>'}${Object.keys(WIRE_COL).map(k => `<option value="${k}" ${cur === k ? 'selected' : ''}>${k === 'auto' ? 'automatico' : k}</option>`).join('')}</select></div>`;
}
function bindWireColor(el, ws) {
  const s = $('#wCol', el); if (!s) return;
  s.onchange = () => { if (!s.value) return; for (const w of ws) { if (s.value === 'auto') delete w.color; else w.color = s.value; } commit({ keepProps: true }); };
}
function bindActs(el, w) {
  $$('[data-a]', el).forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'rot') rotateSel();
    else if (a === 'flip') flipSel();
    else if (a === 'del') deleteSel();
    else if (a === 'blk') saveSelAsBlock();
    else if (a === 'dup') { if (copySel()) { const m = ui.mouse.in; ui.mouse.in = false; pasteClip(); ui.mouse.in = m; } }
    else if (a === 'straight' && w) { w.pts = []; commit({ keepProps: true }); }
  });
}
const POS_LAB = { sel3: ['I', '0', 'II'], sel3b: ['I', 'II', 'III'] };
const SINGLE_CYL = new Set(['cyl_se', 'clamp', 'vacuum', 'airmotor']);
function propLabel(c, k) {
  const d = DEF[c.type], t = c.type;
  const blink = ['flasher', 'pulsegen', 'l_blink', 'l_pulse'].includes(t);
  const L = {
    pot: 'Collegato a', color: d.shape ? 'Colore' : 'Colore della luce', startOn: 'Chiuso all’avvio della simulazione', rev: 'Senso di rotazione inverso',
    t: blink ? 'Tempo acceso (s)' : t === 'soft' ? 'Durata della rampa (s)' : d.variant === 'onoff' ? 'Ritardo all’eccitazione (s)' : 'Ritardo (s)',
    t2: blink ? 'Tempo spento (s)' : 'Ritardo alla diseccitazione (s)', on: 'Accensione (hh:mm)', off: 'Spegnimento (hh:mm)', preset: 'Valore impostato',
    hz: 'Frequenza di uscita (Hz)', pos: 'Posizione iniziale', val: 'Cifra iniziale (0-9)', a: 'Primo contattore', b: 'Secondo contattore', rows: 'Numero di righe',
    expr: 'Condizione (recettività)', q: 'Tipo di azione', d: 'Ritardo D (s)', l: 'Durata limitata L (s)', cond: 'Condizione C (facoltativa)',
    valve: 'Elettrovalvola', v1: 'Velocità di uscita (%/s)', v2: 'Velocità di rientro (%/s)', plus: 'Pilota uscita', minus: 'Pilota rientro', s0: 'Sensore a riposo', s1: 'Sensore a fine corsa', sm: 'Sensore intermedio',
    vn: 'Tensione nominale', vs: 'Tensione del secondario (V)',
    style: 'Stile', text: 'Testo', size: 'Dimensione', bold: 'Grassetto', dx: 'Lunghezza X', dy: 'Lunghezza Y', w: 'Larghezza', h: 'Altezza', lw: 'Spessore linea', dash: 'Tratteggiata', fill: 'Riempimento',
  };
  return L[k] || k;
}
function propField(c, k) {
  const v = c.props[k], d = DEF[c.type], id = 'pp_' + k, lab = esc(propLabel(c, k));
  const sel = (opts) => `<div class="f"><label for="${id}">${lab}</label><select id="${id}" data-p="${k}" data-k="sel">${opts.map(([val, t]) => `<option value="${esc(val)}" ${String(v) === String(val) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>`;
  const num = (min, max, step) => `<div class="f"><label for="${id}">${lab}</label><input id="${id}" type="number" data-p="${k}" data-k="num" min="${min}" max="${max}" step="${step}" value="${esc(v)}"></div>`;
  const txt = (ph, live) => `<div class="f"><label for="${id}">${lab}</label><input id="${id}" type="text" data-p="${k}" data-k="text"${live ? ' data-live' : ''} value="${esc(v)}" placeholder="${esc(ph || '')}" spellcheck="false" autocomplete="off"></div>`;
  const chk = () => `<label class="chk"><input type="checkbox" id="${id}" data-p="${k}" data-k="bool" ${v ? 'checked' : ''}>${lab}</label>`;
  switch (k) {
    case 'pot': return sel(Object.keys(POT_TXT).map(p => [p, POT_TXT[p] + (p === 'P' ? ' (positivo c.c.)' : p === 'M' ? ' (negativo c.c.)' : '')]));
    case 'color': return sel(Object.keys(d.shape ? SHAPE_COL : LAMP_COL).map(x => [x, x]));
    case 'fill': return sel([['', 'nessuno'], ...Object.keys(SHAPE_COL).map(x => [x, x])]);
    case 'startOn': case 'rev': case 'bold': case 'dash': return chk();
    case 't': case 't2': case 'd': case 'l': return num(0, 3600, k === 't' || k === 't2' ? 0.1 : 0.5);
    case 'preset': return num(1, 9999, 1);
    case 'hz': return num(1, 400, 1);
    case 'vn': return sel(VN_OPTS) + (v ? `<p class="note">In simulazione si brucia sopra ${fmtV(v * 1.2)} V e non funziona sotto ${fmtV(v * 0.8)} V.</p>` : '');
    case 'vs': return num(1, 100000, 1);
    case 'val': return num(0, 9, 1);
    case 'rows': return num(1, 30, 1);
    case 'v1': case 'v2': return num(5, 500, 5);
    case 'size': return num(6, 80, 1);
    case 'lw': return num(0.5, 8, 0.5);
    case 'dx': case 'dy': return num(-2000, 2000, 10);
    case 'w': case 'h': return num(10, 2000, 10);
    case 'on': case 'off': return txt('08:00');
    case 'pos': return sel((POS_LAB[c.type] || ['0', '1', '2']).map((t, i) => [i, t]));
    case 'q': return sel([['N', 'N · continua'], ['S', 'S · memorizza a 1'], ['R', 'R · azzera'], ['P', 'P · impulso']]);
    case 'valve': return SINGLE_CYL.has(c.type) ? '' : sel(Object.entries(VALVES));
    case 'style': return sel([['2D', '2D (piatto)'], ['3D', '3D (in rilievo)']]);
    case 'text': return `<div class="f"><label for="pText">${lab}</label><textarea id="pText" data-p="text" data-k="text" data-live>${esc(v)}</textarea></div>`;
    case 'src': return `<div class="acts"><button class="pbtn" data-a="img">Cambia immagine…</button></div>`;
    case 'expr': case 'cond': {
      let err = '';
      if (String(v || '').trim() || k === 'expr') { try { grParse(v); } catch (e) { err = e.message; } }
      return txt(k === 'expr' ? 'es. S1*a0' : 'es. B1', true) + `<p class="note${err ? ' bad' : ''}" data-err="${k}">${err ? 'Errore: ' + esc(err) : k === 'expr' ? '* = E · + = O · / = NON · FP(x) fronte di salita · t/1/5 = tappa 1 attiva da 5 s' : ''}</p>`;
    }
    case 'plus': case 'minus': case 's0': case 's1': case 'sm': { const N = pneuNames(Object.assign({}, c, { props: Object.assign({}, c.props, { [k]: '' }) })); return txt(N[k] || 'nessuno', true); }
    default: return txt('', true);
  }
}
function compPropsHTML(c) {
  const d = DEF[c.type];
  let h = `<div class="sec"><div class="kind"><div class="pv">${c.type === 'image' && c.props.src ? `<img src="${esc(c.props.src)}" alt="">` : previewSVG(c.type, c.props, 0)}</div><div><b>${esc(d.label)}</b><small>${esc(d.desc || '')}</small></div></div></div>`;
  if (!d.noName && !d.shape) {
    const show = c.showName != null ? c.showName : d.showName !== false;
    const nl = d.grStep ? 'Numero della tappa' : d.grAct ? 'Uscita comandata' : d.ladder ? 'Indirizzo o bit' : (d.netGroup ? 'Nome del collegamento' : c.type === 'plc_di' || c.type === 'plc_do' ? 'Indirizzo' : d.pneu ? 'Nome del cilindro' : 'Sigla');
    h += `<div class="sec"><div class="f"><label for="pName">${nl}</label><input id="pName" type="text" list="dlNames" value="${esc(c.name)}" placeholder="es. ${esc(d.prefix || '')}1" autocomplete="off" spellcheck="false"><datalist id="dlNames">${namesList().map(n => `<option value="${esc(n)}">`).join('')}</datalist></div>${d.nameAt && d.showName !== false ? `<label class="chk"><input type="checkbox" id="pShow" ${show ? 'checked' : ''}>Mostra la sigla sul foglio</label>` : ''}${linkInfoHTML(c)}</div>`;
  }
  const keys = Object.keys(c.props || {}).filter(k => k in (d.props || {}));
  if (keys.length) {
    let f = keys.map(k => propField(c, k)).join('');
    if (d.pneu) { const N = pneuNames(c); f = `<p class="note">Piloti <b>${esc(N.plus)}</b>${SINGLE_CYL.has(c.type) ? '' : ` / <b>${esc(N.minus)}</b>`} · sensori <b>${esc(N.s0)}</b> / <b>${esc(N.s1)}</b>. Usa questi nomi per bobine, sensori e GRAFCET.</p>` + f; }
    if (d.fv) f = '<p class="note">Si collega allo schema tramite la sigla: deve essere uguale a quella del componente reale.</p>' + f;
    h += `<div class="sec"><h3>Impostazioni</h3>${f}</div>`;
  }
  h += supplyVoltHTML(c);
  const ts = termsOf(c);
  if (ts.length && d.termLabels !== false && !d.noName && !d.boxDev) h += `<div class="sec"><h3>Morsetti</h3><div class="terms">${ts.map(t => `<div class="f"><input type="text" data-term="${esc(t.id)}" value="${esc(labelOf(c, t.id))}" aria-label="Morsetto ${esc(t.id)}" spellcheck="false"></div>`).join('')}</div>${c.autoLab ? '<p class="note">Numerazione automatica in base alla sigla.</p>' : ''}</div>`;
  h += `<div class="sec">${actsHTML()}</div>`;
  return h;
}
// tensioni di alimentazione modificabili direttamente dal simbolo della sorgente (valgono per tutto lo schema)
function supplyKinds(c) {
  const d = DEF[c.type];
  if (!d.sim || !d.sim.src || d.sim.sys || c.type === 'rectb' || /^psu/.test(c.type)) return new Set();
  let out = null;
  try { out = d.sim.src(c, { dev: () => ({}), sysPots: () => [], plcRun: () => true, disp() {}, pots: () => [] }); } catch (e) { out = null; }
  return new Set(Object.values(out || {}).filter(p => p != null && POTS[p]).map(p => POTS[p].sys));
}
function voltFieldsHTML(kinds, M) {
  let h = '';
  if (kinds.has('mains')) h += `<div class="f"><label for="vVc">Tensione di rete concatenata (V)</label><input id="vVc" type="number" min="1" max="100000" step="1" value="${esc(M.vc)}"></div><p class="note">Fase-neutro: ${fmtV(vLN(+M.vc || 400))} V. Vale per tutte le alimentazioni L1, L2, L3, N dello schema.</p>`;
  if (kinds.has('dc')) h += `<div class="f"><label for="vVdc">Tensione continua (V)</label><input id="vVdc" type="number" min="0.1" max="100000" step="0.1" value="${esc(M.vdc)}"></div><p class="note">Vale per tutte le alimentazioni +/0 V, batterie e alimentatori dello schema.</p>`;
  return h;
}
function supplyVoltHTML(c) { const k = supplyKinds(c); return k.size ? `<div class="sec"><h3>Tensione di alimentazione</h3>${voltFieldsHTML(k, doc.meta)}</div>` : ''; }
function bindVoltFields() {
  for (const [id, f, def] of [['#vVc', 'vc', 400], ['#vVdc', 'vdc', 24]]) {
    const el = $(id); if (!el) continue;
    el.addEventListener('change', () => { let v = parseFloat(String(el.value).replace(',', '.')); if (!Number.isFinite(v) || v <= 0) v = def; doc.meta[f] = clamp(v, 0.1, 100000); commit(); });
  }
}
function linkInfoHTML(c) {
  const k = key(c.name); if (!k) return '';
  const same = allComps().filter(o => o.id !== c.id && key(o.name) === k && !DEF[o.type].noName && !DEF[o.type].shape);
  const d = DEF[c.type];
  if (!same.length) {
    if (d.isCoil || d.thermal) return `<p class="note">Nessun altro elemento con sigla ${esc(c.name)}.</p>`;
    if (d.form && !d.act) return `<p class="note bad">Nessuna bobina o comando con sigla ${esc(c.name)}: questo contatto non si muoverà.</p>`;
    return '';
  }
  const multi = doc.pages.length > 1;
  return `<div class="f"><label>Stessa sigla (${same.length})</label><ul class="links">${same.slice(0, 24).map(o => `<li data-go="${o.id}"><span>${esc(DEF[o.type].label)}</span><span class="m">${esc(termsOf(o).map(t => labelOf(o, t.id)).filter(Boolean).slice(0, 4).join('-'))}${multi ? ` · f.${pageOf(o.id) + 1}` : ''}</span></li>`).join('')}</ul></div>`;
}
function bindCompProps(c) {
  const el = $('#props');
  bindVoltFields();
  const n = $('#pName', el);
  if (n) {
    n.addEventListener('input', () => { c.name = n.value.trim(); render(); });
    n.addEventListener('change', () => { c.name = n.value.trim(); if (c.autoLab) assignLabels(c, allComps()); noteRecent(c); commit(); });
  }
  const sh = $('#pShow', el); if (sh) sh.onchange = () => { c.showName = sh.checked; commit({ keepProps: true }); };
  $$('[data-p]', el).forEach(inp => {
    const k = inp.dataset.p, kind = inp.dataset.k;
    const read = () => {
      if (kind === 'bool') return inp.checked;
      if (kind === 'num') { let v = parseFloat(String(inp.value).replace(',', '.')); if (!Number.isFinite(v)) v = +DEF[c.type].props[k] || 0; v = clamp(v, +inp.min, +inp.max); inp.value = v; return v; }
      if (kind === 'sel') return k === 'pos' ? +inp.value : inp.value;
      return k === 'text' ? inp.value : inp.value.trim();
    };
    if (inp.hasAttribute('data-live')) inp.addEventListener('input', () => {
      c.props[k] = kind === 'text' && k !== 'text' ? inp.value.trim() : inp.value; render();
      const er = $(`[data-err="${k}"]`, el);
      if (er) { let m = ''; if (String(c.props[k] || '').trim() || k === 'expr') { try { grParse(c.props[k]); } catch (e) { m = e.message; } } er.textContent = m ? 'Errore: ' + m : (k === 'expr' ? '* = E · + = O · / = NON · FP(x) fronte di salita · t/1/5 = tappa 1 attiva da 5 s' : ''); er.classList.toggle('bad', !!m); }
    });
    inp.addEventListener('change', () => { c.props[k] = read(); commit({ keepProps: kind !== 'sel' && kind !== 'bool' }); });
  });
  $$('[data-term]', el).forEach(inp => {
    inp.addEventListener('input', () => { c.labels = Object.assign({}, c.labels, { [inp.dataset.term]: inp.value }); c.autoLab = false; render(); });
    inp.addEventListener('change', () => commit({ keepProps: true }));
  });
  $$('[data-go]', el).forEach(li => li.onclick = () => focusComp(li.dataset.go));
  const im = $('[data-a="img"]', el);
  if (im) im.onclick = () => { ui.replaceImg = c.id; $('#imgIn').click(); };
  bindActs(el);
}
function focusComp(id) {
  const c = cmap().get(id); if (!c) return;
  const pi = pageOf(id);
  if (pi !== doc.page) { doc.page = pi; renderTabs(); }
  ui.sel = new Set([id]);
  const r = stageRect(), b = boxW(c);
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  if (ui.view.z < 1.2) ui.view.z = 1.6;
  ui.userView = true;
  ui.view.x = r.width / 2 - cx * ui.view.z; ui.view.y = r.height / 2 - cy * ui.view.z;
  if (window.innerWidth <= 860 && !SIM.on) $('#propsPanel').classList.add('open');
  refreshPanels(); render();
}
function docPropsHTML() {
  const M = doc.meta, multi = doc.pages.length > 1;
  const ck = (id, on, t) => `<label class="chk"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}>${t}</label>`;
  return `<div class="sec"><h3>Foglio e cartiglio</h3>
    <div class="f"><label for="mSheet">Formato</label><select id="mSheet">${Object.keys(SHEETS).map(k => `<option value="${k}" ${M.sheet === k ? 'selected' : ''}>${SHEETS[k].label}</option>`).join('')}</select></div>
    <div class="f"><label for="mTitle">Titolo</label><input id="mTitle" type="text" value="${esc(M.title)}"></div>
    <div class="f"><label for="mAuthor">Disegnato da</label><input id="mAuthor" type="text" value="${esc(M.author)}"></div>
    <div class="f"><label for="mSchool">Scuola / classe</label><input id="mSchool" type="text" value="${esc(M.school)}"></div>
    <div class="row2"><div class="f"><label for="mDate">Data</label><input id="mDate" type="text" value="${esc(M.date)}"></div>${multi ? '' : `<div class="row2"><div class="f"><label for="mNum">Foglio</label><input id="mNum" type="text" value="${esc(M.num)}"></div><div class="f"><label for="mOf">di</label><input id="mOf" type="text" value="${esc(M.of)}"></div></div>`}</div>
  </div>
  <div class="sec"><h3>Opzioni di disegno</h3>
    ${ck('mGrid', M.grid !== false, 'Griglia di punti')}${ck('mTb', M.tb !== false, 'Cartiglio')}${ck('mDash', M.dash !== false, 'Sigle con trattino (-KM1)')}${ck('mXref', !!M.xref, 'Riferimenti incrociati accanto alle bobine')}${ck('mWnum', !!M.wnum, 'Numerazione dei conduttori')}
    <div class="f"><label for="mWcol">Colore dei nuovi cavi</label><select id="mWcol">${Object.keys(WIRE_COL).map(k => `<option value="${k}" ${(ui.wireColor || 'auto') === k ? 'selected' : ''}>${k === 'auto' ? 'automatico' : k}</option>`).join('')}</select></div>
  </div>
  <div class="sec"><h3>Simulazione</h3>
    ${voltFieldsHTML(new Set(['mains', 'dc']), M)}
    <div class="f"><label for="mClock">Ora iniziale dell’orologio (interruttori orari)</label><input id="mClock" type="text" value="${esc(M.clock || '08:00')}" placeholder="08:00"></div>
    <p class="note">Durante la simulazione l’orologio avanza di 1 minuto per ogni secondo (×1). Vengono simulati tutti i fogli insieme: elementi con la stessa sigla su fogli diversi lavorano insieme.</p>
  </div>
  <div class="sec"><h3>Fogli (${doc.pages.length})</h3><ul class="links">${doc.pages.map((p, i) => `<li data-pgo="${i}"><span>${i + 1}. ${esc(p.name)}</span><span class="m">${p.comps.filter(c => c.type !== 'junction').length} el.</span></li>`).join('')}</ul><div class="acts"><button class="pbtn" id="mAddPg">Nuovo foglio</button><button class="pbtn" id="mRenPg">Rinomina questo</button></div></div>
  <div class="sec"><h3>Come si usa</h3>
    <p class="note">Trascina un simbolo dalla libreria sul foglio, poi clicca su un morsetto e su un altro per collegarli. Gli elementi con la stessa sigla lavorano insieme: la bobina KM1 muove tutti i contatti KM1, anche su fogli diversi.</p>
    <div class="acts"><button class="pbtn" id="mHelp">Guida e scorciatoie da tastiera</button></div>
  </div>`;
}
function bindDocProps() {
  const M = doc.meta;
  const bind = (id, f, live) => {
    const el = $(id); if (!el) return;
    if (live) el.addEventListener('input', () => { M[f] = el.value; render(); });
    el.addEventListener('change', () => { M[f] = el.type === 'checkbox' ? el.checked : el.value; commit({ keepProps: true }); if (f === 'sheet') fitView(); });
  };
  bind('#mTitle', 'title', true); bind('#mAuthor', 'author', true); bind('#mSchool', 'school', true); bind('#mDate', 'date', true);
  bind('#mNum', 'num', true); bind('#mOf', 'of', true); bind('#mSheet', 'sheet');
  bind('#mGrid', 'grid'); bind('#mTb', 'tb'); bind('#mDash', 'dash'); bind('#mXref', 'xref'); bind('#mWnum', 'wnum');
  bindVoltFields();
  const ck = $('#mClock');
  if (ck) ck.onchange = () => { const m = /^(\d{1,2})[:.](\d{2})$/.exec(ck.value.trim()); if (!m || +m[1] > 23 || +m[2] > 59) { toast('Scrivi l’ora come hh:mm, ad esempio 08:00.', 'err'); ck.value = M.clock || '08:00'; return; } M.clock = m[1].padStart(2, '0') + ':' + m[2]; ck.value = M.clock; commit({ keepProps: true }); };
  const wc = $('#mWcol'); if (wc) wc.onchange = () => { ui.wireColor = wc.value; };
  $$('[data-pgo]').forEach(li => li.onclick = () => switchPage(+li.dataset.pgo));
  const mh = $('#mHelp'); if (mh) mh.onclick = openHelp;
  const ap = $('#mAddPg'); if (ap) ap.onclick = addPage;
  const rp = $('#mRenPg'); if (rp) rp.onclick = () => renamePage(doc.page);
}

/* ---------- simulation panel ---------- */
function manualKeys() {
  const out = [], seen = new Set();
  for (const c of allComps()) {
    const d = DEF[c.type];
    if (!d.act || d.act === 'key') continue;
    const k = nkey(c);
    if (!DEVICE_ACTS.has(d.act) && SIM.claimed.has(k)) continue;
    const sk = k + '|' + d.act;
    if (seen.has(sk) || (d.fv && out.some(o => o.k === k))) continue;
    seen.add(sk); out.push({ k, c, mode: d.act });
  }
  return out.sort((a, b) => (a.c.name || '').localeCompare(b.c.name || '', 'it', { numeric: true }));
}
function uniqBy(arr, f) { const s = new Set(); return arr.filter(x => { const k = f(x); if (s.has(k)) return false; s.add(k); return true; }); }
function plcBits() {
  const set = new Set();
  for (const c of allComps()) {
    const d = DEF[c.type];
    if (d.ladder && c.name && c.type !== 'lad_fs') set.add(key(c.name));
    if (d.plc && d.addr) { d.addr.di.forEach(a => set.add(key(a))); d.addr.dq.forEach(a => set.add(key(a))); }
    if ((c.type === 'plc_di' || c.type === 'plc_do') && c.name) set.add(key(c.name));
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
}
function buildSimPanel() {
  const el = $('#props');
  $('#propsTitle').textContent = 'Simulazione';
  const all = allComps();
  const man = manualKeys();
  const coils = uniqBy(all.filter(c => DEF[c.type].isCoil && c.type !== 'lad_coil'), nkey);
  const motors = all.filter(c => DEF[c.type].motor);
  const cyls = all.filter(c => DEF[c.type].pneu);
  const sigs = all.filter(c => DEF[c.type].signal || c.type === 'led' || c.type === 'l_led');
  const cpus = all.filter(c => DEF[c.type].cpu);
  const bits = plcBits();
  const steps = all.filter(c => DEF[c.type].grStep);
  const clock = all.some(c => c.type === 'timesw');
  let h = '<div class="sec"><p class="note">Aziona i comandi sul foglio o da qui. Cavi rossi: in tensione (fase o +24 V). Blu: neutro o 0 V.</p>';
  if (clock) h += '<div class="srow"><span class="nm">Ora</span><span class="ds mono" data-clock></span></div>';
  h += '</div>';
  h += '<div class="sec"><h3>Comandi</h3><div class="stat">';
  if (!man.length) h += '<p class="empty">Nessun comando manuale nello schema.</p>';
  for (const m of man) h += `<div class="srow"><span class="nm">${esc(m.c.name || '—')}</span><span class="ds">${esc(DEF[m.c.type].label)}</span><button class="ctl" data-ctl="${esc(m.k)}" data-mode="${m.mode}" data-cid="${m.c.id}"></button></div>`;
  h += '</div></div>';
  if (coils.length) {
    h += '<div class="sec"><h3>Bobine e temporizzatori</h3><div class="stat">';
    for (const c of coils) h += `<div class="srow" data-coil="${c.id}"><span class="led"></span><span class="nm">${esc(c.name || '—')}</span><span class="ds"><span data-txt></span>${DEF[c.type].variant === 'on' || DEF[c.type].variant === 'off' || DEF[c.type].variant === 'onoff' ? '<div class="tbar"><i style="width:0%"></i></div>' : ''}</span></div>`;
    h += '</div></div>';
  }
  if (motors.length || cyls.length) {
    h += '<div class="sec"><h3>Attuatori</h3><div class="stat">';
    for (const c of motors) h += `<div class="srow" data-mot="${c.id}"><span class="led"></span><span class="nm">${esc(c.name || '—')}</span><span class="ds" data-txt></span></div>`;
    for (const c of cyls) h += `<div class="srow" data-cyl="${c.id}"><span class="led"></span><span class="nm">${esc(c.name || '—')}</span><span class="ds"><span data-txt></span><div class="tbar"><i style="width:0%"></i></div></span></div>`;
    h += '</div></div>';
  }
  if (sigs.length) {
    h += '<div class="sec"><h3>Segnalazioni</h3><div class="stat">';
    for (const c of sigs) h += `<div class="srow" data-sig="${c.id}"><span class="led"></span><span class="nm">${esc(c.name || '—')}</span><span class="ds" data-txt></span></div>`;
    h += '</div></div>';
  }
  if (cpus.length || bits.length) {
    h += '<div class="sec"><h3>PLC</h3>';
    if (cpus.length) h += `<div class="stat">${cpus.map(c => `<div class="srow" data-cpu="${c.id}"><span class="led"></span><span class="nm">${esc(c.name || 'CPU')}</span><span class="ds" data-txt></span><button class="ctl" data-ctl="${esc(nkey(c))}" data-mode="run" data-cid="${c.id}"></button></div>`).join('')}</div>`;
    if (bits.length) h += `<div class="bits">${bits.map(b => `<span class="bit" data-bit="${esc(b)}">${esc(b)}</span>`).join('')}</div>`;
    h += '</div>';
  }
  if (steps.length) {
    h += `<div class="sec"><h3>GRAFCET</h3><div class="bits">${steps.map(c => `<span class="bit step" data-step="${c.id}">X${esc(c.name || '?')}</span>`).join('')}</div><p class="note" data-grinfo></p></div>`;
  }
  el.innerHTML = h;
  $$('.ctl', el).forEach(b => {
    const k = b.dataset.ctl, mode = b.dataset.mode;
    if (mode === 'mom') {
      b.addEventListener('pointerdown', e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (er) { /* capture unsupported */ } doAct(k, 'mom', true); });
      const up = () => doAct(k, 'mom', false);
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      b.addEventListener('keydown', e => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); doAct(k, 'mom', true); } });
      b.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') doAct(k, 'mom', false); });
    } else b.addEventListener('click', () => doAct(k, mode, true));
  });
  updateSimPanel();
}
function ctlText(c, mode, k) {
  const S = SIM.S, d = DEF[c.type];
  if (mode === 'mom') return manOn(k) ? ['Premuto', 'on'] : ['Tieni premuto', ''];
  if (mode === 'fuse') return S.blown[k] ? ['Sostituisci', 'trip'] : ['Integro', 'on'];
  if (mode === 'sfu') return S.blown[k] ? ['Sostituisci', 'trip'] : S.man[k] ? ['Chiuso', 'on'] : ['Aperto', ''];
  if (mode === 'pos3') { const p = S.pos[k] != null ? S.pos[k] : (c.props.pos != null ? +c.props.pos : (c.type === 'sel3' ? 1 : 0)); return [`Posizione ${(POS_LAB[c.type] || [])[p] || p}`, p === (c.type === 'sel3' ? 1 : -1) ? '' : 'on']; }
  if (mode === 'digit') { const v = S.digit[k] != null ? S.digit[k] : (+c.props.val || 0); return [`Cifra ${v}`, 'on']; }
  if (mode === 'beam') return S.blocked[k] ? ['Interrotto', 'trip'] : ['Libero', 'on'];
  if (mode === 'run') return S.run[k] === false ? ['STOP', 'trip'] : ['RUN', 'on'];
  const on = !!S.man[k];
  if (d.thermal === 'ol') return on ? ['Scattato', 'trip'] : ['Armato', 'on'];
  if (d.protective === 'breaker' || d.fv) return S.trip[k] && !on ? ['Scattato', 'trip'] : on ? ['Chiuso', 'on'] : ['Aperto', ''];
  if (d.head === 'em') return on ? ['Premuto', 'trip'] : ['Riarmato', ''];
  if (d.sensor) return on ? ['Rileva', 'on'] : ['Libero', ''];
  return on ? ['Azionato', 'on'] : ['A riposo', ''];
}
function updateSimPanel() {
  if (!SIM.on || !SIM.S) return;
  const el = $('#props'), S = SIM.S;
  const ck = $('[data-clock]', el); if (ck) ck.textContent = fmtClock(S.clock);
  $$('.ctl', el).forEach(b => { const c = cmap().get(b.dataset.cid); if (!c) return; const [t, cls] = ctlText(c, b.dataset.mode, b.dataset.ctl); b.textContent = t; b.className = 'ctl' + (cls ? ' ' + cls : ''); });
  $$('[data-coil]', el).forEach(r => {
    const c = cmap().get(r.dataset.coil); if (!c) return;
    const d = DEF[c.type], k = nkey(c), st = SIM.disp[c.id] || {};
    const on = !!(st.on || st.s);
    r.querySelector('.led').className = 'led' + (on ? ' on' : '');
    let txt = on ? 'eccitata' : 'diseccitata';
    const tm = S.tmr[k];
    if (tm) txt += tm.on || tm.off || tm.onoff ? ' · contatti commutati' : '';
    if (st.rem != null) txt += d.variant === 'off' || (d.variant === 'onoff' && !st.on) ? ` · rilascia tra ${fmtNum(st.rem)} s` : ` · commuta tra ${fmtNum(st.rem)} s`;
    if (c.type === 'counter') txt += ` · conteggio ${st.n || 0}/${c.props.preset}`;
    if (c.type === 'coil_tele' || c.type === 'coil_bist') txt = S.lat[k] ? 'contatti azionati' : 'contatti a riposo';
    if (d.variant === 'fl' || d.variant === 'pulse' || d.variant === 'clock') txt += st.q ? ' · uscita chiusa' : '';
    r.querySelector('[data-txt]').textContent = txt;
    const bar = r.querySelector('.tbar i');
    if (bar) { const tot = d.variant === 'off' || (d.variant === 'onoff' && !st.on) ? (+c.props.t2 || +c.props.t || 1) : (+c.props.t || 1); bar.style.width = (st.rem != null ? Math.round(clamp(1 - st.rem / tot, 0, 1) * 100) : (tm && (tm.on || tm.onoff) ? 100 : 0)) + '%'; }
  });
  $$('[data-mot]', el).forEach(r => {
    const st = SIM.disp[r.dataset.mot] || {};
    r.querySelector('.led').className = 'led' + (st.run ? ' g' : st.two ? ' on' : '');
    r.querySelector('[data-txt]').textContent = st.run ? `gira in senso ${st.dir < 0 ? 'antiorario' : 'orario'}${st.mode ? ' · ' + st.mode : ''}${st.hz && st.hz !== 50 ? ` · ${fmtNum(st.hz)} Hz` : ''}` : st.two ? 'alimentato su 2 fasi: non parte' : 'fermo';
  });
  $$('[data-cyl]', el).forEach(r => {
    const st = SIM.disp[r.dataset.cyl] || {}, p = st.p || 0;
    r.querySelector('.led').className = 'led' + (st.moving ? ' on' : p >= 0.999 ? ' g' : '');
    r.querySelector('[data-txt]').textContent = st.spin ? (st.spin > 0 ? 'gira' : 'gira al contrario') : st.moving ? (st.plus && !st.minus ? 'in uscita' : 'in rientro') : p >= 0.999 ? 'tutto fuori' : p <= 0.001 ? 'a riposo' : `fermo al ${Math.round(p * 100)}%`;
    const bar = r.querySelector('.tbar i'); if (bar) bar.style.width = Math.round(p * 100) + '%';
  });
  $$('[data-sig]', el).forEach(r => {
    const st = SIM.disp[r.dataset.sig] || {}, c = cmap().get(r.dataset.sig); if (!c) return;
    const led = r.querySelector('.led');
    const lit = st.on && (c.type !== 'lamp_fl' || st.blink);
    led.className = 'led'; led.style.background = lit ? (LAMP_COL[c.props.color] || '#c2611f') : ''; led.style.boxShadow = lit ? '0 0 0 3px rgba(0,0,0,.08)' : '';
    const sound = c.type === 'horn' || c.type === 'buzzer';
    r.querySelector('[data-txt]').textContent = st.on ? (sound ? 'suona' : c.type === 'lamp_fl' ? 'lampeggia' : 'accesa') : (sound ? 'muta' : 'spenta');
  });
  $$('[data-cpu]', el).forEach(r => {
    const c = cmap().get(r.dataset.cpu), st = SIM.disp[r.dataset.cpu] || {};
    const run = st.on && S.run[nkey(c)] !== false;
    r.querySelector('.led').className = 'led' + (run ? ' g' : st.on ? ' on' : '');
    r.querySelector('[data-txt]').textContent = !st.on ? 'non alimentata' : run ? 'programma in esecuzione' : 'in STOP';
  });
  $$('[data-bit]', el).forEach(b => b.classList.toggle('on', !!S.out[b.dataset.bit]));
  if (SIM.gr) {
    $$('[data-step]', el).forEach(b => b.classList.toggle('on', SIM.gr.active.has(b.dataset.step)));
    const gi = $('[data-grinfo]', el);
    if (gi) { const act = SIM.gr.steps.filter(s => SIM.gr.active.has(s.c.id)); gi.textContent = act.length ? 'Attive: ' + act.map(s => `X${s.c.name} (${fmtNum(SIM.gr.stepT[s.c.id] || 0)} s)`).join(', ') : 'Nessuna tappa attiva.'; }
  }
}

/* ---------- verification ---------- */
function verify() {
  const out = [], all = allComps();
  const nm = c => c.name ? (doc.meta.dash !== false && !DEF[c.type].ladder ? '-' : '') + c.name : DEF[c.type].label;
  const real = all.filter(c => !DEF[c.type].shape && c.type !== 'junction');
  if (!real.length) return [{ lv: 'info', msg: 'Lo schema è vuoto: trascina i componenti dalla libreria.', ids: [] }];
  const hasSrc = all.some(c => DEF[c.type].sim && DEF[c.type].sim.src);
  const needsSrc = all.some(c => { const d = DEF[c.type]; return d.sim && d.sim.eval && !d.ladder && d.cat !== 'grafcet'; });
  if (!hasSrc && needsSrc) out.push({ lv: 'err', msg: 'Manca un’alimentazione: aggiungi fasi e neutro, oppure +24 V e 0 V.', ids: [] });
  doc.pages.forEach(pg => {
    const conn = connInfo(pg), open = new Map();
    for (const g of conn.groups.values()) if (g.br <= 1) for (const k of g.keys) { const [cid, tid] = k.split('|'); if (!open.has(cid)) open.set(cid, []); open.get(cid).push(tid); }
    for (const [cid, tids] of open) {
      const c = cmap().get(cid); if (!c) continue;
      const d = DEF[c.type];
      if (c.type === 'junction') { out.push({ lv: 'warn', msg: 'Cavo che termina nel vuoto.', ids: [cid] }); continue; }
      if (d.boxDev || d.netGroup || c.type === 'lad_rail_l' || c.type === 'lad_rail_r' || (d.cat === 'src' && d.sim && d.sim.src && !d.sim.eval)) continue;
      const t2 = tids.filter(t => !((d.grStep && t === 'act') || (d.grAct && t === 'next')));
      if (!t2.length) continue;
      const labs = t2.map(t => labelOf(c, t) || t);
      if (d.motor && labs.every(l => l === 'PE')) { out.push({ lv: 'info', msg: `${nm(c)}: conduttore di protezione PE non collegato.`, ids: [cid] }); continue; }
      out.push({ lv: 'warn', msg: `${nm(c)} (${d.label}): ${labs.length === 1 ? 'morsetto' : 'morsetti'} ${labs.join(', ')} non ${labs.length === 1 ? 'collegato' : 'collegati'}.`, ids: [cid] });
    }
  });
  const drivers = new Set(), byKey = new Map();
  for (const c of all) { claimsOf(c).forEach(k => drivers.add(k)); if (DEF[c.type].act) drivers.add(nkey(c)); const k = key(c.name); if (k) { if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(c); } }
  for (const c of all) {
    const d = DEF[c.type], k = key(c.name);
    const named = d.form || d.isCoil || /^km\dp$/.test(c.type) || (d.ladder && c.type !== 'lad_fs') || d.grAct;
    if (!k) { if (named && !d.noName) out.push({ lv: 'warn', msg: `${d.label} senza sigla.`, ids: [c.id] }); continue; }
    const consumer = (d.form && !d.act) || /^km\dp$/.test(c.type) || (d.ladder && d.sim && d.sim.links && c.type !== 'lad_fs');
    if (consumer && !drivers.has(k)) out.push({ lv: 'warn', msg: d.ladder ? `Il bit ${c.name} non è comandato da nessun ingresso, bobina o tappa.` : `${nm(c)}: nessuna bobina o comando con questa sigla, il contatto non si muoverà.`, ids: [c.id] });
    if (d.timing && !(byKey.get(k) || []).some(o => ['on', 'off', 'onoff'].includes(DEF[o.type].variant))) out.push({ lv: 'warn', msg: `${nm(c)} è un contatto ritardato ma ${c.name} non è un temporizzatore.`, ids: [c.id] });
    if (d.act && !DEVICE_ACTS.has(d.act) && !d.fv && (byKey.get(k) || []).some(o => DEF[o.type].isCoil)) out.push({ lv: 'warn', msg: `${nm(c)}: un comando manuale ha la stessa sigla di una bobina.`, ids: [c.id] });
  }
  for (const group of byKey.values()) {
    const coils = group.filter(o => DEF[o.type].isCoil);
    if (coils.length > 1) out.push({ lv: 'warn', msg: `Ci sono ${coils.length} bobine con sigla ${coils[0].name}.`, ids: coils.map(c => c.id) });
    const mot = group.filter(o => DEF[o.type].motor);
    if (mot.length > 1) out.push({ lv: 'info', msg: `${mot.length} motori hanno la sigla ${mot[0].name}.`, ids: mot.map(c => c.id) });
  }
  const steps = all.filter(c => DEF[c.type].grStep);
  if (steps.length && !steps.some(c => DEF[c.type].initial)) out.push({ lv: 'warn', msg: 'Il GRAFCET non ha una tappa iniziale.', ids: steps.map(c => c.id) });
  const sn = new Map(); for (const s of steps) { const k = key(s.name); if (sn.has(k)) out.push({ lv: 'warn', msg: `Due tappe hanno il numero ${s.name}.`, ids: [sn.get(k), s.id] }); else sn.set(k, s.id); }
  for (const c of all) {
    const d = DEF[c.type];
    if (d.grTrans) { try { grParse(c.props.expr); } catch (e) { out.push({ lv: 'err', msg: `Transizione “${c.props.expr}”: ${e.message}.`, ids: [c.id] }); } }
    if (d.grAct && c.props.cond) { try { grParse(c.props.cond); } catch (e) { out.push({ lv: 'err', msg: `Azione ${c.name}: condizione non valida.`, ids: [c.id] }); } }
  }
  if (all.some(c => c.type === 'lad_rail_l') && !all.some(c => c.type === 'lad_rail_r')) out.push({ lv: 'warn', msg: 'Il ladder ha la barra sinistra ma manca la barra di ritorno destra.', ids: [] });
  return out;
}
function refreshCheckBadge() {
  const b = $('#chkBadge'); if (!b) return;
  const v = verify(), err = v.filter(i => i.lv === 'err').length, warn = v.filter(i => i.lv === 'warn').length;
  b.textContent = err + warn;
  b.className = 'badge' + (err ? ' err' : warn ? '' : ' ok');
}
function openCheck() {
  const v = verify(), lvT = { err: 'Errore', warn: 'Avviso', info: 'Nota' };
  const body = v.length ? `<ul class="issues">${v.map((i, n) => `<li data-n="${n}"><span class="lv ${i.lv}">${lvT[i.lv]}</span><span>${esc(i.msg)}</span></li>`).join('')}</ul>` : '<p class="note" style="font-size:13px">Nessun problema trovato: tutti i morsetti sono collegati e ogni contatto ha il suo comando.</p>';
  const m = modal('Verifica dello schema', body);
  $$('.issues li', m).forEach(li => li.onclick = () => { const i = v[+li.dataset.n]; closeModal(); if (i.ids.length) { focusComp(i.ids[0]); ui.sel = new Set(i.ids.filter(id => pageOf(id) === doc.page)); refreshPanels(); render(); } });
}

/* ---------- mode UI ---------- */
function updateModeUI() {
  const on = SIM.on;
  $$('.edit-only').forEach(e => { e.hidden = on; });
  $$('.sim-only').forEach(e => { e.hidden = !on; });
  const b = $('#bSim');
  b.classList.toggle('stop', on);
  b.innerHTML = on ? '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg><span>Ferma</span>' : '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg><span>Simula</span>';
  $('#simtag').hidden = !on;
  $('#simtag').classList.toggle('paused', on && SIM.paused);
  $('#simtagT').textContent = SIM.paused ? 'IN PAUSA' : 'SIMULAZIONE';
  const p = $('#bPause');
  if (p) { p.classList.toggle('on', SIM.paused); p.querySelector('span').textContent = SIM.paused ? 'Riprendi' : 'Pausa'; }
  $('#libList').classList.toggle('lib-dim', on);
  $('#stMode').textContent = on ? (SIM.paused ? 'Simulazione in pausa' : 'Simulazione') : 'Modifica';
  renderTabs();
  updateHint();
}
function toggleSim() { if (SIM.on) stopSim(); else startSim(); }
function togglePause() { if (!SIM.on) return; SIM.paused = !SIM.paused; SIM.lastT = performance.now(); updateModeUI(); }
function stepOnce() {
  if (!SIM.on) return;
  if (!SIM.paused) { SIM.paused = true; updateModeUI(); }
  step(0.1);
  render(); updateSimPanel();
}
