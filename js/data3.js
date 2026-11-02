/* Module 3 — Serving de contenu statique */
(function () {
  'use strict';
  const M = window.MODULES.find((m) => m.id === 'statique');
  if (!M) return;

  M.lessons.push({
    id: 'root-index-alias',
    title: 'root, index et alias',
    excerpt: 'Où NGINX cherche-t-il les fichiers ? root vs alias, index.',
    content: `
# root, index et alias

Le serveur statique est l’ADN de NGINX : servir des fichiers le plus vite possible. Tout commence par la question **« où est le fichier ? »**.

> [!info] **Chemins selon ton OS** : /var/www/site est un exemple Linux. Sur Windows, utilise C:/nginx/html/site (ou un dossier de ton choix) : la configuration ne change pas, seul le chemin varie.

## root : le point d’ancrage

\`root\` définit le dossier de base : le chemin d’URL vient se **coller derrière**.

\`\`\`nginx
server {
    server_name example.com;
    root /var/www/site;        # ici, fichier = /var/www/site + URI

    location / {
        # /index.html  → /var/www/site/index.html
        # /css/app.css → /var/www/site/css/app.css
        # /blog/1      → /var/www/site/blog/1  (…puis 404 si absent)
    }
}
\`\`\`

L’URL = \`root\` + \`$uri\`. Classique et intuitif.

## index : le fichier par défaut

Quand l’URI aboutit à un **dossier**, NGINX essaie les fichiers \`index\` dans l’ordre :

\`\`\`nginx
index index.html index.htm;
# /           → /var/www/site/index.html
# /blog/      → /var/www/site/blog/index.html (si présent)
\`\`\`

> [!warn] Sans \`index\` et sans \`autoindex on\`, un dossier sans fichier index renvoie \`403 Forbidden\` (ou \`404\` selon la config).

## alias : le découplage réinventé

\`alias\` **remplace** le chemin d’URL par un autre chemin fichier.

\`\`\`nginx
location /downloads/ {
    alias /var/www/files/;
    # /downloads/a.zip → /var/www/files/a.zip
}

location /avatars/ {
    alias /storage/avatars/;   # le dossier source n’a rien à voir avec l’URL
}
\`\`\`

| | root | alias |
|---|---|---|
| Sémantique | root + URI = fichier | URI remplacé par alias |
| Chemin | \`root /var/www; location /x/ { } → /var/www/x/...\` | \`alias /data/; location /x/ { } → /data/...\` |
| Usage | 95 % des cas | fichiers hors arborescence, URLs renommées |

> [!warn] Piège n°1 du web : dans \`location /images/ { alias /data/pics; }\`, l’URL \`/images/a.png\` donne \`/data/pics/a.png\` — **sans** le \`/\` final, ce serait \`/data/picsa.png\`. L’oubli du slash final est LA faute classique d’alias.

## Hiérarchie réelle : un exemple complet

\`\`\`nginx
server {
    listen 80;
    server_name docs.local;
    root /srv/docs;

    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    location /assets/ {
        alias /srv/shared-assets/;   # partagé entre plusieurs sites
        expires 30d;
    }
}
\`\`\`

- \`/index.html\` → \`/srv/docs/index.html\`
- \`/assets/logo.svg\` → \`/srv/shared-assets/logo.svg\` (alias)
- \`/manuel/intro.html\` → \`/srv/docs/manuel/intro.html\` (root)
`
  });

  M.lessons[0].quiz = [
    {
      q: 'Avec « root /var/www/site; », à quel fichier correspond /css/app.css ?',
      options: ['/var/www/css/app.css', '/var/www/site/css/app.css', '/var/www/site/css/app.css/', '/var/www/site/app.css'],
      correct: [1],
      explain: 'root + URI = /var/www/site/css/app.css.'
    },
    {
      q: 'Que fait la directive index ?',
      options: ['Elle trie les fichiers par nom', 'Elle choisit le fichier servi quand l’URI est un dossier', 'Elle définit la page d’erreur', 'Elle active l’indexation par Google'],
      correct: [1],
      explain: '/ → index.html (ou les suivants, dans l’ordre de la liste).'
    },
    {
      q: 'location /downloads/ { alias /var/www/files/; } — où est /downloads/doc.pdf ?',
      options: ['/var/www/files/doc.pdf', '/var/www/files/downloads/doc.pdf', '/var/www/files/downloads/doc.pdf/', '/var/www/doc.pdf'],
      correct: [0],
      explain: 'alias remplace le préfixe d’URL par un autre chemin : le slash final compte !'
    },
    {
      q: 'Pourquoi le slash final d’alias est-il critique ?',
      options: ['Il accélère la lecture', 'Sans lui le nom du dossier s’incruste dans le fichier résultant', 'Il est requis par la syntaxe nginx', 'Il active le mode binaire'],
      correct: [1],
      explain: 'Sans /, « pics » se colle au nom de fichier (picsa.png). C’est l’écueil n°1 d’alias.'
    }
  ];

  M.lessons[0].exercises = [
    {
      type: 'mcq', diff: 'easy', title: 'root ou alias ?',
      prompt: 'Des avatars sont stockés dans /storage/avatars mais l’URL publique est /avatars/. Quelle directive utiliser ?',
      options: ['root /storage/avatars;', 'alias /storage/avatars/;', 'index /storage/avatars;', 'try_files /storage/avatars;'],
      answer: [1],
      explain: 'L’URL ne correspond pas à l’arborescence : alias découple les deux.'
    }
  ];

  M.lessons.push({
    id: 'try-files',
    title: 'try_files : le couteau suisse',
    excerpt: 'Essayer plusieurs chemins, garder l’URL : la base des SPA.',
    content: `
# try_files : le couteau suisse

\`try_files\` tente une **liste de chemins** l’un après l’autre : le premier qui **existe** est servi. En dernier argument, une **cible finale** (fichier, \`=code\`, ou \`@location\`) s’il n’y a aucune correspondance.

## Syntaxe

\`\`\`nginx
try_files $uri $uri/ =404;
\`\`\`

Lecture : « essaie \`$uri\` (fichier), puis \`$uri/\` (dossier → index), sinon renvoie 404 ».

## Les trois usages majeurs

### 1. Fichier, dossier, sinon 404 (classique)

\`\`\`nginx
location / {
    try_files $uri $uri/ =404;
}
\`\`\`

### 2. Fallback vers un fichier : les SPA (single-page apps)

Une app React/Vue/Angular : toutes les routes (\`/dashboard\`, \`/settings\`) doivent servir \`index.html\`, car c’est le JS qui fait le routage.

\`\`\`nginx
location / {
    root /srv/app/dist;
    try_files $uri $uri/ /index.html;   # dernier argument = fichier de repli
}
\`\`\`

\`/dashboard\` → index.html expédié → le navigateur charge l’app → le JS affiche le bon écran.

> [!warn] Le repli sur \`index.html\` pour TOUT peut masquer de vraies erreurs 404 à l’API. On réserve ce pattern aux sous-routes de l’app, jamais à \`/api/\`.

### 3. Redirection interne vers une location (named location)

\`\`\`nginx
location / {
    try_files $uri @fallback;      # @fallback = location nommée (jamais servie directement)
}
location @fallback {
    return 404;                    # ou proxy_pass, ou rewrite…
}
\`\`\`

Les locations \`@nom\` sont des **redirections internes** : le cycle se rejoue dans le worker, sans nouveau round-trip réseau.

## Fichier inexistant → quoi ?

Par défaut : \`404\` avec la page standard. Le module suivant vous montre \`error_page\` pour personnaliser.

> [!tip] \`$uri/\` déclenche une redirection interne vers le dossier (trailing slash) puis \`index\` si présent. Avec \`autoindex on;\`, il liste le dossier à la place.
`
  });

  M.lessons[1].quiz = [
    {
      q: 'Que fait « try_files $uri $uri/ =404; » si $uri n’existe pas ?',
      options: ['Il crée le fichier', 'Il essaie $uri/ puis renvoie 404', 'Il redirige vers la page d’accueil', 'Il liste le dossier'],
      correct: [1],
      explain: 'Liste de tentatives + cible finale en dernier argument.'
    },
    {
      q: 'Pourquoi une SPA utilise-t-elle « try_files $uri $uri/ /index.html; » ?',
      options: ['Pour cacher les fichiers', 'Pour que toute route serve l’app : le JS gère le routage', 'Pour accélérer le chargement', 'Pour compresser les fichiers'],
      correct: [1],
      explain: 'Le serveur ne connaît pas les routes du client : tout tombe sur index.html, et l’app route elle-même.'
    },
    {
      q: 'Qu’est-ce qu’une « named location » @fallback ?',
      options: ['Une location protégée par mot de passe', 'Une location qu’on ne peut pas atteindre par une URL, seulement par try_files', 'Une location en cache', 'Un alias d’alias'],
      correct: [1],
      explain: '@nom s’utilise comme cible de try_files / error_page : redirection interne, jamais d’URL directe.'
    },
    {
      q: 'Quel dernier argument renvoie un code 404 sans page ?',
      options: ['=403', '=404', '@404', '404;'],
      correct: [1],
      explain: '« =code » génère la réponse avec ce code directement.'
    }
  ];

  M.lessons[1].exercises = [
    {
      type: 'mcq', diff: 'medium',
      title: 'La bonne séquence try_files',
      prompt: 'Pour un site classique (fichiers à la racine), quelle est la séquence try_files correcte ?',
      options: ['try_files /index.html $uri $uri/;', 'try_files $uri $uri/ =404;', 'try_files $uri =404 $uri/;', 'try_files =404 $uri $uri/;'],
      answer: [1],
      explain: 'D’abord le fichier, puis le dossier (index), sinon 404.'
    }
  ];
})();

/* --- Leçon 3 : MIME, charset, autoindex --- */
(function addL3_3() {
  const M = window.MODULES.find((m) => m.id === 'statique');
  const L = {
    id: 'mime-autoindex',
    title: 'Types MIME, charset et autoindex',
    excerpt: 'Content-Type correct, listing de dossiers, sécurité des fichiers.',
    content: `
# Types MIME, charset et autoindex

## Les types MIME : l’étiquette des fichiers

Pour chaque extension, NGINX associe un \`Content-Type\` via \`mime.types\`. Sans cette étiquette, aucun navigateur ne sait interpréter la réponse.

\`\`\`text
.html  → text/html
.css   → text/css
.js    → text/javascript
.json  → application/json
.png   → image/png
.svg   → image/svg+xml
\`\`\`

\`default_type\` est le **filet** : ce qui ne matche aucune extension. Sa valeur par défaut est \`text/plain\`, mais beaucoup de configs posent :

\`\`\`nginx
default_type application/octet-stream;   # = « je ne sais pas : télécharge-le »
\`\`\`

> [!warn] Conséquence concrète : si vous servez un \`.json\` sans l’extension reconnue (ex. fichier \`config\`), le navigateur pourra le **télécharger** au lieu de l’afficher. Vérifiez \`mime.types\` et ajoutez vos types : \`types { application/x-custom conf; }\` dans \`http\`.

## charset : l’encodage des textes

\`\`\`nginx
charset utf-8;              # ajoute "Content-Type: text/html; charset=utf-8"
charset_types text/html text/css;   # applique le charset à ces types seulement
\`\`\`

Sans \`charset\`, les pages avec accents peuvent s’afficher en mojibake si le document ne déclare rien. Déclarer \`charset utf-8;\` au niveau \`http\` évite bien des soucis.

## autoindex : lister les dossiers

\`\`\`nginx
location /downloads/ {
    alias /srv/pub/;
    autoindex on;           # liste le contenu du dossier
    autoindex_exact_size off;   # tailles arrondies (plus lisible)
    autoindex_format html;  # html | json | xml
}
\`\`\`

> [!warn] L’autoindex public expose l'**intégralité** d’une arborescence : à réserver aux zones volontairement publiques (miroirs, artefacts de build), jamais au code source.

## Bien servir sans fuites

Quelques réflexes : \`index\` limité, pas de \`autoindex\` par défaut, \`charset\` posé en haut (\`http\`), et \`server_tokens off\`.

> [!tip] Notez \`linear\` : un fichier \`.git/\` non protégé se télécharge sans gêne. Interdisez-le en règle générale : \`location ~ /\\.git { deny all; }\` — vu en détail au module Sécurité.
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'À quoi sert le fichier mime.types ?',
      options: ['À limiter la taille des fichiers', 'À associer chaque extension à un Content-Type', 'À gérer les erreurs 404', 'À définir les certificats'],
      correct: [1],
      explain: 'C’est la table de conversion extension → type MIME.'
    },
    {
      q: 'Que se passe-t-il pour un fichier sans extension reconnue si default_type est application/octet-stream ?',
      options: ['NGINX le refuse', 'Le navigateur tend à le télécharger', 'Il est affiché en texte', 'Il est compressé automatiquement'],
      correct: [1],
      explain: 'Le type « octet-stream » = données binaires inconnues → téléchargement.'
    },
    {
      q: 'Que fait « charset utf-8; » ?',
      options: ['Compresse le texte', 'Ajoute le charset au Content-Type des réponses textes', 'Traduit le site', 'Active la recherche plein texte'],
      correct: [1],
      explain: 'Il enrichit l’en-tête Content-Type : text/html; charset=utf-8.'
    },
    {
      q: 'Quel danger principal de « autoindex on; » ?',
      options: ['Il ralentit le serveur', 'Il expose publiquement le contenu du dossier', 'Il casse les URLs', 'Il interdit les téléchargements'],
      correct: [1],
      explain: 'Liste complète et téléchargeable : à réserver aux zones publiques voulues.'
    }
  ];

  L.exercises = [
    {
      type: 'mcq', diff: 'easy', title: 'Diagnostic MIME',
      prompt: 'Un fichier « data.config » s’ouvre en téléchargement au lieu d’apparaître. Quelle est la solution propre ?',
      options: ['Renommer en data.txt', 'Ajouter le type dans un bloc types { … }', 'Mettre autoindex on', 'Désactiver charset'],
      answer: [1],
      explain: 'Déclarez le type personnalisé : types { application/x-custom config; }.'
    }
  ];
})();

/* --- Leçon 4 : cache navigateur --- */
(function addL3_4() {
  const M = window.MODULES.find((m) => m.id === 'statique');
  const L = {
    id: 'cache-navigateur',
    title: 'Cache navigateur : expires, Cache-Control, ETag',
    excerpt: 'Faire garder les fichiers par le navigateur : un site 10× plus rapide.',
    content: `
# Cache navigateur : expires, Cache-Control, ETag

Un site « ressenti rapide » = le navigateur **garde** les fichiers et ne les redemande pas. NGINX pilote cela via les en-têtes de cache.

## Les deux en-têtes à connaître

- \`Cache-Control\` — la politique moderne (\`max-age\`, \`no-cache\`, \`immutable\`…).
- \`Expires\` — la date d’expiration (ancien, encore honoré).

## expires : la directive magique

\`\`\`nginx
location /assets/ {
    expires 30d;            # Cache-Control: max-age=2592000
}

location / {
    expires -1;             # pas de cache : max-age=0
}
\`\`\`

\`expires\` accepte : \`off\`, \`epoch\`, \`-1\` (pas de cache), \`max\` (10 ans), ou une durée (\`1h\`, \`7d\`, \`1M\`).

## La bonne stratégie

| Type de fichier | Exemples | Cache |
|---|---|---|
| Statiques « immuables » | \`assets/logo-v3.png\`, \`dist/app-HASH.js\` | \`expires 1y; add_header Cache-Control "immutable";\` |
| Statiques versatiles | CSS/JS sans hash | \`expires 30d;\` |
| Pages HTML | index.html | \`expires -1;\` ou \`no-cache\` |
| API | /api/* | jamais de cache |

> [!info] \`immutable\` dit au navigateur : pendant max-age, **ne revalide même pas** (aucune requête), c’est le maximum du cache.

## ETag et revalidation

NGINX génère un \`ETag\` (empreinte du fichier) par défaut sur le statique. Quand le \`max-age\` expire, le navigateur fait une requête **conditionnelle** (\`If-None-Match\`) :

- fichier identique → réponse \`304 Not Modified\` (pas de corps) : rapide.
- fichier modifié → réponse 200 + nouveau corps.

\`\`\`nginx
etag on;                 # activé par défaut
if_modified_since exact; # garde cohérence ETag/Last-Modified
\`\`\`

> [!tip] Configurer \`expires\` par location, jamais globalement : chaque famille de fichiers a sa politique.

## Vérifier chez soi

\`\`\`bash
curl -I https://example.com/assets/app.js
# Cache-Control: max-age=2592000
# ETag: "5d8c72a9-2a1e"
# Last-Modified: ...
\`\`\`
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Que fait « expires 30d; » ?',
      options: ['Il purge le cache au bout de 30 jours', 'Il envoie Cache-Control: max-age=2592000', 'Il stocke la page sur le disque', 'Il limite l’accès à 30 jours'],
      correct: [1],
      explain: 'expires traduit une durée en Cache-Control max-age (en secondes).'
    },
    {
      q: 'Que renvoie le serveur quand un fichier n’a pas changé lors d’une revalidation ETag ?',
      options: ['200 avec le corps complet', '304 Not Modified, sans corps', '404 Not Found', '412 Precondition Failed'],
      correct: [1],
      explain: '304 = « garde ta copie » : pas de corps, réponse minimale.'
    },
    {
      q: 'Quelle politique pour index.html d’une SPA ?',
      options: ['expires 1y', 'expires -1 (ou no-cache)', 'expires 30s', 'JAMAIS de Cache-Control'],
      correct: [1],
      explain: 'L’HTML doit rester frais ; les assets hashés, eux, peuvent être immutables.'
    },
    {
      q: 'Pourquoi « immutable » sur les assets hashés ?',
      options: ['Ça les compresse', 'Le navigateur ne fait aucune requête pendant max-age', 'Ça les chiffre', 'Ça les rend inaccessibles'],
      correct: [1],
      explain: 'Hashé = invariable : pas besoin de revalider avant expiration.'
    }
  ];

  L.exercises = [
    {
      type: 'mcq', diff: 'medium', title: 'La bonne politique',
      prompt: 'Quel couple de configurations est cohérent pour un site vite ?',
      options: [
        'expires 1y partout',
        'assets hashés : expires 1y + immutable ; HTML : expires -1',
        'expires -1 sur les assets, max sur l’HTML',
        'Ne rien configurer, c’est optimisé par défaut'
      ],
      answer: [1],
      explain: 'Frais pour l’HTML, immuable pour les assets hashés : le combo classique.'
    }
  ];
})();

/* --- Leçon 5 : error_page --- */
(function addL3_5() {
  const M = window.MODULES.find((m) => m.id === 'statique');
  const L = {
    id: 'error-pages',
    title: 'error_page : de belles pages d’erreur',
    excerpt: '404, 50x personnalisés, mais un piège mortel avec les codes.',
    content: `
# error_page : de belles pages d’erreur

Par défaut, NGINX renvoie ses pages d’erreur minimalistes. \`error_page\` permet de servir **vos propres pages**.

## Syntaxe de base

\`\`\`nginx
error_page 404 /404.html;
error_page 500 502 503 504 /50x.html;

location = /404.html { internal; }
location = /50x.html { internal; }
\`\`\`

- \`/404.html\` est **interne** (\`internal\`) : accessible seulement par redirection interne, jamais par URL directe.
- Sans \`internal\`, n’importe qui pourrait « lire » votre page d’erreur… et surtout la config devient fragile.

## Le piège : changer le code de statut

\`error_page\` change la page servie, mais le **code de statut reste celui d’origine** — sauf si on le force avec \`=\` :

\`\`\`nginx
error_page 404 =200 /bonus.html;    # le client voit 200 (utile? dangereux!)
error_page 404 = /404.html;         # = (sans code) : garde le code 404
error_page 403 =301 /login;         # transforme un 403 en redirection
\`\`\`

> [!danger] \`error_page 404 =200 /index.html;\` pour « arranger » les 404 est un anti-pattern SEO : tout devient 200, les moteurs indexent des pages vides, et vos metrics de 404 sont fausses.

## error_page + try_files : le duo SPA

Pour une SPA : 404 → recharge la route client, mais 200 en surface ?

\`\`\`nginx
location / {
    try_files $uri $uri/ /index.html;   # repli SPA (200)
}
error_page 404 /index.html;             # tout de même un plan B pour les vrais 404
\`\`\`

Non : si \`/api/inexistant\` tombe dans ce 404 → on servira l’app HTML avec un statut 404. Selon l’API, on préférera du \`=404\` JSON pour \`/api/\`. D’où l’importance de **scoper les replis par location**.

## Vérifier

\`\`\`bash
curl -I http://localhost/mauvaise-page
# HTTP/1.1 404 Not Found        (votre page personnalisée en corps)
\`\`\`
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Sans « = » : « error_page 404 /404.html; » change quoi ?',
      options: ['Le code de statut', 'La page servie uniquement (le code 404 reste)', 'Le statut ET la page', 'Rien'],
      correct: [1],
      explain: 'La page change, le code reste celui du problème d’origine.'
    },
    {
      q: 'Que fait « error_page 404 =200 /index.html; » ?',
      options: ['Une belle 404', 'Sert index.html ET répond 200 : dangereux pour le SEO', 'Bloque le site', 'Redirige vers Google'],
      correct: [1],
      explain: 'Plus aucun 404 n’existe aux yeux des clients : mauvaises métriques, pages vides indexées.'
    },
    {
      q: 'Pourquoi marquer la page d’erreur « internal; » ?',
      options: ['Pour l’encrypter', 'Pour qu’elle soit servie uniquement en redirection interne', 'Pour la compresser', 'Pour la cacher du DNS'],
      correct: [1],
      explain: 'internal : jamais d’URL publique directe vers cette page.'
    },
    {
      q: 'Où servira-t-on des erreurs JSON pour une API ?',
      options: ['Dans la même location que la SPA', 'Dans une location /api/ scoped avec error_page dédié', 'On ne possède pas les erreurs API', 'Dans le bloc events'],
      correct: [1],
      explain: 'Scoper les replis : l’API ne doit pas renvoyer du HTML.'
    }
  ];

  L.exercises = [
    {
      type: 'config', diff: 'hard', title: 'Erreurs propres pour un site complet',
      prompt: 'Construis un server (port 80, server_name site.local, root /var/www/site) avec : location / (try_files $uri $uri/ =404), error_page 404 /404.html ; error_page 500 502 503 504 /50x.html ; et les deux locations internes correspondantes.',
      skeleton: '# server port 80, server_name site.local, root /var/www/site\n# + error_page + locations internes (internal)',
      required: ['server', 'listen', 'server_name', 'root', 'error_page', 'internal'],
      hint: 'location = /404.html { internal; }',
      explain: 'server { listen 80; server_name site.local; root /var/www/site; error_page 404 /404.html; error_page 500 502 503 504 /50x.html; location = /404.html { internal; } location = /50x.html { internal; } location / { try_files $uri $uri/ =404; } }'
    }
  ];

  M.project = {
    title: 'Mini-projet du module : ton site statique complet',
    goal: 'Produire un site statique multi-contenus avec cache efficace, belles erreurs et zéro fuite.',
    objectives: [
      'Un serveur virtuel site-cv.local (port 80) avec root dédié',
      'Structure propre : index.html, assets/, pages/ avec index adaptés',
      'try_files adapté (fichier, dossier, 404)',
      'Assets hashés avec expires 1y + immutable ; HTML en no-cache',
      'Pages 404.html et 50x.html personnalisées, locations internal',
      'alias pour une zone partagée hors arborescence (ex: /medias/)',
      'Vérifier avec curl : cache headers, 404, 200'
    ],
    answer: 'Voir la leçon « error_page » et « cache navigateur » pour les blocs de référence. Vérif : curl -I serveur.local/assets/app.js (max-age) ; curl -I serveur.local/nimporte (404) ; nginx -t avant reload.'
  };
})();

/* ============ Projets d’évaluation finaux ============ */
window.PROJECTS = [
  {
    id: 'p1',
    level: 'Facile → Intermédiaire',
    title: 'Projet 1 — Premier serveur, premier site',
    goal: 'Déployer un serveur NGINX qui sert un site vitrine statique propre : virtual host dédié, erreurs personnalisées, cache navigateur. (Chemins libres : /var/www/vitrine en Linux, C:/nginx/html/vitrine en Windows.)',
    objectives: [
      'Installer NGINX et valider avec nginx -v',
      'Créer /var/www/vitrine avec index.html, styles.css, assets/',
      'Créer un server block : port 80, server_name vitrine.local, root, index',
      'Personnaliser 404 et 50x (error_page + locations internal)',
      'Assets avec expires 1y + immutable, HTML en no-cache',
      'nginx -t puis reload ; vérifier avec curl (headers, 404)',
      'Ajouter un alias pour /medias/ pointant hors de root'
    ],
    grid: [
      'Installation et démarrage corrects (5 pts)',
      'Virtual host fonctionnel : vitrine.local sert le bon contenu (10 pts)',
      'Erreurs personnalisées + internal corrects (10 pts)',
      'Politique de cache cohérente, vérifiée par curl (10 pts)',
      'alias /medias/ fonctionnel (5 pts)',
      'Rapport : commandes, config finale, tests (10 pts)'
    ],
    answer: 'Points clés : listen 80; server_name vitrine.local; root /var/www/vitrine; index index.html; error_page 404 /404.html + location = /404.html { internal; }; expires 1y sur /assets/ (hashés) ; expires -1 sur l’HTML ; nginx -t avant chaque reload. Le rapport doit montrer les tests curl et les logs.'
  },
  {
    id: 'p2',
    level: 'Intermédiaire → Avancé',
    title: 'Projet 2 — SPA + reverse proxy + hôte partagé',
    goal: 'Architecture type production sur une machine : une SPA servie statiquement, une API Node derrière un reverse proxy, deux domaines sur la même IP.',
    objectives: [
      'SPA (fichiers dist/) servie avec repli try_files vers index.html',
      '/api/* proxy_pass vers un backend local (ex: 127.0.0.1:3000)',
      'proxy_set_header Host, X-Real-IP, X-Forwarded-For propres',
      'Second server block : domain2.local avec sa propre racine',
      'Un bloc sert de default_server explicite',
      'Limiter le client_max_body_size pour l’API (ex: 2m)',
      'Vérifier : SPA, API, vhosts par curl avec Host'
    ],
    grid: [
      'SPA + try_files corrects (10 pts)',
      'Reverse proxy /api/* fonctionnel, headers transmis vérifiés côté backend (15 pts)',
      'Deux vhosts distincts + default_server (10 pts)',
      'client_max_body_size scoped sur l’API (5 pts)',
      'Rapport avec config complète et tests (10 pts)'
    ],
    answer: 'Config clé : location / { try_files $uri $uri/ /index.html; } ; location /api/ { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; client_max_body_size 2m; } ; le second vhost n’a pas de /api/ ; un des deux porte default_server.'
  },
  {
    id: 'p3',
    level: 'Avancé',
    title: 'Projet 3 — Site public complet : HTTPS + cache + sécurité',
    goal: 'Challenge final : un site public (ou simulé en local avec un certificat auto-signé) avec HTTPS, redirection 80→443, cache agressif et règle de sécurité simple.',
    objectives: [
      'Deux blocs : 80 (redirection 301 vers https) et 443 ssl',
      'Certificat + clé référencés (auto-signé localement accepté)',
      'HSTS : add_header Strict-Transport-Security (si 443)',
      'Expiration du cache : assets hashés 1y+immutable, HTML no-cache',
      'Interdire .git, .env et fichiers sensibles (deny all)',
      'GZip activé sur text/* (gzip on; gzip_types …)',
      'nginx -t + tests curl -I complets + rapport d’audit'
    ],
    grid: [
      'HTTPS opérationnel + redirection 80→443 (15 pts)',
      'Config TLS correcte (certs, protocoles, HSTS) (10 pts)',
      'Politique de cache et compression vérifiées (10 pts)',
      'Sécurité : fichiers sensibles bloqués, server_tokens off (10 pts)',
      'Rapport d’audit détaillé (curl -I, logs, décisions) (10 pts)'
    ],
    answer: 'Blocs clés : server 80 { return 301 https://$host$request_uri; } ; server 443 ssl { ssl_certificate /etc/ssl/certs/self.crt; ssl_certificate_key …; add_header Strict-Transport-Security "max-age=31536000" always; gzip on; gzip_types text/css application/javascript application/json; location ~ /(\.git|\.env) { deny all; } location /assets/ { expires 1y; add_header Cache-Control "immutable"; } } avec server_tokens off globalement.'
  }
];
