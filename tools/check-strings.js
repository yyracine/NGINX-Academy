// Vérifie l'équilibre des template literals dans un fichier JS
const fs = require('fs');
const file = process.argv[2];
const src = fs.readFileSync(file, 'utf8');
const lines = src.split('\n');
let bal = 0; // profondeur template literal
let state = 'code'; // code | double | single | comment | template
let errs = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    const prev = j > 0 ? line[j - 1] : '';
    if (state === 'comment') {
      if (ch === '\n') state = 'code';
      continue;
    }
    if (state === 'double') {
      if (ch === '"' && prev !== '\\') state = 'code';
      continue;
    }
    if (state === 'single') {
      if (ch === "'" && prev !== '\\') state = 'code';
      continue;
    }
    if (state === 'template') {
      if (ch === '`' && prev !== '\\') {
        if (line[j + 1] === '$' && line[j + 2] === '{') { /* ${...} normal */ continue; }
        state = 'code';
        bal--;
      } else if (ch === '$' && line[j + 1] === '{') {
        // interpolation simple (pas de récursion) — on saute
        const end = line.indexOf('}', j);
        if (end > -1) { j = end; }
      }
      continue;
    }
    // code
    if (ch === '/' && line[j + 1] === '/') { state = 'comment'; j++; continue; }
    if (ch === '"') { state = 'double'; continue; }
    if (ch === "'") { state = 'single'; continue; }
    if (ch === '`') { state = 'template'; bal++; }
  }
}
console.log('niveau template final (0 = OK) :', bal);
if (bal !== 0) errs.push('Template literals non équilibrés');
if (state === 'template') errs.push('Fichier se termine DANS une template literal');
if (state === 'single') errs.push('Fichier se termine dans une chaîne simple');
if (state === 'double') errs.push('Fichier se termine dans une chaîne double');
console.log(errs.length ? 'PROBLÈMES:\n' + errs.join('\n') : 'Structure des chaînes : OK');
process.exit(errs.length ? 1 : 0);