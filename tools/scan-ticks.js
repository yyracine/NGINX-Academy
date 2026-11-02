const s = require('fs').readFileSync(process.argv[2], 'utf8').split('\n');
let unescaped = 0;
s.forEach((l, i) => {
  let n = 0;
  for (let j = 0; j < l.length; j++) {
    if (l[j] === '`' && (j === 0 || l[j - 1] !== '\\')) n++;
  }
  unescaped += n;
  if (n % 2 === 1) console.log((i + 1) + '  impair=' + n + '  |' + l.slice(0, 90));
});
console.log('backticks non échappés au total:', unescaped);