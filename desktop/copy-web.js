// Copia i file del sito in desktop/web: è la copia dell'app inclusa nel programma, usata quando il sito non è raggiungibile.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'web');
const ITEMS = ['index.html', 'login.html', 'version.json', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'css', 'js', 'fonts', 'vendor'];
fs.rmSync(OUT, { recursive: true, force: true });
for (const it of ITEMS) fs.cpSync(path.join(ROOT, it), path.join(OUT, it), { recursive: true });
console.log('File del sito copiati in', OUT);
