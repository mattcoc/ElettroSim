/* ElettroSim · Impostazioni: tema, colore, pannelli, preferenze dell'editor e della simulazione, aggiornamenti. */
'use strict';
const PREF_DEF = { theme: 'auto', accent: 'rame', lib: true, props: true, libW: 0, propsW: 0, hints: true, startup: 'last', updates: true, speed: 1, vc: 400, vdc: 24, wireColor: 'auto' };
const PREFS = (() => { try { return Object.assign({}, PREF_DEF, JSON.parse(localStorage.getItem('elettrosim.prefs') || '{}')); } catch (e) { return Object.assign({}, PREF_DEF); } })();
function savePrefs() { LS.set('elettrosim.prefs', JSON.stringify(PREFS)); }
const ACCENTS = [['rame', '#b4581c', 'Rame'], ['blu', '#2160e0', 'Blu'], ['viola', '#7c3aed', 'Viola'], ['verde', '#0f766e', 'Verde acqua'], ['rosa', '#c0266e', 'Lampone']];
const isNarrow = () => window.innerWidth <= 860;
// la versione web si aggiorna da sola a ogni apertura: gli avvisi di aggiornamento servono solo al programma desktop
const IS_DESKTOP = !!window.elettroDesktop;

function applyPrefs() {
  const r = document.documentElement;
  if (PREFS.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', PREFS.theme);
  if (PREFS.accent === 'rame') r.removeAttribute('data-accent'); else r.setAttribute('data-accent', PREFS.accent);
  for (const [k, v] of [['--lib-w', PREFS.libW], ['--props-w', PREFS.propsW]]) { if (v) r.style.setProperty(k, v + 'px'); else r.style.removeProperty(k); }
  document.body.classList.toggle('no-lib', !PREFS.lib);
  document.body.classList.toggle('no-props', !PREFS.props);
  document.body.classList.toggle('no-hints', !PREFS.hints);
  $('#bLib').classList.toggle('on', isNarrow() ? $('#lib').classList.contains('open') : PREFS.lib);
  $('#bProps').classList.toggle('on', isNarrow() ? $('#propsPanel').classList.contains('open') : PREFS.props);
}
function setPanel(which, open) {
  const el = which === 'lib' ? $('#lib') : $('#propsPanel');
  if (isNarrow()) {
    if (open) (which === 'lib' ? $('#propsPanel') : $('#lib')).classList.remove('open');
    el.classList.toggle('open', open);
  } else { PREFS[which] = open; savePrefs(); }
  applyPrefs();
}
function togglePanel(which) { setPanel(which, isNarrow() ? !(which === 'lib' ? $('#lib') : $('#propsPanel')).classList.contains('open') : !PREFS[which]); }

function initResizers() {
  $$('.resizer').forEach(h => h.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    const which = h.dataset.rs, panel = h.parentElement;
    h.setPointerCapture(e.pointerId); h.classList.add('drag'); document.body.classList.add('resizing');
    const mv = ev => {
      const r = panel.getBoundingClientRect();
      const w = clamp(Math.round(which === 'lib' ? ev.clientX - r.left : r.right - ev.clientX), 180, 520);
      PREFS[which + 'W'] = w; applyPrefs();
    };
    const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.classList.remove('drag'); document.body.classList.remove('resizing'); savePrefs(); };
    h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
  }));
  $$('.resizer').forEach(h => h.addEventListener('dblclick', () => { PREFS[h.dataset.rs + 'W'] = 0; savePrefs(); applyPrefs(); }));
}

function initSettings() {
  ui.wireColor = PREFS.wireColor;
  SIM.speed = +PREFS.speed || 1;
  const sp = $('#speed'); if (sp) sp.value = String(SIM.speed);
  $('#bLib').onclick = () => togglePanel('lib');
  $('#bProps').onclick = () => togglePanel('props');
  $$('[data-close]').forEach(b => b.onclick = () => setPanel(b.dataset.close === 'lib' ? 'lib' : 'props', false));
  $('#bSettings').onclick = () => openSettings();
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === ',') { e.preventDefault(); openSettings(); } }, true);
  initResizers();
  applyPrefs();
  // la vista si adatta quando cambia lo spazio del foglio (pannelli aperti, chiusi o ridimensionati)
  if (window.ResizeObserver) { let t = null; new ResizeObserver(() => { clearTimeout(t); t = setTimeout(() => { if (!ui.userView) fitView(); else render(); }, 40); }).observe($('#stage')); }
  window.addEventListener('resize', () => applyPrefs());
  if (IS_DESKTOP) {
    setTimeout(() => checkUpdates(false), 6000);
    setInterval(() => checkUpdates(false), 30 * 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - UPD.at > 10 * 60 * 1000) checkUpdates(false); });
  }
}

/* ---------- finestra impostazioni ---------- */
let setTab = 'look';
function openSettings(tab) {
  if (tab) setTab = tab;
  const tabs = [['look', 'Aspetto'], ['edit', 'Editor'], ['sim', 'Simulazione'], ...(FIREBASE_CONFIG ? [['acc', 'Account']] : []), ...(IS_DESKTOP ? [['upd', 'Aggiornamenti']] : []), ['info', 'Informazioni']];
  if (!tabs.some(t => t[0] === setTab)) setTab = 'look';
  const m = modal('Impostazioni', `<div class="settabs" role="tablist">${tabs.map(([k, t]) => `<button role="tab" data-tab="${k}" class="${k === setTab ? 'on' : ''}">${t}</button>`).join('')}</div><div class="setpane" id="setPane"></div>`, '<button class="pbtn primary" data-c>Fatto</button>', true);
  m.querySelector('[data-c]').onclick = closeModal;
  $$('[data-tab]', m).forEach(b => b.onclick = () => { setTab = b.dataset.tab; $$('[data-tab]', m).forEach(x => x.classList.toggle('on', x === b)); renderSetPane(); });
  renderSetPane();
}
function segHTML(id, cur, opts) { return `<div class="seg" id="${id}">${opts.map(([v, t]) => `<button data-v="${esc(v)}" class="${String(cur) === String(v) ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>`; }
function bindSeg(id, f) { $$(`#${id} button`).forEach(b => b.onclick = () => { $$(`#${id} button`).forEach(x => x.classList.toggle('on', x === b)); f(b.dataset.v); }); }
const setChk = (id, on, t, sub) => `<label class="chk"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span>${t}${sub ? `<small style="display:block;color:var(--muted)">${sub}</small>` : ''}</span></label>`;
function renderSetPane() {
  const P = $('#setPane'); if (!P) return;
  const sel = (id, cur, opts) => `<select id="${id}">${opts.map(([v, t]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
  let h = '';
  if (setTab === 'look') {
    h = `<div class="setrow"><span>Tema<small>Automatico segue l’impostazione del sistema.</small></span>${segHTML('sTheme', PREFS.theme, [['auto', 'Automatico'], ['light', 'Chiaro'], ['dark', 'Scuro']])}</div>
      <div class="setrow"><span>Colore principale</span><div class="swatches">${ACCENTS.map(([k, c, t]) => `<button data-acc="${k}" title="${t}" aria-label="${t}" style="background:${c}" class="${PREFS.accent === k ? 'on' : ''}"></button>`).join('')}</div></div>
      <h3 class="mh3">Pannelli</h3>
      ${setChk('sLib', PREFS.lib, 'Mostra la libreria dei componenti')}
      ${setChk('sProps', PREFS.props, 'Mostra il pannello delle proprietà', 'Puoi chiuderli anche con la × nel loro titolo e riaprirli dai pulsanti nella barra in alto. Trascina il bordo per allargarli.')}
      <div class="acts"><button class="pbtn" id="sResetW">Ripristina la larghezza dei pannelli</button></div>
      ${setChk('sHints', PREFS.hints, 'Mostra i suggerimenti sul foglio', 'Il riquadro in basso che spiega cosa fare con lo strumento scelto.')}`;
  } else if (setTab === 'edit') {
    h = `<div class="f"><label for="sStart">All’apertura dell’app</label>${sel('sStart', PREFS.startup, [['last', 'Riapri l’ultimo schema (la prima volta: foglio vuoto)'], ['empty', 'Inizia sempre con un foglio vuoto'], ['example', 'Apri l’esempio di avviamento diretto']])}</div>
      <div class="f"><label for="sWire">Colore dei nuovi cavi</label>${sel('sWire', PREFS.wireColor, Object.keys(WIRE_COL).map(k => [k, k === 'auto' ? 'automatico (secondo il potenziale)' : k]))}</div>
      <div class="acts"><button class="pbtn" id="sHelp">Guida e scorciatoie da tastiera</button></div>`;
  } else if (setTab === 'sim') {
    h = `<div class="f"><label for="sSpeed">Velocità iniziale dei temporizzatori</label>${sel('sSpeed', PREFS.speed, [['0.25', '×0,25'], ['0.5', '×0,5'], ['1', '×1 (tempo reale)'], ['2', '×2'], ['5', '×5'], ['10', '×10']])}</div>
      <h3 class="mh3">Tensioni di questo schema</h3>${voltFieldsHTML(new Set(['mains', 'dc']), doc.meta)}
      <h3 class="mh3">Tensioni per i nuovi schemi</h3>
      <div class="row2"><div class="f"><label for="sVc">Concatenata (V)</label><input id="sVc" type="number" min="1" step="1" value="${esc(PREFS.vc)}"></div><div class="f"><label for="sVdc">Continua (V)</label><input id="sVdc" type="number" min="0.1" step="0.1" value="${esc(PREFS.vdc)}"></div></div>
      <p class="note">Ogni carico (bobine, lampade, motori…) ha una “Tensione nominale” nelle proprietà: se la imposti, in simulazione si brucia con una tensione troppo alta e non funziona con una troppo bassa.</p>`;
  } else if (setTab === 'acc') {
    const u = CLOUD.user;
    h = u ? `<div class="peer"><span class="av">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((u.displayName || u.email || '?')[0])}</span><b>${esc(u.displayName || '')}</b><small>${esc(u.email || '')}</small></div>
      <div class="acts"><button class="pbtn" id="sMine">I miei schemi</button><button class="pbtn" id="sSaveC">Salva nel mio account</button><button class="pbtn danger" id="sOut">Esci</button></div>`
      : `<p class="note" style="font-size:13px">Accedi con Google per salvare gli schemi online, ritrovarli su ogni dispositivo e usare <b>Lavora insieme</b>.${window.elettroDesktop ? ' Nel programma desktop l’accesso si apre nel tuo browser, dove sei già collegato a Google.' : ''}</p><div class="acts"><button class="pbtn primary" id="sIn">Accedi con Google</button></div>`;
  } else if (setTab === 'upd') {
    const L = UPD.latest, siteNew = L && cmpVer(L.version, APP_VERSION) > 0, D = UPD.desk, dv = window.elettroDesktop.version || '';
    h = `<div class="setrow"><span>Programma ElettroSim ${esc(dv)}<small>${D ? (D.newer ? `È disponibile la versione ${esc(D.latest)}: scaricala e installala sopra quella attuale.` : 'È la versione più recente.') : 'Gli aggiornamenti vengono controllati da soli all’avvio.'}</small></span><div class="acts">${D && D.newer ? '<button class="pbtn primary" id="sDeskDl">Scarica</button>' : ''}<button class="pbtn" id="sCheck">Controlla ora</button></div></div>
      <div class="setrow"><span>App ${esc(APP_VERSION)}<small>${siteNew ? `Il sito è stato aggiornato alla versione ${esc(L.version)}.` : 'Con la connessione il programma usa sempre l’ultima versione del sito.'}</small></span>${siteNew ? '<button class="pbtn primary" id="sReload">Ricarica</button>' : ''}</div>
      ${setChk('sUpd', PREFS.updates, 'Avvisami quando è disponibile una nuova versione')}
      ${L && L.notes && L.notes.length ? `<h3 class="mh3">Novità della versione ${esc(L.version)}</h3><ul class="note" style="margin:0;padding-left:18px">${L.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}`;
  } else {
    h = `<p class="note" style="font-size:13px"><b>ElettroSim</b> ${esc(APP_VERSION)} · editor e simulatore di schemi elettrici, PLC, GRAFCET e pneumatica. Funziona nel browser, anche offline, e come programma per computer.${IS_DESKTOP ? '' : ' La versione web si aggiorna da sola ogni volta che la apri.'}</p>
      <div class="acts"><a class="pbtn" href="https://mattcoc.github.io/ElettroSim/" target="_blank" rel="noopener">Sito</a><a class="pbtn" href="https://github.com/mattcoc/ElettroSim" target="_blank" rel="noopener">Codice su GitHub</a><a class="pbtn" href="${RELEASES_URL}" target="_blank" rel="noopener">Programma desktop</a><a class="pbtn" href="https://github.com/mattcoc/ElettroSim/issues/new" target="_blank" rel="noopener">Segnala un problema</a></div>`;
  }
  P.innerHTML = h;
  const on = (id, ev, f) => { const el = $('#' + id); if (el) el.addEventListener(ev, f); };
  bindSeg('sTheme', v => { PREFS.theme = v; savePrefs(); applyPrefs(); render(); });
  $$('[data-acc]', P).forEach(b => b.onclick = () => { PREFS.accent = b.dataset.acc; savePrefs(); applyPrefs(); $$('[data-acc]', P).forEach(x => x.classList.toggle('on', x === b)); render(); });
  on('sLib', 'change', e => setPanel('lib', e.target.checked));
  on('sProps', 'change', e => setPanel('props', e.target.checked));
  on('sResetW', 'click', () => { PREFS.libW = 0; PREFS.propsW = 0; savePrefs(); applyPrefs(); });
  on('sHints', 'change', e => { PREFS.hints = e.target.checked; savePrefs(); applyPrefs(); });
  on('sStart', 'change', e => { PREFS.startup = e.target.value; savePrefs(); });
  on('sWire', 'change', e => { PREFS.wireColor = e.target.value; ui.wireColor = e.target.value; savePrefs(); });
  on('sHelp', 'click', () => { closeModal(); openHelp(); });
  on('sSpeed', 'change', e => { PREFS.speed = +e.target.value || 1; savePrefs(); SIM.speed = PREFS.speed; const sp = $('#speed'); if (sp) sp.value = String(SIM.speed); });
  on('sVc', 'change', e => { PREFS.vc = clamp(+e.target.value || 400, 1, 100000); savePrefs(); });
  on('sVdc', 'change', e => { PREFS.vdc = clamp(+e.target.value || 24, 0.1, 100000); savePrefs(); });
  bindVoltFields();
  on('sIn', 'click', async () => { await cloudSignIn(); renderSetPane(); });
  on('sOut', 'click', async () => { await cloudSignOut(); renderSetPane(); });
  on('sMine', 'click', () => { closeModal(); openDialog(); });
  on('sSaveC', 'click', () => saveToCloud());
  on('sCheck', 'click', async () => { await checkUpdates(true); renderSetPane(); });
  on('sReload', 'click', () => location.reload());
  on('sDeskDl', 'click', () => openExternal(UPD.desk.url));
  on('sUpd', 'change', e => { PREFS.updates = e.target.checked; savePrefs(); });
}

/* ---------- aggiornamenti ---------- */
const UPD = { at: 0, latest: null, desk: null, shown: '' };
function cmpVer(a, b) {
  const pa = String(a || '0').replace(/^[^\d]*/, '').split('.').map(n => +n || 0), pb = String(b || '0').replace(/^[^\d]*/, '').split('.').map(n => +n || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i] || 0) - (pb[i] || 0); if (d) return d > 0 ? 1 : -1; }
  return 0;
}
function openExternal(url) { if (window.elettroDesktop && window.elettroDesktop.openExternal) window.elettroDesktop.openExternal(url); else window.open(url, '_blank', 'noopener'); }
async function checkUpdates(manual) {
  UPD.at = Date.now();
  if (!navigator.onLine) { if (manual) toast('Sei offline: gli aggiornamenti si controllano quando torna la connessione.'); return; }
  let found = false;
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      UPD.latest = j;
      if (cmpVer(j.version, APP_VERSION) > 0) { found = true; if (manual || PREFS.updates) showUpdateBar(j); }
    }
  } catch (e) { if (manual) toast('Impossibile controllare gli aggiornamenti.', 'err'); }
  if (window.elettroDesktop && window.elettroDesktop.checkUpdate) {
    try {
      const d = await window.elettroDesktop.checkUpdate();
      UPD.desk = d;
      if (d && d.newer) { found = true; if (manual || PREFS.updates) showDeskUpdateBar(d); }
    } catch (e) { /* controllo desktop non disponibile */ }
  }
  if (manual && !found) toast(`Hai già l’ultima versione (${APP_VERSION}).`);
}
function updBar(html, actions) {
  const old = $('#updbar'); if (old) old.remove();
  const b = document.createElement('div');
  b.className = 'updbar'; b.id = 'updbar'; b.setAttribute('role', 'status');
  b.innerHTML = `<span>${html}</span>${actions.map((a, i) => `<button class="pbtn${a.primary ? ' primary' : ''}" data-ua="${i}">${esc(a.t)}</button>`).join('')}<button class="pbtn" data-ux title="Chiudi" aria-label="Chiudi">×</button>`;
  document.body.appendChild(b);
  $$('[data-ua]', b).forEach(x => x.onclick = () => { b.remove(); actions[+x.dataset.ua].f(); });
  $('[data-ux]', b).onclick = () => b.remove();
}
function showUpdateBar(j) {
  if (UPD.shown === j.version) return;
  UPD.shown = j.version;
  updBar(`È disponibile ElettroSim <b>${esc(j.version)}</b>.`, [
    { t: 'Novità', f: () => openSettings('upd') },
    { t: 'Aggiorna', primary: true, f: () => { if (SIM.on) stopSim(); location.reload(); } },
  ]);
}
function showDeskUpdateBar(d) {
  if (UPD.shown === 'desk' + d.latest) return;
  UPD.shown = 'desk' + d.latest;
  updBar(`È disponibile il programma desktop <b>${esc(d.latest)}</b>.`, [{ t: 'Scarica', primary: true, f: () => openExternal(d.url) }]);
}
