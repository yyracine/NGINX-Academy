/* Nginx Academy — Module 8 : 🚀 Cache et performance */
(function addPerfL1() {
  const M = window.MODULES.find((m) => m.id === "performance");
  const L = {
    id: "perf-gzip",
    title: "Compresser : gzip et brotli",
    excerpt: "gzip on, niveaux, types MIME, min_length, et brotli.",
    content: `
# Compresser : gzip et brotli

La compression est le gain de performance le plus rapide à obtenir : le texte se compresse à ~80 %, le HTML/JSON/CSS/JS en tête.

## L’activation de base

\`\`\`nginx
http {
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json
               application/javascript application/xml image/svg+xml;
}
\`\`\`

| directive | rôle |
|---|---|
| \`gzip on\` | active la compression |
| \`gzip_comp_level 5\` | 1 (rapide) à 9 (fort) : au-delà de 5-6, on gagne peu pour plus de CPU |
| \`gzip_min_length 1024\` | ne pas compresser les petits fichiers (inutile : l’en-tête pèse plus) |
| \`gzip_types\` | les types MIME éligibles (le \`text/html\` est toujours inclus) |

> [!info] Attention : NGINX compresse seulement si le client envoie \`Accept-Encoding: gzip\` (tous les navigateurs le font). Côté serveur, le contenu compressé est mis en cache de façon intelligente (vary).

## Vérifier la compression

\`\`\`bash
curl -H "Accept-Encoding: gzip" -I http://site.local/css/app.css
# Content-Encoding: gzip   ← présent = OK
# Content-Length: 12345    ← taille compressée
\`\`\`

## brotli : mieux que gzip (module tiers)

\`brotli\` compresse ~15 % mieux que gzip au même niveau. NGINX open source ne l’inclut pas : il faut compiler le module \`ngx_brotli\` (nginx.org / module tiers) ou utiliser la distribution openresty.

\`\`\`nginx
http {
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json text/javascript;
}
\`\`\`

Les clients qui ne parlent pas brotli reçoivent du gzip : \`brotli\` se place avant \`gzip\` dans l’ordre des Content-Encoding.

## Les pièges

- **Ne pas compresser** : images (déjà compressées), vidéos, fichiers trop petits.
- Un \`gzip_types\` incomplet = des fichiers non compressés (ex. le JSON !).
- \`gzip_proxied\` : pour le contenu venant d’un amont, active par défaut seulement pour certaines conditions — vérifie \`curl -I\` derrière un proxy.
- La compression consomme du CPU : sur un serveur sous-dimensionné, un niveau 9 peut ralentir plus qu’il n’accélère. Niveau 5-6 : l’équilibre idéal.

> [!tip] **Règle d’or** : compresse tout ce qui est texte, ne touche pas aux fichiers média, et vérifie avec curl que le Content-Encoding est bien gzip (ou br).
`,
    quiz: [
      { q: "Pourquoi ne pas compresser les fichiers < 1 Ko ?", options: ["Ils sont déjà petits", "L’en-tête de compression pèse presque autant que le gain : contre-productif", "Interdit", "gzip les casse"], correct: [1], explain: "gzip_min_length évite de compresser l’incompressible." },
      { q: "Comment vérifier que la compression marche ?", options: ["nginx -t", "curl -H Accept-Encoding: gzip -I … → Content-Encoding: gzip", "Regarder le CPU", "ping"], correct: [1], explain: "La présence de Content-Encoding: gzip (ou br) prouve la compression." },
      { q: "brotli est :", options: ["Inclus par défaut dans NGINX", "Un module tiers, plus efficace que gzip", "Déprécié", "Un algorithme de cache"], correct: [1], explain: "ngx_brotli (module tiers) offre ~15 % de compression en plus." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "gzip de base", prompt: "Active la compression gzip pour les types texte, JSON et JS.", skeleton: "http {\n    # active gzip, niveau 5, types texte + JSON + JS\n}\n", required: ["gzip"], hint: "gzip on; gzip_comp_level 5; gzip_min_length 1024; gzip_types text/plain text/css application/json application/javascript;" },
      { type: "mcq", diff: "easy", title: "Le bon niveau", prompt: "Serveur petit en CPU, gros en réseau : quel niveau gzip ?", options: ["9 (le maximum)", "5-6", "1-3", "gzip off"], answer: [2], explain: "Peu de CPU disponible : reste sur 1-3 pour ne pas étrangler le serveur." }
    ]
  };
  M.lessons.push(L);
})();
(function addPerfL2() {
  const M = window.MODULES.find((m) => m.id === "performance");
  const L = {
    id: "perf-cache-nav",
    title: "Le cache du navigateur : expires et Cache-Control",
    excerpt: "expires, caché permanent vs dynamique, assets hachés, ETag.",
    content: `
# Le cache du navigateur : expires et Cache-Control

Le navigateur peut **réutiliser** vos fichiers au lieu de les retélécharger. Deux en-têtes pilotent cela : \`Expires\` (ancien) et \`Cache-Control\` (moderne, définitif).

## La règle de base

\`\`\`nginx
server {
    # assets (versionnés) : immuables, cache très long
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # pages HTML : cache court (on peut laisser NGINX gérer)
    location / {
        expires 5m;
    }
}
\`\`\`

| teinte | durée | type de contenu |
|---|---|---|
| permanent | 1 an + immutable | \`/assets/\`, fichiers hachés \`app.a1b2c3.js\` |
| standard | minutes | pages HTML, JSON public |
| jamais | no-store | panier, page de compte, réponses API privées |

## assets hachés : le secret

\`\`\`nginx
location /build/ {
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
\`\`\`

Si tes fichiers sont \`app.8f3a2b.js\`, le contenu ne change jamais pour un même nom (le nom contient le hash du contenu). On peut donc les cacher **pour toujours** : à chaque déploiement, le nom change, le navigateur redemande.

## Ne jamais cacher le privé

\`\`\`nginx
location /compte/ {
    add_header Cache-Control "no-store";
}
location /api/ {
    add_header Cache-Control "no-cache";
}
\`\`\`

- \`no-store\` : interdit tout stockage (pages sensibles).
- \`no-cache\` : doit être revalidée avant usage.

> [!warn] \`add_header\` au niveau location ne s’applique PAS aux réponses des codes 200 seulement ? Si — mais attention : une add_header au niveau location **remplace** celles héritées du server. Répète tes en-têtes si besoin de cumuler.

## ETag et Last-Modified (revalidation)

NGINX ajoute \`ETag\` (empreinte) et \`Last-Modified\` automatiquement. Le navigateur peut alors demander \`If-None-Match\` : si rien n’a changé, NGINX répond \`304 Not Modified\` (quasi gratuit). Rien à configurer — ne désactive jamais ces en-têtes sans raison.

## L’outil de contrôle : curl

\`\`\`bash
curl -I http://site.local/assets/app.js
# Cache-Control: public, max-age=31536000, immutable
# ETag: ...
# Last-Modified: ...

curl -I http://site.local/compte/
# Cache-Control: no-store
\`\`\`

## Aller plus loin : vary

Quelques frameworks ajoutent \`Vary: Accept-Encoding\` pour que les caches ne mélangent pas les versions compressées et non compressées. NGINX gère déjà cela de façon interne sous gzip.
`,
    quiz: [
      { q: "Sur quels fichiers peut-on mettre un cache d’un an ?", options: ["Les pages HTML", "Les assets hachés (nom = contenu)", "Les réponses API", "Les cookies"], correct: [1], explain: "Un nom haché garantit l’immuabilité : cache infini possible." },
      { q: "Que répond NGINX quand un fichier n’a pas changé et que le client revalide ?", options: ["200 avec le contenu", "304 Not Modified (pas de corps)", "301", "404"], correct: [1], explain: "ETag/Last-Modified permettent le 304 : pas de retéléchargement." },
      { q: "no-store signifie :", options: ["Cache 1 minute", "Interdiction de stocker (page sensible)", "Compresser plus", "Rediriger"], correct: [1], explain: "no-store : jamais de copie en cache, idéal pour le privé." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Le cache des assets", prompt: "Configure le cache navigateur : 1 an immutable pour les assets, aucun cache pour /inbox/.", skeleton: "server {\n    root /srv/site;\n    location /assets/ {\n        # cache 1 an + immutable\n    }\n    location /inbox/ {\n        # jamais de cache\n    }\n}\n", required: ["expires", "Cache-Control"], hint: "Location /assets/ : add_header Cache-Control \"public, max-age=31536000, immutable\"; + expires 1y;  — /inbox/ : add_header Cache-Control \"no-store\";" },
      { type: "mcq", diff: "medium", title: "Le mauvais cache", prompt: "Une page de profil affiche des données périmées après mise à jour. Cause probable :", options: ["gzip trop fort", "Cache-Control trop long (ou manquant) sur cette page", "TLS", "worker_connections"], answer: [1], explain: "Le navigateur sert une copie ; corrige le Cache-Control de cette page." }
    ]
  };
  M.lessons.push(L);
})();
(function addPerfL3() {
  const M = window.MODULES.find((m) => m.id === "performance");
  const L = {
    id: "perf-proxy-cache",
    title: "proxy_cache : mettre en cache les réponses de l’app",
    excerpt: "proxy_cache_path, clé, validité, bypass, micro-caching, hit/miss.",
    content: `
# proxy_cache : mettre en cache les réponses de l’app

Le reverse proxy peut conserver les réponses de l’application et les resservir sans la solliciter. C’est le **cache de niveau 2** (après le navigateur).

## La configuration de base

\`\`\`nginx
http {
    # 1. déclarer la zone de cache
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api:10m
                     max_size=1g inactive=60m use_temp_path=off;

    server {
        location /api/ {
            proxy_pass http://127.0.0.1:8000;

            # 2. activer le cache sur cette location
            proxy_cache api;
            proxy_cache_key "$scheme$request_method$host$request_uri";
            proxy_cache_valid 200 60s;      # les 200 vivent 60 s
            proxy_cache_valid 404 5m;       # les 404 vivent 5 min (évite les latences pour les erreurs stables)

            add_header X-Cache-Status $upstream_cache_status;
        }
    }
}
\`\`\`

| directive | rôle |
|---|---|
| \`proxy_cache_path\` | où et comment stocker (niveaux de sous-dossiers, zone mémoire pour les index) |
| \`proxy_cache\` | active la zone sur une location |
| \`proxy_cache_key\` | ce qui rend une entrée unique (ici schéma+méthode+hôte+URL) |
| \`proxy_cache_valid\` | durée de vie par code de statut |
| \`X-Cache-Status\` | variable de debug : MISS/HIT/EXPIRED |

## Vérifier hit/miss

\`\`\`bash
curl -I http://api.local/api/public
# X-Cache-Status: MISS   ← première fois
curl -I http://api.local/api/public
# X-Cache-Status: HIT    ← servi depuis le cache
\`\`\`

## Ne surtout pas cacher n’importe quoi

\`\`\`nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_cache api;
    proxy_cache_valid 200 60s;

    # jamais de cache pour les cookies ou les réponses marquées
    proxy_cache_bypass $cookie_session;
    proxy_no_cache $cookie_session;
}
location /api/private/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_cache off;               # données privées : pas de cache
}
\`\`\`

- \`proxy_cache_bypass\` : si la variable est non vide, la requête atteint l’app (mais la réponse peut être mise en cache).
- \`proxy_no_cache\` : la réponse n’est pas mise en cache.
- Variable utile : \`$upstream_cache_status\`.

## Micro-caching : la bouée des apps lentes

Même une app qui met 500 ms à répondre peut tenir 10× plus de charge si ses réponses **publiques** sont cachées 5 s :

\`\`\`nginx
proxy_cache_valid 200 5s;
\`\`\`

Entre deux requêtes pour la même URL, seulement 1 requête sur N atteint l’app. Attention à la fraîcheur : 5 s de délai acceptable pour une donnée publique.

## Cache et HEAD/streams

- Pas de cache sur les réponses avec cookies (ou alors durée très courte et clé incluant le cookie — déconseillé).
- \`proxy_cache off\` sur les flux (SSE/WebSocket).
- Les \`Set-Cookie\` empêchent la mise en cache par défaut.

> [!warn] Le cache ne nettoie pas tout seul : \`inactive=60m\` expire les entrées non consultées, \`max_size=1g\` borne l’espace (suppression selon LRU). Formule magique : \`proxy_cache_path ... levels=1:2 keys_zone=nom:10m max_size=1g inactive=60m use_temp_path=off;\`
`,
    quiz: [
      { q: "X-Cache-Status: MISS puis HIT sur la même URL signifie :", options: ["Une erreur", "La 1re requête a atteint l’app, la 2de a été servie depuis le cache", "Le cache est vide", "Le DNS"], correct: [1], explain: "MISS = pas en cache, HIT = servi depuis le cache." },
      { q: "proxy_cache_valid 200 60s; signifie :", options: ["60 requêtes par minute", "Les réponses 200 sont gardées 60 secondes", "200 Mo de cache", "60 % du trafic en cache"], correct: [1], explain: "Durée de vie des réponses 200 : 60 s." },
      { q: "Pourquoi un cache sur une page privée est dangereux ?", options: ["Il ralentit", "Il peut servir le contenu d’un utilisateur à un autre (fuite de données)", "Il coûte cher", "Il n’y a pas de danger"], correct: [1], explain: "proxy_cache_bypass/no_cache et proxy_cache off protègent les données personnelles." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Le cache API", prompt: "Déclare une zone proxy_cache et active-la sur /public/ avec les durées de validité.", skeleton: "http {\n    # déclare proxy_cache_path /var/cache/nginx keys_zone=api:10m max_size=1g inactive=60m\n\n    server {\n        listen 80;\n        location /public/ {\n            proxy_pass http://127.0.0.1:8000;\n            # active la zone api, clé standard, 200 → 60s, 404 → 5m\n        }\n    }\n}\n", required: ["proxy_cache_path", "proxy_cache", "proxy_cache_valid"], hint: "proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api:10m max_size=1g inactive=60m use_temp_path=off; puis proxy_cache api; proxy_cache_key ...; proxy_cache_valid 200 60s; proxy_cache_valid 404 5m;" },
      { type: "mcq", diff: "medium", title: "Choix de stratégie", prompt: "Ton API publique met 400 ms à répondre, 300 req/s la submergent. La meilleure solution immédiate :", options: ["Plus de worker_connections", "Micro-caching 5 s sur les réponses publiques", "return 444", "Changer d’algorithme"], answer: [1], explain: "Le micro-caching divise le nombre de requêtes atteignant l’app." }
    ]
  };
  M.lessons.push(L);
})();
(function addPerfL4() {
  const M = window.MODULES.find((m) => m.id === "performance");
  const L = {
    id: "perf-http2",
    title: "HTTP/2, HTTP/3 et la plomberie TCP",
    excerpt: "Multiplexage, listen http2, sendfile, tcp_nopush, tcp_nodelay, keepalive.",
    content: `
# HTTP/2, HTTP/3 et la plomberie TCP

Au-delà du cache, NGINX a une **plomberie** finement réglable : HTTP/2 côté client, TCP efficace, connexions persistantes.

## HTTP/2 : multiplexer

\`\`\`nginx
listen 443 ssl http2;
\`\`\`

HTTP/2 envoie **plusieurs requêtes en parallèle sur une seule connexion TCP** (multiplexage) et compresse les en-têtes (HPACK). Pages chargées plus vite, moins de connexions.

> [!info] HTTP/2 n’existe qu’en **https** (h2 + ALPN). \`http/2 sur 80 en clair\` (h2c) existe mais est rare et déconseillé. NGINX moderne : \`listen 443 ssl;\` + \`http2 on;\`.

## HTTP/3 : UDP, zéro latence

HTTP/3 (sur QUIC/UDP) élimine le blocage de tête de ligne et améliore le réseau mobile. Nécessite un module \`ngx_http_v3_module\` (build récent) et l’ouverture du port UDP 443. De nos jours :

\`\`\`nginx
listen 443 quic reuseport;
listen 443 ssl http2;
\`\`\`

## sendfile : zéro copie

\`\`\`nginx
sendfile on;
tcp_nopush on;    # regroupe les paquets (utile avec sendfile)
tcp_nodelay on;   # pas de délai d’acquittement Nagle (réactif)
\`\`\`

- \`sendfile\` : NGINX envoie les fichiers depuis le disque **sans les copier dans l’espace utilisateur** — le réglage le plus rentable pour le statique.
- \`tcp_nopush\` : collecte avant d’envoyer (paquets pleins) — bon pour les gros fichiers.
- \`tcp_nodelay\` : désactive Nagle — indispensable pour le petit trafic interactif (API).

## Les connexions persistantes (keepalive)

\`\`\`nginx
http {
    keepalive_timeout  65;
    keepalive_requests 1000;
}
\`\`\`

- \`keepalive_timeout\` : combien de temps une connexion client peut rester ouverte inactive.
- \`keepalive_requests\` : combien de requêtes par connexion avant recyclage (1000 par défaut, très bien).

Ne pas confondre avec \`keepalive 32;\` dans un \`upstream\` (connexions **vers les backends**) — les deux se cumulent : client ↔ NGINX réutilise, NGINX ↔ backend réutilise aussi.

## Le réglage magique pour les APIs

\`\`\`nginx
location /api/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";   # laisse NGINX réutiliser la connexion amont
}
\`\`\`

## Mesurer, ne pas deviner

\`\`\`bash
# charge : 2000 requêtes, 50 concurrentes
ab -n 2000 -c 50 http://site.local/
# ou wrk
wrk -t4 -c100 -d10s http://site.local/
\`\`\`

Compare avant/après chaque réglage : le RPS et le temps de réponse percentille (95e/99e) sont tes vraies unités.

> [!tip] Contentement : http2 + sendfile + keepalive bien réglés font souvent gagner 30-50 % sur un site statique, sans toucher au code de l’app.
`,
    quiz: [
      { q: "HTTP/2 permet :", options: ["Le chiffrement obligatoire uniquement", "Plusieurs requêtes en parallèle sur une même connexion TCP", "La compression gzip des images", "Les WebSocket plus rapides"], correct: [1], explain: "Multiplexage : la latence de tête de ligne diminue." },
      { q: "sendfile on; sert à :", options: ["Envoyer les fichiers sans copie inutile en espace utilisateur", "Compresser les fichiers", "Cacher les fichiers", "Limiter les téléchargements"], correct: [0], explain: "Zéro copie : NGINX délègue l’envoi au noyau." },
      { q: "keepalive_requests 1000 :", options: ["1000 connexions max", "1000 requêtes par connexion avant recyclage", "1000 octets par réponse", "1000 ms de timeout"], correct: [1], explain: "Plus une connexion sert de requêtes, moins on en rouvre." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Le vhost optimisé", prompt: "Écris un vhost HTTPS avec HTTP/2 activé et les certificats.", skeleton: "server {\n    # HTTP/2 sur 443 + certificats\n    server_name site.local;\n    root /srv/site;\n}\n", required: ["listen", "ssl_certificate"], hint: "listen 443 ssl http2; + ssl_certificate/ssl_certificate_key (chemins de ton choix)." },
      { type: "order", diff: "easy", title: "Flux HTTP/2", prompt: "Ordonne ce qui se passe avec HTTP/2.", items: ["Le navigateur ouvre UNE connexion TCP", "Il envoie plusieurs requêtes simultanées (multiplexage)", "Le serveur répond dans n’importe quel ordre sans blocage", "Les en-têtes compressés (HPACK)"], explain: "1 connexion → multiplexage → réponses non bloquées." }
    ]
  };
  M.lessons.push(L);
})();
(function addPerfL5() {
  const M = window.MODULES.find((m) => m.id === "performance");
  const L = {
    id: "perf-workers",
    title: "Tuner les workers et les connexions",
    excerpt: "worker_processes, worker_connections, limites de fichiers, modèle d’événements.",
    content: `
# Tuner les workers et les connexions

Chaque **worker** NGINX traite jusqu’à \`worker_connections\` connexions simultanées (modèle événementiel epoll sous Linux, aucun thread par connexion). Bien les régler, c’est bien dimensionner le serveur.

## worker_processes

\`\`\`nginx
worker_processes auto;        # 1 worker par cœur CPU (recommandé)
\`\`\`

- \`auto\` : NGINX choisit = nombre de cœurs. Le bon choix par défaut.
- Ne mets jamais plus d’un worker par cœur : chacun a une boucle d’événements mono-thread ; l’excès coûte en concurrence.
- Les workers sont le moteur : \`nginx -s reload\` les recycle sans perte.

## worker_connections

\`\`\`nginx
events {
    worker_connections 1024;
}
\`\`\`

Capacité par worker. **Capacité totale = workers × connections**, mais chaque requête en keepalive compte comme une connexion (même inactive). Ordre de grandeur : 1024 par défaut, monte à 4096-8192 pour du soutien assumé, en surveillant la RAM.

## La limite de fichiers (ulimit)

Chaque connexion = un descripteur de fichier. Si la limite système (ulimit -n) est trop basse, NGINX plafonne :

\`\`\`nginx
worker_rlimit_nofile 65535;    # au minimum worker_connections × 2
\`\`\`

Mets aussi la limite côté système : \`ulimit -n 65535\` (ou le fichier /etc/security/limits.conf sur Linux).

## Le modèle d’événements

\`\`\`nginx
events {
    use epoll;           # Linux (kqueue sur BSD/macOS / select en secours) — auto détecté
}
\`\`\`

\`epoll\` est le modèle événementiel efficace de Linux : un worker gère des dizaines de milliers de connexions sans threads. La valeur auto est presque toujours la bonne ; n’écris \`use\` que si tu sais pourquoi.

## Les combos à connaître

| symptôme | réglage |
|---|---|
| erreurs dans error.log « too many open files » | worker_rlimit_nofile + ulimit |
| CPU non utilisé mais saturé réseau | worker_processes auto vérifie, tcp_nopush/tcp_nodelay/sendfile |
| clients lents qui épuisent les connexions | keepalive + limits de timeouts + http2 |
| « 503 Service Temporarily Unavailable » intermittent | worker_connections trop bas + proximité (attention à la RAM) |

## Ne pas oublier les timeouts côté client

\`\`\`nginx
client_body_timeout   10s;
client_header_timeout 10s;
send_timeout          30s;
\`\`\`

Des timeouts raisonnables empêchent les connexions léthargiques de manger la capacité.

> [!warn] \`worker_connections 999999\` ne rend pas un petit VPS plus rapide : chaque connexion consomme de la RAM (buffers TCP). Règle empirique sur machine 2 cœurs : 2 × 4096 max, puis mesure.

## La mesure avant tout

\`\`\`bash
# combien de connexions utilise NGINX aujourd’hui ?
ss -s                     # Linux : statistiques sockets
# stress test ciblé
ab -n 5000 -c 200 http://site.local/
\`\`\`

Chaque réglage doit se justifier par une mesure (RPS, P95, erreurs), pas par intuition.
`,
    quiz: [
      { q: "worker_processes auto signifie :", options: ["Un worker par cœur CPU", "Un worker par connexion", "Autant que demandé dans URL", "Pas de workers"], correct: [0], explain: "auto = nombre de cœurs, le bon réglage par défaut." },
      { q: "La capacité de connexions simultanées totale ≈ :", options: ["worker_connections", "worker_processes × worker_connections", "worker_processes + worker_connections", "worker_connections × 2"], correct: [1], explain: "Le produit des deux : c’est la jauge de ton serveur." },
      { q: "« too many open files » dans error.log :", options: ["Problème disque", "Limite de descripteurs de fichiers atteinte : worker_rlimit_nofile + ulimit", "Cache plein", "TLS"], correct: [1], explain: "Chaque connexion = un fd ; la limite système doit suivre." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Le worker bien réglé", prompt: "Règle les workers : un par cœur, 4096 connexions par worker, limite de fichiers 65535.", skeleton: "events {\n    # 4096 connexions par worker\n}\n\n# 1 worker par cœur, limite de fichiers 65535\n", required: ["worker_processes", "worker_connections"], hint: "worker_processes auto; events { worker_connections 4096; worker_rlimit_nofile 65535; }" },
      { type: "mcq", diff: "hard", title: "Diagnostic 503", prompt: "Sous pic, NGINX renvoie des 503 intermittents. Cause la plus probable :", options: ["Le certificat", "Capacité de connexions dépassée (worker_connections trop bas) ou ressources système", "HSTS", "map vide"], answer: [1], explain: "503 = indisponibilité temporaire : la capacité est atteinte." }
    ]
  };
  M.lessons.push(L);
})();
(function addPerfL6() {
  const M = window.MODULES.find((m) => m.id === "performance");
  const L = {
    id: "perf-pratique",
    title: "Mise en pratique : le profil performance complet",
    excerpt: "gzip + assets immuables + proxy_cache + http2 + workers : l’ensemble cohérent.",
    content: `
# Mise en pratique : le profil performance complet

Assembler tous les leviers sur un serveur statique + API. L’ensemble est cohérent et immédiatement testable.

## Le fichier complet

\`\`\`nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
}

http {
    # --- compression ---
    gzip on;
    gzip_comp_level 5;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml application/json application/javascript;

    # --- TCP ---
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;

    # --- cache applicatif ---
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api:10m max_size=1g inactive=60m use_temp_path=off;

    # --- redirection https partout ---
    server {
        listen 80;
        server_name perf.local;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name perf.local;

        ssl_certificate     /etc/nginx/certs/site.crt;
        ssl_certificate_key /etc/nginx/certs/site.key;

        root /srv/site;
        index index.html;

        # assets hachés : cache infini
        location /build/ {
            add_header Cache-Control "public, max-age=31536000, immutable";
        }

        # API publique : micro-cache
        location /api/public/ {
            proxy_pass http://127.0.0.1:8000;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_cache api;
            proxy_cache_key "$scheme$request_method$host$request_uri";
            proxy_cache_valid 200 5s;
            add_header X-Cache-Status $upstream_cache_status;
        }

        # le reste
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
\`\`\`

## Les vérifications

\`\`\`bash
nginx -t && sudo nginx -s reload

# 1. compression
curl -H "Accept-Encoding: gzip" -I https://perf.local/build/app.js | grep -i content-encoding

# 2. cache navigateur
curl -I https://perf.local/build/app.js | grep -i cache-control

# 3. cache applicatif (deux requêtes)
curl -I https://perf.local/api/public/x | grep -i x-cache-status   # MISS
curl -I https://perf.local/api/public/x | grep -i x-cache-status   # HIT

# 4. HTTP/2
curl -sI https://perf.local/ -o /dev/null -w ’%{http_version}\n’   # 2

# 5. charge
ab -n 3000 -c 100 https://perf.local/
\`\`\`

## Interpréter la sortie d’ab

- \`Requests per second\` : le débit.
- \`Failed requests\` : DOIT être 0.
- \`Time per request\` (mean) : la latence moyenne.
- Le dernier percentile : \`100%\` = le pire cas.

## Les gains attendus

| levier | effet typique |
|---|---|
| gzip | -70 % de trafic texte |
| assets immuables | -90 % de requêtes de revalidation |
| proxy_cache (micro) | ×5-×10 de capacité API publique |
| http2 | -30-50 % de latence perçue sur pages riches |
| sendfile/tcp_* | +10-20 % sur le statique |

> [!tip] **Règle d’or performante** : les 4 cache (browser + proxy + compression + http2) forment un système ; mesure AVANT et APRÈS chaque réglage, et garde dans un fichier les valeurs qui t’ont fait gagner.
`,
    quiz: [
      { q: "COMPLÈTE : sur /build/, le Cache-Control « immutable » est possible car :", options: ["Les fichiers sont petits", "Les noms sont hachés (contenu figé)", "Le gzip le permet", "HTTP/2"], correct: [1], explain: "Un nom haché ne change jamais pour un contenu donné." },
      { q: "Quelle séquence de X-Cache-Status sur deux requêtes identiques ?", options: ["HIT, HIT", "MISS puis HIT", "MISS, MISS", "HIT, MISS"], correct: [1], explain: "La 1re remplit le cache (MISS), la 2de est servie (HIT)." },
      { q: "ab -n 3000 -c 100 signifie :", options: ["3000 requêtes, 100 en parallèle", "3000 Mo, 100 processeurs", "3000 s, 100 requêtes", "3000 connexions, 100 octets"], correct: [0], explain: "total de requêtes et niveau de concurrence." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "L’assemblage", prompt: "Assemble le profil performance complet : gzip, HTTP/2, cache navigateur et micro-cache API.", skeleton: "worker_processes auto;\n\nevents {\n    worker_connections 1024;\n}\n\nhttp {\n    # 1. active gzip (types texte/JS/JSON)\n    # 2. HTTP/2 sur le vhost 443 + certificats\n    # 3. cache navigateur 1 an sur /build/\n    # 4. micro-cache 5s sur /api/public/ (zone proxy_cache_path)\n}\n", required: ["gzip", "listen", "proxy_cache_path", "proxy_cache"], hint: "Voir le fichier complet de la leçon : gzip on; listen 443 ssl http2; proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api:10m max_size=1g inactive=60m use_temp_path=off; proxy_cache api;" },
      { type: "mcq", diff: "medium", title: "Le goulot", prompt: "Les polices/downloads sont lents, les pages sont rapides. Que regardes-tu en premier ?", options: ["worker_connections", "tcp_nopush/sendfile + le cache browser des gros fichiers", "gzip_comp_level 9", "HSTS"], answer: [1], explain: "Gros fichiers = transport + cache navigateur ; le gzip ne peut rien pour un binaire." }
    ]
  };
  M.lessons.push(L);
})();
(function addPerfProj() {
  const M = window.MODULES.find((m) => m.id === "performance");
  M.project = {
    title: "Mini-projet du module : le monitorat de performance",
    goal: "Appliquer le profil performance complet (compression, caches, HTTP/2, workers) sur un site statique + API locale, et DÉMONTRER les gains par des mesures avant/après.",
    objectives: [
      "Site local avec statique (dossier /srv/site ou C:/nginx/html/perf) + une app sur 8000 répondant à /api/public/large (ex. python -m http.server ne suffit pas pour JSON : utiliser un petit serveur ou un fichier statique API)",
      "Activer gzip (types texte + JSON + JS) et vérifier Content-Encoding: gzip avec curl",
      "Cache navigateur 1 an + immutable sur /build/ (ou assets à nom haché)",
      "Micro-cache 5 s sur /api/public/ avec X-Cache-Status : démontrer MISS puis HIT",
      "HTTP/2 sur 443 (+ redirection 80→443), certificat auto-signé",
      "worker_processes auto, worker_connections 4096, worker_rlimit_nofile 65535",
      "Mesures avec ab -n 3000 -c 100 : RPS et échecs AVANT (sans aucun réglage) et APRÈS ; écrire les chiffres",
      "Bonus : graphique simple (tableau) des gains par levier"
    ],
    answer: "Config de référence : voir la leçon 6 (profil complet). Points de mesure :\nAVANT (config brute) vs APRÈS (profil complet) sur https://perf.local/build/app.js :\n- Content-Encoding: gzip présent après\n- Cache-Control: public, max-age=31536000, immutable après\n- X-Cache-Status : MISS puis HIT sur /api/public/x\n- http_version : 2 après\n- ab -n 3000 -c 100 : RPS après > avant, Failed requests = 0\nAttention : sur Windows, /var/cache/nginx → C:/nginx/temp (déjà le tmp par défaut) ; proxy_cache_path C:/nginx/cache_zone... utiliser un chemin existant."
  };
})();
