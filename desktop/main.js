// ElettroSim desktop: quando c'è connessione apre il sito (sempre aggiornato, con account e Lavora insieme);
// il sito resta salvato in locale dal service worker, quindi si apre anche offline. Se non è mai stato
// aperto online, usa la copia dell'app inclusa nel programma.
const { app, BrowserWindow, Menu, protocol, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const ONLINE_URL = 'https://mattcoc.github.io/ElettroSim/';
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

function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 360, minHeight: 500,
    backgroundColor: '#e9edf0', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true, show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.once('ready-to-show', () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\/(accounts\.google\.com|[\w-]+\.firebaseapp\.com|apis\.google\.com)\//.test(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: { width: 520, height: 720, autoHideMenuBar: true, parent: win } };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  let local = false;
  const loadLocal = () => { if (local) return; local = true; win.loadURL(LOCAL_URL); };
  const timer = setTimeout(() => { if (win.webContents.getURL().startsWith('https:') && win.webContents.isLoading()) { win.webContents.stop(); loadLocal(); } }, 12000);
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => { if (isMain && !local && url.startsWith('https:')) loadLocal(); });
  win.webContents.on('did-finish-load', () => clearTimeout(timer));
  win.loadURL(ONLINE_URL).catch(loadLocal);
}

const menu = Menu.buildFromTemplate([
  { label: 'File', submenu: [{ label: 'Ricarica', role: 'reload' }, { type: 'separator' }, { label: 'Esci', role: 'quit' }] },
  { label: 'Visualizza', submenu: [{ label: 'Ingrandisci', role: 'zoomIn' }, { label: 'Riduci', role: 'zoomOut' }, { label: 'Dimensione reale', role: 'resetZoom' }, { type: 'separator' }, { label: 'Schermo intero', role: 'togglefullscreen' }, { label: 'Strumenti per sviluppatori', role: 'toggleDevTools' }] },
  { label: 'Aiuto', submenu: [{ label: 'Sito di ElettroSim', click: () => shell.openExternal(ONLINE_URL) }, { label: 'Scarica aggiornamenti', click: () => shell.openExternal('https://github.com/mattcoc/ElettroSim/releases/latest') }] },
]);

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { const w = BrowserWindow.getAllWindows()[0]; if (w) { if (w.isMinimized()) w.restore(); w.focus(); } });
  app.whenReady().then(() => {
    // user agent da browser normale (Google blocca l'accesso dai programmi che si dichiarano Electron)
    app.userAgentFallback = app.userAgentFallback.replace(/\s(Electron|elettrosim|ElettroSim)\/\S+/g, '') + ' ElettroSimDesktop';
    Menu.setApplicationMenu(menu);
    serveLocal();
    createWindow();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
