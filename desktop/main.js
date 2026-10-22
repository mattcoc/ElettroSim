// ElettroSim desktop: quando c'è connessione apre il sito (sempre aggiornato, con account e Lavora insieme);
// il sito resta salvato in locale dal service worker, quindi si apre anche offline. Se non è mai stato
// aperto online, usa la copia dell'app inclusa nel programma.
const { app, BrowserWindow, Menu, Notification, ipcMain, net, protocol, screen, shell } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const path = require('path');

const SITE = 'https://mattcoc.github.io/ElettroSim/';
const RELEASES_API = 'https://api.github.com/repos/mattcoc/ElettroSim/releases/latest';
const RELEASES_URL = 'https://github.com/mattcoc/ElettroSim/releases/latest';
const LOCAL_URL = 'app://elettrosim/index.html';
const WEB = path.join(__dirname, 'web');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.txt': 'text/plain', '.md': 'text/markdown' };

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);

function serveLocal() {
  protocol.handle('app', req => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === '/' || p === '') p = '/index.html';
    const file = path.normalize(path.join(WEB, p));
    if (!file.startsWith(WEB + path.sep) || !fs.existsSync(file)) return new Response('Non trovato', { status: 404 });
    return new Response(fs.readFileSync(file), { headers: { 'content-type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' } });
  });
}

/* ---------- finestra: dimensione adatta allo schermo e ricordata tra un avvio e l'altro ---------- */
const STATE_FILE = () => path.join(app.getPath('userData'), 'finestra.json');
function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')); } catch (e) { return null; } }
function saveState(win) {
  try { fs.writeFileSync(STATE_FILE(), JSON.stringify({ bounds: win.getNormalBounds(), max: win.isMaximized(), full: win.isFullScreen() })); } catch (e) { /* non salvato */ }
}
function visible(b) { return screen.getAllDisplays().some(d => { const a = d.workArea; return b.x < a.x + a.width - 80 && b.x + b.width > a.x + 80 && b.y >= a.y - 10 && b.y < a.y + a.height - 80; }); }

let win = null;
function createWindow() {
  const st = loadState(), wa = screen.getPrimaryDisplay().workArea;
  const def = { width: Math.min(1440, Math.round(wa.width * 0.9)), height: Math.min(920, Math.round(wa.height * 0.9)) };
  const b = st && st.bounds && visible(st.bounds) ? st.bounds : def;
  win = new BrowserWindow({
    x: b.x, y: b.y, width: Math.min(b.width, wa.width), height: Math.min(b.height, wa.height), minWidth: 380, minHeight: 520,
    backgroundColor: '#e9edf0', icon: path.join(__dirname, 'icon.png'), show: false, title: 'ElettroSim',
    webPreferences: { contextIsolation: true, sandbox: true, preload: path.join(__dirname, 'preload.js') },
  });
  if (st ? st.max : wa.width < 1500) win.maximize();
  if (st && st.full) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  let t = null;
  const remember = () => { clearTimeout(t); t = setTimeout(() => saveState(win), 400); };
  for (const ev of ['resize', 'move', 'maximize', 'unmaximize', 'enter-full-screen', 'leave-full-screen']) win.on(ev, remember);
  win.on('close', () => saveState(win));

  // scorciatoie del programma (senza la barra dei menu)
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    const mod = i.control || i.meta;
    if (i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (mod && i.shift && (i.key === 'I' || i.key === 'i')) { win.webContents.toggleDevTools(); e.preventDefault(); }
    else if ((mod && (i.key === 'r' || i.key === 'R')) || i.key === 'F5') { win.webContents.reload(); e.preventDefault(); }
  });
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(SITE) && !url.startsWith('app://')) { e.preventDefault(); shell.openExternal(url); } });

  let local = false;
  const loadLocal = () => { if (local) return; local = true; win.loadURL(LOCAL_URL); };
  const timer = setTimeout(() => { if (!local && win.webContents.isLoading()) { win.webContents.stop(); loadLocal(); } }, 12000);
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => { if (isMain && !local && url.startsWith('https:')) loadLocal(); });
  win.webContents.on('did-finish-load', () => clearTimeout(timer));
  win.loadURL(SITE).catch(loadLocal);
}

/* ---------- accesso con Google nel browser predefinito ----------
   Il programma apre login.html del sito nel browser con una porta locale e un codice casuale; la pagina,
   dopo l'accesso con Google, rimanda il token a http://127.0.0.1:porta/done e il programma lo passa all'app. */
let pendingLogin = null;
function finishLogin(res) { if (!pendingLogin) return; const p = pendingLogin; pendingLogin = null; clearTimeout(p.timer); try { p.server.close(); } catch (e) { /* già chiuso */ } p.resolve(res); }
const PAGE = (title, text) => `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font:15px system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;margin:0;background:#e9edf0;color:#1c2329"><div style="background:#fff;padding:28px 32px;border-radius:14px;text-align:center;max-width:420px"><h2 style="margin:0 0 8px">${title}</h2><p style="margin:0;color:#5d6a75">${text}</p></div></body>`;
ipcMain.handle('es-login', () => {
  if (pendingLogin) finishLogin({ error: 'cancelled' });
  return new Promise(resolve => {
    const state = crypto.randomBytes(16).toString('hex');
    const server = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/done') { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      if (u.searchParams.get('state') !== state || !u.searchParams.get('id')) { res.end(PAGE('Accesso non valido', 'Riprova dal programma ElettroSim.')); return; }
      res.end(PAGE('Accesso completato', 'Puoi chiudere questa scheda e tornare a ElettroSim.'));
      if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
      finishLogin({ idToken: u.searchParams.get('id'), accessToken: u.searchParams.get('at') || null });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      pendingLogin = { resolve, server, timer: setTimeout(() => finishLogin({ error: 'timeout' }), 5 * 60 * 1000) };
      shell.openExternal(`${SITE}login.html?port=${port}&state=${state}`);
    });
    server.on('error', () => resolve({ error: 'server' }));
  });
});
ipcMain.handle('es-login-cancel', () => finishLogin({ error: 'cancelled' }));
ipcMain.on('es-version', e => { e.returnValue = app.getVersion(); });
ipcMain.handle('es-open', (e, url) => { if (/^https:\/\//.test(String(url))) shell.openExternal(String(url)); });

/* ---------- aggiornamenti del programma ---------- */
const verOf = s => { const m = /(\d+)\.(\d+)\.(\d+)/.exec(String(s || '')); return m ? m.slice(1).map(Number) : [0, 0, 0]; };
const newer = (a, b) => { const x = verOf(a), y = verOf(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return false; };
async function checkUpdate() {
  try {
    const r = await net.fetch(RELEASES_API, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'ElettroSim-desktop' } });
    if (!r.ok) return null;
    const j = await r.json();
    const latest = verOf(j.tag_name).join('.');
    return { current: app.getVersion(), latest, newer: newer(latest, app.getVersion()), url: j.html_url || RELEASES_URL };
  } catch (e) { return null; }
}
ipcMain.handle('es-check-update', () => checkUpdate());
async function notifyUpdate() {
  const u = await checkUpdate();
  if (!u || !u.newer || !Notification.isSupported()) return;
  const n = new Notification({ title: 'Aggiornamento di ElettroSim', body: `È disponibile la versione ${u.latest} del programma. Clicca per scaricarla.`, icon: path.join(__dirname, 'icon.png') });
  n.on('click', () => shell.openExternal(u.url));
  n.show();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.whenReady().then(() => {
    // user agent da browser normale, più un segno per riconoscere il programma desktop
    app.userAgentFallback = app.userAgentFallback.replace(/\s(Electron|elettrosim|ElettroSim)\/\S+/g, '') + ' ElettroSimDesktop';
    if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]));
    else Menu.setApplicationMenu(null);
    if (process.platform === 'win32') app.setAppUserModelId('io.github.mattcoc.elettrosim');
    serveLocal();
    createWindow();
    setTimeout(notifyUpdate, 8000);
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
