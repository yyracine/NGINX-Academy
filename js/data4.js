/* Nginx Academy — Module 4 : 🔀 Reverse proxy */
(function addRpL1() {
  const M = window.MODULES.find((m) => m.id === "proxy");
  const L = {
    id: "rp-role",
    title: "Le reverse proxy en action",
    excerpt: "Rôle, schéma client → proxy → app, intérêts et limites.",
    content: `
# Le reverse proxy en action

## Qu’est-ce qu’un reverse proxy ?

Au-delà du serveur de fichiers statiques, NGINX excelle comme **reverse proxy** : il reçoit les requêtes des clients et les relaie vers un serveur d’application (Node.js, Python, PHP, Java, un autre NGINX...) situé **derrière** lui, sur la même machine ou sur le réseau interne.

\`\`\`
client (Internet)
   │  GET https://exemple.fr/api/tickets
   ▼
NGINX (reverse proxy)
   │  proxy_pass → http://127.0.0.1:8000
   ▼
API Node.js (invisible du client)
\`\`\`

Le client ne parle **jamais directement** à l’application : il ne connaît que NGINX.

## Reverse ou forward proxy ?

- **Forward proxy** : se place *devant les clients* (ex. le proxy d’entreprise par lequel passent les navigateurs pour sortir vers Internet).
- **Reverse proxy** : se place *devant les serveurs* ; on l’installe soi-même, à la limite de son réseau.

## Pourquoi placer NGINX devant son application ?

1. **Point d’entrée unique** : un seul port 80/443 exposé sur Internet, quel que soit le nombre d’apps.
2. **TLS centralisé** : le certificat est géré au niveau du proxy, les applications restent en http interne.
3. **Sécurité en profondeur** : filtrage, en-têtes, rate limiting, contrôle d’accès (module Sécurité).
4. **Cache** : NGINX peut servir des copies en cache des réponses applicatives (module Performance).
5. **Répartition de charge** : le proxy peut répartir la charge sur plusieurs instances (module suivant).
6. **Sous le même domaine** : servir le frontend statique *et* l’API, avec un partage propre de l’URL.

## Quand ne pas en mettre

- Une app unique, sans TLS ni filtrage : le proxy n’apporte rien.
- Flux temps réel ultra-denses : le relais ajoute une étape (négligeable, mais à connaître).

> [!tip] **Règle d’or** : le reverse proxy gère l’**entrée** (TLS, host, sécurité, cache) ; l’application gère la **logique métier**. Ne t’expose jamais une application nue sans filtres.
`,
    quiz: [
      { q: "Qu’est-ce qu’un reverse proxy ?", options: ["Un serveur qui représente les clients (comme un proxy d’entreprise)", "Un serveur placé devant une ou plusieurs applications, qui relaie leurs requêtes", "Un pare-feu applicatif qui bloque les requêtes", "Un enregistrement DNS qui pointe vers plusieurs IP"], correct: [1], explain: "Le reverse proxy est placé devant les serveurs ; le forward proxy se place devant les clients." },
      { q: "Dans une architecture avec reverse proxy, qui voit directement l’application ?", options: ["Le navigateur du client", "Le reverse proxy et lui seul", "Les serveurs d’application entre eux", "Tout le monde"], correct: [1], explain: "Le client ne connaît que le reverse proxy ; l’application n’est accessible que via lui." },
      { q: "Quels bénéfices apporte le reverse proxy ? (plusieurs réponses)", options: ["Concentrer le TLS sur un seul point", "Mettre en cache des réponses applicatives", "Répartir la charge entre plusieurs instances", "Réécrire le code de l’application"], correct: [0, 1, 2], explain: "TLS, cache, load balancing : le proxy épaissit la couche d’entrée, il ne modifie jamais l’application." }
    ],
    exercises: [
      { type: "order", diff: "easy", title: "Tracer le chemin d’une requête", prompt: "Remets dans l’ordre le chemin d’une requête avec reverse proxy.", items: ["Le client envoie GET /api/tickets", "NGINX fait correspondre la location /api/", "NGINX relaie la requête vers l’application", "NGINX renvoie la réponse au client", "L’application traite et répond"], explain: "Entrée → matching → relais → traitement → réponse." },
      { type: "mcq", diff: "medium", title: "Reverse ou forward ?", prompt: "Ton entreprise te demande d’installer un serveur qui relayerait les requêtes sortantes des employés vers Internet. C’est un...", options: ["proxy_pass", "reverse proxy", "forward proxy", "load balancer"], answer: [2], explain: "Devant les clients = forward proxy. Devant les serveurs = reverse proxy." }
    ]
  };
  M.lessons.push(L);
})();
(function addRpL2() {
  const M = window.MODULES.find((m) => m.id === "proxy");
  const L = {
    id: "rp-proxy-pass",
    title: "proxy_pass : la base et le piège des URI",
    excerpt: "Syntaxe, règles d’URI (slash final !), services nommés Docker, exemple complet.",
    content: `
# proxy_pass : la base et le piège des URI

## Syntaxe minimale

\`\`\`nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
}
\`\`\`

Toute requête commençant par \`/api/\` est transmise à une application locale écoutant sur le port \`8000\`.

## La règle d’URI (le piège classique)

Le comportement dépend de la présence d’un **chemin** dans \`proxy_pass\` :

| configuration | requête reçue | transmise à l’app |
|---|---|---|
| \`proxy_pass http://127.0.0.1:8000;\` | \`/api/tickets\` | \`/api/tickets\` (inchangée) |
| \`proxy_pass http://127.0.0.1:8000/;\` | \`/api/tickets\` | \`/tickets\` (préfixe remplacé) |
| \`proxy_pass http://127.0.0.1:8000/new;\` | \`/api/tickets\` | \`/newtickets\` (concaténation) |

- **Sans chemin** (pas de slash après le port) : le path d’origine est **conservé**.
- **Avec chemin** (\`/\` ou autre) : la partie reconnue par la \`location\` est **remplacée** par ce chemin.

> [!warn] Une \`location /api/\` ne doit servir que ce préfixe : si tu écris \`proxy_pass http://app:3000\`, les URL internes de l’app (ex. \`/login\`) ne seront atteintes qu’avec le préfixe \`/api/login\`. Vérifie toujours côté app ce que ton proxy attend.

## Proxy vers des services nommés (Docker, réseau interne)

Dans un réseau Docker Compose, on peut adresser un service par son nom :

\`\`\`nginx
location /api/ {
    proxy_pass http://app:3000;
}
\`\`\`

> [!info] NGINX résout le nom \`app\` **au démarrage**. Si l’IP change dynamiquement, ajoute un \`resolver\` (ex. \`resolver 127.0.0.11;\` sous Docker) pour une résolution à la volée.

## Garder une connexion propre avec l’app

\`\`\`nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_http_version 1.1;      # nécessaire pour le keepalive amont
}
\`\`\`

Sans \`proxy_http_version 1.1\`, NGINX parle HTTP/1.0 à l’application, qui ferme la connexion après chaque réponse (performance médiocre).

## Exemple complet

\`\`\`nginx
server {
    listen 80;
    server_name exemple.local;

    location / {
        root /data/frontend;
        index index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
    }
}
\`\`\`

Frontend servi en statique par NGINX, API relayée : un seul domaine, deux mondes.
`,
    quiz: [
      { q: "Avec location /api/ { proxy_pass http://127.0.0.1:8000; }, une requête /api/tickets est transmise comme...", options: ["/tickets", "/api/tickets", "/tickets/api", "/api/tickets/api"], correct: [1], explain: "Sans chemin dans proxy_pass, le path d’origine est conservé intégralement." },
      { q: "Et avec proxy_pass http://127.0.0.1:8000/; ?", options: ["/api/tickets", "/tickets", "/", "Erreur de syntaxe"], correct: [1], explain: "Le chemin '/' remplace la partie reconnue par la location (le préfixe /api/)." },
      { q: "Pourquoi écrire proxy_http_version 1.1 ?", options: ["Pour activer HTTP/3", "Pour profiter du keepalive avec l’application", "Pour chiffrer la liaison", "C’est obligatoire pour nginx -t"], correct: [1], explain: "HTTP/1.1 permet les connexions persistantes vers l’amont." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Proxy minimal vers une app locale", prompt: "Complète la location /api/ pour relayer les requêtes vers l’application sur le port 8000.", skeleton: "server {\n    listen 80;\n    server_name app.local;\n\n    location /api/ {\n        # écris ici le proxy vers l’app sur le port 8000\n    }\n}\n", required: ["proxy_pass"], hint: "Ajoute proxy_pass http://127.0.0.1:8000; dans la location /api/." },
      { type: "mcq", diff: "medium", title: "Devine l’URL transmise", prompt: "location /api/ et proxy_pass http://127.0.0.1:8000/app; — que reçoit l’app pour GET /api/hello ?", options: ["/api/hello", "/app/hello", "/hello", "/api/app/hello"], answer: [1], explain: "La location matche /api/ et le chemin /app remplace ce préfixe, puis on concatène le reste : /app/hello." },
      { type: "config", diff: "medium", title: "Proxy avec version HTTP", prompt: "Ajoute la directive qui permet le keepalive vers l’application (HTTP/1.1).", skeleton: "server {\n    listen 80;\n    server_name exemple.local;\n\n    location /api/ {\n        proxy_pass http://127.0.0.1:8080;\n        # ajoute ici la version HTTP pour le keepalive\n    }\n}\n", required: ["proxy_pass", "proxy_http_version"], hint: "Ajoute proxy_http_version 1.1;" }
    ]
  };
  M.lessons.push(L);
})();
(function addRpL3() {
  const M = window.MODULES.find((m) => m.id === "proxy");
  const L = {
    id: "rp-headers",
    title: "En-têtes : l’identité réelle du client",
    excerpt: "Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto, forwarded et le piège de confiance.",
    content: `
# En-têtes : donner l’identité réelle du client à l’app

Quand NGINX relaie une requête, il peut (doit) **enrichir les en-têtes** pour que l’application sache qui frappe réellement à la porte : l’IP du client, le domaine demandé, le schéma (http/https).

## Le trio historique

\`\`\`nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;

    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
\`\`\`

| en-tête | contenu | pourquoi |
|---|---|---|
| \`Host\` | \`$host\` (le nom demandé par le client) | l’app fabrique des URL absolues et des vhosts |
| \`X-Real-IP\` | \`$remote_addr\` (l’IP du client) | logs et géolocalisation côté app |
| \`X-Forwarded-For\` | chaîne des IP traversées | l’app connaît la liste complète |
| \`X-Forwarded-Proto\` | \`http\` ou \`https\` | l’app génère des liens \`https\` corrects |

> [!warn] Sans \`X-Forwarded-Proto\`, une app derrière un proxy TLS croit être en http : elle génère des URL \`http://\` et des cookies potentiellement non sécurisés.

## La norme moderne : forwarded

\`forwarded\` est le standard RFC 7239, plus propre que les en-têtes X-* :

\`\`\`nginx
proxy_set_header forwarded for=$remote_addr;proto=$scheme;host=$host;
\`\`\`

## Exemple complet

\`\`\`nginx
server {
    listen 80;
    server_name app.exemple.fr;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
\`\`\`

## Le piège de la confiance

> [!warn] **Sécurité** : toute application qui s’appuie sur \`X-Forwarded-For\` pour bloquer des IP doit **ignorer** les valeurs fournies par les clients. Un client peut envoyer \`X-Forwarded-For: 127.0.0.1\` à NGINX, qui l’annexera tel quel via \`$proxy_add_x_forwarded_for\`. Ne fais confiance qu’aux **derniers** éléments de la chaîne, ajoutés par ton proxy.
`,
    quiz: [
      { q: "Quel en-tête permet à l’application de connaître le domaine demandé par le client ?", options: ["X-Real-IP", "Host", "X-Forwarded-For", "Upgrade"], correct: [1], explain: "proxy_set_header Host $host transmet le nom de domaine saisi par le client." },
      { q: "Que contient X-Forwarded-Proto ?", options: ["L’IP du client", "Le protocole de la requête d’origine (http ou https)", "La version de NGINX", "Le nom du navigateur"], correct: [1], explain: "Il informe l’app que la connexion d’origine était chiffrée, même si le proxy parle http avec elle." },
      { q: "Pourquoi ne pas faire confiance à un X-Forwarded-For envoyé par le client ?", options: ["Il est toujours vide", "Le client peut l’écrire lui-même et le falsifier", "NGINX ne lit jamais cet en-tête", "Il contient des données chiffrées"], correct: [1], explain: "N’importe qui peut envoyer cet en-tête ; seul le proxy doit l’ajouter, et l’app ne doit considérer que la valeur la plus récente." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Riche en en-têtes", prompt: "Transmets au backend l’identité réelle du client : Host, X-Real-IP et X-Forwarded-Proto.", skeleton: "server {\n    listen 80;\n    server_name app.local;\n\n    location / {\n        proxy_pass http://127.0.0.1:8000;\n        proxy_http_version 1.1;\n        # transmet ici le Host, l’IP réelle et le proto\n    }\n}\n", required: ["proxy_pass", "proxy_set_header"], hint: "Ajoute 3 lignes proxy_set_header (Host, X-Real-IP, X-Forwarded-Proto)." },
      { type: "mcq", diff: "hard", title: "La chaîne d’IP", prompt: "client → proxy → app. Le client envoie X-Forwarded-For: 10.0.0.99. Que reçoit l’app avec $proxy_add_x_forwarded_for ?", options: ["10.0.0.99", "10.0.0.99, IP du client", "IP du client seule", "Rien, l’en-tête est ignoré"], answer: [1], explain: "$proxy_add_x_forwarded_for conserve la chaîne existante et y ajoute l’IP réelle vue par NGINX." }
    ]
  };
  M.lessons.push(L);
})();
(function addRpL4() {
  const M = window.MODULES.find((m) => m.id === "proxy");
  const L = {
    id: "rp-timeouts",
    title: "Timeouts, buffers et taille des corps",
    excerpt: "Connect/read/send timeout, buffering, client_max_body_size, gros fichiers et uploads.",
    content: `
# Timeouts, buffers et taille des corps

Un reverse proxy doit savoir **attendre** et **tamponner**. Ces réglages évitent les requêtes qui s’éternisent et les applications submergées.

## Les trois timeouts d’un proxy

\`\`\`nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;

    proxy_connect_timeout 5s;   # délai pour établir la connexion vers l’app
    proxy_send_timeout    60s;  # envoi des données vers l’app
    proxy_read_timeout    60s;  # attente d’une réponse de l’app
}
\`\`\`

| directive | sens | défaut |
|---|---|---|
| \`proxy_connect_timeout\` | connexion à l’app | 60s |
| \`proxy_send_timeout\` | entre deux envois vers l’app | 60s |
| \`proxy_read_timeout\` | entre deux lectures depuis l’app | 60s |

> [!tip] Une app lente légitime (génération de rapport, IA, upload) : monte \`proxy_read_timeout\` à 300s **sur la location concernée uniquement**, pas globalement.

## Buffering : tamponner ou couler ?

- **\`proxy_buffering on\`** (défaut) : NGINX lit toute la réponse de l’app avant de la renvoyer au client. Protège l’app d’un client lent, mais le client voit arriver la réponse en bloc.
- **\`proxy_buffering off\`** : streaming immédiat, indispensable pour **SSE** (server-sent events), vidéo en direct, gros téléchargements interactifs.

\`\`\`nginx
location /events {
    proxy_pass http://127.0.0.1:8000;
    proxy_buffering off;
    proxy_cache off;               # ne jamais cacher un flux
    proxy_set_header Connection "";
    proxy_http_version 1.1;
}
\`\`\`

## Taille maximale des corps (upload)

\`client_max_body_size\` limite la taille des requêtes contenant un corps (POST/upload) :

\`\`\`nginx
server {
    listen 80;
    client_max_body_size 25m;    # à mettre dans server (contexte http/serveur)
    ...
}
\`\`\`

Sans réglage, limite par défaut à **1 Mo** : un upload de photo de 5 Mo donnera une erreur 413 Request Entity Too Large.

## Taille des buffers internes

\`\`\`nginx
proxy_buffer_size 8k;       # tête de réponse de l’app
proxy_buffers 8 4k;         # tampons de corps (16 buffers au total)
\`\`\`

En général, les valeurs par défaut suffisent ; augmente \`proxy_buffer_size\` si tes réponses ont de très gros en-têtes.

## À retenir

| symptôme | réglage à vérifier |
|---|---|
| 504 Gateway Timeout | \`proxy_read_timeout\` / \`proxy_connect_timeout\` |
| 413 Request Entity Too Large | \`client_max_body_size\` |
| flux SSE coupé | \`proxy_buffering off\` + \`proxy_cache off\` |
| app paresseuse à répondre lentement | buffers trop petits |
`,
    quiz: [
      { q: "Quelle erreur obtient-on quand proxy_read_timeout expire ?", options: ["502 Bad Gateway", "504 Gateway Timeout", "413 Request Entity Too Large", "404 Not Found"], correct: [1], explain: "Le délai d’attente de la réponse amont est dépassé → 504." },
      { q: "Quelle est la limite par défaut de client_max_body_size ?", options: ["25 Mo", "1 Mo", "2 Go", "Illimitée"], correct: [1], explain: "1 Mo par défaut ; au-delà NGINX répond 413." },
      { q: "Pour un flux SSE (événements temps réel), quel réglage est indispensable ?", options: ["proxy_buffering on", "proxy_buffering off", "proxy_connect_timeout 1s", "client_max_body_size 0"], correct: [1], explain: "Le streaming impose proxy_buffering off (et proxy_cache off) pour que chaque événement parte immédiatement." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Proxy patient pour une I.A.", prompt: "La génération IA peut durer plusieurs minutes : configure des timeouts adaptés.", skeleton: "server {\n    listen 80;\n    server_name ia.local;\n\n    location /generate/ {\n        proxy_pass http://127.0.0.1:7000;\n        # la génération peut prendre 5 min : monte les timeouts\n    }\n}\n", required: ["proxy_pass", "proxy_read_timeout", "proxy_connect_timeout"], hint: "Ajoute proxy_read_timeout 300s; et proxy_connect_timeout 10s;" },
      { type: "mcq", diff: "hard", title: "Diagnostic streaming", prompt: "Ton flux temps réel se bloque toutes les ~60 secondes. La cause la plus probable :", options: ["client_max_body_size trop petit", "proxy_read_timeout par défaut qui expire", "Host mal transmis", "Le certificat TLS"], answer: [1], explain: "Avec un flux qui n’envoie rien pendant plus de 60s, le proxy_read_timeout par défaut coupe la connexion : monte-le ou désactive le buffering pour ce flux." }
    ]
  };
  M.lessons.push(L);
})();
(function addRpL5() {
  const M = window.MODULES.find((m) => m.id === "proxy");
  const L = {
    id: "rp-websocket",
    title: "WebSocket et flux spéciaux",
    excerpt: "Upgrade HTTP, map $http_upgrade, temps d’inactivité, cas particuliers.",
    content: `
# WebSocket et flux spéciaux

Les WebSocket démarrent en HTTP puis **upgradent** la connexion. NGINX doit passer l’en-tête \`Upgrade\` à l’application, sinon la poignée de main échoue (erreur 400 côté client, connexion fermée).

## La configuration standard

\`\`\`nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ’’      close;
}

server {
    listen 80;
    server_name chat.local;

    location /ws/ {
        proxy_pass http://127.0.0.1:7000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 300s;   # sockets souvent inactives : soit patient
    }
}
\`\`\`

Explication ligne par ligne :

- \`$http_upgrade\` : contient la valeur de l’en-tête \`Upgrade\` envoyé par le client (\`websocket\` en général).
- \`map\` : si le client demande un upgrade → on transmet \`Upgrade: websocket\` et \`Connection: upgrade\` ; sinon (requête normale) → \`Connection: close\` (on ne transmet pas un upgrade fantôme).
- \`proxy_read_timeout 300s\` : nettoyer les sockets qui restent vides trop longtemps.

> [!warn] Sans le bloc \`map\`, écrire simplement \`proxy_set_header Connection "upgrade";\` sur toutes les requêtes casse le keepalive normal avec l’app. La map est la bonne pratique.

## SSE (Server-Sent Events)

Même combat que les WebSocket, sans upgrade :

\`\`\`nginx
location /events {
    proxy_pass http://127.0.0.1:8000;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection "";
    proxy_http_version 1.1;
    proxy_read_timeout 1h;
}
\`\`\`

## Cas particuliers à connaître

| situation | conseil |
|---|---|
| WebSocket + cache | \`proxy_cache off\` (jamais de cache sur un flux) |
| WebSocket + timeouts | monter \`proxy_read_timeout\` (WebSocket laissent souvent des silences) |
| Plusieurs apps WebSocket | un bloc \`location /ws-1/\`, un \`/ws-2/\`… chaque app son proxy |
| HTTP/2 amont | les WebSocket passent en h2c… en général inutile, reste en HTTP/1.1 |

## Vérifier qu’un upgrade fonctionne

\`\`\`bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: xxx" \
     http://chat.local/ws/
\`\`\`

Une réponse \`101 Switching Protocols\` confirme que le proxy relaie bien l’upgrade.
`,
    quiz: [
      { q: "Quel en-tête le client envoie-t-il pour lancer un WebSocket ?", options: ["Upgrade: websocket", "Content-Type: websocket", "X-WebSocket: true", "Connection: keep-alive"], correct: [0], explain: "Le client demande l’upgrade avec Upgrade: websocket + Connection: Upgrade." },
      { q: "À quoi sert le bloc map $http_upgrade $connection_upgrade ?", options: ["À compresser les messages", "À transmettre Connection: upgrade seulement quand le client la demande, sinon close", "À bloquer les WebSocket", "À régler le timeout"], correct: [1], explain: "Il adapte l’en-tête Connection selon que la requête demande un upgrade ou non." },
      { q: "Sur un flux, pourquoi écrire proxy_cache off ?", options: ["Pour économiser le disque", "Pour ne jamais servir une copie en cache d’un flux temps réel", "C’est le défaut", "Pour activer HTTP/2"], correct: [1], explain: "Un flux doit arriver en direct ; un cache le décalerait ou le corromprait." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Proxy WebSocket complet", prompt: "Complète le proxy WebSocket : en-têtes Upgrade/Connection et un read_timeout généreux.", skeleton: "server {\n    listen 80;\n    server_name chat.local;\n\n    location /ws/ {\n        proxy_pass http://127.0.0.1:7000;\n        proxy_http_version 1.1;\n        # ajoute les en-têtes Upgrade/Connection et un read_timeout généreux\n    }\n}\n", required: ["proxy_pass", "proxy_http_version", "proxy_set_header", "proxy_read_timeout"], hint: "Tu peux aussi ajouter un bloc map au niveau http (au-dessus du server) : map $http_upgrade $connection_upgrade { default upgrade; '' close; }" },
      { type: "order", diff: "easy", title: "La poignée de main WebSocket", prompt: "Ordonne les étapes d’une connexion WebSocket à travers NGINX.", items: ["Le client demande Upgrade: websocket", "NGINX transmet Upgrade et Connection: upgrade", "L’application accepte et répond 101 Switching Protocols", "NGINX relaie la réponse 101 au client", "Le canal bidirectionnel est ouvert"], explain: "Demande → relais → acceptation → réponse → flux ouvert." }
    ]
  };
  M.lessons.push(L);
})();
(function addRpL6() {
  const M = window.MODULES.find((m) => m.id === "proxy");
  const L = {
    id: "rp-pratique",
    title: "Mise en pratique : un front + une API derrière un proxy",
    excerpt: "Serveur complet front/API, en-têtes, WebSocket, timeouts, tests avec curl.",
    content: `
# Mise en pratique : un front + une API derrière un proxy

Objectif : un serveur NGINX qui sert un **frontend statique** et relaie un **backend** (API + WebSocket) sur le même domaine. C’est l’architecture type de beaucoup de projets.

## 1. L’architecture

\`\`\`
http://app.local:80
   │
   ├── /        → fichiers statiques (frontend)
   ├── /api/    → http://127.0.0.1:8000 (API)
   └── /ws/     → http://127.0.0.1:8001 (WebSocket)
\`\`\`

## 2. La configuration complète

\`\`\`nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ’’      close;
}

server {
    listen 80;
    server_name app.local;
    root /srv/app/frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA : tout retombe sur index.html
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_connect_timeout 10s;
        proxy_read_timeout    60s;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 300s;
    }
}
\`\`\`

## 3. Mettre le backend en place (pour t’entraîner)

Choisis n’importe quelle app locale :

- Node : \`node server.js\` sur le port 8000.
- Python : \`python -m http.server 8000\` pour un simple fichier de test.
- PHP : \`php -S 127.0.0.1:8000\`.
- Un second NGINX sur le port 8000 (root différent) : parfait pour s’entraîner sans installer d’app.

## 4. Les tests

\`\`\`bash
curl -i http://app.local/                    # frontend statique
curl -i http://app.local/api/health          # proxy → application
curl -X POST -F "file=@photo.jpg" http://app.local/api/upload   # upload
curl -I -H "Host: autre-site.com" http://app.local/api/health  # host forcé
\`\`\`

Vérifie dans la réponse API la présence de \`X-Forwarded-Proto: http\` : preuve que les en-têtes passent.

## 5. Pièges rencontrés en conditions réelles

1. L’app génère des URL \`http://127.0.0.1:8000/...\` → configure le \`Host\`/base URL côté app.
2. Upload > 1 Mo → 413 → ajoute \`client_max_body_size\`.
3. Le socket se ferme toutes les 60 s → \`proxy_read_timeout 300s\`.
4. \`/api/login\` renvoie 404 parce que l’app attend \`/login\` → choisis la règle d’URI qui va bien (regarde la leçon 2 !).

> [!tip] Les chemins de \`root\` (Linux : /srv/app/frontend, Windows : C:/nginx/html/frontend) ne changent pas la syntaxe du proxy : seuls les chemins du backend (\`127.0.0.1:8000\`) importent ici.
`,
    quiz: [
      { q: "Pour une application monopage (SPA), quelle ligne fait retomber les routes inconnues sur index.html ?", options: ["try_files $uri $uri/ /index.html;", "index index.html;", "proxy_pass http://127.0.0.1:8000;", "error_page 404 = /index.html;"], correct: [0], explain: "try_files essaie le fichier réel, puis le dossier, puis index.html." },
      { q: "Tes uploads échouent avec 413. Que fais-tu ?", options: ["proxy_read_timeout 300s", "client_max_body_size 25m", "proxy_buffering off", "proxy_http_version 1.1"], correct: [1], explain: "413 = corps trop gros : augmente client_max_body_size au niveau server." },
      { q: "Ta page affiche des assets cassés car l’API renvoie des URL http://127.0.0.1:8000/... . La cause ?", options: ["NGINX est mal installé", "L’app ne connaît pas son adresse publique : mal configurée côté app (base URL/Host)", "Le certificat", "Le DNS"], correct: [1], explain: "L’app fabrique des URL avec sa vue locale ; règle sa base URL (ou le Host transmis)." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Le serveur complet", prompt: "Assemble le serveur complet : front SPA + API relayée + WebSocket, avec en-têtes et timeouts.", skeleton: "map $http_upgrade $connection_upgrade {\n    default upgrade;\n    ''      close;\n}\n\nserver {\n    listen 80;\n    server_name app.local;\n    root /srv/app/frontend;\n    index index.html;\n\n    location / {\n        try_files $uri $uri/ /index.html;\n    }\n\n    location /api/ {\n        # à compléter : proxy vers 127.0.0.1:8000 + en-têtes\n    }\n\n    location /ws/ {\n        proxy_pass http://127.0.0.1:8001;\n        # à compléter : Upgrade, Connection et read_timeout\n    }\n}\n", required: ["proxy_pass", "proxy_set_header", "proxy_read_timeout", "proxy_http_version"], hint: "Tu peux mettre les en-têtes du WS dans la location /ws/ (proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection $connection_upgrade; proxy_read_timeout 300s;)." },
      { type: "mcq", diff: "medium", title: "Diagnostic 404 sur /api/login", prompt: "Ton app gère /login, pas /api/login, et ta location est /api/ avec proxy_pass http://127.0.0.1:8000 (sans chemin). Que reçois-tu sur /api/login ?", options: ["200 OK", "404 (le chemin /api/login part tel quel vers l’app)", "301", "502"], answer: [1], explain: "Sans chemin dans proxy_pass, /api/login est transmis tel quel ; l’app ne connaît que /login → 404. Utilise proxy_pass avec un chemin ou remonte l’app." }
    ]
  };
  M.lessons.push(L);
})();
(function addRpProj() {
  const M = window.MODULES.find((m) => m.id === "proxy");
  M.project = {
    title: "Mini-projet du module : un service livré par proxy",
    goal: "Créer une petite application (n’importe quel serveur local : un second NGINX, Python, Node…) et l’exposer derrière un reverse proxy NGINX avec en-têtes, WebSocket et timeouts, puis vérifier le tout.",
    objectives: [
      "Installer/faire tourner une application sur 127.0.0.1:8000 (ex. python -m http.server 8000 ou un second NGINX sur le port 8000)",
      "Renommer ou adapter tes deux fichiers de config : virtual host app.local sur le port 80",
      "location /api/ : proxy_pass + proxy_http_version 1.1 + les 4 en-têtes (Host, X-Real-IP, X-Forwarded-For, X-Forwarded-Proto)",
      "Ajouter un flux WebSocket (même factice) avec map $http_upgrade, Upgrade, Connection et proxy_read_timeout 300s",
      "Valider avec nginx -t puis recharger",
      "Tester avec curl : / (frontend), /api/ (proxy), en-tête X-Forwarded-Proto visible, upload de plus de 1 Mo rejeté avec 413 si pas de client_max_body_size",
      "Bonus : ajouter client_max_body_size 25m et vérifier que l’upload passe"
    ],
    answer: "Config de référence :\nmap $http_upgrade $connection_upgrade { default upgrade; '' close; }\nserver {\n  listen 80;\n  server_name app.local;\n  root /srv/app/frontend;\n  index index.html;\n  location / { try_files $uri $uri/ /index.html; }\n  location /api/ {\n    proxy_pass http://127.0.0.1:8000;\n    proxy_http_version 1.1;\n    proxy_connect_timeout 10s;\n    proxy_read_timeout 60s;\n    proxy_set_header Host $host;\n    proxy_set_header X-Real-IP $remote_addr;\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n    proxy_set_header X-Forwarded-Proto $scheme;\n  }\n  location /ws/ {\n    proxy_pass http://127.0.0.1:8001;\n    proxy_http_version 1.1;\n    proxy_set_header Upgrade $http_upgrade;\n    proxy_set_header Connection $connection_upgrade;\n    proxy_read_timeout 300s;\n  }\n}\nVérifications : curl -i http://app.local/api/health montre X-Forwarded-Proto: http ; curl -X POST --data-binary @fichier-2Mo.jpg http://app.local/api/ sans client_max_body_size renvoie 413."
  };
})();
