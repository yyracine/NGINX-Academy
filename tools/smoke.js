// Smoke test : charge données + moteurs (sans DOM), rend chaque leçon, teste le linter.
global.window = {};
require('../js/md.js');
require('../js/nginx-lint.js');
require('../js/data.js');
require('../js/data1.js');
require('../js/data1b.js');
require('../js/data2.js');
require('../js/data3.js');
require('../js/data4.js');
require('../js/data5.js');
require('../js/data6.js');
require('../js/data7.js');
require('../js/data8.js');
require('../js/data9.js');
require('../js/data10.js');
require('../js/lexique.js');
require('../js/correction.js');
require('../js/guide.js');

let errs = [];
let lessons = 0, quizzes = 0, exs = 0, projs = (window.PROJECTS || []).length;

try { const g = window.mdParse(window.GUIDE_MD); if (!g || g.length < 100) errs.push('guide vide'); } catch (e) { errs.push('mdParse a échoué sur le guide: ' + e.message); }
if (!window.LEXIQUE || window.LEXIQUE.length < 30) errs.push('lexique trop court: ' + (window.LEXIQUE||[]).length);
if (!window.KIT || window.KIT.length !== 3) errs.push('kit de correction absent: ' + (window.KIT||[]).length);
window.KIT.forEach((p, i) => { if (!p.grille || !p.grille.every(g => g.crit && g.bar && g.bar.length === 4)) errs.push('kit projet ' + p.id + ' : grille invalide'); if (!p.verifs || !p.verifs.length) errs.push('kit projet ' + p.id + ' : verifs manquantes'); });

// Typographie : apostrophes ASCII entre deux lettres interdites (sauf Let's Encrypt)
const TYPO = /([A-Za-zÀ-ÖØ-öø-ÿ])'([A-Za-zÀ-ÖØ-öø-ÿ])/;
for (const f of ['data1', 'data1b', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data8', 'data9', 'data10', 'guide', 'lexique']) {
  const src = require('fs').readFileSync('js/' + f + '.js', 'utf8');
  const cleaned = src.split("Let's").join('');
  if (TYPO.test(cleaned)) errs.push('apostrophe ASCII entre lettres dans js/' + f + '.js');
}
window.LEXIQUE.forEach((e, i) => { if (!e || e.length !== 3 || e[0].length !== 1 || !String(e[1]) || String(e[2]).length < 10) errs.push('entrée lexique invalide: index ' + i); });
window.MODULES.filter(m => m.id !== 'projets').forEach(m => { if (!m.project || !m.project.objectives || !m.project.objectives.length) errs.push('module sans projet: ' + m.id); });
for (const m of window.MODULES) {
  for (const l of m.lessons) {
    lessons++;
    quizzes += (l.quiz || []).length;
    exs += (l.exercises || []).length;
    try {
      const html = window.mdParse(l.content);
      if (!html || html.length < 40) errs.push(`contenu vide: ${m.id}/${l.id}`);
      // vérifie l'équilibre des blocs <pre> ouverts/fermés
      const open = (html.match(/<pre>/g) || []).length;
      const close = (html.match(/<\/pre>/g) || []).length;
      if (open !== close) errs.push(`fences déséquilibrées: ${m.id}/${l.id} (${open}/${close})`);
      for (const q of l.quiz || []) {
        if (!q.correct || !q.correct.length) errs.push(`quiz sans correct: ${m.id}/${l.id} :: ${q.q.slice(0, 40)}`);
        if (q.correct.some((c) => c >= q.options.length)) errs.push(`correct hors bornes: ${m.id}/${l.id}`);
      }
      for (const ex of l.exercises || []) {
        if (!ex.title || !String(ex.title).trim()) errs.push(`exercice sans titre: ${m.id}/${l.id}`);
        if (!ex.prompt || !String(ex.prompt).trim()) errs.push(`exercice sans prompt: ${m.id}/${l.id} :: ${ex.title}`);
        if (ex.type === 'order' && (!ex.items || !ex.items.length)) errs.push(`order vide: ${m.id}/${l.id}`);
        if (ex.type === 'config' && (!ex.required || !ex.required.length)) errs.push(`config sans required: ${m.id}/${l.id}`);
        if (ex.type === 'mcq' && (!ex.answer || !ex.answer.length)) errs.push(`mcq sans answer: ${m.id}/${l.id}`);
      }
    } catch (e) {
      errs.push(`mdParse a échoué: ${m.id}/${l.id} => ${e.message}`);
    }
  }
}

// Linter : configs
const L = window.NginxLint;
const good = `
events { worker_connections 1024; }
http {
  include mime.types;
  server {
    listen 80 default_server;
    server_name site-a.local;
    root /var/www/site-a;
    location / { try_files $uri $uri/ =404; }
  }
}
`;
const bad = `
http {
  server {
    root /var/www;   # pas de ;
`;
const rGood = L.validate(good);
const rBad = L.validate(bad);
if (!rGood.ok) errs.push(`linter rejette une config valide: ${JSON.stringify(rGood.errors)}`);
if (rBad.ok) errs.push('linter accepte une config invalide (point-virgule manquant / bloc ouvert)');
const rCtx = L.validate('events { worker_connections 1024; }\nhttp { listen 80; }');
if (rCtx.errors.length === 0) errs.push('linter ne détecte pas listen hors server');

console.log(`Leçons: ${lessons} | Quiz: ${quizzes} | Exercices: ${exs} | Projets: ${projs}`);
console.log('Modules avec contenu:', window.MODULES.filter((m) => m.lessons.length).map((m) => m.id).join(', '));
console.log('Linter: valide-OK =', rGood.ok, '| invalide-rejeté =', !rBad.ok, '| contexte détecté =', !!rCtx.errors.length);
console.log(errs.length ? 'ERREURS:\n' + errs.join('\n') : '✅ TOUT EST BON');
process.exit(errs.length ? 1 : 0);