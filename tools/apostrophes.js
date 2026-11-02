// Convertit les apostrophes ASCII ' en U+2019 UNIQUEMENT dans :
//  - les corps de template literals (contenu des leçons)
//  - les chaînes JS mono-guillemets (valeurs q/prompt/explain/...)
// Le code (ids, clés) reste en ASCII.
const fs = require('fs');
const TY = '\u2019';
for (const f of process.argv.slice(2)) {
  const src = fs.readFileSync(f, 'utf8');
  let out = '';
  let st = 'N'; // N normal, T template, S single-quote, D double-quote
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1] || '';
    if (st === 'T') {
      if (c === '\\') { out += c + next; i += 2; continue; }
      if (c === '`' && (i === 0 || src[i - 1] === '\n')) { st = 'N'; out += c; i++; continue; }
      if (c === "'") { out += TY; i++; continue; }
      out += c; i++; continue;
    }
    if (st === 'S') {
      if (c === '\\') { out += c + next; i += 2; continue; }
      if (c === "'") { st = 'N'; out += c; i++; continue; }
      if (c === "'") { out += TY; i++; continue; }
      out += c; i++; continue;
    }
    if (st === 'D') {
      if (c === '\\') { out += c + next; i += 2; continue; }
      if (c === '"') { st = 'N'; }
      out += c; i++; continue;
    }
    // NORMAL
    if (c === "'") { st = 'S'; out += c; i++; continue; }
    if (c === '"') { st = 'D'; out += c; i++; continue; }
    if (c === '`') { st = 'T'; out += c; i++; continue; }
    out += c; i++;
  }
  fs.writeFileSync(f, out);
  console.log(`OK ${f} (${src.length} -> ${out.length} octets)`);
}