// Controlla che sito e programma desktop abbiano lo stesso numero di versione.
// Uso: node tools/check-version.js   (lo esegue anche il workflow della versione desktop)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const found = {
  'js/version.js': (/APP_VERSION\s*=\s*'([^']+)'/.exec(read('js/version.js')) || [])[1],
  'version.json': JSON.parse(read('version.json')).version,
  'desktop/package.json': JSON.parse(read('desktop/package.json')).version,
  'desktop/src-tauri/Cargo.toml': (/^version\s*=\s*"([^"]+)"/m.exec(read('desktop/src-tauri/Cargo.toml')) || [])[1],
};
const vals = new Set(Object.values(found));
for (const [f, v] of Object.entries(found)) console.log(`${v || '?'}\t${f}`);
if (vals.size !== 1 || vals.has(undefined)) { console.error('Le versioni non coincidono: aggiornale tutte allo stesso numero.'); process.exit(1); }
console.log('Versione', [...vals][0], 'coerente in tutti i file.');
