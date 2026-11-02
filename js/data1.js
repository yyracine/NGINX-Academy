/* Module 1 — Les fondamentaux du web */
(function () {
  'use strict';
  const M = window.MODULES.find((m) => m.id === 'fondamentaux');
  if (!M) return;

  M.lessons.push({
    id: 'web-http',
    title: 'Le web et HTTP : ce que NGINX voit vraiment',
    excerpt: 'Client-serveur, requêtes, réponses, méthodes, codes de statut : la base de tout serveur web.',
    content: `
# Le web et HTTP : ce que NGINX voit vraiment

Un serveur web (comme NGINX) ne fait pas grand-chose de magique : il **reçoit des requêtes HTTP**, les **traite**, et **renvoie des réponses**. Pour maîtriser NGINX, il faut d’abord maîtriser ce protocole que vous utilisez chaque jour sans le voir.

## Le modèle client-serveur

Deux rôles, un dialogue :

- Le **client** (navigateur, application, \`curl\`) **émet une requête**.
- Le **serveur** (NGINX) **répond** avec un statut, des en-têtes et, souvent, un corps.

\`\`\`text
Client (navigateur)                    Serveur (NGINX)
      │   GET /index.html HTTP/1.1          │
      │   Host: example.com                 │
      │────────────────────────────────────►│  traitement
      │                                     │
      │   HTTP/1.1 200 OK                    │
      │   Content-Type: text/html           │
      │   <html>…</html>                    │
      │◄────────────────────────────────────│
\`\`\`

Tout est **texte** : la requête et la réponse sont des lignes de texte formatées, puisées dans des fichiers ou générées dynamiquement.

## L’URL : ce qu’elle contient

\`\`\`text
https://example.com:443/blog/article?page=2#intro
└─┬──┘ └───┬────┘ └┬┘ └──┬────┘ └───┬────┘ └───┬──┘
schéma    hôte      port  chemin     query      fragment
\`\`\`

- **schéma** : http / https (transport + chiffrement).
- **hôte** : le nom de domaine ; NGINX s’en sert pour **choisir le bon \`server\`** (virtual host).
- **port** : 80 (http) ou 443 (https) par défaut ; rappels qu’un serveur peut écouter sur plusieurs ports.
- **chemin** : \`/blog/article\` → NGINX décide quel \`location\` traitera la requête.
- **query** : \`?page=2\` → paramètres accessibles via la variable \`$args\`.

> [!info] Fragments (#…) ne sont **jamais envoyés au serveur** : ils sont traités uniquement par le navigateur.

## Une requête HTTP

Trois parties :

\`\`\`text
GET /index.html HTTP/1.1                        ← ligne de requête
Host: example.com                              ← en-têtes
User-Agent: Mozilla/5.0 …
Accept: text/html,application/xhtml+xml

(éventuel corps, ex. pour POST)                  ← corps
\`\`\`

## Les méthodes HTTP

| Méthode | Rôle | Corps ? |
|---|---|---|
| \`GET\` | Lire une ressource | non |
| \`HEAD\` | Comme GET, sans le corps (en-têtes seuls) | non |
| \`POST\` | Créer / soumettre (formulaire, API) | oui |
| \`PUT\` | Remplacer une ressource | oui |
| \`PATCH\` | Modifier partiellement | oui |
| \`DELETE\` | Supprimer | évent. |

> [!warn] NGINX ne fait pas de différence GET/POST par défaut **sur le choix de la ressource** ; en revanche \`limit_req\`, \`proxy_pass\` ou les logs (via \`$request_method\`) en tiennent compte.

## Les codes de statut : le langage des réponses

| Code | Famille | Exemples |
|---|---|---|
| \`1xx\` | Information | \`101 Switching Protocols\` (WebSocket) |
| \`2xx\` | Succès | \`200 OK\`, \`201 Created\`, \`204 No Content\` |
| \`3xx\` | Redirection | \`301 Moved Permanently\`, \`302 Found\`, \`304 Not Modified\` |
| \`4xx\` | Erreur client | \`400 Bad Request\`, \`401 Unauthorized\`, \`403 Forbidden\`, \`404 Not Found\`, \`429 Too Many Requests\` |
| \`5xx\` | Erreur serveur | \`500 Internal Server Error\`, \`502 Bad Gateway\`, \`503 Service Unavailable\`, \`504 Gateway Timeout\` |

  NGINX est responsable de la plupart de ces codes : \`404\` si la ressource n’existe pas, \`502\` ou \`504\` si le backend derriere le proxy est mort ou trop lent, \`429\` si vous imposez un \`limit_req\`.

## Les en-têtes essentiels

- \`Host\` : le nom de domaine demandé — **crucial** pour le virtual hosting.
- \`Content-Type\` : type de la ressource (\`text/html\`, \`application/json\`…) — NGINX le choisit via \`mime.types\`.
- \`Content-Length\` : taille du corps.
- \`Cache-Control\` / \`ETag\` / \`Last-Modified\` : gestion du cache navigateur.

> [!tip] Testez HTTP vous-même : \`curl -v http://localhost\` affichera la requête complète et la réponse en clair. C’est le meilleur moyen de « voir » ce que NGINX voit.

## Ce que NGINX retient d’une requête

Pour chaque requête, NGINX expose des **variables** que l’on utilisera partout (logs, \`try_files\`, réécritures) :

- \`$request_method\`, \`$uri\` (chemin sans query), \`$request_uri\` (avec query), \`$host\`, \`$remote_addr\` (IP client), \`$http_user_agent\`, \`$status\`, \`$request_time\`…

C’est exactement ce que vous lirez dans les fichiers de log par défaut.
`
  });

  M.lessons[0].quiz = [
    {
      q: 'Quelle méthode HTTP est la plus typique pour envoyer des données d’un formulaire ?',
      options: ['GET', 'POST', 'DELETE', 'HEAD'],
      correct: [1],
      explain: 'POST transporte un corps de requête : c’est LA méthode des formulaires et de la création de ressources.'
    },
    {
      q: 'Que signifie une réponse HTTP 404 ?',
      options: ['Le serveur est en surcharge', 'La ressource demandée est introuvable', 'Redirection permanente', 'Requête mal formée'],
      correct: [1],
      explain: '4xx = erreur client ; 404 = ressource introuvable sur ce serveur.'
    },
    {
      q: 'Lequel de ces éléments est envoyé dans la requête, pas dans la réponse ?',
      options: ['Code de statut', 'En-tête Host', 'En-tête Content-Type de la réponse', 'Corps HTML'],
      correct: [1],
      explain: 'Le client précise le Host (qu’il demande) ; le serveur répond avec un statut et un Content-Type.'
    },
    {
      q: 'Pourquoi l’en-tête Host est-il essentiel pour NGINX ?',
      options: ['Il indique la vitesse du réseau', 'Il permet de choisir le bon bloc server (virtual host)', 'Il chiffre la connexion', 'Il identifie le navigateur'],
      correct: [1],
      explain: 'Sans Host, NGINX ne saurait pas quel site (parmi des dizaines sur la même IP) servir la requête.'
    }
  ];

  M.lessons[0].exercises = [
    {
      type: 'mcq', diff: 'easy', title: 'Codes de statut courants',
      prompt: 'Un utilisateur tape une URL avec une faute de frappe : le site n’existe pas. Quel statut NGINX renvoie-t-il ?',
      options: ['200 OK', '404 Not Found', '500 Internal Server Error', '301 Moved Permanently'],
      answer: [1],
      explain: '404 : la ressource (page, chemin) n’existe pas sur le serveur.'
    },
    {
      type: 'mcq', diff: 'medium', title: 'Statut par situation',
      prompt: 'Votre backend (Node.js) vient de planter alors qu’une requête arrive via le reverse proxy NGINX. Quel code voyez-vous ?',
      options: ['204 No Content', '404 Not Found', '502 Bad Gateway', '101 Switching Protocols'],
      answer: [2],
      explain: '502 : NGINX ne peut pas joindre le serveur amont (le backend est down).'
    }
  ];

/* --- Leçon 2 : pourquoi NGINX --- */
(function addL2() {
  const M = window.MODULES.find((m) => m.id === "fondamentaux");
  const L = {
    id: 'nginx-role',
    title: 'NGINX : pourquoi et comment',
    excerpt: 'Rôles de NGINX, architecture événementielle, NGINX vs Apache.',
    content: `
# NGINX : pourquoi et comment

NGINX est né en 2004 du problème dit **C10K** (« 10 000 connexions simultanées ») : les serveurs de l’époque s’effondraient bien avant. Sa réponse : une architecture **asynchrone et événementielle**, qui gère des centaines de milliers de connexions avec très peu de ressources.

## Les rôles de NGINX

NGINX n’est pas qu’un serveur web. Il excelle dans cinq métiers, souvent simultanément :

1. **Serveur de fichiers statiques** — HTML, CSS, JS, images, vidéos. C’est sa spécialité : très rapide, peu de RAM.
2. **Reverse proxy** — il reçoit les requêtes des clients et les **transmet à des serveurs internes** (Node.js, PHP-FPM, Java) qui n’exposent jamais directement de port public.
3. **Load balancer** — il répartit le trafic entre plusieurs backends identiques (\`upstream\`).
4. **Terminator TLS** — il porte les certificats SSL/TLS et parle en clair avec le backend.
5. **Cache** — il met en cache les réponses (statiques ou dynamiques) pour soulager les backends.

\`\`\`text
        Internet
           │
      ┌────▼────┐
      │  NGINX  │  ← TLS, statique, proxy, cache, répartition
      └────┬────┘
     ┌─────┼─────┬──────────┐
   Node.js PHP-FPM  Python  MySQL (jamais exposés)
\`\`\`

## L’architecture événementielle

Apache (mode classique) crée **un processus ou thread par connexion** : 10 000 connexions → 10 000 threads → énorme mémoire.

NGINX, lui, utilise **peu de workers** (\`worker_processes auto\` ≈ nombre de cœurs CPU). Chaque worker traite des **milliers de connexions simultanées** grâce à une boucle d’événements : il ne bloque jamais en attendant un disque ou un réseau.

| | Apache (mpm_prefork) | NGINX |
|---|---|---|
| Modèle | 1 processus / connexion | boucle d’événements / worker |
| Connexions simultanées | ~hundreds par process | des dizaines de milliers |
| Mémoire par connexion | élevée | faible, constante |
| Contenu statique | moyen | très rapide |
| Modules dynamiques | chargés dans le serveur | certains via modules tiers |

> [!tip] Vérifiez le nombre de workers : \`grep worker_processes /etc/nginx/nginx.conf\`. Puis \`ps -ef | grep nginx\` sur Linux : vous verrez un processus \`master\` + N workers.

## Le modèle master / workers

- Le **master** lit la configuration, crée les workers, surveille leur santé (il les relance si besoin). Il n’exécute presque aucun traitement.
- Les **workers** font le travail : réseau, fichiers, proxy… C’est pourquoi \`reload\` est si peu coûteux : on ne redémarre rien, on demande aux workers de finir leur requête courante puis d’adopter la nouvelle configuration.

> [!info] \`nginx -s reload\` envoie un signal \`HUP\` au master : les anciens workers terminent leurs requêtes en cours, les nouveaux démarrent avec la config fraîche. Zéro coupure pour vos utilisateurs.

## Et le contenu dynamique ?

NGINX ne sait pas exécuter PHP, Python ou JS **en natif**. Il délègue : il parle à \`php-fpm\`, à \`node\`, à des conteneurs… via \`proxy_pass\` ou \`fastcgi_pass\` (vous verrez cela au module Reverse proxy). En clair : NGINX gère le trafic, les backends font le calcul.
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Quel est l’atout principal de l’architecture événementielle de NGINX ?',
      options: ['Un processus par connexion pour plus de stabilité', 'Très peu de ressources pour des milliers de connexions', 'Le support natif du PHP', 'La possibilité de compiler des modules'],
      correct: [1],
      explain: 'Une boucle d’événements par worker permet de traiter énormément de connexions avec très peu de mémoire et de CPU.'
    },
    {
      q: 'Quel processus NGINX reçoit le signal de rechargement (reload) ?',
      options: ['Chaque worker individuellement', 'Le master', 'Le processus systemd', 'Aucun : reload nécessite un arrêt'],
      correct: [1],
      explain: 'Le master gère la configuration et les workers ; un HUP (reload) lui est envoyé.'
    },
    {
      q: 'Que signifie « NGINX fait office de reverse proxy » ?',
      options: ['Il cache les pages dans le navigateur', 'Il transmet les requêtes à des serveurs internes non exposés', 'Il remplace le DNS', 'Il chiffre uniquement les e-mails'],
      correct: [1],
      explain: 'Le reverse proxy reçoit du trafic public et le relaie vers des backends privés.'
    },
    {
      q: 'Pourquoi NGINX ne peut-il pas exécuter du PHP « en natif » ?',
      options: ['Il manque de mémoire', 'Il est conçu pour le réseau et le proxy, pas pour exécuter des langages', 'PHP est abandonné', 'C’est une limitation de la licence'],
      correct: [1],
      explain: 'NGINX délègue l’exécution (php-fpm, node…) et se concentre sur le transport et le cache.'
    }
  ];

  L.exercises = [
    {
      type: 'mcq', diff: 'easy', title: 'Le bon outil',
      prompt: 'Vous servez 40 000 utilisateurs simultanés sur un site très statique, avec une petite machine. Quelle solution est la plus adaptée ?',
      options: ['Apache en mode prefork par défaut', 'NGINX en simple serveur statique', 'Un seul processus Node.js qui sert les fichiers', 'Un serveur FTP'],
      answer: [1],
      explain: 'NGINX excelle sur le statique avec une faible empreinte mémoire.'
    },
    {
      type: 'mcq', diff: 'medium', title: 'Le reload sans coupure',
      prompt: 'Après avoir modifié une config, vous lancez « nginx -s reload ». Que se passe-t-il pour les requêtes en cours ?',
      options: ['Elles sont interrompues immédiatement', 'Les anciens workers finissent leurs requêtes en cours puis passent à la nouvelle config', 'Elles sont rejetées avec un 503', 'Le master redémarre et tout est perdu'],
      answer: [1],
      explain: 'Le reload est progressif : fin de requêtes en cours, puis nouvelle config. C’est pourquoi on utilise reload plutôt que restart.'
    }
  ];
})();

/* --- Leçon 3 : le cycle d’une requête --- */
(function addL3() {
  const M = window.MODULES.find((m) => m.id === "fondamentaux");
  const L = {
    id: 'requete-cycle',
    title: 'Le cycle d’une requête chez NGINX',
    excerpt: 'De la connexion TCP à la réponse : chaque étape comptée.',
    content: `
# Le cycle d’une requête chez NGINX

Pour apprendre à configurer NGINX, il faut visualiser ce qui se passe **à l’intérieur** à chaque requête. Même si tout est très rapide (souvent < 1 ms), chaque étape a un ordre précis, et certaines erreurs de configuration viennent d’une mauvaise compréhension de cet ordre.

## Les 7 grandes phases

\`\`\`text
 1. Accept    le serveur accepte la connexion TCP
 2. Read      il lit la requête (ligne + en-têtes)
 3. Server    il choisit le bloc server (listen + server_name)
 4. Location  il choisit le bloc location (chemin)
 5. Phases    réécriture → accès → contenu → journals
 6. Response  il envoie le statut, les en-têtes, le corps
 7. Logs      il écrit dans access.log (et error.log)
\`\`\`

## 1-2. Accept et lecture

Le worker accepte la connexion TCP (port 80/443) puis lit la requête complète. NGINX impose des limites pour éviter les abus :

- \`client_header_buffer_size\` — taille du tampon d’en-têtes (1k par défaut).
- \`large_client_header_buffers\` — au-delà, tampons plus grands (4 × 8k par défaut).
- \`client_max_body_size\` — taille maximale du corps (1m par défaut !).

> [!warn] \`client_max_body_size 1m\` par défaut : un upload de 5 Mo échoue avec \`413 Request Entity Too Large\` tant que vous n’avez pas augmenté cette limite dans le bloc \`server\` ou \`location\`.

## 3. Le choix du server (virtual host)

NGINX regarde l’en-tête \`Host\` et le port, puis parcourt les blocs \`server\` du bloc \`http\` :

1. Il garde ceux qui matchent le port (\`listen\`).
2. Parmi eux, celui dont le \`server_name\` correspond exactement au Host.
3. Sinon le **premier** bloc avec \`default_server\`, ou le premier déclaré.

## 4. Le choix de la location

Le chemin (\`$uri\`) est confronté aux blocs \`location\` selon des règles de priorité très précises (module Configuration). En résumé : \`location = /exact\` > \`location ^~ /prefixe\` > \`location ~ regex\` > \`location /prefixe\`.

## 5. Les phases de traitement

À l’intérieur d’une location, NGINX passe par des **phases** (résumé simplifié) :

1. **rewrite** — directives \`rewrite\` / \`return\` (redirections).
2. **access** — \`allow\` / \`deny\`, auth basic, \`limit_req\`, \`limit_conn\`.
3. **content** — la phase qui génère la réponse : \`try_files\`, \`root\` + fichier, \`proxy_pass\`, \`fastcgi_pass\`…
4. **log** — écriture des logs.

> [!info] La phase \`content\` est la seule qui crée le corps de la réponse. \`try_files\` y fait des redirections internes (le cycle se rejoue à l’intérieur du worker).

## 6-7. Réponse et logs

La réponse part avec son statut, ses en-têtes, son corps. Puis NGINX écrit une ligne dans \`access.log\` (format \`combined\` par défaut) : IP, heure, méthode, URI, statut, taille, user-agent. Les erreurs internes (config, timeouts, upstream morts) vont dans \`error.log\`.

> [!tip] \`error.log\` est votre meilleur ami de debug. Niveau \`info\` ou \`debug\` pour creuser : \`error_log /var/log/nginx/error.log info;\`
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Quelle directive limite la taille d’un upload de fichier ?',
      options: ['client_header_buffer_size', 'client_max_body_size', 'worker_connections', 'sendfile'],
      correct: [1],
      explain: 'client_max_body_size limite le corps de la requête (1m par défaut → 413 au-delà).'
    },
    {
      q: 'Dans quel ordre NGINX choisit-il son server block ?',
      options: ['D’abord le fichier le plus grand, puis par ordre alphabétique', 'Port + correspondance server_name, sinon default_server', 'Par ordre de déclaration uniquement', 'Le hasard pour équilibrer'],
      correct: [1],
      explain: 'Port d’abord, puis server_name exact ; à défaut default_server, sinon le premier déclaré.'
    },
    {
      q: 'Quelle phase de traitement génère le corps de la réponse ?',
      options: ['rewrite', 'access', 'content', 'log'],
      correct: [2],
      explain: 'La phase content (try_files, root, proxy_pass…) produit la réponse ; les autres préparent ou journalisent.'
    },
    {
      q: 'Où sont écrites les erreurs de configuration et les upstream morts ?',
      options: ['access.log', 'error.log', '/var/log/messages', 'Dans la page HTML'],
      correct: [1],
      explain: 'error.log contient les messages internes ; access.log trace chaque requête réussie.'
    }
  ];

  L.exercises = [
    {
      type: 'order', diff: 'medium', title: 'L’ordre du cycle',
      prompt: 'Remets les étapes d’une requête dans l’ordre réel chez NGINX.',
      items: ['Le worker accepte la connexion TCP', 'NGINX lit la requête et ses en-têtes', 'Le bloc server est choisi (listen + server_name)', 'Le bloc location est choisi (chemin $uri)', 'La phase access (allow/deny, limit_req) s’exécute', 'La phase content produit la réponse', 'NGINX écrit une ligne dans access.log'],
      explain: 'Connexion → lecture → server → location → phases (access avant content) → réponse → logs.'
    },
    {
      type: 'mcq', diff: 'hard', title: 'Un upload qui échoue',
      prompt: 'Vos utilisateurs envoient des fichiers de 10 Mo et tout échoue avec 413 Request Entity Too Large. Quelle est la meilleure correction ?',
      options: [
        'Augmenter worker_connections',
        'Ajouter « client_max_body_size 10m; » dans le bloc server (ou location) concerné',
        'Passer en HTTP/2',
        'Utiliser try_files pour les uploads'
      ],
      answer: [1],
      explain: 'client_max_body_size 1m par défaut limite le corps. On l’augmente au niveau server ou location.'
    }
  ];
})();

})();

/* --- Leçon 4 : installer et gérer NGINX --- */
(function addL4() {
  const M = window.MODULES.find((m) => m.id === "fondamentaux");
  const L = {
    id: 'install',
    title: 'Installer et gérer NGINX',
    excerpt: 'Installation, services, validation de configuration, reload vs restart.',
    content: `
# Installer et gérer NGINX

Avant d’apprendre la syntaxe, il faut un serveur qui tourne et des commandes de base pour le piloter. NGINX fonctionne sur Linux (le plus courant), macOS et Windows (moins usité en production).

## 1. Installer

**Debian / Ubuntu :**

\`\`\`bash
sudo apt update
sudo apt install -y nginx
nginx -v            # affiche la version
\`\`\`

**RHEL / Fedora / Rocky :**

\`\`\`bash
sudo dnf install -y nginx
\`\`\`

> [!info] Deux familles de versions : **stable** (recommandée, plus prudente) et **mainline** (nouveautés, correctifs plus frais). L’un des deux suffit.

> [!info] **Sous Windows**, pas de systemd : on décompresse le ZIP officiel (nginx.org/en/download.html) dans \`C:/nginx/\`, on lance \`nginx.exe\` (une console reste ouverte : c’est le serveur), on arrête avec \`nginx -s stop\`, on recharge avec \`nginx -s reload\`. La config principale est \`C:/nginx/conf/nginx.conf\`, les logs dans \`C:/nginx/logs/\`.

## 2. Démarrer et piloter le service

Avec systemd (Ubuntu moderne) :

\`\`\`bash
sudo systemctl enable --now nginx   # démarre + active au boot
sudo systemctl status nginx         # état détaillé
sudo systemctl restart nginx        # arrêt puis démarrage
sudo systemctl reload nginx         # applique la config sans couper le service
\`\`\`

Avec le binaire NGINX directement (utile en conteneur, où il n’y a souvent pas de systemd) :

\`\`\`bash
nginx             # démarre en arrière-plan
nginx -s stop     # arrêt immédiat
nginx -s quit     # arrêt propre (requêtes en cours terminées)
nginx -s reload   # équivalent du reload systemd
nginx -s reopen   # réouvre les fichiers de log
\`\`\`

> [!warn] \`nginx -s reload\` **ne valide rien** : si vous avez cassé un fichier, le reload échoue en signalant l’erreur — et l’ancienne configuration reste active. Toujours faire \`nginx -t\` avant de recharger !

## 3. La commande \`nginx -t\` (test de configuration)

C’est LE réflexe pro :

\`\`\`bash
sudo nginx -t
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
\`\`\`

\`nginx -t\` vérifie la **syntaxe** et la **cohérence** (blocs mal imbriqués, directives hors de leur contexte, fichiers \`include\` manquants…). Une seule erreur dans un fichier = la configuration entière est rejetée, et le serveur continue de tourner avec la précédente.

> [!tip] Testez depuis l’extérieur : \`curl -I http://localhost\` doit répondre \`HTTP/1.1 200 OK\` avec la page d’accueil par défaut de NGINX.

## 4. Les deux manières de configurer (à connaître)

NGINX compile à chaque démarrage/reload un **document de configuration unique** :

- Le point d’entrée est **\`/etc/nginx/nginx.conf\`**, qui contient le bloc \`http\` principal.
- \`include /etc/nginx/conf.d/*.conf;\` charge tous les fichiers \`*.conf\` de \`conf.d/\`.
- \`include /etc/nginx/sites-enabled/*;\` (Debian) charge les « vhosts » activés, via des symlinks vers \`sites-available/\`.

C’est ce pattern \`available → enabled via symlink\` qui permet d'**activer/désactiver un site** d’une ligne : \`ln -s /etc/nginx/sites-available/mon-site /etc/nginx/sites-enabled/mon-site\`, puis \`nginx -t && nginx -s reload\`.

## 5. Vérifier ce qui tourne

\`\`\`bash
ps -ef | grep nginx          # master + workers
ss -tlnp | grep 80           # écoute sur le port 80
sudo tail -f /var/log/nginx/access.log
\`\`\`
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Quelle commande applique une configuration modifiée SANS interrompre le service ?',
      options: ['nginx -s stop', 'nginx -s reload', 'nginx -s quit', 'systemctl stop nginx'],
      correct: [1],
      explain: 'reload envoie un signal HUP : les workers finissent leurs requêtes puis adoptent la nouvelle config.'
    },
    {
      q: 'Que signifie le résultat « syntax is ok … test is successful » de nginx -t ?',
      options: ['Le serveur a redémarré', 'La configuration est syntaxiquement valide et cohérente', 'Les sites sont tous en ligne', 'Le port 80 est libre'],
      correct: [1],
      explain: 'nginx -t valide la config sans l’appliquer. C’est le réflexe avant tout reload.'
    },
    {
      q: 'Si un reload applique une configuration invalide, que se passe-t-il ?',
      options: ['Le serveur s’arrête complètement', 'Le reload échoue et l’ancienne configuration reste active', 'Le serveur redémarre en écrasant tout', 'Rien : la config cassée est ignorée au fil de l’eau'],
      correct: [1],
      explain: 'NGINX refuse d’appliquer une config invalide : l’ancienne reste en place. D’où l’intérêt de nginx -t d’abord.'
    },
    {
      q: 'À quoi sert le répertoire sites-enabled/ (Debian) ?',
      options: ['À stocker les certificats', 'À contenir les sites « activés » via symlinks vers sites-available/', 'À garder les sauvegardes de logs', 'À compiler les modules'],
      correct: [1],
      explain: 'Le pattern available/enabled : on écrit dans sites-available, on active par un symlink dans sites-enabled.'
    }
  ];

  L.exercises = [
    {
      type: 'order', diff: 'easy', title: 'La séquence de déploiement',
      prompt: 'Remets dans l’ordre la séquence professionnelle pour modifier la configuration d’un serveur en production.',
      items: ['Éditer le fichier de configuration', 'Lancer « nginx -t » pour valider', 'Relancer « nginx -s reload »', 'Vérifier le serveur : curl -I http://localhost',
        'Consulter les logs si quelque chose cloche'],
      explain: 'Modifier → tester → recharger → vérifier → diagnostiquer via les logs.'
    },
    {
      type: 'mcq', diff: 'medium', title: 'Erreur de config en prod',
      prompt: 'Vous avez un typo dans nginx.conf et lancez quand même « nginx -s reload ». Que voit votre utilisateur ?',
      options: ['Une coupure de 2 secondes', 'Rien : le service continue avec la bonne configuration précédente', 'Des erreurs 500 aléatoires', 'Le serveur redémarre de lui-même'],
      answer: [1],
      explain: 'Config invalide = reload rejeté, ancienne config toujours en service. Aucun impact pour les utilisateurs.'
    }
  ];
})();

/* --- Leçon 5 : les fichiers de configuration --- */
(function addL5() {
  const M = window.MODULES.find((m) => m.id === "fondamentaux");
  const L = {
    id: 'structure-fichiers',
    title: 'Les fichiers de configuration',
    excerpt: 'Le contenu de /etc/nginx, le nginx.conf commenté, les logs.',
    content: `
# Les fichiers de configuration

## L’arborescence type (Debian/Ubuntu)

\`\`\`text
/etc/nginx/
├── nginx.conf                 ← le fichier principal (bloc http)
├── mime.types                 ← association extensions → Content-Type
├── conf.d/                    ← fichiers *.conf supplémentaires
├── sites-available/           ← vhosts écrits mais inactifs
├── sites-enabled/             ← symlinks vers sites-available (actifs)
└── modules-available/         ← modules dynamiques activables
\`\`\`

> [!info] **Sous Windows**, l’arborescence est plus simple : tout vit dans le dossier d’installation (C:/nginx/nginx.exe, C:/nginx/conf/nginx.conf, C:/nginx/html/, C:/nginx/logs/). Pas de sites-available/enabled : les vhosts sont des fichiers .conf dans conf.d (à créer).

Fichiers et dossiers connexes dont il faut connaître l’existence :

- \`/var/log/nginx/access.log\` et \`error.log\` — les journaux.
- \`/usr/share/nginx/html/\` — la page d’accueil par défaut (souvent \`index.html\`).
- \`/run/nginx.pid\` — le fichier contenant le PID du master (les scripts s’en servent pour \`nginx -s\`).
- \`/etc/nginx/fastcgi_params\`, \`/etc/nginx/proxy_params\` — trames d’en-têtes pour PHP/Proxy.

## Un nginx.conf minimal commenté

\`\`\`nginx
user www-data;                       # utilisateur des workers
worker_processes auto;               # = nombre de cœurs CPU

events {
    worker_connections 1024;         # connexions max par worker
}

http {
    include /etc/nginx/mime.types;   # types MIME
    default_type application/octet-stream;

    sendfile on;                     # envoi optimisé des fichiers

    keepalive_timeout 65;            # durée des connexions persistantes

    server {                         # ici commence un *site*
        listen 80;                   # écoute sur le port 80
        server_name localhost;       # nom du virtual host

        root /usr/share/nginx/html;  # dossier racine du site
        index index.html;

        location / {                 # traite toutes les requêtes
            try_files $uri $uri/ =404;
        }
    }
}
\`\`\`

> [!tip] Lisez le \`nginx.conf\` de votre machine : chaque ligne y est commentée. C’est le meilleur « tutoriel vivant » qui existe. La plupart des serveurs de test n’utilisent qu’une fraction de ce fichier.

## Logs : access vs error

\`\`\`text
# access.log (format combined) — UNE ligne par requête
192.168.1.20 - - [12/Mar/2025:09:14:32 +0100] "GET /index.html HTTP/1.1" 200 6120 "..." "Mozilla/5.0 ..."

# error.log — uniquement les événements problématiques
2025/03/12 09:15:01 [error] 1234#1234: *7 connect() failed (111: Connection refused)
\`\`\`

L’ordre des champs de l’access.log est **configurable** via \`log_format\` (module Logs & monitoring).

## Le mécanisme include

\`include\` est une **inclusion textuelle** : NGINX insère le contenu du fichier à cet endroit, comme un copier-coller. C’est lui qui assemble le « un seul gros document » final.

> [!warn] L’ordre compte : deux \`server\` avec le même \`server_name\` → le premier déclaré gagne (sauf \`default_server\`). Les includes sont donc ordonnés.
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Que fait la directive include ?',
      options: ['Elle exécute un script externe', 'Elle insère le contenu d’un autre fichier dans la configuration', 'Elle charge un module dynamique', 'Elle copie des fichiers dans /usr/share/nginx/html'],
      correct: [1],
      explain: 'include = inclusion textuelle : NGINX assemble tous les fichiers en un seul document de configuration.'
    },
    {
      q: 'Quel fichier contient le PID du processus master ?',
      options: ['/etc/nginx/nginx.conf', '/run/nginx.pid', '/var/log/nginx/access.log', '/usr/share/nginx/html/index.html'],
      correct: [1],
      explain: 'Le pidfile sert aux commandes nginx -s (reload, stop…).'
    },
    {
      q: 'À quoi sert le fichier mime.types ?',
      options: ['À limiter les types de fichiers à servir', 'À associer des extensions à des Content-Type', 'À déclarer les certificats', 'À définir le format des logs'],
      correct: [1],
      explain: 'mime.types mappe extension → Content-Type (html → text/html, json → application/json…).'
    },
    {
      q: 'Dans access.log, une ligne = ?',
      options: ['Une erreur serveur', 'Une requête HTTP traitée', 'Un redémarrage de NGINX', 'Un fichier modifié'],
      correct: [1],
      explain: 'Chaque requête produit une ligne dans access.log (format configurable).'
    }
  ];

  L.exercises = [
    {
      type: 'config', diff: 'easy', title: 'Ta première configuration valide',
      prompt: 'Complète la configuration ci-dessous pour créer un site vitrine minimal : un bloc server écoutant sur le port 80, avec server_name « demo.local » et root /usr/share/nginx/html.',
      skeleton: 'events {\n    worker_connections 1024;\n}\n\nhttp {\n    include mime.types;\n    default_type application/octet-stream;\n\n    # TODO : crée un bloc server port 80, server_name "demo.local", root /usr/share/nginx/html\n}',
      required: ['server', 'listen', 'server_name', 'root'],
      hint: 'structure : server { listen 80; server_name demo.local; root /usr/share/nginx/html; }',
      explain: 'La structure minimale : le bloc server déclare listen (le port), server_name (le nom) et root (où chercher les fichiers).'
    }
  ];
})();

/* --- Leçon 6 : mise en pratique (capstone du module) --- */
(function addL6() {
  const M = window.MODULES.find((m) => m.id === "fondamentaux");
  const L = {
    id: 'mise-en-pratique',
    title: 'Mise en pratique : deux sites sur un serveur',
    excerpt: 'Assemble tout le module 1 : deux virtual hosts, validation, diagnostic.',
    content: `
# Mise en pratique : deux sites sur un serveur

Objectif : configurer **deux sites** (deux \`server\` blocks) sur le même serveur et comprendre comment NGINX les distingue.

## Le scénario

- \`site-a.local\` → \`/var/www/site-a\` (port 80)
- \`site-b.local\` → \`/var/www/site-b\` (port 80)

Les deux sites partagent la même IP. C’est l’en-tête \`Host\` de la requête qui permet à NGINX de choisir.

\`\`\`nginx
http {
    server {
        listen 80;
        server_name site-a.local;
        root /var/www/site-a;
    }

    server {
        listen 80;
        server_name site-b.local;
        root /var/www/site-b;
    }
}
\`\`\`

> [!warn] Pour tester sans domaine réel : ajoutez la ligne 127.0.0.1 site-a.local site-b.local dans le fichier hosts — /etc/hosts (Linux) ou C:/Windows/System32/drivers/etc/hosts (Windows, en mode administrateur).

## Que se passe-t-il pour chaque requête ?

| Requête (Host) | serveur choisi | fichier servi |
|---|---|---|
| \`http://site-a.local/accueil.html\` | le 1er | \`/var/www/site-a/accueil.html\` |
| \`http://site-b.local/contact.html\` | le 2e | \`/var/www/site-b/contact.html\` |
| \`http://192.168.1.10/\` (pas de Host) | le 1er (default) | \`/var/www/site-a/index.html\` |

Si **aucun** \`server_name\` ne correspond, NGINX utilise \`default_server\` : \`listen 80 default_server;\` — indispensable pour ne pas servir le mauvais site.

## La démarche de validation

1. \`nginx -t\` — syntaxe et cohérence.
2. \`curl -H "Host: site-a.local" http://localhost/\` — testez le vhost explicitement.
3. \`curl -H "Host: site-b.local" http://localhost/\`.
4. Regardez \`access.log\` : chaque ligne vous dira quel vhost a répondu.

> [!tip] Le réflexe du pro : **parler à un vhost précis** avec \`curl -H "Host: …"\` évite de tester par erreur le mauvais site (et les caches).
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Deux sites partagent la même IP et le même port. Qu’est-ce qui permet à NGINX de choisir le bon server block ?',
      options: ['L’adresse IP du client', 'L’en-tête Host de la requête', 'Le chemin de l’URL', 'L’ordre des fichiers sur le disque'],
      correct: [1],
      explain: 'Le virtual hosting par nom repose sur l’en-tête Host (et sur server_name).'
    },
    {
      q: 'Quelle directive désigne le serveur par défaut quand aucun server_name ne correspond ?',
      options: ['server_name default;', 'listen 80 default_server;', 'default_server on;', 'server { default yes; }'],
      correct: [1],
      explain: 'Le modificateur default_server sur listen marque le bloc utilisé quand aucune correspondance de nom n’existe.'
    },
    {
      q: 'Comment tester un vhost précis depuis la ligne de commande ?',
      options: ['curl -H "Host: site-a.local" http://localhost/', 'curl http://localhost/site-a', 'curl --dns site-a.local', 'Il est impossible de tester un vhost précis'],
      correct: [0],
      explain: 'On force l’en-tête Host pour simuler la requête vers ce site précis.'
    }
  ];

  L.exercises = [
    {
      type: 'config', diff: 'hard', title: 'Deux virtual hosts sur le port 80',
      prompt: 'Dans le bac à sable, construis la configuration complète : bloc events (worker_connections 1024), bloc http avec les deux server blocks ci-dessus, et marque le premier comme default_server.',
      skeleton: '# Objectif : deux sites (site-a.local et site-b.local) sur le port 80.\n# 1) un bloc events avec worker_connections 1024;\n# 2) un bloc http contenant DEUX blocs server (listen 80,\n#    server_name, root) ; le premier avec default_server.',
      required: ['events', 'http', 'server', 'listen', 'server_name', 'root'],
      hint: 'listen 80 default_server;',
      explain: 'events { worker_connections 1024; } puis http { server { listen 80 default_server; server_name site-a.local; root /var/www/site-a; } server { listen 80; server_name site-b.local; root /var/www/site-b; } }'
    }
  ];

  M.project = {
    title: 'Mini-projet du module : ton premier serveur virtuel',
    goal: 'Sur une machine (réelle ou virtuelle) : installer NGINX, créer deux sites distincts, tester la répartition par Host, et produire un petit rapport.',
    objectives: [
      'Installer NGINX et vérifier la version (nginx -v)',
      'Créer les dossiers des deux sites (Linux : /var/www/site-a et /var/www/site-b ; Windows : C:/nginx/html/site-a et /site-b) avec un index.html différent',
      'Écrire deux server blocks (port 80) avec server_name adaptés',
      'Valider avec nginx -t puis recharger',
      'Forcer l’en-tête Host avec curl et vérifier chaque site',
      'Ajouter default_server et tester la réponse sans Host',
      'Résumer dans un rapport : commandes, logs, enseignements'
    ],
    answer: 'Structure attendue :\n/var/www/site-a/index.html (titres différents)\n/var/www/site-b/index.html\n\nConfig :\nserver {\n  listen 80 default_server;\n  server_name site-a.local;\n  root /var/www/site-a;\n}\nserver {\n  listen 80;\n  server_name site-b.local;\n  root /var/www/site-b;\n}\n\nTests :\ncurl -H "Host: site-a.local" http://localhost/\ncurl -H "Host: site-b.local" http://localhost/\ncurl -I http://localhost/            # → site-a (default_server)'
  };
})();
