// Cherche les séquences "\`" avec un nombre impair de backslashes avant le backtick
// (causent une fermeture involontaire de template literal) et les \` à préfixe double-antislash.
const fs = require('fs');
for (const f of process.argv.slice(2)) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  let nb = 0;
  lines.forEach((l, i) => {
    for (let j = 0; j < l.length; j++) {
      if (l[j] !== '`') continue;
      let bs = 0;
      for (let k = j - 1; k >= 0 && l[k] === '\\'; k--) bs++;
      if (bs > 0 && bs % 2 === 0) {
        // pair nombre d'antislash : le backtick est RÉEL (non échappé)
        nb++;
        if (bs >= 2) console.log(`${f}:${i + 1} antislash-pair=${bs} |${l.slice(Math.max(0, j - 24), j + 14).replace(/\\/g, 'BS')}|`);
      }
    }
  });
  console.log(`${f}: ${nb} backticks réels tombant à un endroit impair`);
}