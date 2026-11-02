/* Module 2 — Syntaxe et structure de configuration */
(function () {
  'use strict';
  const M = window.MODULES.find((m) => m.id === 'configuration');
  if (!M) return;

  M.lessons.push({
    id: 'blocs',
    title: 'La structure des blocs',
    excerpt: 'main · http · server · location · upstream — et la règle de l’héritage.',
    content: `
# La structure des blocs

Toute la puissance de NGINX repose sur un principe simple : la configuration est une **arborescence de blocs** \`{ … }\`, dans laquelle chaque bloc a un rôle précis.

## Les blocs fondamentaux

\`\`\`nginx
# Bloc main (racine, pas de nom) : réglages globaux du processus
user www-data;
worker_processes auto;

events {                  # conduction du réseau
    worker_connections 1024;
}

http {                    # tout ce qui est HTTP vit ICI
    include mime.types;

    server {              # un « site » (virtual host)
        listen 80;
        server_name example.com;

        location / {      # un chemin de ce site
            root /var/www/example;
        }
    }

    upstream backend {    # groupe de serveurs (load balancing)
        server 10.0.0.1:8080;
        server 10.0.0.2:8080;
    }
}
\`\`\`

| Bloc | Rôle | Vive où ? |
|---|---|---|
| \`main\` (racine) | processus, fichiers, réseau global | — |
| \`events\` | modèle de connexions | main |
| \`http\` | toute la partie HTTP | main |
| \`server\` | un site / virtual host | http |
| \`location\` | un chemin d’URL | server (ou location) |
| \`upstream\` | groupe de backends | http |

> [!info] Il existe aussi \`stream\` (TCP/UDP brut, hors HTTP) et \`mail\` — on les verra dans les modules avancés.

## La syntaxe d’une directive

\`\`\`nginx
directive  argument1  argument2 ;
\`\`\`

- Le **nom** (mots et tirets, sans espaces), des **arguments**, et un **point-virgule** obligatoire.
- Les arguments ne sont jamais entre parenthèses (contrairement à beaucoup d’autres configs).

> [!warn] Oubli du \`;\` = erreur de syntaxe classique. Notre bac à sable te le signalera.

## Ce qui vit dans quel bloc : pas si rigide

NGINX utilise un système de **contextes** : une directive n’est valable que dans certains blocs.

- \`worker_processes\` → uniquement dans main.
- \`listen\` / \`server_name\` → uniquement dans \`server\`.
- \`root\` → dans \`http\`, \`server\` et \`location\`.
- \`proxy_pass\` → dans \`location\` (ou \`server\` avec des conditions).

Placer une directive dans le mauvais contexte produit une erreur au \`nginx -t\` (ou un avertissement chez nous).

## L’héritage : la règle d’or

Une directive valide dans plusieurs contextes **s’hérite** vers les blocs enfants — sauf si l’enfant la redéfinit.

\`\`\`nginx
http {
    root /var/www/general;          # hérité par tous les servers…

    server {
        server_name site-a.local;   # … sauf celui-ci :
        root /var/www/site-a;       # qui redéfinit root pour LUI + ses locations
        location / { }              # root reste /var/www/site-a ici
    }
}
\`\`\`

> [!tip] C’est cette mécanique d’héritage qui donne son élégance à NGINX : on pose les valeurs par défaut en haut (\`http\`), on précise rarément en bas.
`
  });

  M.lessons[0].quiz = [
    {
      q: 'Dans quel bloc déclare-t-on un site (virtual host) ?',
      options: ['Dans le bloc main', 'Dans le bloc http', 'Dans le bloc events', 'Dans le bloc stream'],
      correct: [1],
      explain: 'Le bloc server vit dans http (ou stream pour du TCP).'
    },
    {
      q: 'Que signifie « une directive est héritée » ?',
      options: ['Elle est copiée dans tous les fichiers du système', 'Les blocs enfants l’utilisent sauf s’ils la redéfinissent', 'Elle ne s’applique qu’au master', 'Elle apparaît dans les logs'],
      correct: [1],
      explain: 'L’héritage définit « par défaut » aux niveaux supérieurs, « exception » aux niveaux inférieurs.'
    },
    {
      q: 'Quel est le rôle du bloc events ?',
      options: ['Définir les événements HTTP', 'Configurer le traitement des connexions (ex. worker_connections)', 'Journaliser les erreurs', 'Charger les certificats'],
      correct: [1],
      explain: 'events contient worker_connections, use, accept_mutex : le modèle de connexions.'
    },
    {
      q: 'Quelle syntaxe de directive est correcte ?',
      options: ['root=/var/www/html', 'root /var/www/html;', 'root(/var/www/html);', 'set root /var/www/html'],
      correct: [1],
      explain: 'Nom + arguments + point-virgule : « root /var/www/html; ».'
    }
  ];

  M.lessons[0].exercises = [
    {
      type: 'mcq', diff: 'easy', title: 'Le bon emballage',
      prompt: 'Où placer le bloc « upstream backend { … } » pour faire du load balancing HTTP ?',
      options: ['Dans main, à côté de events', 'Dans http', 'Dans un server', 'Dans une location'],
      answer: [1],
      explain: 'upstream se déclare dans http (comme server).'
    }
  ];

  /* --- Leçon 2 : nginx.conf ligne à ligne --- */
  M.lessons.push({
    id: 'nginx-conf-ligne',
    title: 'Le nginx.conf expliqué ligne à ligne',
    excerpt: 'user, worker_processes, events, sendfile… chaque ligne a un sens.',
    content: `
> [!info] **Où vit ce fichier selon ton OS ?** 🐧 Linux : /etc/nginx/nginx.conf. 🪟 Windows : C:/nginx/conf/nginx.conf (dans le dossier d’installation). Le contenu et la syntaxe sont identiques.

# Le nginx.conf expliqué ligne à ligne

Prenons un \`nginx.conf\` type (celui des distributions) et décortiquons-le.

\`\`\`nginx
user www-data;                  # 1
worker_processes auto;          # 2

error_log /var/log/nginx/error.log warn;   # 3
pid /run/nginx.pid;             # 4

events {                        # 5
    worker_connections 1024;    # 6
}

http {                          # 7
    include mime.types;         # 8
    default_type application/octet-stream;  # 9

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent"';     # 10

    access_log /var/log/nginx/access.log main;  # 11

    sendfile on;                # 12
    keepalive_timeout 65;       # 13
    server_tokens off;          # 14

    server {                    # 15
        listen 80;              # 16
        server_name _;          # 17
        root /usr/share/nginx/html;  # 18
        index index.html;       # 19

        location / {            # 20
            try_files $uri $uri/ =404;   # 21
        }
    }
}
\`\`\`

1. **\`user www-data\`** — les workers tournent avec cet utilisateur limité (jamais root).
2. **\`worker_processes auto\`** — un worker par cœur CPU (le master gère, les workers travaillent).
3. **\`error_log\`** — où vont les messages internes, niveau \`warn\` minimum.
4. **\`pid\`** — fichier du PID du master.
5. **\`events { worker_connections 1024; }\`** — chaque worker gère jusqu’à 1024 connexions simultanées (1024 × nb workers = capacité totale théorique).
6. **\`include mime.types\`** — les Content-Type par extension.
7. **\`default_type application/octet-stream\`** — le type par défaut quand aucune extension ne matche (on verra son danger au module statique).
8. **\`log_format main …\`** — le gabarit de l’access.log (macro \`$…\`).
9. **\`access_log … main\`** — active les logs avec ce format.
10. **\`sendfile on\`** — NGINX demandera au noyau de copier les fichiers sans passer par l’espace utilisateur : plus rapide.
11. **\`keepalive_timeout 65\`** — les connexions persistantes restent ouvertes 65 s (réutilisées par le navigateur).
12. **\`server_tokens off\`** — masque la version de NGINX dans \`Server\` (durcissement).
13. **\`server_name _;\`** — « n’importe quel nom » (nom techniquement invalide qui sert de fourre-tout).
14. **\`try_files $uri $uri/ =404\`** — on y reviendra : essaie $uri, puis $uri/, sinon 404.

> [!info] \`log_format\` fonctionne **uniquement dans le bloc http**. \`access_log\` peut être redéfini plus bas (server, location).
`
  });

  M.lessons[1].quiz = [
    {
      q: 'Pourquoi les workers ne tournent-ils pas en root ?',
      options: ['Root coûte plus cher en CPU', 'Par sécurité : une faille dans un worker ne donne pas root', 'NGINX interdit root par licence', 'Les workers ne peuvent pas lire les fichiers'],
      correct: [1],
      explain: 'Moindre privilège : worker est compris, l’attaquant n’est pas root.'
    },
    {
      q: 'Que permet sendfile on ?',
      options: ['Envoyer les fichiers via le noyau, sans copie en espace utilisateur', 'Compresser les réponses', 'Chiffrer les envois', 'Journaliser les envois'],
      correct: [0],
      explain: 'sendfile délègue la copie fichier → socket au noyau : moins de mémoire et plus rapide.'
    },
    {
      q: 'Que fait server_tokens off ?',
      options: ['Supprime les logs', 'Cache la version de NGINX dans l’en-tête Server', 'Désactive les tokens OAuth', 'Bloque les robots'],
      correct: [1],
      explain: 'Évite de donner la version exacte à d’éventuels attaquants (durcissement).'
    },
    {
      q: 'Combien de connexions simultanées un serveur peut-il gérer avec worker_processes auto (4 cœurs) et worker_connections 1024 ?',
      options: ['1024', '2048', '4096', 'Uniquement selon la mémoire'],
      correct: [2],
      explain: '4 workers × 1024 connexions = 4096 (en théorie ; la réalité dépend des timeouts et des ressources).'
    }
  ];

  M.lessons[1].exercises = [
    {
      type: 'mcq', diff: 'medium', title: 'Le bon emplacement',
      prompt: 'La directive « log_format » ne peut être déclarée que :',
      options: ['Dans le bloc server', 'Dans le bloc http', 'Dans le bloc location', 'Dans le bloc events'],
      answer: [1],
      explain: 'log_format est « http-only » : on définit le format en haut, on l’utilise via access_log en dessous.'
    }
  ];
})();

/* --- Leçon 3 : server blocks --- */
(function addL2_3() {
  const M = window.MODULES.find((m) => m.id === 'configuration');
  const L = {
    id: 'server-blocks',
    title: 'Les server blocks : listen et server_name',
    excerpt: 'Ports, adresses, noms de domaines, wildcards et default_server.',
    content: `
# Les server blocks : listen et server_name

Un bloc \`server\` définit **un « site »** : sur quoi il écoute (\`listen\`) et pour quels noms il répond (\`server_name\`).

## listen : sur quoi écouter

\`\`\`nginx
listen 80;                # port 80, toutes les interfaces
listen 127.0.0.1:8080;    # seulement sur localhost, port 8080
listen [::]:80;           # IPv6
listen 443 ssl;           # TLS activé pour ce port
listen 80 default_server; # ce server répond si aucun nom ne matche
\`\`\`

- Sans port précisé : **80** (http).
- L’adresse peut cibler une interface précise — pratique pour ne pas exposer un vhost sur Internet.

## server_name : pour quels noms

\`\`\`nginx
server_name example.com;            # nom exact
server_name example.com www.example.com;   # plusieurs
server_name *.example.com;          # sous-domaines : blog.example.com…
server_name ~^api\.example\.com$;  # regex (rare, coûteux)
server_name _;                      # « fourre-tout » : n’importe quel nom
\`\`\`

## La logique de choix du server (rappel)

1. Filtre sur le **port** (\`listen\`).
2. **server_name** le plus proche : exact > wildcard début (\`*.example.com\`) > regex.
3. Sinon \`default_server\` ; sinon le **premier bloc déclaré**.

> [!warn] Deux blocs \`server\` avec le même port ET le même server_name : seul le premier est utilisé (warn au \`nginx -t\`). Vérifiez vos includes.

## Le cas très fréquent : http → https

On déclare souvent **deux blocs** pour le même nom : un qui écoute le 80 et redirige, un qui sert en 443.

\`\`\`nginx
server {
    listen 80;
    server_name example.com www.example.com;
    return 301 https://$host$request_uri;   # redirige tout vers https
}

server {
    listen 443 ssl;
    server_name example.com www.example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    root /var/www/example;
}
\`\`\`

> [!tip] \`$host\` et \`$request_uri\` reconstruisent l’URL d’origine dans la redirection — on les verra en détail à la leçon « Variables ».
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Que signifie « listen 80 default_server; » ?',
      options: ['Le serveur écoute uniquement sur l’IP 80', 'C’est le serveur par défaut quand aucun server_name ne matche', 'Il répond seulement au domaine « default »', 'Il est réservé à localhost'],
      correct: [1],
      explain: 'default_server : le plan B. Sans lui, le premier server déclaré sert de plan B.'
    },
    {
      q: 'Quelle forme de server_name couvre « blog.example.com » et « shop.example.com » ?',
      options: ['server_name blog.example.com shop.example.com;', 'server_name *.example.com;', 'server_name example.com*;', 'server_name ~example.com'],
      correct: [1],
      explain: 'Le wildcard *.example.com couvre tout sous-domaine (mais pas le domaine nu).'
    },
    {
      q: 'Un client demande https://example.com sur le port 443. Le bloc 443 a « listen 443 ssl; ». Quelle directive manquerait-il en premier ?',
      options: ['add_header', 'ssl (activation)', 'ssl_certificate', 'index'],
      correct: [2],
      explain: 'Un bloc 443 ssl doit déclarer au moins ssl_certificate et ssl_certificate_key, sinon nginx -t échoue.'
    },
    {
      q: 'Que fait « return 301 https://$host$request_uri; » dans un bloc port 80 ?',
      options: ['Il crypte la requête en place', 'Il redirige définitivement vers la version https de la même URL', 'Il renvoie une erreur 301 volontaire', 'Il charge un certificat'],
      correct: [1],
      explain: 'Redirection permanente http → https, en préservant l’hôte et le chemin.'
    }
  ];

  L.exercises = [
    {
      type: 'mcq', diff: 'medium', title: 'Ordre de résolution',
      prompt: 'Trois blocs server écoutent sur 443 : server_name example.com ; server_name *.example.com ; et l’un avec default_server. Une requête Host: shop.example.com arrive. Qui répond ?',
      options: ['localhost', 'Le bloc *.example.com', 'Le bloc default_server', 'Le premier déclaré'],
      answer: [1],
      explain: 'Exact > wildcard > regex > default_server. Ici le wildcard gagne.'
    }
  ];
})();

/* --- Leçon 4 : les locations --- */
(function addL2_4() {
  const M = window.MODULES.find((m) => m.id === 'configuration');
  const L = {
    id: 'locations',
    title: 'Les locations : trier les URL',
    excerpt: 'Préfixe, exact, ^~, regex — et leur ordre de priorité exact.',
    content: `
# Les locations : trier les URL

Le bloc \`location\` découpe le site en **chemins** : chaque requête tombe dans UNE location, qui décide de la suite (fichier, proxy, redirection…).

## Les 4 formes

\`\`\`nginx
location = /exact { … }        # 1. égalité exacte (priorité maximale)
location ^~ /images/ { … }     # 2. préfixe « bloquant » (pas de regex ensuite)
location ~ \.php$ { … }       # 3. regex sensible à la casse (~) / insensible (~*)
location / { … }               # 4. préfixe simple (le filet de sécurité)
\`\`\`

## L’ordre de décision (à connaître par cœur)

1. **\`= \` exact** — si l’URL est exactement ce chemin, c’est gagné immédiatement.
2. **Préfixes longs d’abord** — la location à préfixe la plus longue gagne.
3. **\`^~ \`** — si la plus longue est \`^~\`, elle gagne **sans consulter les regex**.
4. **Regex** (\`~\` / \`~*\`) — sinon NGINX teste les regex **dans l’ordre de déclaration** ; la première qui matche gagne.
5. **Préfixe simple** — sinon la plus longue préfixe simple gagne.

> [!warn] L’ordre de déclaration est sans importance pour les préfixes, mais **crucial pour les regex** : la première regex déclarée qui matche l’emporte.

## Trois exemples parlants

\`\`\`nginx
server {
    root /var/www/site;

    location = /favicon.ico { log_not_found off; access_log off; }

    location ^~ /static/ {
        # fichiers statiques : on coupe court, pas de regex inutile
        expires 30d;
    }

    location ~ \.(js|css)$ { root /var/www/dossier-special; }

    location / {
        try_files $uri $uri/ =404;
    }
}
\`\`\`

Analysons :

- \`/favicon.ico\` → \`=\` gagne (pas de log 404 parasite).
- \`/static/logo.png\` → \`^~\` gagne (immédiat, sans regex).
- \`/app.js\` → regex \`~(js|css)\` gagne (avant la préfixe \`/\`).
- \`/page.html\` → rien d’autre → \`/\` s’applique.

> [!tip] Règle d’or : **\`/\` en dernier, toujours**. C’est le filet qui attrape tout ce qui n’est pas spécial.
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Quelle est la priorité maximale entre ces locations pour l’URL /favicon.ico ?',
      options: ['location /', 'location ^~ /favicon', 'location = /favicon.ico', 'location ~ \.ico$'],
      correct: [2],
      explain: 'L’égalité exacte (=) bat tout, y compris les regex.'
    },
    {
      q: 'Avec ^~ sur /static/ : que se passe-t-il pour /static/img/x.png ?',
      options: ['Les regex sont ensuite testées', 'La location ^~ gagne immédiatement, sans consulter les regex', 'Le préfixe simple / gagne', 'C’est une erreur de syntaxe'],
      correct: [1],
      explain: '^~ « bloque » : quand c’est la plus longue préfixe, on ne teste plus aucune regex.'
    },
    {
      q: 'Deux regex peuvent-elles matcher la même URL ?',
      options: ['Non, c’est interdit', 'Oui ; c’est la première déclarée qui gagne', 'Oui ; c’est la plus longue qui gagne', 'Oui, elles sont fusionnées'],
      correct: [1],
      explain: 'Les regex sont testées dans l’ordre du fichier : première qui matche = gagnante.'
    },
    {
      q: 'Pourquoi place-t-on généralement « location / » en dernier ?',
      options: ['Par convention esthétique', 'C’est le filet final qui attrape tout le reste', 'Les préfixes courts doivent venir après', 'À cause d’un bug historique'],
      correct: [1],
      explain: 'C’est le fallback par défaut du site ; tout le reste est une exception plus précise.'
    }
  ];

  L.exercises = [
    {
      type: 'order', diff: 'hard', title: 'Priorité des locations',
      prompt: 'Classe ces locations de la plus prioritaire à la moins prioritaire pour l’URL /images/banner.jpg',
      items: ['location = /images/banner.jpg', 'location ^~ /images/', 'location ~ \.(jpg|png)$', 'location /images/', 'location /'],
      explain: 'Exact (=) > ^~ (préfixe la plus longue, bloque les regex) > regex > préfixes simples (la plus longue d’abord : /images/ avant /).'
    },
    {
      type: 'config', diff: 'medium', title: 'Un site avec zone statique',
      prompt: 'Écris une configuration valide : un server (port 80, server_name cdn.local) contenant root /var/www/cdn, une location ^~ /static/ (avec expires 30d), et une location / par défaut avec try_files $uri $uri/ =404.',
      skeleton: '# Écris un bloc server complet :\n# - listen 80 ; server_name cdn.local ; root /var/www/cdn\n# - location ^~ /static/ { expires 30d; }\n# - location / { try_files $uri $uri/ =404; }',
      required: ['server', 'listen', 'server_name', 'root', 'location'],
      hint: 'location ^~ /static/ { … }',
      explain: 'Vérifie : server { listen 80; server_name cdn.local; root /var/www/cdn; location ^~ /static/ { expires 30d; } location / { try_files $uri $uri/ =404; } }'
    }
  ];
})();

/* --- Leçon 5 : les variables --- */
(function addL2_5() {
  const M = window.MODULES.find((m) => m.id === 'configuration');
  const L = {
    id: 'variables',
    title: 'Les variables NGINX',
    excerpt: '$host, $uri, $remote_addr, $http_*… et l’interpolation.',
    content: `
# Les variables NGINX

NGINX expose des **variables** (toujours préfixées \`$\`) qui décrivent la requête en cours. Elles servent dans les logs, les redirections, les réécritures et les en-têtes.

## Les plus utiles

| Variable | Contenu | Exemple |
|---|---|---|
| \`$host\` | Nom demandé (Host, sans port) | example.com |
| \`$server_name\` | Le nom du server block choisi | example.com |
| \`$request_method\` | Méthode HTTP | GET |
| \`$uri\` | Chemin décodé, sans query | /blog/1 |
| \`$request_uri\` | Chemin brut + query | /blog/1?page=2 |
| \`$args\` | La query string | page=2 |
| \`$remote_addr\` | IP du client | 203.0.113.7 |
| \`$remote_user\` | Utilisateur (auth basic) | alice |
| \`$http_…\` | En-tête arbitraire | $http_user_agent, $http_referer |
| \`$status\` | Code de la réponse | 200 |
| \`$request_time\` | Durée de traitement (s) | 0.042 |
| \`$body_bytes_sent\` | Octets de corps envoyés | 6120 |

> [!info] \`$host\` ≠ \`$server_name\` : \`$host\` est ce que le client a demandé, \`$server_name\` ce que la config a choisi. En virtual hosting, ils diffèrent si le client tape une IP ou un alias.

## Interpolation dans les chaînes

Les variables s’utilisent **dans des chaînes** (entre guillemets ou non) :

\`\`\`nginx
# redirection qui conserve tout
return 301 https://$host$request_uri;

# log personnalisé
log_format accel '$remote_addr - $request_method $uri -> $status ($request_time s)';

# en-tête transmis au backend
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

# plan B générique
error_page 404 /404.html;

# envoyer l’IP réelle au backend
proxy_set_header X-Real-IP $remote_addr;
\`\`\`

## Attention aux pièges

- **\`$uri\` est décodé et normalisé** : \`/a%20b\` devient \`/a b\`. \`$request_uri\` reste brut. Pour une redirection, préférez \`$request_uri\`.
- Les variables sont **lazy** : elles ne sont calculées que si une directive les utilise (coût quasi nul).
- Toutes les variables ne sont pas disponibles partout : \`$cookie_x\`, \`$arg_x\` (paramètre précis) n’existent que quand utilisés.

> [!tip] \`$arg_nom\` donne un paramètre de query précis : \`?page=2\` → \`$arg_page\`. Très utile dans \`if\` ou \`proxy_pass\`.
`
  };
  M.lessons.push(L);

  L.quiz = [
    {
      q: 'Quelle différence entre $uri et $request_uri ?',
      options: ['Aucune, ils sont identiques', '$uri est décodé/sans query ; $request_uri est brut avec la query', '$uri contient le port, pas $request_uri', '$request_uri est réservé aux redirections'],
      correct: [1],
      explain: '$uri : chemin normalisé sans query. $request_uri : la ligne de requête brute.'
    },
    {
      q: 'Quelle variable récupère la valeur d’un paramètre ?id=42 ?',
      options: ['$id', '$arg_id', '$param_id', '$query_id'],
      correct: [1],
      explain: '$arg_<nom> donne la valeur d’un paramètre de query string.'
    },
    {
      q: 'Quelle variable journalise l’IP du client ?',
      options: ['$client_ip', '$remote_addr', '$host', '$http_ip'],
      correct: [1],
      explain: '$remote_addr = IP du pair TCP. Derrière un proxy, voir X-Forwarded-For.'
    },
    {
      q: 'Dans « proxy_set_header X-Real-IP $remote_addr; », que transmet-on au backend ?',
      options: ['Le nom du domaine', 'L’adresse IP réelle du client', 'L’adresse du backend', 'Le port utilisé'],
      correct: [1],
      explain: 'On propage l’IP réelle du client au serveur amont, sinon celui-ci verrait seulement l’IP du proxy.'
    }
  ];

  L.exercises = [
    {
      type: 'mcq', diff: 'medium', title: 'Redirection intacte',
      prompt: 'Quelle directive redirige en https en conservant EXACTEMENT la requête d’origine (y compris la query) ?',
      options: ['return 301 https://$host$uri;', 'return 301 https://$host$request_uri;', 'return 301 https://$server_name$uri;', 'rewrite ^ https://$host;'],
      answer: [1],
      explain: '$request_uri garde la forme exacte (chemin brut + ?args), $host le nom demandé.'
    },
    {
      type: 'mcq', diff: 'hard', title: 'Virtual hosting avec alias',
      prompt: 'Un client tape http://example.com (Host: example.com). Le server_name déclaré est « www.example.com » (wildcard absent). Quelle variable vaut « www.example.com » ?',
      options: ['$host', '$server_name', '$uri', 'Aucune des deux variable ne se remplit'],
      answer: [1],
      explain: '$server_name reflète le nom déclaré qui a gagné ; $host ce que le client a envoyé.'
    }
  ];
})();
(function addCfgProj() {
  const M = window.MODULES.find((m) => m.id === "configuration");
  M.project = {
    title: "Mini-projet du module : rédiger une configuration propre",
    goal: "Écrire de zéro un nginx.conf structuré et documenté pour un site (deux vhosts, locations, variables), le valider et le faire tourner.",
    objectives: [
      "Écrire un fichier de configuration complet : contexte principal (events + http) avec worker_connections et include",
      "Deux server blocks : site-a.local (root dédié, index) et site-b.local (root dédié)",
      "Au moins une location avec alias, une avec try_files, et une avec une variable nginx utilisée (ex. dans un en-tête ou une log)",
      "Structurer les fichiers : vhosts dans sites-available/sites-enabled (Linux) ou conf.d (Windows), avec include",
      "Valider : nginx -t sans erreur, puis rechargement",
      "Tester : curl -I sur les deux vhosts (bonne page servie), vérifier une location alias et try_files",
      "Documenter chaque bloc par un commentaire (#) expliquant le rôle",
      "Bonus : ajouter un log_format personnalisé et vérifier une ligne de log détaillée"
    ],
    answer: "Structure de référence :\n# /etc/nginx/nginx.conf (extrait)\nevents { worker_connections 1024; }\nhttp {\n  include /etc/nginx/mime.types;\n  sendfile on;\n  log_format detail '\u0024remote_addr - [\u0024time_local] \"\u0024request\" \u0024status \u0024body_bytes_sent rt=\u0024request_time ureq=\u0024uri';\n  include /etc/nginx/sites-enabled/*;\n}\n# sites-available/site-a.local\nserver {\n  listen 80;\n  server_name site-a.local;\n  root /srv/site-a;\n  index index.html;\n  access_log /var/log/nginx/site-a.access.log detail;\n  location /images/ { alias /srv/site-a/photos/; }\n  location / {\n    try_files \u0024uri \u0024uri/ /index.html;\n  }\n}\nTests :\n- nginx -t → syntax is ok\n- curl -H \"Host: site-a.local\" -I http://127.0.0.1/ → 200 avec la bonne page\n- curl -I http://site-a.local/images/logo.png → sert photos/logo.png (alias)\nWindows : chemins C:/nginx/html/site-a, conf.d/*.conf ; le reste est identique."
  };
})();
