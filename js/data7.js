/* Nginx Academy — Module 7 : ↪️ Redirections et réécritures */
(function addRedL1() {
  const M = window.MODULES.find((m) => m.id === "redirections");
  const L = {
    id: "red-return",
    title: "return : la redirection simple et fiable",
    excerpt: "Les statuts de redirection, les URLs dynamiques, la page de maintenance.",
    content: `
# return : la redirection simple et fiable

\`return\` est la façon **la plus simple et la plus sûre** de rediriger : NGINX envoie immédiatement la réponse sans rien interpréter d’autre.

## Les statuts

\`\`\`nginx
server {
    listen 80;
    server_name ancien-site.fr;

    return 301 https://$host$request_uri;
}
\`\`\`

| statut | qui c’est | usage type |
|---|---|---|
| 301 | permanent | migration de domaine, canonisation www, http→https |
| 302 | temporaire | maintenance courte, solde spéciale |
| 303 | « vois ailleurs » | après un POST → GET (rare) |
| 307 | temporaire, méthode conservée | POST conservé |
| 308 | permanent, méthode conservée | migration POST-safe |

> [!tip] **Règle de bon sens** : 301 pour ce qui est définitif, 302/307 pour ce qui est provisoire. Les moteurs de recherche mémorisent les 301 — ne les utilise que pour du permanent.

## URLs dynamiques

\`\`\`nginx
server {
    listen 80;
    server_name www.exemple.fr;
    return 301 https://exemple.fr$request_uri;   # www → sans www, même chemin
}

server {
    listen 80;
    server_name exemple.fr;

    location /ancien/ {
        return 301 /nouveau$request_uri;          # ex. /ancien/x → /nouveau/x
    }

    location /page-v2/ {
        return 308 /page-v3$request_uri;          # POST préservé
    }
}
\`\`\`

Variables utiles : \`$request_uri\` (chemin + query), \`$scheme\`, \`$host\`, \`$uri\` (chemin normalisé, sans query).

## Page de maintenance (sans redirection)

\`\`\`nginx
location / {
    return 503;
}
error_page 503 /maintenance.html;
location = /maintenance.html {
    root /srv/site;
    internal;                     # non accessible directement
}
\`\`\`

Le site répond 503 Service Unavailable avec la page de maintenance ; les robots comprennent qu’il faut revenir plus tard.

## Où peut vivre return ?

- dans \`server\` : s’applique à tout le vhost (recommandé pour les redirections globales) ;
- dans \`location\` : pour un chemin précis ;
- dans \`if\` (déconseillé, voir le module) : rarement nécessaire.

## return et les autres directives

Une fois \`return\` rencontré, NGINX **ignore tout le reste** du bloc pour cette requête : pas de try_files, pas de proxy, rien. C’est sa force (prévisible) et sa limite (pas de traitement aval).
`,
    quiz: [
      { q: "Quoi de mieux pour rediriger un domaine entier vers un autre ?", options: ["rewrite (.*) https://nouveau.fr$1;", "return 301 https://nouveau.fr$request_uri;", "proxy_pass", "alias"], correct: [1], explain: "return est simple, rapide, et conserve chemin + query avec $request_uri." },
      { q: "Les moteurs mémorisent quel statut comme définitif ?", options: ["302", "307", "301", "200"], correct: [2], explain: "Le 301 est permanent et indexé par les moteurs." },
      { q: "Une fois return exécuté, NGINX :", options: ["Continue avec try_files", "Ignore le reste du bloc pour cette requête", "Relit le fichier nginx.conf", "Passe au vhost suivant"], correct: [1], explain: "return répond immédiatement : c’est un arrêt." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "La migration de domaine", prompt: "Écris le vhost qui redirige définitivement l’ancien domaine vers le nouveau, en gardant le chemin.", skeleton: "server {\n    listen 80;\n    server_name ancien-site.fr;\n    # redirige en 301 vers https://nouveau-site.fr en gardant le chemin\n}\n", required: ["listen", "return"], hint: "return 301 https://nouveau-site.fr$request_uri;" },
      { type: "mcq", diff: "medium", title: "POST en migration", prompt: "Tu migres un formulaire définitivement et tu veux préserver la méthode :", options: ["301", "308", "302", "303"], answer: [1], explain: "308 = permanent + méthode conservée." }
    ]
  };
  M.lessons.push(L);
})();
(function addRedL2() {
  const M = window.MODULES.find((m) => m.id === "redirections");
  const L = {
    id: "red-rewrite",
    title: "rewrite : réécrire à la volée",
    excerpt: "Syntaxe regex → remplacement, drapeaux last/break/redirect/permanent, $1.",
    content: `
# rewrite : réécrire à la volée

\`rewrite\` **réécrit** l’URL interne avant que NGINX choisisse où servir. C’est plus puissant que return, mais plus dangereux.

## Syntaxe

\`\`\`nginx
rewrite regexes remplacement [drapeau];
\`\`\`

Exemples concrets :

\`\`\`nginx
# 1. tout déplacer vers /nouveau/
location /ancien/ {
    rewrite ^/ancien/(.*)$ /nouveau/$1 permanent;   # /ancien/x → /nouveau/x (301)
}

# 2. normaliser l’absence de / final
rewrite ^/services$ /services/ permanent;

# 3. nettoyer les ?id=123 → /articles/123
location /articles {
    rewrite ^/articles\?id=([0-9]+)$ /articles/$1 permanent;
}

# 4. supprimer un préfixe de langue pour un site monolingue
rewrite ^/fr/(.*)$ /$1 last;
\`\`\`

## Les captures : $1, $2…

Toute parenthèse capturante devient une variable : \`$1\`, \`$2\`… Excellent pour transformer proprement une URL.

\`\`\`nginx
# /produits/1234 → /boutique/fiche/1234
rewrite ^/produits/([0-9]+)$ /boutique/fiche/$1 permanent;
\`\`\`

## Les drapeaux

| drapeau | effet |
|---|---|
| \`last\` | arrête la réécriture, **re-évalue** les locations avec la nouvelle URL |
| \`break\` | arrête la réécriture, garde la location courante pour servir |
| \`redirect\` | 302 temporaire envoyé au client |
| \`permanent\` | 301 définitif envoyé au client |

\`\`\`nginx
location /old/ {
    rewrite ^/old/(.*)$ /new/$1 last;     # réévaluation : location /new/ appliquée
}

location /new/ {
    # rooot ou proxy selon le cas
}
\`\`\`

## Piège : le changement de domaine avec rewrite

\`rewrite ^/$ http://nouveau-site.fr/ redirect;\` fonctionne, mais **return est plus clair**. Le rewrite est utile quand la transformation est **structurelle** (chemin), le return pour les **redirections de domaine/protocole**.

## Vérifier sans stresser le site

\`\`\`bash
curl -I http://site.local/old/produit-42
# HTTP/1.1 301
# Location: http://site.local/new/produit-42
\`\`\`
`,
    quiz: [
      { q: "Que fait rewrite ^/produits/([0-9]+)$ /boutique/fiche/$1 permanent; ?", options: ["Redirige /boutique/fiche/123 vers /produits/123", "Redirige /produits/123 vers /boutique/fiche/123", "Réécrit le HTML", "Bloque les URL numériques"], correct: [1], explain: "La capture ([0-9]+) devient $1 dans l’URL de destination." },
      { q: "La différence entre last et break :", options: ["Aucune", "last re-évalue les locations ; break garde la location courante", "last est plus rapide", "break envoie un 404"], correct: [1], explain: "last relance le matching des locations avec la nouvelle URL ; break continue dans la location courante." },
      { q: "Quel drapeau pour un 301 ?", options: ["break", "redirect", "permanent", "last"], correct: [2], explain: "permanent = 301 ; redirect = 302." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Migration de chemins", prompt: "Réécris /ancien/* vers /nouveau/* avec une redirection permanente.", skeleton: "location /ancien/ {\n    # /ancien/produit/5 → /nouveau/produit/5 en 301\n}\n", required: ["rewrite"], hint: "rewrite ^/ancien/(.*)$ /nouveau/$1 permanent;" },
      { type: "mcq", diff: "hard", title: "Le bon drapeau", prompt: "À l’intérieur d’une location, tu réécris l’URL pour que la location /proxy/ s’applique. Tu utilises :", options: ["break", "last", "redirect", "permanent"], answer: [1], explain: "last relance le matching : la nouvelle URL trouve la location /proxy/." }
    ]
  };
  M.lessons.push(L);
})();
(function addRedL3() {
  const M = window.MODULES.find((m) => m.id === "redirections");
  const L = {
    id: "red-choix",
    title: "return ou rewrite ? Le bon outil pour chaque cas",
    excerpt: "Table de décision, le fameux if est evil, try_files, patterns propres.",
    content: `
# return ou rewrite ? Le bon outil pour chaque cas

Deux outils qui semblent proches, des usages très différents.

## La table de décision

| besoin | outil |
|---|---|
| déplacer tout un domaine / http→https / www→sans-www | **return 301** |
| URL temporaire (maintenance, promo) | **return 302** |
| transformer un **chemin** avant de servir (pas de redirection visible) | **rewrite … last/break** |
| redirection visible d’un chemin précis vers un autre | **return** (ou rewrite permanent) |
| redirection avec **calcul** (capture de groupe) | **rewrite** (sinon return + variables) |

## Le principe : favoriser return

Si un \`return\` répond au besoin, utilise-le : il est simple, imprévisible? non — **prévisible**, performant, et ne dépend pas du module rewrite. On ne sort le rewrite que quand on a besoin de **transformer** l’URL côté serveur.

## Attention : le if est (presque) evil

\`\`\`nginx
# À ÉVITER
location / {
    if ($request_uri ~ ^/ancien/) {
        rewrite ^/ancien/(.*)$ /nouveau/$1 permanent;
    }
}
\`\`\`

La doc officielle interdit \`if\` au niveau location (sauf deux usages précis : \`return\` et \`rewrite\` dans certains cas). Préfère :

\`\`\`nginx
location /ancien/ {
    rewrite ^/ancien/(.*)$ /nouveau/$1 permanent;
}
\`\`\`

Les locations collent au préfixe : pas besoin de if.

## try_files : la réécriture implicite

\`\`\`nginx
# les URLs propres retombent sur index.html (SPA)
location / {
    try_files $uri $uri/ /index.html;
}
\`\`\`

\`try_files\` essaie des fichiers **sans rediriger** : c’est souvent ce qu’on cherche (et non un rewrite).

## Patterns propres en résumé

1. Migration de domaine → deux server blocks + return 301.
2. Changement de chemin → location + rewrite permanent (ou return).
3. URLs propres / SPA → try_files.
4. Equation rare : rewrite dans un if → la plupart du temps, une location suffit.

> [!tip] **Règle d’or** : commence par return, améliore avec try_files, et ne dégaine rewrite que pour une transformation réelle d’URL. Le write? non : l’expression régulière doit rester un scalpel.
`,
    quiz: [
      { q: "www → sans www, la méthode favorite :", options: ["rewrite dans une location", "return 301 dans un vhost 80 dédié", "try_files", "alias"], correct: [1], explain: "Un vhost dédié à www qui répond return 301 vers le domaine nu." },
      { q: "Pourquoi éviter if dans les locations ?", options: ["C’est lent", "Comportements imprévisibles (la doc officielle le déconseille)", "Interdit par le guide", "if ne marche pas"], correct: [1], explain: "if au niveau location a des sémantiques piégeuses ; une location suffit en général." },
      { q: "Une SPA avec des URLs propres : quel outil ?", options: ["rewrite (.*) /index.html last;", "try_files $uri $uri/ /index.html;", "return 301 /index.html", "proxy_pass"], correct: [1], explain: "try_files essaie le fichier réel puis retombe sur index.html sans redirection." }
    ],
    exercises: [
      { type: "mcq", diff: "easy", title: "Le bon outil", prompt: "Rediriger définitivement tout le site http vers https :", options: ["rewrite ^/(.*)$ https://$host/$1 permanent;", "return 301 https://$host$request_uri;", "try_files", "map"], answer: [1], explain: "return est le plus simple et le plus sûr pour http→https." },
      { type: "config", diff: "medium", title: "URLs propres pour une SPA", prompt: "Fais retomber toutes les routes inconnues sur index.html (routing côté client).", skeleton: "server {\n    root /srv/spa;\n    index index.html;\n\n    location / {\n        # fichiers réels, puis dossiers, puis index.html\n    }\n}\n", required: ["try_files"], hint: "try_files $uri $uri/ /index.html;" }
    ]
  };
  M.lessons.push(L);
})();
(function addRedL4() {
  const M = window.MODULES.find((m) => m.id === "redirections");
  const L = {
    id: "red-regex",
    title: "Expressions régulières et matching des locations",
    excerpt: "location =, ~, ~*, ^~, captures $1, et map pour mapper des URLs.",
    content: `
# Expressions régulières et matching des locations

La moitié des pièges de réécriture viennent du **matching des locations**. Mettons les règles à plat.

## Les quatre types de location

\`\`\`nginx
location = /contact {          # 1. exacte (priorité maximale)
    ...
}
location ^~ /api/ {            # 2. préfixe + priorité (pas de regex testée ensuite)
    ...
}
location ~ /\\.mp4$ {          # 3. regex sensible à la casse
    ...
}
location ~* \.(jpg|png)$ {    # 4. regex insensible à la casse
    ...
}
location / {                   # 5. préfixe simple (sert de ’default’)
    ...
}
\`\`\`

Ordre de chois : 1) \`=\` exacte, 2) \`^~\` préfixe prioritaire, 3) la **première** regex \`~\`/\`~*\` qui matche (dans l’ordre du fichier !), 4) le préfixe le plus long, 5) \`/\`.

> [!warn] Les regex sont testées **dans l’ordre où elles apparaissent** dans le fichier. Si \`~ \\.php$\` précède \`~ \\.php\\d+$\`, la première gagne pour \`x.php1\` etc. — sois précis.

## Les captures dans les locations regex

\`\`\`nginx
location ~ ^/article/([0-9]+)/?(.*)$ {
    # $1 = l’id, $2 = le reste
    set $article_id $1;
    proxy_pass http://127.0.0.1:8080;   # l’app lira l’en-tête prenant $article_id
}
\`\`\`

## map : le mappage d’URL propre

\`map\` (contexte http) transforme une variable en une autre — parfait pour des **tables de redirection** sans rewrite compliqué :

\`\`\`nginx
http {
    map $uri $nouvelle_url {
        /ancien/accueil   /nouveau/;
        /ancien/contact   /nouveau/contact;
        /ancien/produits  /nouveau/boutique;
        default           "";
    }

    server {
        location /ancien/ {
            if ($nouvelle_url != "") {
                return 301 $nouvelle_url;
            }
            return 404;
        }
    }
}
\`\`\`

Fin du débat : la table est lisible, unique source de vérité, et rechargée à chaque test sans regex.

## Les caractères spéciaux à échapper

Dans les regex \`~\`, échappe le point (\`\\.\`), le slash est littéral, \`$\` = fin. Pour matcher une extension : \`\.(gif|jpg|jpeg|png)$\`.

## Le piège de la barre oblique

\`location ^~ /api/\` matche \`/api/\` et \`/api/x\`, mais **pas** \`/apig\` (le slash compte). \`location /api\` (sans slash final) matcherait aussi \`/apig\` — sois cohérent.
`,
    quiz: [
      { q: "location ~ \.(png|jpg)$  : quel type ?", options: ["Préfixe", "Regex sensible à la casse", "Exacte", "Préfixe prioritaire"], correct: [1], explain: "~ introduit une regex case-sensitive." },
      { q: "Quelle location a la priorité maximale ?", options: ["location /", "location ^~ /api/", "location = /contact", "location ~ \\.php$"], correct: [2], explain: "La correspondance exacte (=) passe devant tout." },
      { q: "map sert à :", options: ["Créer une table de correspondance variable→valeur au niveau http", "Réécrire le HTML", "Compresser", "Équilibre ronde"], correct: [0], explain: "map construit une table : parfait pour mapper des URLs." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Table de migration", prompt: "Crée une table map pour migrer les anciennes URL vers les nouvelles.", skeleton: "http {\n    # map $uri $nouvelle_url : /ancien/accueil → /nouveau/, /ancien/contact → /nouveau/contact\n}\n", required: ["map"], hint: "map $uri $nouvelle_url { /ancien/accueil /nouveau/; /ancien/contact /nouveau/contact; default \"\"; }" },
      { type: "mcq", diff: "hard", title: "Priorité entre locations", prompt: "location = /admin existe, location ^~ /admin/ aussi, location ~ /admin/.*$ aussi. Une requête exactement /admin va :", options: ["Dans la regex", "Dans = /admin (exacte : priorité 1)", "Dans ^~", "Erreur"], answer: [1], explain: "L’égalité exacte gagne toujours." }
    ]
  };
  M.lessons.push(L);
})();
(function addRedL5() {
  const M = window.MODULES.find((m) => m.id === "redirections");
  const L = {
    id: "red-pieges",
    title: "Les pièges des redirections",
    excerpt: "Boucles, contenus dupliqués, canonicalisation, query strings, sitemaps.",
    content: `
# Les pièges des redirections

Confondre deux pièges classiques suffit à casser un référencement ou un site. Les voici, avec les parades.

## 1. La boucle de redirection

\`\`\`nginx
# BOUCLE : le vhost A redirige vers B, qui redirige vers A
# 301 https://a → https://b  et  301 https://b → https://a
\`\`\`

Les navigateurs finissent par afficher « trop de redirections ». Parades :

- une seule règle par usage (ex. www → nu) dans **un seul** sens ;
- vérifier que les deux server blocks ne se mordent pas la queue ;
- tester avec \`curl -I\` (suivi de Location en clair).

## 2. Le contenu dupliqué : seo.cc

Toujours **canonicaliser** : un et un seul URL pour une page.

| cas | règle |
|---|---|
| www vs sans-www | l’un est choisi, l’autre 301 |
| http vs https | https canonique après migration |
| /page vs /page/ | un seul form : redirige l’autre |

\`\`\`nginx
server {
    listen 80;
    server_name www.exemple.fr;
    return 301 https://exemple.fr$request_uri;
}
server {
    listen 80;
    server_name exemple.fr;
    return 301 https://$host$request_uri;
}
\`\`\`

## 3. La query string perdue ou doublée

- \`return 301 /nouveau$request_uri;\` conserve la query (bon).
- \`rewrite ^/ancien/(.*)$ /nouveau/$1 permanent;\` **conserve aussi** la query par défaut… mais si tu réécris vers une URL avec \`?\`, tu écraseras la query originale.

\`\`\`nginx
# /ancien/x?a=1 → /nouveau/x?a=1  (query conservée)
rewrite ^/ancien/(.*)$ /nouveau/$1 permanent;

# /ancien/x?a=1 → /nouveau/x (query PERDUE — la réécriture l’ignore)
rewrite ^/ancien/(.*)$ /nouveau/$1?a=0 permanent;
\`\`\`

## 4. Le sitemap et les liens internes obsolètes

Après une migration, mets à jour :

- le \`sitemap.xml\` (nouvelles URLs) ;
- les liens internes de ton site (éviter les chaînes de redirection) ;
- les boutons partagés, QR codes… (une redirection bien faite est un filet, pas un mode de vie).

## 5. La redirection de secours

\`\`\`nginx
server {
    listen 80 default_server;      # vhosts inconnus (IP directe, domaine inattendu)
    server_name _;
    return 444;                    # ferme la connexion silencieusement
}
\`\`\`

\`return 444\` ferme la connexion sans réponse : les scanneurs de ports n’obtiennent aucun indice.

> [!tip] **La checklist finale** : un seul canonique (www + https), pas de boucle (curl -I en cascade), query strings conservées, sitemap à jour, défaut silencieux pour les domaines inconnus.
`,
    quiz: [
      { q: "Deux vhosts se redirigent l’un vers l’autre. Résultat :", options: ["Rien de spécial", "Erreur trop de redirections", "502", "Les deux fonctionnent"], correct: [1], explain: "La boucle finit par être coupée par le navigateur avec une erreur." },
      { q: "Que fait return 301 /nouveau$request_uri; quand la query est ?id=5 ?", options: ["Il la perd", "Il la conserve (/nouveau?id=5)", "Il la duplique", "Il l’échappe"], correct: [1], explain: "$request_uri contient chemin + query : tout est conservé." },
      { q: "return 444 ;", options: ["Redirige vers 444", "Ferme la connexion sans réponse", "Renvoie une page 404", "Écrit dans les logs"], correct: [1], explain: "444 est une fermeture silencieuse propre à NGINX." }
    ],
    exercises: [
      { type: "mcq", diff: "hard", title: "Diagnostic boucle", prompt: "curl -I http://exemple.fr/ renvoie 301 → http://www.exemple.fr, qui renvoie 301 → http://exemple.fr. La parade :", options: ["Ajouter un return 444", "Ne garder qu’un sens : canonique = exemple.fr, et www → exemple.fr (jamais l’inverse)", "Utiliser rewrite", "Tout passer en 302"], answer: [1], explain: "Un seul sens de redirection pour les paires www/domaine ou http/https." },
      { type: "order", diff: "easy", title: "Query conservée", prompt: "Ordonne la transformation de /ancien/42?id=7 avec la règle rewrite ^/ancien/(.*)$ /nouveau/$1 permanent;", items: ["GET /ancien/42?id=7", "match regex : $1 = 42", "construction : /nouveau/42 + query id=7", "réponse 301 Location: /nouveau/42?id=7"], explain: "Capture → construction → query conservée par défaut." }
    ]
  };
  M.lessons.push(L);
})();
(function addRedL6() {
  const M = window.MODULES.find((m) => m.id === "redirections");
  const L = {
    id: "red-pratique",
    title: "Mise en pratique : une migration sans casse",
    excerpt: "Canonique, http→https, table map, maintenance 503 : le scénario complet.",
    content: `
# Mise en pratique : une migration sans casse

Scénario réaliste : \`ancien-site.fr\` migre vers \`exemple.fr\` (https + sans-www), avec quelques chemins réécrits et une page de maintenance prête.

## 1. La cible canonique

Choix : \`https://exemple.fr\` (sans www). Tout le reste pointe vers elle — un sens unique.

## 2. Le fichier nginx.conf (extrait http)

\`\`\`nginx
http {
    map $uri $nouvelle_url {
        /ancien/accueil           /;
        /ancien/contact           /contact;
        /ancien/produit           /boutique;
        /ancien/produit/(.+)      /boutique/$1;    # ne marche pas tel quel : map ne capture pas ; voir ci-dessous
        default                   "";
    }
    ...
}
\`\`\`

> [!info] map n’utilise pas de captures regex : pour les chemins dynamiques, utilise une location + rewrite (ex. \`location /ancien/produit/ { rewrite ^/ancien/produit/(.*)$ /boutique/$1 permanent; }\`). La table map reste parfaite pour les mappings **exacts**.

## 3. Les server blocks

\`\`\`nginx
# --- ancien domaine : tout vers le nouveau ---
server {
    listen 80;
    server_name ancien-site.fr www.ancien-site.fr;
    return 301 https://exemple.fr$request_uri;
}

# --- www → sans www ---
server {
    listen 80;
    listen 443 ssl http2;
    server_name www.exemple.fr;
    ssl_certificate     /etc/letsencrypt/live/exemple.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/exemple.fr/privkey.pem;
    return 301 https://exemple.fr$request_uri;
}

# --- le vrai site ---
server {
    listen 80;
    server_name exemple.fr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name exemple.fr;
    ssl_certificate     /etc/letsencrypt/live/exemple.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/exemple.fr/privkey.pem;

    root /srv/site;
    index index.html;

    location /ancien/produit/ {
        rewrite ^/ancien/produit/(.*)$ /boutique/$1 permanent;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
\`\`\`

## 4. La maintenance (bascule en 30 secondes)

\`\`\`nginx
# dans le vhost canonique, quand tu prépares une mise à jour :
# location / { return 503; }
# error_page 503 /maintenance.html;
# location = /maintenance.html { root /srv/site; internal; }
\`\`\`

## 5. La batterie de tests

\`\`\`bash
curl -I http://ancien-site.fr/contact          # 301 → https://exemple.fr/contact
curl -I https://www.exemple.fr/                 # 301 → https://exemple.fr/
curl -I http://exemple.fr/produits              # 301 → https://exemple.fr/produits
curl -I http://exemple.fr/ancien/produit/7      # 301 → https://exemple.fr/boutique/7
curl -I https://exemple.fr/contact              # 200
curl -I http://exemple.fr/?ref=mail             # query conservée : Location: https://exemple.fr/?ref=mail
\`\`\`

## 6. Après la migration

1. Vérifier le sitemap aux nouvelles URL.
2. Basculer les clés API / domaines de l’app (s’ils référencent l’ancien domaine).
3. Garder les redirections **au moins 12 mois** (SEO).

> [!tip] **Règle d’or pro** : une migration réussie est invisible pour l’utilisateur — il n’a jamais à taper deux fois la même URL.
`,
    quiz: [
      { q: "Pourquoi garder les redirections longtemps après une migration ?", options: ["Pour la lenteur", "Les liens externes et favoris pointent encore l’ancien domaine : les 301 les rapatrient", "Pour les logs", "Aucune raison"], correct: [1], explain: "Les 301 transmettent le jus SEO et guident les visiteurs vers la nouvelle URL." },
      { q: "Le site canonique reçoit http://exemple.fr/produits. Où va-t-il ?", options: ["404", "301 https://exemple.fr/produits", "200 direct", "il reste en http"], correct: [1], explain: "Le vhost 80 du site canonique ne fait que rediriger vers https." },
      { q: "Un vieux QR code pointe http://ancien-site.fr/produit/7. Résultat final ?", options: ["Erreur", "Le client aboutit sur https://exemple.fr/boutique/7", "Le client reste sur l’ancien site", "502"], correct: [1], explain: "Deux 301 en cascade : ancien → canonique https, puis chemin réécrit." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Le fichier de migration", prompt: "Écris le fichier de migration complet : ancien domaine → nouveau site https, et www → sans www.", skeleton: "server {\n    listen 80;\n    server_name ancien-site.fr;\n    # 1. tout vers https://exemple.fr (chemin conservé)\n}\n\nserver {\n    listen 80;\n    listen 443 ssl http2;\n    server_name www.exemple.fr;\n    ssl_certificate /etc/nginx/certs/site.crt;\n    ssl_certificate_key /etc/nginx/certs/site.key;\n    # 2. www → sans www (https)\n}\n", required: ["return"], hint: "1. return 301 https://exemple.fr$request_uri;  2. return 301 https://exemple.fr$request_uri;" },
      { type: "order", diff: "medium", title: "Le parcours d’un vieux lien", prompt: "Un lien externe pointe http://ancien-site.fr/produit/7. Ordonne ce qui se passe.", items: ["Le client envoie GET http://ancien-site.fr/produit/7", "Le vhost ancien répond 301 https://exemple.fr/produit/7", "Le client suit vers https et reçoit 200", "Le rewrite de chemin n’a pas lieu (même chemin) — le contenu s’affiche"], explain: "301 → suivi → 200. Splendide : pas de boucle, pas de perte." }
    ]
  };
  M.lessons.push(L);
})();
(function addRedProj() {
  const M = window.MODULES.find((m) => m.id === "redirections");
  M.project = {
    title: "Mini-projet du module : la migration sans casse",
    goal: "Simuler la migration d’un ancien domaine vers un nouveau site https canonique, avec réécriture de chemins et tests complets.",
    objectives: [
      "Choisir un domaine canonique (exemple : exemple.local, sans www, en https) et générer un certificat auto-signé pour le tester",
      "Vhosts : ancien-site.local (80) → 301 vers https://exemple.local ; www.exemple.local → exemple.local ; exemple.local:80 → https",
      "Vhost canonique 443 ssl http2 avec certificat, root et index",
      "Réécrire un chemin : /ancien/vers/(.*) → /nouveau/$1 en 301 permanent",
      "Table map (niveau http) pour 3 mappings exacts (ex. /ancien/accueil → /)",
      "nginx -t puis reload sans erreur",
      "Tester avec curl -I : les 4 redirections + query string conservée (Location en clair)",
      "Bonus : rédiger les notes de déploiement pour une équipe (ordres, rollback)"
    ],
    answer: "Config minimale de référence :\nhttp {\n  map $uri $nouvelle_url {\n    /ancien/accueil /;\n    /ancien/contact /contact;\n    default \"\";\n  }\n  server {\n    listen 80; server_name ancien-site.local;\n    return 301 https://exemple.local$request_uri;\n  }\n  server {\n    listen 80; listen 443 ssl http2; server_name www.exemple.local;\n    ssl_certificate /etc/nginx/certs/site.crt; ssl_certificate_key /etc/nginx/certs/site.key;\n    return 301 https://exemple.local$request_uri;\n  }\n  server {\n    listen 80; server_name exemple.local; return 301 https://$host$request_uri;\n  }\n  server {\n    listen 443 ssl http2; server_name exemple.local;\n    ssl_certificate /etc/nginx/certs/site.crt; ssl_certificate_key /etc/nginx/certs/site.key;\n    root /srv/site; index index.html;\n    location /ancien/vers/ { rewrite ^/ancien/vers/(.*)$ /nouveau/$1 permanent; }\n    location / { try_files $uri $uri/ /index.html; }\n  }\n}\nTests attendus (curl -I) :\n- http://ancien-site.local/contact → 301 https://exemple.local/contact\n- https://www.exemple.local/ → 301 https://exemple.local/\n- http://exemple.local/produits → 301 https://exemple.local/produits\n- http://exemple.local/ancien/vers/5 → 301 https://exemple.local/nouveau/5\n- http://exemple.local/?ref=x → Location conserve ?ref=x\n- https://exemple.local/contact → 200"
  };
})();
