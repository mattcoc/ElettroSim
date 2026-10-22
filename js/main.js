/* ElettroSim · Avvio dell’applicazione. */
'use strict';
/* ---------- offline e installazione ---------- */
let installEvt = null;
const RELEASES_URL = 'https://github.com/mattcoc/ElettroSim/releases/latest';
function isStandalone() { try { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || /Electron/.test(navigator.userAgent); } catch (e) { return false; } }
function installApp() {
  if (installEvt) { installEvt.prompt(); installEvt.userChoice.finally(() => { installEvt = null; }); return; }
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  modal('Installa ElettroSim', `<p class="note" style="font-size:13px">${ios
    ? 'Su iPhone e iPad: apri il sito con Safari, tocca il pulsante <b>Condividi</b> e scegli <b>Aggiungi alla schermata Home</b>.'
    : 'Apri il menu del browser (⋮ in Chrome, ⋯ in Edge) e scegli <b>Installa app</b> oppure <b>Aggiungi a schermata Home</b>.'} L’app si apre come un programma, con la sua icona, e funziona anche senza connessione.</p>
    <p class="note">Per il computer puoi anche scaricare la versione desktop (Windows, macOS, Linux): <a href="${RELEASES_URL}" target="_blank" rel="noopener">pagina dei download</a>.</p>`);
}
function initOffline() {
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
  window.addEventListener('appinstalled', () => { installEvt = null; toast('ElettroSim è installata: la trovi tra le app del dispositivo.'); });
  window.addEventListener('offline', () => toast('Sei offline: puoi continuare a lavorare, tutto resta salvato su questo dispositivo.'));
  window.addEventListener('online', () => { toast('Di nuovo online.'); if (COOP.room) coopSchedule(); if (CLOUD.id) cloudSchedule(); });
}

/* ---------- init ---------- */
function init() {
  const st = document.createElement('style'); st.textContent = SHEET_CSS; document.head.appendChild(st);
  buildLIB(); buildLibrary();
  $('#libq').addEventListener('input', filterLib);
  $('#libq').addEventListener('keydown', e => { if (e.key === 'Escape' && e.target.value) { e.preventDefault(); e.stopPropagation(); e.target.value = ''; filterLib(); } });
  $('#libqX').onclick = () => { const q = $('#libq'); q.value = ''; filterLib(); q.focus(); };
  $('#bHelp').onclick = openHelp;
  $('#esHelp').onclick = openHelp;
  $('#esEx').onclick = () => $('#bEx').click();
  $('#esLib').onclick = () => { if (window.innerWidth <= 860) { $('#propsPanel').classList.remove('open'); $('#lib').classList.add('open'); } setTimeout(() => $('#libq').focus(), 220); };
  $('#bFile').onclick = e => menu(e.currentTarget, [
    { t: 'Nuovo schema', f: () => replaceGuard(() => loadDoc(newDoc(), 'Nuovo schema vuoto.')) },
    { t: 'Apri…', f: openDialog },
    ...(FIREBASE_CONFIG ? [{ t: COOP.room ? 'Sessione condivisa…' : 'Lavora insieme (cowork)…', f: openCoop }] : []),
    ...(FIREBASE_CONFIG ? [{ t: CLOUD.user ? 'Salva nel mio account' : 'Salva nel mio account (accedi con Google)…', k: CLOUD.user ? 'Ctrl+S' : '', f: saveToCloud }] : []),
    { t: 'Salva nel browser', k: CLOUD.user ? '' : 'Ctrl+S', f: saveToBrowser },
    '-',
    { t: 'Scarica file .json', f: downloadJSON },
    { t: 'Importa file .json', f: () => $('#fileIn').click() },
    '-',
    { t: 'Esporta PDF (tutti i fogli)', f: exportPDF },
    { t: 'Esporta immagine PNG (foglio attuale)', f: exportPNG },
    { t: 'Esporta disegno SVG (foglio attuale)', f: exportSVG },
    '-',
    { t: 'Salva selezione come blocco…', dis: SIM.on || !selComps().length, f: saveSelAsBlock },
    { t: 'Guida e scorciatoie', k: 'F1', f: openHelp },
    ...(isStandalone() ? [] : [{ t: 'Installa l’app (funziona offline)…', f: installApp }]),
    { t: 'Impostazioni del foglio', f: () => { ui.sel.clear(); refreshPanels(); render(); if (window.innerWidth <= 860) $('#propsPanel').classList.add('open'); } },
  ]);
  $('#bEx').onclick = e => menu(e.currentTarget, [{ h: 'Schemi pronti da simulare' }, ...EXAMPLES.map(([id, t]) => ({ t, f: () => replaceGuard(() => loadExample(id)) }))]);
  $('#tDraw').onclick = e => menu(e.currentTarget, [
    { t: 'Linea', k: 'L', f: () => setTool('shp_line') },
    { t: 'Rettangolo', f: () => setTool('shp_rect') },
    { t: 'Ellisse', f: () => setTool('shp_ellipse') },
    { t: 'Immagine…', f: () => $('#imgIn').click() },
  ]);
  $('#fileIn').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; importFile(f); e.target.value = ''; });
  $('#imgIn').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; onImageFile(f); e.target.value = ''; });
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo;
  $('#tSelect').onclick = () => setTool('select');
  $('#tWire').onclick = () => setTool(ui.tool === 'wire' ? 'select' : 'wire');
  $('#tText').onclick = () => setTool(ui.tool === 'text' ? 'select' : 'text');
  $('#bRot').onclick = rotateSel; $('#bFlip').onclick = flipSel; $('#bDel').onclick = deleteSel;
  $('#bZi').onclick = () => zoomCenter(1.25); $('#bZo').onclick = () => zoomCenter(0.8); $('#bFit').onclick = fitView;
  $('#bCheck').onclick = openCheck;
  $('#bSim').onclick = toggleSim;
  $('#bPause').onclick = togglePause; $('#bStep').onclick = stepOnce;
  $('#speed').onchange = e => { SIM.speed = +e.target.value || 1; };
  $('#bLib').onclick = () => { $('#propsPanel').classList.remove('open'); $('#lib').classList.toggle('open'); };
  $('#bProps').onclick = () => { $('#lib').classList.remove('open'); $('#propsPanel').classList.toggle('open'); };
  $$('[data-close]').forEach(b => b.onclick = () => $('#' + b.dataset.close).classList.remove('open'));
  const cv = $('#cv');
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('wheel', onWheel, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerleave', () => { ui.mouse.in = false; if (ui.place || ui.hoverTerm) { ui.hoverTerm = null; render(); } });
  window.addEventListener('pointermove', libMove);
  window.addEventListener('pointerup', e => { libUp(e); if (SIM.on && SIM.held && !ui.drag) releaseHeld(); });
  window.addEventListener('pointercancel', e => { if (ui.libDrag && ui.libDrag.id === e.pointerId) { ui.libDrag = null; ui.place = null; render(); } });
  document.addEventListener('keydown', onKey);
  document.addEventListener('keyup', e => { if (e.key === ' ' && ui.space) { ui.space = false; e.preventDefault(); } });
  window.addEventListener('blur', () => { ui.space = false; releaseHeld(); });
  let rz = null;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (!ui.userView) fitView(); else render(); }, 60); });
  let loaded = false;
  const saved = LS.get('elettrosim.current');
  if (saved) { try { doc = validateDoc(JSON.parse(saved)); loaded = true; } catch (e) { loaded = false; } }
  if (!loaded) doc = buildExample('diretto');
  touch();
  resetHistory();
  renderTabs();
  setTool('select');
  updateModeUI();
  refreshPanels();
  requestAnimationFrame(() => { fitView(); drawNow(); });
  if (!loaded) toast('Esempio caricato: premi Simula per provarlo.');
  if (!LS.get('elettrosim.seenHelp')) setTimeout(openHelp, 400);
  initCaps();
  initCloud();
  initOffline();
  window.__es = { get doc() { return doc; }, COOP, DEF, SIM, ui, POTS, buildExample, loadExample, loadDoc, startSim, stopSim, step, doAct, actFor, verify, termsW, wireRoute, cmap, allComps, exportSVGString, commit, undo, redo, switchPage, addPage, mkComp, grParse, buildTopo, previewSVG, LIB: () => LIB };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
