/* Nginx Academy — Module 9 : 🛡️ Sécurité approfondie */
(function addSecL1() {
  const M = window.MODULES.find((m) => m.id === "securite");
  const L = {
    id: "sec-auth",
    title: "L’authentification HTTP (Basic Auth)",
    excerpt: "htpasswd, auth_basic, protéger une zone, se déconnecter.",
    content: `
# L’authentification HTTP (Basic Auth)

La plus simple des protections : un **nom + mot de passe** demandé par le navigateur. Parfait pour un back-office, un staging, une page sensible — à condition de l’utiliser en HTTPS (le Basic transmet les identifiants en **base64, lisible** !).

## 1. Créer le fichier d’utilisateurs (htpasswd)

\`\`\`bash
# Linux
sudo apt install apache2-utils        # fournit htpasswd
sudo mkdir -p /etc/nginx
sudo htpasswd -c /etc/nginx/.htpasswd admin
# on te demande le mot de passe
\`\`\`

Ajouter un utilisateur (sans -c, qui recrée) :

\`\`\`bash
sudo htpasswd /etc/nginx/.htpasswd alice
\`\`\`

**Sans htpasswd** (openssl suffit, Linux comme Windows — Git Bash) :

\`\`\`bash
# format : login:hash_md5
printf "admin:$(openssl passwd -apr1 MonMotDePasse)\n" > /etc/nginx/.htpasswd
\`\`\`

## 2. Protéger une zone

\`\`\`nginx
server {
    listen 443 ssl http2;
    server_name admin.exemple.fr;
    ...

    location / {
        auth_basic           "Zone réservée";
        auth_basic_user_file /etc/nginx/.htpasswd;
    }
}
\`\`\`

## 3. Protéger UN CHEMIN précis

\`\`\`nginx
server {
    location /admin/ {
        auth_basic "Admin";
        auth_basic_user_file /etc/nginx/.htpasswd;
        try_files $uri $uri/ /admin/index.html;   # SPA admin
    }
    location / {
        # public : pas d’auth
    }
}
\`\`\`

## 4. La « déconnexion »

Le Basic Auth est mémorisé par le navigateur : pas de bouton logout. Astuce : renvoyer un 401 pour invalider visuellement :

\`\`\`nginx
location = /logout {
    return 401;
}
\`\`\`

## 5. Le piège n°1 : le clair

> [!warn] Sans HTTPS, le couple login:mot de passe en base64 est **interceptable** (le base64 se décode en 1 seconde). Règle absolue : Basic Auth QUE derrière TLS, sinon c’est une porte ouverte.

## 6. Le piège n°2 : les permissions du fichier

Le fichier \`.htpasswd\` doit être lisible par l’utilisateur nginx et rien de plus :

\`\`\`bash
sudo chown root:www-data /etc/nginx/.htpasswd
sudo chmod 640 /etc/nginx/.htpasswd
\`\`\`

Sous Windows : placer le fichier dans C:/nginx/conf/ (protégé du web par défaut).

## 7. Afficher l’utilisateur dans les logs

La variable \`$remote_user\` contient le login : idéal pour tracer \`log_format\` (module Logs).

> [!tip] **Au-delà du Basic** : pour une vraie application, utilise un système de session/l’SSO. Le Basic Auth protège l’ENTRÉE (humain ou bot) — pas la logique applicative.
`,
    quiz: [
      { q: "Le Basic Auth transmet les identifiants en :", options: ["Chiffré RSA", "Base64 (lisible !)", "MD5", "En clair hors connexion"], correct: [1], explain: "base64 = déchiffrable à la lecture : TLS obligatoire." },
      { q: "htpasswd -c crée un fichier ; sans -c :", options: ["Supprime tout", "Ajoute un utilisateur au fichier existant", "Affiche le contenu", "Échoue"], correct: [1], explain: "-c force la recréation ; sans lui, on ajoute." },
      { q: "Quel réglage protège /admin/ sans protéger le reste ?", options: ["Une location /admin/ avec auth_basic", "auth_basic dans le server", "Ssl_certificate", "limit_req partout"], correct: [0], explain: "auth_basic vit dans la location à protéger." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Protéger le back-office", prompt: "Protège /admin/ par mot de passe (Basic Auth) avec le fichier .htpasswd.", skeleton: "server {\n    listen 80;\n    server_name app.local;\n\n    location / { try_files $uri $uri/ /index.html; }\n\n    location /admin/ {\n        # active Basic Auth (zone « Admin ») avec le fichier /etc/nginx/.htpasswd\n    }\n}\n", required: ["auth_basic", "auth_basic_user_file"], hint: "auth_basic \"Admin\"; auth_basic_user_file /etc/nginx/.htpasswd;" },
      { type: "mcq", diff: "medium", title: "Sans TLS ?", prompt: "Ton admin en Basic Auth est servi en http. Risque réel :", options: ["Aucun", "Le login + mot de passe circulent lisibles (base64) sur le réseau", "Le serveur plante", "Les logs explosent"], answer: [1], explain: "Le base64 est triviable : en clair, la protection est factice." }
    ]
  };
  M.lessons.push(L);
})();
(function addSecL2() {
  const M = window.MODULES.find((m) => m.id === "securite");
  const L = {
    id: "sec-ip",
    title: "Contrôler l’accès par IP : allow et deny",
    excerpt: "allow/deny, ordre des règles, geo, et la prudence X-Forwarded-For.",
    content: `
# Contrôler l’accès par IP : allow et deny

Restreindre l’accès à certaines IP (administration, VPN, partenaires) est un classique.

## Les bases

\`\`\`nginx
location /admin/ {
    allow 192.168.1.0/24;      # le réseau des bureaux
    allow 10.0.0.5;            # un poste précis
    deny all;                  # tout le reste refusé (403)
    auth_basic "Admin";
    auth_basic_user_file /etc/nginx/.htpasswd;
}
\`\`\`

**Les règles se lisent dans l’ordre** : la première qui matche gagne. La ligne \`deny all\` doit arriver EN DERNIÈRE. C’est le réflexe n°1.

## Refuser une IP parasite

\`\`\`nginx
location / {
    deny 203.0.113.7;          # un bot connu
    allow all;                 # tout le reste accepté
}
\`\`\`

## geo : des listes par région (contexte http)

\`\`\`nginx
http {
    geo $permis {
        default 0;
        192.168.1.0/24 1;
        203.0.113.0/24 1;
    }

    server {
        location /admin/ {
            if ($permis = 0) { return 403; }
            ...
        }
    }
}
\`\`\`

\`geo\` compile une table efficace — bien mieux que des centaines de règles allow/deny.

## Le piège : l’IP derrière un proxy

Si NGINX est DERRIÈRE un autre proxy (Cloudflare, etc.), \`$remote_addr\` est l’IP du proxy, pas du client. Dans ce cas :

- les vraies IP arrivent dans \`X-Forwarded-For\` (attention au spoofing, module proxy) ;
- configurer \`real_ip_header X-Forwarded-For\` + \`set_real_ip_from\` (l’IP du proxy de confiance) pour que \`$remote_addr\` redevienne l’IP cliente.

\`\`\`nginx
set_real_ip_from 173.245.48.0/20;   # plage IP de ton proxy de confiance
real_ip_header    X-Forwarded-For;
\`\`\`

> [!warn] SANS \`set_real_ip_from\` propre, n’utilise JAMAIS \`$http_x_forwarded_for\` dans allow/deny : n’importe qui peut prétendre être \`127.0.0.1\` en envoyant \`X-Forwarded-For: 127.0.0.1\`.

## zéro réponse aux scanneurs

La position par défaut des vhosts inconnus :

\`\`\`nginx
server {
    listen 80 default_server;
    server_name _;
    return 444;
}
server {
    listen 443 ssl default_server;
    server_name _;
    ssl_certificate /etc/nginx/certs/default.crt;   # n’importe quel cert
    ssl_certificate_key /etc/nginx/certs/default.key;
    return 444;
}
\`\`\`

Les requêtes sur IP directe ou domaine inconnu sont **fermées sans réponse** : aucun indice de service.

## Récapitulatif

| cas | outil |
|---|---|
| bureau/VPN uniquement | allow + deny all dans la location |
| bots récurrents | deny + allow all |
| plusieurs plages propres | geo |
| derrière Cloudflare | real_ip + set_real_ip_from, puis allow/deny |
| domaine inconnu | default_server + return 444 |
`,
    quiz: [
      { q: "Dans allow/deny, l’ordre compte car :", options: ["NGINX trie automatiquement", "La première règle qui matche gagne", "deny doit être premier", "Peu importe"], correct: [1], explain: "Premier match gagne : deny all en DERNIÈRE position." },
      { q: "$remote_addr derrière un proxy donne :", options: ["L’IP du client", "L’IP du proxy de confiance (ou puis du vrai client si real_ip configuré)", "127.0.0.1", "Une erreur"], correct: [1], explain: "Sans real_ip_header/set_real_ip_from, $remote_addr = l’IP du proxy." },
      { q: "default_server + return 444 :", options: ["Redirige vers 444", "Ferme silencieusement les connexions vers domaines inconnus", "Renvoie une page d’erreur", "Log tout"], correct: [1], explain: "444 = connexion fermée sans réponse : idéal anti-scan." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "VPN uniquement", prompt: "Restreins /admin/ aux IP du VPN et au poste admin, puis refuse tout le reste.", skeleton: "location /admin/ {\n    # autorise 10.0.0.0/8 et 192.168.1.7, refuse le reste\n    # puis protection par mot de passe basique\n}\n", required: ["allow", "deny"], hint: "allow 10.0.0.0/8; allow 192.168.1.7; deny all;" },
      { type: "mcq", diff: "hard", title: "Spoofing", prompt: "Sans real_ip configuré, un bot envoie X-Forwarded-For: 127.0.0.1 et ta règle utilise $http_x_forwarded_for. Résultat ?", options: ["Rien", "Le bot est traité comme local : il contourne tes allow/deny", "Une erreur 500", "Le bot est bloqué"], answer: [1], explain: "Il suffit d’envoyer l’en-tête pour s’injecter : ne fais confiance qu’aux IP établies (set_real_ip_from)." }
    ]
  };
  M.lessons.push(L);
})();
(function addSecL3() {
  const M = window.MODULES.find((m) => m.id === "securite");
  const L = {
    id: "sec-rate",
    title: "Lutter contre l’abus : rate limiting",
    excerpt: "limit_req_zone, burst, nodelay, limit_conn, et la protection des endpoints sensibles.",
    content: `
# Lutter contre l’abus : rate limiting

NGINX sait **limiter le débit** des requêtes : c’est la première ligne contre le brute-force (login), les scrapers et les pointes d’attaques.

## limit_req : limiter le nombre de requêtes par unité de temps

\`\`\`nginx
http {
    # 1. définir la « zone » (le compteur)
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;

    server {
        location /connexion {
            # 2. l’appliquer
            limit_req zone=login burst=5 nodelay;
            proxy_pass http://127.0.0.1:8000;
        }
    }
}
\`\`\`

| élément | rôle |
|---|---|
| \`$binary_remote_addr\` | clé du compteur : l’IP cliente (compacte) |
| \`zone=login:10m\` | nom de la zone + mémoire allouée |
| \`rate=1r/s\` (ou \`30r/m\`) | le débit autorisé par clé |
| \`burst=5\` | tolérance de rafale : 5 requêtes au-delà sont mises en file |
| \`nodelay\` | pas d’attente pour la file : la rafale passe immédiatement, pas plus |
| (sans nodelay) | les requêtes en surplus attendent au rythme de la rate |

## Réponse en cas de dépassement

Par défaut, NGINX renvoie \`503\`. On peut le rendre plus explicite :

\`\`\`nginx
limit_req_status 429;           # Too Many Requests : le code juste
error_page 429 /trop-rapide.html;
location = /trop-rapide.html { internal; }
\`\`\`

> [!warn] Réponse 503 = « le site est down » pour Google ; 429 = « trop de requêtes ». Utilise 429 pour le rate limiting, 503 pour les vrais soucis.

## Doser par endpoint

\`\`\`nginx
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
limit_req_zone $binary_remote_addr zone=api:10m  rate=100r/m;

location /api/ { limit_req zone=api burst=20 nodelay; ... }
location /api/connexion { limit_req zone=auth burst=3 nodelay; ... }
\`\`\`

Le login est cher : 1 req/s + burst 3. L’API publique : 100/min.

## limit_conn : limiter les connexions simultanées

\`\`\`nginx
http {
    limit_conn_zone $binary_remote_addr zone=perip:10m;

    server {
        limit_conn perip 10;      # max 10 connexions simultanées par IP
    }
}
\`\`\`

Lutte contre l’ouverture de masse de connexions (slowloris, téléchargements multiples).

## Combiner : la défense en couches

\`\`\`nginx
location /connexion {
    limit_req zone=auth burst=3 nodelay;   # vitesse
    limit_conn perip 5;                    # nombre de connexions
    proxy_pass http://127.0.0.1:8000;
}
\`\`\`

## Attention au proxy : la clé IP

Derrière Cloudflare, tout le monde partage la même IP : le rate limit frapperait tout le monde à la fois. Comme pour allow/deny, configure \`real_ip\` (set_real_ip_from + real_ip_header) POUR QUE la clé \`$binary_remote_addr\` soit la vraie IP.

> [!tip] **Le test** : \`ab -n 100 -c 5 http://site.local/api/connexion\` doit montrer des 429/503 à partir du seuil. Ajuste burst selon la vraie population (tester avec un vrai trafic, pas des chiffres rêvés).
`,
    quiz: [
      { q: "limit_req_zone + limit_req, à quoi servent-elles ?", options: ["Comprimer", "Limiter le débit de requêtes par client", "Cacher les réponses", "Authentifier"], correct: [1], explain: "La zone compte, la location applique la limite." },
      { q: "burst=5 nodelay signifie :", options: ["5 requêtes de rafale acceptées immédiatement au-delà de la rate", "5 secondes d’attente", "5 essais par login", "Pas de limite"], correct: [0], explain: "Le burst tolère la rafale ; nodelay l’accélère, en restant borné." },
      { q: "Quel statut utiliser pour le rate limiting ?", options: ["503", "429", "404", "301"], correct: [1], explain: "429 Too Many Requests est le code exact pour ce cas." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Protéger le login", prompt: "Limite le débit de requêtes sur /connexion pour freiner le brute-force.", skeleton: "http {\n    # zone « auth » : clé IP, 10 Mo, débit 1 req/s\n\n    server {\n        location /connexion {\n            # rate limit : zone=auth, burst=3, nodelay\n            proxy_pass http://127.0.0.1:8000;\n        }\n    }\n}\n", required: ["limit_req_zone", "limit_req"], hint: "limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s; puis limit_req zone=auth burst=3 nodelay;" },
      { type: "mcq", diff: "hard", title: "Tout le monde bloqué", prompt: "Après activation, TOUS tes utilisateurs se font limiter derrière le même proxy. Cause probable :", options: ["Le burst est trop grand", "La clé est l’IP du proxy partagé (il faut real_ip + set_real_ip_from)", "La zone est trop petite", "Le débit est trop élevé"], answer: [1], explain: "Avec un proxy partagé, $binary_remote_addr = l’IP du proxy : tout le monde partage le compteur." }
    ]
  };
  M.lessons.push(L);
})();
(function addSecL4() {
  const M = window.MODULES.find((m) => m.id === "securite");
  const L = {
    id: "sec-headers",
    title: "Les en-têtes de sécurité HTTP",
    excerpt: "X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.",
    content: `
# Les en-têtes de sécurité HTTP

Des en-têtes simples font reculer une bonne partie des attaques côté navigateur (clickjacking, MIME sniffing, exfiltration…).

## La base solide

\`\`\`nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
\`\`\`

| en-tête | protège contre | valeur typique |
|---|---|---|
| X-Frame-Options | clickjacking (iframe) | SAMEORIGIN ou DENY |
| X-Content-Type-Options | sniffing du type MIME | nosniff |
| Referrer-Policy | fuite du chemin dans Referer | strict-origin-when-cross-origin |
| Permissions-Policy | API navigateur sensibles | camera=() etc. |

## La grosse artillerie : Content-Security-Policy

\`\`\`nginx
add_header Content-Security-Policy "default-src ’self’; script-src ’self’; style-src ’self’ ’unsafe-inline’; img-src ’self’ data:;" always;
\`\`\`

La CSP dit au navigateur **d’où** peuvent venir scripts, styles, images, connexions… Un script injecté (XSS) qui tente de charger un domaine externe est bloqué.

> [!warn] La CSP est **facile à casser un site** : teste en relâché — \`default-src ’self’\` bloquera les scripts inline non déclarés, les fonts CDN, \`eval()\`, les WebSocket non listés… Passe en mode report (\`report-uri\`/report-to) avant de durcir.

## Le mot-clé always

Sans \`always\`, les en-têtes \`add_header\` ne s’appliquent **qu’aux réponses 200** : les 404/500/301 partiraient sans protection. \`always\` les force sur tous les codes.

## L’héritage : la règle de la location

\`\`\`nginx
server {
    add_header X-Frame-Options "SAMEORIGIN" always;
    location /api/ {
        # PAS de add_header ici : hérite du server
    }
    location /static/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        # ATTENTION : un add_header au niveau location REMPLACE ceux du server.
        # Si tu veux les deux, répète-les ici.
    }
}
\`\`\`

**Piège classique** : ajouter Cache-Control dans /static/ a fait disparaître X-Frame-Options de ces réponses.

## HSTS (déjà vu au module TLS)

\`add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\` — le compagnon obligatoire dès que HTTPS.

## Le package prêt à l’emploi

\`\`\`nginx
server {
    listen 443 ssl http2;
    ...
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Frame-Options          "SAMEORIGIN" always;
    add_header X-Content-Type-Options   "nosniff" always;
    add_header Referrer-Policy          "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy       "camera=(), microphone=(), geolocation=()" always;
    # CSP : à tuner selon ton app, commence en report
}
\`\`\`

> [!tip] Quelques formats d’audit (Mozilla Observatory, securityheaders.com) vérifient automatiquement ces en-têtes : vise le niveau A.
`,
    quiz: [
      { q: "X-Frame-Options SAMEORIGIN protège contre :", options: ["L’injection SQL", "Le clickjacking (votre page mise en iframe par un tiers)", "Le brute-force", "Les cookies"], correct: [1], explain: "Il interdit l’hébergement en iframe hors de votre domaine." },
      { q: "Sans le mot-clé always, add_header s’applique :", options: ["À toutes les réponses", "Aux réponses 200 seulement", "Aux erreurs seulement", "À rien"], correct: [1], explain: "always force l’en-tête sur tous les codes de statut." },
      { q: "Une CSP trop stricte provoque :", options: ["Rien", "Des ressources bloquées (scripts CDN, fonts, WebSocket…)", "Un ralentissement", "Des 502"], correct: [1], explain: "défaut-src 'self' bloque tout ce qui n’est pas sur votre domaine : à déployer progressivement." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Le package de sécurité", prompt: "Ajoute les quatre en-têtes de sécurité de base sur toutes les réponses.", skeleton: "server {\n    listen 443 ssl http2;\n    server_name site.local;\n    ssl_certificate /etc/nginx/certs/site.crt;\n    ssl_certificate_key /etc/nginx/certs/site.key;\n    # ajoute les 4 en-têtes de base (X-Frame, nosniff, Referrer, Permissions)\n}\n", required: ["add_header"], hint: "4 lignes add_header ... always; — voir la leçon." },
      { type: "mcq", diff: "hard", title: "L’en-tête disparu", prompt: "Après un add_header Cache-Control dans /static/, X-Frame-Options du server a disparu sur /static/. Pourquoi ?", options: ["NGINX a un bug", "Un add_header dans une location remplace l’ensemble hérité", "HTTP/2 l’interdit", "Le cache"], answer: [1], explain: "Une location qui définit add_header n’hérite plus du server : répète les en-têtes." }
    ]
  };
  M.lessons.push(L);
})();
(function addSecL5() {
  const M = window.MODULES.find((m) => m.id === "securite");
  const L = {
    id: "sec-hardening",
    title: "Durcir NGINX : la checklist",
    excerpt: "Masquer la version, permissions, dossiers sensibles, méthodes, mises à jour.",
    content: `
# Durcir NGINX : la checklist

Les réglages de sécurité vont au-delà de l’auth et des en-têtes : il s’agit de réduire la surface d’attaque — de l’installation elle-même.

## 1. Ne pas afficher le numéro de version

\`\`\`nginx
server_tokens off;      # « nginx/1.18.0 » devient « nginx » dans Server
\`\`\`

Un attaquant qui connaît ta version précise cherche les exploits correspondants. (NGINX modern : \`server_tokens off\` au niveau http.)

## 2. Interdire les méthodes dangereuses

\`\`\`nginx
if ($request_method !~ ^(GET|HEAD|POST)$) {
    return 405;
}
\`\`\`

> [!warn] Ce if dans une location marche pour return ; c’est l’un des usages tolérés. Alternatives : limiter par location avec \`limit_except\` (voir encadré).

\`\`\`nginx
location /admin/ {
    limit_except GET HEAD POST {
        deny all;
    }
}
\`\`\`

## 3. Cacher les fichiers sensibles

\`\`\`nginx
location ~ /\\. {           # tout ce qui commence par un point (.git, .env, .htaccess)
    deny all;
}
location ~ ~$ {              # backups ~
    deny all;
}
\`\`\`

Teste : \`curl -I http://site.local/.git/config\` doit répondre 403.

## 4. Désactiver l’index des répertoires

\`\`\`nginx
autoindex off;              # PAS de listing de dossier (déjà off par défaut)
\`\`\`

## 5. Permissions et propriétés des fichiers

- Fichiers de config : \`644\`, dossier : \`755\`, clé privée TLS : \`600\`, htpasswd : \`640\`.
- Jamais de \`chmod 777\`, jamais de fichiers dans plus de monde que nécessaire.
- sous Windows : restreindre l’accès au dossier C:/nginx via les ACL NTFS.

## 6. Ne pas tourner en root

NGINX démarre en root pour ouvrir le port 443, puis bascule sur \`user nginx;\` (débute le fichier nginx.conf). Ne touches pas à ça sans une très bonne raison : un worker compromis ne doit pas avoir les droits root.

## 7. Minimiser l’exposition

- \`default_server\` + \`return 444\` pour les domaines inconnus (leçon IP).
- N’expose que les ports nécessaires (50 fermé si rien ne l’utilise).
- Le reverse proxy limite l’exposition des apps internes (module proxy).

## 8. Se mettre à jour

NGINX corrige des CVE régulièrement : suis les mises à jour (\`sudo apt upgrade nginx\` sur Debian/Ubuntu, \`dnf update nginx\` sur Fedora, ou via le repo officiel), et surveille les bulletins (nginx.org/en/security_advisories.html).

## 9. Journaliser et surveiller

- Conserver les logs (module suivant) et les parser.
- Teste toi-même : \`nmap -sV localhost\`, \`curl -I\` sur les chemins sensibles, un pentest léger de ta config.

## 10. La checklist express

\`\`\`bash
nginx -v                       # version à jour ?
curl -I http://site.local/    # Server: nginx (pas nginx/1.18.0) ?
curl -I http://site.local/.git/config    # 403 ?
curl -I http://site.local/secret.txt     # fichiers exposés ?
curl -sI http://site.local/ | grep -i strict    # HSTS présent ?
\`\`\`
`,
    quiz: [
      { q: "server_tokens off ; :", options: ["Désactive les logs", "Masque le numéro de version dans l’en-tête Server", "Ferme le port 80", "Enlève la signature numérique"], correct: [1], explain: "Le banner « nginx/x.y.z » devient « nginx »." },
      { q: "Comment bloquer /.git et .env ?", options: ["location ~ /\. { deny all; }", "return 444 partout", "Chmod 777", "autoindex on"], correct: [0], explain: "Le regex sur le point caché refuse toute l’arborescence des fichiers cachés." },
      { q: "Pourquoi NGINX démarre en root puis bascule ?", options: ["Pour lire la config", "Pour ouvrir les ports < 1024 (80/443), puis il se dégrade en user nginx", "Pour écrire les logs", "Obligatoire"], correct: [1], explain: "Ports privilégiés → root au boot → déchéance de privilèges ensuite." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "La location verrouillée", prompt: "Masque la version de NGINX et refuse l’accès aux fichiers cachés.", skeleton: "server {\n    # masque la version\n    # refuse tout accès aux fichiers cachés (.git, .env)\n    location / { try_files $uri $uri/ /index.html; }\n}\n", required: ["server_tokens", "deny"], hint: "server_tokens off; location ~ /\. { deny all; }" },
      { type: "order", diff: "medium", title: "Le durcissement", prompt: "Ordonne le durcissement d’un nouveau serveur.", items: ["Installer NGINX et le maintenir à jour", "server_tokens off + permissions correctes", "Bloquer les fichiers cachés et méthodes inutiles", "En-têtes de sécurité + HSTS", "Tester avec curl/nmap"], explain: "Installation → durcissement global → filtres → en-têtes → audit." }
    ]
  };
  M.lessons.push(L);
})();
(function addSecL6() {
  const M = window.MODULES.find((m) => m.id === "securite");
  const L = {
    id: "sec-pratique",
    title: "Mise en pratique : le site blindé",
    excerpt: "Auth + IP + rate limit + en-têtes + durcissement : le dossier complet.",
    content: `
# Mise en pratique : le site blindé

Assemblons tout : un site public rapide, un back-office protégé en profondeur, des armes anti-abus et des en-têtes de sécurité.

## La configuration

\`\`\`nginx
http {
    server_tokens off;

    # zones de rate limiting
    limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/s;
    limit_req_zone $binary_remote_addr zone=api:10m  rate=100r/m;

    # le vhost inconnu
    server {
        listen 80 default_server;
        server_name _;
        return 444;
    }

    server {
        listen 80;
        listen 443 ssl http2;
        server_name blinde.local;

        ssl_certificate     /etc/nginx/certs/site.crt;
        ssl_certificate_key /etc/nginx/certs/site.key;

        root /srv/site;
        index index.html;

        # en-têtes de sécurité (toujours)
        add_header Strict-Transport-Security "max-age=31536000" always;
        add_header X-Frame-Options          "SAMEORIGIN" always;
        add_header X-Content-Type-Options   "nosniff" always;
        add_header Referrer-Policy          "strict-origin-when-cross-origin" always;

        # fichiers cachés : jamais
        location ~ /\. {
            deny all;
        }

        # back-office : IP + mot de passe + rate limité
        location /admin/ {
            allow 192.168.1.0/24;
            allow 127.0.0.1;
            deny all;

            auth_basic           "Zone admin";
            auth_basic_user_file /etc/nginx/.htpasswd;

            limit_req zone=auth burst=3 nodelay;

            try_files $uri $uri/ /admin/index.html;
        }

        # API publique : débitée
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            try_files $uri =404;
        }

        # le reste
        location / {
            try_files $uri $uri/ /index.html;
        }
    }
}
\`\`\`

## La batterie de tests

\`\`\`bash
# 1. version masquée
curl -sI https://blinde.local/ | grep -i server        # nginx (pas nginx/1.18.0)

# 2. fichiers cachés
curl -s -o /dev/null -w "%{http_code}\n" https://blinde.local/.git/config   # 403

# 3. admin sans IP : 403 ; avec IP : 401 (mot de passe demandé)
curl -s -o /dev/null -w "%{http_code}\n" https://blinde.local/admin/        # 403 (IP inconnue)
curl -u admin:MotDePasse -s -o /dev/null -w "%{http_code}\n" https://blinde.local/admin/  # 200 (IP autorisée)

# 4. rate limiting sur /api/
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code} " https://blinde.local/api/x; done
# → 200 200 ... 429 429 ...      (burst épuisé)

# 5. en-têtes
curl -sI https://blinde.local/ | grep -iE "strict|frame|nosniff"
\`\`\`

## Décortiquons un cas frappant

**Attaque brute-force sur /admin/** : 20 requêtes/minute à 1 r/s → NGINX rejette après le burst de 3, avec 429. L’attaquant ne peut plus bourriner — et l’auth est en plus verrouillée par IP.

**Scanner de ports** : GET sur l’IP directe → \`444\`, connexion fermée sans un octet de réponse.

> [!tip] **Le réflexe pro** : chaque protection doit être **testable** en une commande curl. Si tu ne peux pas prouver qu’elle marche, elle n’existe pas.
`,
    quiz: [
      { q: "Sur /admin/ sans IP autorisée, la réponse est :", options: ["401", "403", "200", "404"], correct: [1], explain: "deny all → 403 Forbidden (l’auth n’est même pas atteinte)." },
      { q: "Avec IP autorisée mais sans mot de passe :", options: ["403", "401 (mot de passe demandé)", "200", "429"], correct: [1], explain: "L’IP passe le filtre, l’auth_basic répond 401." },
      { q: "Le test du rate limiting sur /api/ finit par montrer :", options: ["502", "429 après épuisement du burst", "301", "Rien"], correct: [1], explain: "Une fois burst consommé, NGINX limite avec 429." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Le back-office blindé", prompt: "Blinde /admin/ : IP autorisées + mot de passe + rate limiting.", skeleton: "server {\n    listen 443 ssl http2;\n    server_name blinde.local;\n    ssl_certificate /etc/nginx/certs/site.crt;\n    ssl_certificate_key /etc/nginx/certs/site.key;\n\n    location /admin/ {\n        # a. seulement 10.0.0.0/8\n        # b. + mot de passe basique (fichier /etc/nginx/.htpasswd)\n        # c. + rate limit 1 r/s (zone auth) avec burst 3\n    }\n    location / { try_files $uri $uri/ /index.html; }\n}\n", required: ["allow", "deny", "auth_basic", "limit_req"], hint: "allow 10.0.0.0/8; deny all; auth_basic \"Admin\"; auth_basic_user_file /etc/nginx/.htpasswd; limit_req zone=auth burst=3 nodelay;" },
      { type: "mcq", diff: "medium", title: "Diagnostic 429", prompt: "Les vrais utilisateurs (Navré) se font limiter sur /api/ alors que le débit semble large. Cause probable :", options: ["burst trop petit", "clé = IP du proxy partagé, ou zone trop partagée", "Cache", "TLS"], answer: [1], explain: "Si tous partagent une IP (proxy/CDN), ils partagent le compteur : configure real_ip ou change de clé." }
    ]
  };
  M.lessons.push(L);
})();
(function addSecProj() {
  const M = window.MODULES.find((m) => m.id === "securite");
  M.project = {
    title: "Mini-projet du module : fortifier ton site",
    goal: "Durcir un site (public + back-office) : auth, IP, rate limiting, en-têtes de sécurité, durcissement global — et prouver chaque protection en ligne de commande.",
    objectives: [
      "server_tokens off et default_server + return 444 pour les domaines inconnus",
      "Fichiers cachés refusés (location ~ /\. { deny all; }) et test 403 sur .git/config",
      "Back-office /admin/ : allow IP de bureau + deny all + Basic Auth (fichier htpasswd généré) + limit_req 1 r/s burst 3",
      "API : limit_req adapté (ex. 100 r/m burst 20, statut 429)",
      "En-têtes de sécurité présents (HSTS, X-Frame, nosniff, Referrer-Policy) sur TOUS les codes (always)",
      "Site en HTTPS avec redirection 80→443",
      "Démonstrations curl : 444 (domaine inconnu), 403 (fichiers cachés), 401 (admin/IP OK sans mdp), 403 (admin/IP interdite), 429 (après burst), headers présents",
      "Bonus : vérification avec securityheaders.com ou Mozilla Observatory (ou une check-list maison) et note A visée"
    ],
    answer: "Config de référence : voir la leçon 6 (site blindé). Points de vérification :\n- curl -I https://blinde.local/ → Server: nginx (sans version)\n- curl -s -o /dev/null -w '%{http_code}' https://blinde.local/.git/config → 403\n- curl https://blinde.local/admin/ → 403 (IP inconnue) / 401 (IP OK, sans mdp) / 200 (avec -u)\n- boucle curl sur /api/x → 200... puis 429\n- curl -sI https://blinde.local/ | grep -iE 'strict|frame|nosniff' → présent\nhtpasswd : sudo htpasswd -c /etc/nginx/.htpasswd admin (ou printf 'admin:$(openssl passwd -apr1 MDP)\n' > /etc/nginx/.htpasswd).\nAttention Windows : chemins → C:/nginx/conf/.htpasswd, C:/nginx/certs/site.crt."
  };
})();
