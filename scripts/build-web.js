// Copies the web game into ./www (Capacitor's webDir).
const fs = require('fs'), path = require('path');
const out = 'www'; fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out + '/js', { recursive: true });
for (const f of ['index.html', 'style.css', 'manifest.json', 'icon.svg', 'sw.js']) fs.copyFileSync(f, path.join(out, f));
for (const f of fs.readdirSync('js')) fs.copyFileSync('js/' + f, path.join(out, 'js', f));
console.log('web built into ./www');
