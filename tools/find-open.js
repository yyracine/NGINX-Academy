// Analyseur lexical léger : repère la construction ouverte à la fin du fichier
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const L = src.split('\n');
const stack = []; // {ch, pos, line}
const report = [];
let tempDepth = 0;
function open(ch, i, line, desc) {
  stack.push({ ch, idx: stack.length, desc: desc || ch });
  if (ch === '`') tempDepth++;
}
for (let li = 0; li < L.length; li++) {
  const line = L[li];
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    const top = stack[stack.length - 1];
    if (top && top.ch === '`') {
      // mode template literal
      if (c === '\\') { j++; continue; }
      if (c === '`') { stack.pop(); tempDepth--; continue; }
      if (c === '$' && line[j + 1] === '{') {
        // interpolation : on pousse un marqueur et on traite comme code
        stack.push({ ch: '${', idx: stack.length, line: li });
        j++;
      }
      continue;
    }
    if (top && top.ch === '${') {
      if (c === '\\') { j++; continue; }
      if (c === '{') { stack.push({ ch: '{', idx: stack.length, line: li }); continue; }
      if (c === '}') { stack.pop(); continue; }
      if (c === "'" || c === '"' || c === '`') { stack.push({ ch: c, idx: stack.length, line: li }); continue; }
      continue;
    }
    if (top && (top.ch === "'" || top.ch === '"')) {
      if (c === '\\') { j++; continue; }
      if (c === top.ch) stack.pop();
      continue;
    }
    if (top && top.ch === '//') {
      if (c === '\n') stack.pop();
      continue;
    }
    // commentaire de ligne
    if (c === '/' && line[j + 1] === '/' && !(top && top.ch === '`')) { stack.push({ ch: '//', idx: stack.length, line: li }); j++; continue; }
    if (c === "'" || c === '"' || c === '`') { open(c, j, li); continue; }
    if (c === '(' || c === '[' || c === '{') { open(c, j, li, c); continue; }
    if (c === ')' || c === ']') {
      if (top && top.ch === '(') stack.pop();
      else report.push(`'${c}' sans ouverture ligne ${li + 1}`);
      continue;
    }
    if (c === '}') {
      if (top && top.ch === '{') stack.pop();
      else if (top && top.ch === '${') stack.pop();
      else report.push(`'}' sans ouverture ligne ${li + 1}`);
    }
  }
}
console.log('Constructions ouvertes en fin de fichier :');
if (!stack.length) console.log('  (aucune)');
stack.forEach((s, i) => console.log(`  ${i + 1}. ${s.ch}  ouvert ligne ${s.line + 1}`));
console.log('Erreurs de fermeture :');
console.log(report.length ? report.join('\n') : '  (aucune)');