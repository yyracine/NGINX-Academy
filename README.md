# Nginx Academy 🎓

> Apprendre **NGINX de A à Z** — cours interactif progressif, en français, pour Linux **et** Windows.

Une académie complète et autonome : leçons détaillées, quiz interactifs, exercices de difficulté croissante, bac à sable de configuration et projets d'évaluation. Installable en **PWA** (fonctionne hors connexion).

**🌐 Lien : https://yyracine.github.io/NGINX-Academy/**

---

## 📚 Contenu

| # | Module | Thème |
|---|--------|-------|
| 1 | 🌐 Les fondamentaux du web | HTTP, requêtes/réponses, serveurs web, rôle de NGINX |
| 2 | ⚙️ Syntaxe et structure | Blocs main/http/server/location, directives, variables |
| 3 | 🗂️ Serving statique | root, index, try_files, types MIME, autoindex, cache navigateur |
| 4 | 🔀 Reverse proxy | proxy_pass, en-têtes, WebSocket, timeouts |
| 5 | ⚖️ Load balancing | upstream, algorithmes, health checks, retries |
| 6 | 🔒 TLS / HTTPS | Certificats, redirection, HSTS, TLS 1.3, en-têtes de sécurité |
| 7 | ↪️ Redirections | return vs rewrite, matching des locations, regex, map |
| 8 | 🚀 Cache et performance | proxy_cache, gzip/brotli, expires, HTTP/2, tuning |
| 9 | 🛡️ Sécurité approfondie | Basic Auth, rate limiting, contrôle IP, headers, hardening |
| 10 | 📊 Logs et monitoring | log_format, stub_status, analyse, observabilité |
| 11 | 🏆 Projets d'évaluation | 3 projets complets + kit de correction |

**Chiffres :** 60 leçons · 198 questions de quiz · 113 exercices (QCM, ordre, configurations) · 3 projets notés · ~70 termes au lexique.

## ✨ Fonctionnalités

- 🧠 **Parcours progressif** : chaque leçon = cours + quiz + exercices de difficulté croissante.
- 🛠️ **Bac à sable de configuration** : éditeur intégré + mini-linter (blocs, `;`, directives, contextes) + schéma des blocs — un entraînement avant `nginx -t`.
- 📈 **Progression sauvegardée** localement (localStorage), certificat de fin de parcours.
- 🧑🏫 **Kit de correction** des 3 projets : barèmes 0-3 détaillés, commandes de vérification, erreurs fréquentes.
- 📱 **PWA** : installable, fonctionne hors connexion.
- 🐧🪟 **Linux & Windows** : chemins, commandes et services explicités pour chaque OS.

## 🚀 Démarrage rapide

```bash
# Servir l'app localement (Python 3)
cd nginx-academy
python -m http.server 8123 --bind 127.0.0.1
# puis ouvrir http://127.0.0.1:8123/
```

Ou simplement **double-cliquer `index.html`** (sauf installation PWA / mode hors-ligne).

## 🧪 Tests

```bash
node tools/smoke.js   # valide données, quiz, exercices, linter et typographie
```

## 🏗️ Architecture

PWA statique 100 % vanilla JS, sans framework ni build :

```
index.html          Squelette + scripts
js/app.js           Moteur (progression, routage hash, rendu, certificat)
js/md.js            Mini-parseur Markdown
js/nginx-lint.js    Linter de configuration nginx
js/sandbox.js       Bac à sable d'édition
js/quiz.js          Moteur quiz + exercices (mcq / order / config)
js/data1…10.js      Contenu des 10 modules (leçons + quiz + exercices)
js/guide.js         Guide d'utilisation
js/lexique.js       Lexique (~70 termes)
js/correction.js    Kit de correction des projets
sw.js               Service worker (app-shell cache-first)
manifest.webmanifest
```

## 📄 Licence

Usage libre pour l'apprentissage personnel et l'enseignement.
