// Copia i file del sito in desktop/web, da cui l'app desktop li carica quando è offline.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'web');
const ITEMS = ['index.html', 'login.html', 'version.json', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'css', 'js', 'fonts', 'vendor'];
fs.rmSync(OUT, { recursive: true, force: true });
for (const it of ITEMS) fs.cpSync(path.join(ROOT, it), path.join(OUT, it), { recursive: true });
console.log('File del sito copiati in', OUT);
