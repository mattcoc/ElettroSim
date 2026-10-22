/* ElettroSim · File, esportazioni (PDF, PNG, SVG) e account Google. */
'use strict';
/* ---------- files ---------- */
let DL = null;
async function initCaps() { try { if (window.claude && typeof window.claude.use === 'function') DL = await window.claude.use('downloads'); } catch (e) { DL = null; } }
function slug(s) { return (String(s || 'schema').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'schema').slice(0, 60); }
async function saveFile(filename, data, mime) {
  if (DL) {
    try { await DL.save({ filename, data }); toast(`File pronto: ${filename}`); return; }
    catch (e) {
      const code = e && e.code;
      if (code === 'declined') return;
      if (code === 'rate_limited') { toast('Attendi un attimo e riprova.'); return; }
      if (!['unavailable', 'not_granted', 'capability_disabled', 'capability_removed'].includes(code)) { toast('Non è stato possibile preparare il file.', 'err'); return; }
    }
  }
  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  } catch (e) { toast('Il download non è disponibile in questa vista.', 'err'); }
}
function projects() { try { const p = JSON.parse(LS.get('elettrosim.projects') || '{}'); return p && typeof p === 'object' ? p : {}; } catch (e) { return {}; } }
function saveToBrowser() {
  if (SIM.on) { toast('Ferma la simulazione per salvare.'); return; }
  const P = projects(), name = (doc.meta.title || 'Schema').trim() || 'Schema';
  P[name] = { doc: JSON.parse(snapshot()), at: Date.now() };
  if (LS.set('elettrosim.projects', JSON.stringify(P))) toast(`Salvato nel browser come “${name}”.`);
  else toast('Spazio del browser esaurito: usa “Scarica file .json”.', 'err');
}
function downloadJSON() { saveFile(slug(doc.meta.title) + '.json', JSON.stringify(doc, null, 1), 'application/json'); }
function exportSVGString(pageIdx) {
  const SH = sheetDims();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SH.w}" height="${SH.h}" viewBox="0 0 ${SH.w} ${SH.h}"><style>${SHEET_CSS}</style>${sheetSVG({ exp: true, page: pageIdx != null ? pageIdx : doc.page })}</svg>`;
}
function exportSVG() { saveFile(slug(doc.meta.title) + (doc.pages.length > 1 ? '-' + slug(doc.pages[doc.page].name) : '') + '.svg', exportSVGString(), 'image/svg+xml'); }
async function pageCanvas(i, scale) {
  const SH = sheetDims();
  const url = URL.createObjectURL(new Blob([exportSVGString(i)], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const cv = document.createElement('canvas');
    cv.width = Math.round(SH.w * scale); cv.height = Math.round(SH.h * scale);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    return cv;
  } finally { URL.revokeObjectURL(url); }
}
async function exportPNG() {
  try {
    const cv = await pageCanvas(doc.page, 2);
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
    if (!blob) throw new Error('png');
    await saveFile(slug(doc.meta.title) + (doc.pages.length > 1 ? '-' + slug(doc.pages[doc.page].name) : '') + '.png', blob, 'image/png');
  } catch (e) { toast('Non è stato possibile creare l’immagine.', 'err'); }
}
let jspdfP = null;
function loadJsPDF() {
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (!jspdfP) jspdfP = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'vendor/jspdf.umd.min.js';
    s.onload = () => (window.jspdf && window.jspdf.jsPDF ? res(window.jspdf.jsPDF) : rej(new Error('jspdf')));
    s.onerror = () => { jspdfP = null; rej(new Error('jspdf')); };
    document.head.appendChild(s);
  });
  return jspdfP;
}
async function exportPDF() {
  if (SIM.on) { toast('Ferma la simulazione per esportare.'); return; }
  toast(`Preparo il PDF (${doc.pages.length} ${doc.pages.length === 1 ? 'foglio' : 'fogli'})…`);
  try {
    const jsPDF = await loadJsPDF();
    const SH = sheetDims(), fmt = { A4: 'a4', A3: 'a3', A2: 'a2', A4V: 'a4' }[doc.meta.sheet] || 'a4', orient = SH.w > SH.h ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation: orient, unit: 'mm', format: fmt, compress: true });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    for (let i = 0; i < doc.pages.length; i++) {
      if (i) pdf.addPage(fmt, orient);
      const cv = await pageCanvas(i, SH.w > 2000 ? 1.5 : 2);
      pdf.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pw, ph);
    }
    pdf.setProperties({ title: doc.meta.title || 'Schema', author: doc.meta.author || '' });
    await saveFile(slug(doc.meta.title) + '.pdf', pdf.output('blob'), 'application/pdf');
  } catch (e) { toast('Non è stato possibile creare il PDF.', 'err'); }
}
const CLOUD = { lib: null, user: null, id: null, timer: null, blkTimer: null, saving: false, again: false };
const FB_URL = new URL('vendor/firebase/', document.baseURI).href;
function cloudLib() {
  if (!CLOUD.lib) CLOUD.lib = Promise.all(['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => import(FB_URL + f))).then(([A, U, F]) => {
    const app = A.initializeApp(FIREBASE_CONFIG);
    // cache locale di Firestore: gli schemi dell’account restano leggibili offline e i salvataggi partono al ritorno della rete
    let db;
    try { db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) }); }
    catch (e) { db = F.getFirestore(app); }
    return { U, F, auth: U.getAuth(app), db };
  }).catch(e => { CLOUD.lib = null; throw e; });
  return CLOUD.lib;
}
function setCloudId(id) {
  CLOUD.id = id;
  LS.set('elettrosim.cloudId', id && CLOUD.user ? JSON.stringify({ uid: CLOUD.user.uid, id }) : '');
}
function authErr(e) {
  const c = (e && e.code) || '';
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return;
  if (c === 'auth/unauthorized-domain') { toast('Questo indirizzo non è autorizzato: aggiungilo in Firebase › Authentication › Impostazioni › Domini autorizzati.', 'err'); return; }
  if (c === 'auth/network-request-failed') { toast('Connessione assente: impossibile accedere.', 'err'); return; }
  toast('Accesso non riuscito. Riprova.', 'err');
}
async function cloudSignIn() {
  if (!navigator.onLine) { toast('Sei offline: per accedere all’account serve la connessione. Puoi continuare a lavorare, lo schema resta salvato su questo dispositivo.'); return; }
  let L;
  try { L = await cloudLib(); } catch (e) { toast('Impossibile caricare il servizio di accesso. Controlla la connessione.', 'err'); return; }
  // nel programma desktop l'accesso si fa nel browser predefinito, dove l'account Google è già collegato
  if (window.elettroDesktop && window.elettroDesktop.login && /^https:/.test(location.protocol)) {
    const m = modal('Accesso con Google', '<p class="note" style="font-size:13px">Si è aperta una pagina nel tuo browser: scegli lì il tuo account Google. Al termine l’accesso passa da solo a ElettroSim.</p>', '<button class="pbtn" data-c>Annulla</button>');
    let cancelled = false;
    m.querySelector('[data-c]').onclick = () => { cancelled = true; closeModal(); window.elettroDesktop.cancelLogin && window.elettroDesktop.cancelLogin(); };
    try {
      const r = await window.elettroDesktop.login();
      if (cancelled) return;
      closeModal();
      if (!r || !r.idToken) { if (r && r.error !== 'cancelled') toast(r.error === 'timeout' ? 'Tempo scaduto: riprova ad accedere.' : 'Accesso non riuscito. Riprova.', 'err'); return; }
      await L.U.signInWithCredential(L.auth, L.U.GoogleAuthProvider.credential(r.idToken, r.accessToken || null));
    } catch (e) { closeModal(); authErr(e); }
    return;
  }
  const prov = new L.U.GoogleAuthProvider();
  prov.setCustomParameters({ prompt: 'select_account' });
  try { await L.U.signInWithPopup(L.auth, prov); }
  catch (e) {
    if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) { try { await L.U.signInWithRedirect(L.auth, prov); } catch (e2) { authErr(e2); } return; }
    authErr(e);
  }
}
async function cloudSignOut() {
  try { const L = await cloudLib(); clearTimeout(CLOUD.timer); setCloudId(null); await L.U.signOut(L.auth); toast('Sei uscito dall’account. Gli schemi restano salvati online.'); }
  catch (e) { toast('Uscita non riuscita.', 'err'); }
}
function userCol(L, name) { return L.F.collection(L.db, 'users', CLOUD.user.uid, name); }
function cloudPayload() {
  const data = snapshot();
  return { name: (doc.meta.title || 'Schema').trim() || 'Schema', data, at: Date.now(), n: allComps().length, pages: doc.pages.length };
}
function setSaveStatus(t) { const el = $('#stSave'); if (el) el.textContent = t; }
async function cloudWrite(P) {
  if (P.data.length > 900000) { setSaveStatus('Schema troppo grande per il salvataggio online'); toast('Lo schema è troppo grande per il salvataggio online (massimo circa 900 kB): riduci o elimina le immagini.', 'err'); return false; }
  if (CLOUD.saving) { CLOUD.again = true; return true; }
  CLOUD.saving = true; setSaveStatus('Salvataggio nel tuo account…');
  try {
    const L = await cloudLib();
    const ref = CLOUD.id ? L.F.doc(userCol(L, 'schemes'), CLOUD.id) : L.F.doc(userCol(L, 'schemes'));
    setCloudId(ref.id);
    const w = L.F.setDoc(ref, P);
    // offline la scrittura resta in coda nella cache locale e parte da sola quando torna la connessione
    if (!navigator.onLine) { w.catch(() => {}); setSaveStatus('Offline: salvato su questo dispositivo, andrà nel tuo account al ritorno della rete'); return true; }
    await w;
    setSaveStatus('Salvato nel tuo account');
    return true;
  } catch (e) {
    setSaveStatus('Salvataggio online non riuscito: le modifiche restano nel browser');
    return false;
  } finally {
    CLOUD.saving = false;
    if (CLOUD.again) { CLOUD.again = false; cloudSchedule(); }
  }
}
async function saveToCloud() {
  if (SIM.on) { toast('Ferma la simulazione per salvare.'); return; }
  if (!CLOUD.user) { await cloudSignIn(); if (!CLOUD.user) return; }
  const P = cloudPayload(), isNew = !CLOUD.id;
  if (await cloudWrite(P)) toast(isNew ? `Salvato nel tuo account come “${P.name}”. Da ora le modifiche si salvano da sole.` : `Salvato nel tuo account.`);
  else if (P.data.length <= 900000) toast('Salvataggio online non riuscito. Controlla la connessione e riprova.', 'err');
}
function cloudSchedule() {
  if (!CLOUD.user || !CLOUD.id || SIM.on) return;
  clearTimeout(CLOUD.timer);
  CLOUD.timer = setTimeout(() => cloudWrite(cloudPayload()), 2500);
}
async function cloudList() {
  const L = await cloudLib();
  const q = await L.F.getDocs(L.F.query(userCol(L, 'schemes'), L.F.orderBy('at', 'desc')));
  return q.docs.map(d => Object.assign({ id: d.id }, d.data())).filter(x => typeof x.data === 'string');
}
async function cloudDelete(id) { const L = await cloudLib(); await L.F.deleteDoc(L.F.doc(userCol(L, 'schemes'), id)); }
function cloudSaveBlocks(b) {
  if (!CLOUD.user) return;
  clearTimeout(CLOUD.blkTimer);
  CLOUD.blkTimer = setTimeout(async () => {
    try { const L = await cloudLib(); await L.F.setDoc(L.F.doc(L.db, 'users', CLOUD.user.uid), { blocks: JSON.stringify(b) }, { merge: true }); }
    catch (e) { toast('I blocchi non sono stati salvati nel tuo account.', 'err'); }
  }, 800);
}
async function cloudLoadBlocks() {
  const L = await cloudLib(), uid = CLOUD.user.uid;
  const snap = await L.F.getDoc(L.F.doc(L.db, 'users', uid));
  let cb = null;
  try { const v = snap.exists() ? JSON.parse(snap.data().blocks || 'null') : null; cb = Array.isArray(v) ? v : null; } catch (e) { cb = null; }
  const local = loadBlocks();
  let B = cb || [];
  // al primo accesso da questo browser i blocchi locali si aggiungono a quelli dell’account
  if (LS.get('elettrosim.blocksSync') !== uid) { const ids = new Set(B.map(x => x.id)); B = B.concat(local.filter(x => !ids.has(x.id))); LS.set('elettrosim.blocksSync', uid); }
  LS.set('elettrosim.blocks', JSON.stringify(B));
  if (!cb || B.length !== cb.length) cloudSaveBlocks(B);
  buildLibrary();
}
function updateAccBtn() {
  const b = $('#bAcc'); if (!b) return;
  const u = CLOUD.user;
  b.title = u ? `Account: ${u.email || u.displayName || ''}` : 'Accedi con Google per salvare online';
  const pic = u && u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>';
  b.innerHTML = `${pic}<span class="hide-sm">${esc(u ? (u.displayName || u.email || 'Account').split(' ')[0] : 'Accedi')}</span>`;
}
function accMenu(anchor) {
  const u = CLOUD.user;
  if (!u) { menu(anchor, [{ h: 'Salva i tuoi schemi online' }, { t: 'Accedi con Google', f: cloudSignIn }]); return; }
  menu(anchor, [
    { h: u.email || u.displayName || 'Account' },
    { t: CLOUD.id ? 'Salva ora nel mio account' : 'Salva nel mio account', k: 'Ctrl+S', dis: SIM.on, f: saveToCloud },
    { t: 'I miei schemi…', f: openDialog },
    { t: COOP.room ? 'Sessione condivisa…' : 'Lavora insieme…', f: openCoop },
    '-',
    { t: 'Esci', f: cloudSignOut },
  ]);
}
async function initCloud() {
  if (!FIREBASE_CONFIG) return;
  const b = $('#bAcc'); b.hidden = false; b.onclick = e => accMenu(e.currentTarget);
  $('#bCoop').hidden = false; $('#bCoop').onclick = openCoop; $('#coopChip').onclick = openCoop;
  updateAccBtn();
  let L;
  try { L = await cloudLib(); } catch (e) { return; }
  L.U.getRedirectResult(L.auth).catch(authErr);
  L.U.onAuthStateChanged(L.auth, async u => {
    const was = CLOUD.user;
    CLOUD.user = u || null;
    updateAccBtn();
    if (!u) { CLOUD.id = null; if (COOP.room) coopLeave(true); coopFromURL(); return; }
    try { const s = JSON.parse(LS.get('elettrosim.cloudId') || 'null'); CLOUD.id = s && s.uid === u.uid ? s.id : null; } catch (e) { CLOUD.id = null; }
    if (!was) toast(`Accesso eseguito come ${u.displayName || u.email}.${CLOUD.id ? '' : ' Usa File › Salva nel mio account per salvare questo schema online.'}`);
    coopFromURL();
    try { await cloudLoadBlocks(); } catch (e) { /* blocchi offline: restano quelli locali */ }
  });
}
