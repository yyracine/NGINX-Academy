/* Nginx Academy — Module 10 : 📊 Logs et monitoring */
(function addLogL1() {
  const M = window.MODULES.find((m) => m.id === "logs-monitoring");
  const L = {
    id: "log-systeme",
    title: "Le système de logs de NGINX",
    excerpt: "access_log vs error_log, niveaux, emplacements Linux/Windows, rotation.",
    content: `
# Le système de logs de NGINX

Tout ce que fait NGINX peut être tracé. Deux journaux complémentaires : l’**access log** (qui a demandé quoi) et l’**error log** (ce qui a déraillé).

## Les deux journaux

| journal | contenu | exemple de ligne |
|---|---|---|
| access_log | chaque requête servie | \`127.0.0.1 - - [01/Nov/2025:10:00:00] "GET / HTTP/1.1" 200 612 "-" "curl/8"\` |
| error_log | erreurs, avertissements, niveau configurables | \`2025/11/01 10:00:00 [error] 1234#0: connect() failed (111: Connection refused) while connecting to upstream\` |

## Emplacements par OS

| OS | access log | error log | config |
|---|---|---|---|
| Linux (Debian/Ubuntu) | /var/log/nginx/access.log | /var/log/nginx/error.log | /etc/nginx/nginx.conf |
| RHEL/Fedora | /var/log/nginx/access.log | /var/log/nginx/error.log | /etc/nginx/nginx.conf |
| Windows | C:/nginx/logs/access.log | C:/nginx/logs/error.log | C:/nginx/conf/nginx.conf |

## Configurer les logs

\`\`\`nginx
http {
    access_log /var/log/nginx/access.log;
    error_log  /var/log/nginx/error.log warn;
}
\`\`\`

Un niveau d’erreur par \`error_log\` :

| niveau | quand l’utiliser |
|---|---|
| debug | développement (très verbeux, PAS en production) |
| info / notice | peu utile en routine |
| warn | à partir des avertissements (bon choix quotidien) |
| error | seulement les erreurs |
| crit / alert / emerg | incidents graves |

## Choisir ses niveaux

\`\`\`nginx
error_log /var/log/nginx/error.log warn;     # production habituelle
error_log /var/log/nginx/error.log debug;    # pont de diagnostic temporaire
\`\`\`

## Rotation des journaux (Linux)

Les logs grossissent : une rotation quotidienne/compressée est indispensable.

\`\`\`bash
# logrotate (Debian/Ubuntu) : /etc/logrotate.d/nginx
/var/log/nginx/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 www-data adm
    sharedscripts
    postrotate
        if [ -f /run/nginx.pid ]; then
            kill -USR1 $(cat /run/nginx.pid)   # NGINX rouvre ses logs
        fi
    endscript
}
\`\`\`

Le signal \`USR1\` demande à NGINX de **rouvrir ses fichiers de logs** (le truc à connaître pour toute rotation sans redémarrage).

> [!info] Sous Windows, pas de logrotate nativement : réglage « Schéma des tâches » pour déplacer/compresser les logs, puis \`nginx -s reopen\` (version Windows du USR1).

## Tampon et taille

\`\`\`nginx
access_log /var/log/nginx/access.log combined buffer=16k flush=5s;
\`\`\`

Le buffer accélère les écritures massives ; \`flush\` limite le délai de latence des logs en temps réel.

## Un conseil d’architecture

- Les access logs vivent **par vhost** (un fichier par site) pour une analyse propre.
- Activer le logique des erreurs sensibles (auth, 4xx) : \`access_log ... if=…\` ou parser ensuite.
- Ne jamais oublier : les logs contiennent des IP, des User-Agent, parfois des URL sensibles — protège-les (RGPD : pense à la conservation).

> [!tip] **Réflexe n°1 d’un incident** : \`tail -f /var/log/nginx/error.log\` pendant la reproduction. Sous Windows : \`Get-Content C:/nginx/logs/error.log -Tail 20 -Wait\` ou Notepad++ qui suit le fichier.
`,
    quiz: [
      { q: "L’error_log en production, niveau conseillé :", options: ["debug", "warn", "info", "emerg seulement"], correct: [1], explain: "warn capture avertissements + erreurs sans le bruit de debug." },
      { q: "Quel signal demande à NGINX de rouvrir ses logs ?", options: ["USR1 (nginx -s reopen)", "USR2", "TERM", "HUP"], correct: [0], explain: "USR1/reopen : indispensable après rotation logrotate." },
      { q: "Un « connect() failed (111: Connection refused) while connecting to upstream » vient de :", options: ["L’access log", "L’error log (niveau error)", "La console", "Le DNS"], correct: [1], explain: "Les échecs internes se tracent dans l’error log." }
    ],
    exercises: [
      { type: "order", diff: "easy", title: "Résoudre un incident", prompt: "Ordonne la démarche.", items: ["Reproduire le problème", "Regarder error.log en tail -f", "Identifier l’erreur (timeout, refus…)", "Corriger la config", "nginx -t puis reload, et re-tester"], explain: "Reproduction → logs → diagnostic → correctif → validation." },
      { type: "mcq", diff: "easy", title: "Emplacement Windows", prompt: "Sur Windows, l’access log se trouve par défaut dans :", options: ["C:/Windows/System32/logs", "C:/nginx/logs/access.log", "C:/ProgramData/nginx", "Le dossier temp"], answer: [1], explain: "Tout vit dans le dossier d’installation de NGINX." }
    ]
  };
  M.lessons.push(L);
})();
(function addLogL2() {
  const M = window.MODULES.find((m) => m.id === "logs-monitoring");
  const L = {
    id: "log-format",
    title: "log_format : des logs sur mesure",
    excerpt: "combined, variables clés, timings, upstream, et mettre des logs par vhost.",
    content: `
# log_format : des logs sur mesure

Le format par défaut (\`combined\`) est un bon départ. Pour diagnostiquer la latence et les proxys, il faut **plus de variables**.

## Le format par défaut (combined)

\`\`\`nginx
log_format combined ’$remote_addr - $remote_user [$time_local] ’
                   ’"$request" $status $body_bytes_sent ’
                   ’"$http_referer" "$http_user_agent"’;
\`\`\`

## Un format taillé pour le diagnostic

\`\`\`nginx
http {
    log_format detail ’$remote_addr - $remote_user [$time_local] ’
                      ’"$request" $status $body_bytes_sent ’
                      ’"$http_referer" "$http_user_agent" ’
                      ’rt=$request_time uct="$upstream_connect_time" ’
                      ’urt="$upstream_response_time" ’
                      ’up="$upstream_addr" method=$request_method ’
                      ’host="$host" scheme=$scheme’;

    server {
        access_log /var/log/nginx/mon-site.access.log detail;
    }
}
\`\`\`

## Les variables qui changent tout

| variable | sens |
|---|---|
| \`$request_time\` | durée totale vue par NGINX (attente incluse) |
| \`$upstream_connect_time\` | délai de connexion à l’app |
| \`$upstream_response_time\` | temps de réponse de l’app |
| \`$upstream_addr\` | IP:port de l’instance amont utilisée (module load balancing !) |
| \`$status\` | code de la réponse |
| \`$request_uri\` | chemin + query |
| \`$http_user_agent\` | navigateur/robot |
| \`$remote_user\` | login Basic Auth |

**Exemple de ligne :**

\`\`\`
203.0.113.5 - - [01/Nov/2025:10:00:00] "GET /api/tickets HTTP/1.1" 200 512 "-" "Mozilla/5.0" rt=0.042 uct="0.002" urt="0.039" up="127.0.0.1:8002" method=GET host="app.local" scheme=http
\`\`\`

On lit d’un coup : l’app a mis 39 ms, l’instance était 8002, la requête a pris 42 ms.

## Un format JSON (pour les pipelines)

\`\`\`nginx
log_format json escape=json
    ’{"time":"$time_iso8601","ip":"$remote_addr",’
    ’"request":"$request","status":$status,’
    ’"rt":$request_time,"up":"$upstream_addr",’
    ’"uri":"$request_uri","ua":"$http_user_agent"}’;
\`\`\`

À envoyer vers un système de logs centralisé (Elasticsearch, Loki…).

## Un format par vhost

\`\`\`nginx
server { server_name api.exemple.fr; access_log /var/log/nginx/api.access.log detail; }
server { server_name www.exemple.fr; access_log /var/log/nginx/www.access.log combined; }
\`\`\`

Chaque site journalise dans son fichier au bon format.

## Désactiver un log

\`access_log off;\` — pour les endpoints bruyants et inutiles (health checks) :

\`\`\`nginx
location = /healthz {
    access_log off;
    return 200 "ok";
}
\`\`\`

> [!tip] **L’ordre des variables** compte pour le parsing : garde le même format entre les vhosts d’un même cluster, sinon tes outils d’analyse s’étranglent.
`,
    quiz: [
      { q: "Quelle variable donne la durée totale d’une requête chez NGINX ?", options: ["$upstream_response_time", "$request_time", "$request_uri", "$status"], correct: [1], explain: "$request_time = vue client via NGINX (attente incluse)." },
      { q: "Tu cherches quelle instance amont a servi la requête :", options: ["$upstream_addr", "$remote_addr", "$host", "$scheme"], correct: [0], explain: "$upstream_addr : IP:port du backend — précieux en load balancing." },
      { q: "log_format json escape=json sert à :", options: ["Compresser les logs", "Produire une ligne JSON exploitable par des pipelines", "Chiffrer les logs", "Rendre les logs illisibles"], correct: [1], explain: "JSON = ingestion facile par Elasticsearch/Loki et outils d’analyse." }
    ],
    exercises: [
      { type: "config", diff: "medium", title: "Le format de diagnostic", prompt: "Définis un log_format détaillé et applique-le à un vhost via access_log.", skeleton: "http {\n    # définit un log_format « detail » avec : $remote_addr, $request, $status,\n    # $request_time, $upstream_response_time, $upstream_addr\n    # puis active-le sur un vhost (access_log)\n}\n", required: ["log_format", "access_log"], hint: "log_format detail '...' ; puis access_log /var/log/nginx/site.access.log detail;" },
      { type: "mcq", diff: "medium", title: "Lire une ligne", prompt: "up=\"127.0.0.1:8002\" rt=0.042 urt=\"0.039\" — l’instance était :", options: ["8000", "8002", "RT", "irréfutablement la plus rapide"], answer: [1], explain: "up = 127.0.0.1:8002 : la requête est passée par l’instance 8002." }
    ]
  };
  M.lessons.push(L);
})();
(function addLogL3() {
  const M = window.MODULES.find((m) => m.id === "logs-monitoring");
  const L = {
    id: "log-analyse",
    title: "Analyser les logs : la boîte à outils",
    excerpt: "grep, awk, top URL/5xx, outils visuels, et le diagnostic pas à pas.",
    content: `
# Analyser les logs : la boîte à outils

Les logs ne valent que si on sait les interroger. Quelques commandes classiques suffisent pour 90 % des besoins.

## Les classiques (Linux, Git Bash sous Windows)

\`\`\`bash
# 1. Les 10 IP les plus actives
awk ’{print $1}’ /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# 2. Les URL les plus demandées
awk ’{print $7}’ /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# 3. Toutes les erreurs 5xx (avec l’URL)
awk ’$9 ~ /^5/ {print $9, $7}’ /var/log/nginx/access.log | sort | uniq -c | sort -rn | head

# 4. Une IP précise, toutes ses requêtes
grep "203.0.113.7" /var/log/nginx/access.log | tail -20

# 5. La latence la plus haute (avec format detail : rt=...)
grep -o ’rt=[0-9.]*’ /var/log/nginx/access.log | sort -t= -k2 -rn | head -5

# 6. En direct
tail -f /var/log/nginx/access.log
\`\`\`

> [!info] Les commandes awk/grep fonctionnent à l’identique sous Windows via Git Bash (ou PowerShell avec Select-String/ForEach-Object ; plus verbeux).

## Le monitoring en un coup d’œil : les métriques

| question | commande |
|---|---|
| requêtes par seconde (moyenne) | \`wc -l < access.log\` / durée |
| taux d’erreurs | somme des 4xx/5xx / total |
| endpoint le plus lent | tri par \`rt=\` |
| pics instantanés | \`grep ’01/Nov/2025:10:’ access.log \| wc -l\` (voir l’heure) |
| robots | \`awk ’{print $12}’ …\` (user-agent, position variable) |

## Les outils visuels

- **GoAccess** : \`goaccess /var/log/nginx/access.log\` — une interface terminal/historique en 1 commande.
- **ngxtop** : \`ngxtop\` — top en temps réel des requêtes.
- Pipelines centralisés (Loki, ELK) pour les fermes.

## Étude de cas : le site qui rame

1. \`tail -f error.log\` pendant la reproduction → \`upstream timed out\` ?
2. \`grep -o ’rt=[0-9.]*’ access.log | sort -rn | head\` → les réponses lentes.
3. \`awk ’{print $7}’ access.log | sort | uniq -c | sort -rn | head\` → quel chemin est cher : \`/generate\` à 4 % mais 40 % de la latence.
4. Décision : cache + timeouts (module performance) ou scaling.

## Le piège : les horodatages et fuseaux

Les logs sont en heure locale (\`[$time_local]\`) ou UTC (\`$time_iso8601\`). Standardise : \`$time_iso8601\` dans tes log_formats si tu analyses sur plusieurs serveurs.

## Le piège : analyser des logs compressés/rotatés

\`\`\`bash
zcat /var/log/nginx/access.log.1.gz | grep "203.0.113.7"
\`\`\`

> [!tip] **La routine du matin** : 5 commandes — erreurs du jour, top IP, top URL, top latence, log direct. 2 minutes pour sonder l’état de la veille.
`,
    quiz: [
      { q: "Pour trouver les 10 IP les plus actives :", options: ["grep -c IP", "awk '{print $1}' | sort | uniq -c | sort -rn | head -10", "cat", "nginx -t"], correct: [1], explain: "Compter les occurrences de la 1re colonne (l’IP)." },
      { q: "Tu cherches les réponses lentes dans un log avec rt=... :", options: ["grep rt", "grep -o 'rt=[0-9.]*' | sort -t= -k2 -rn | head", "awk '{print $1}'", "tail -f"], correct: [1], explain: "L’extraction puis le tri numérique descendent." },
      { q: "GoAccess sert à :", options: ["Générer des certificats", "Visualiser les logs access en mode texte/HTML", "Compiler NGINX", "Sauvegarder"], correct: [1], explain: "Analyse visuelle immédiate depuis un fichier de log." }
    ],
    exercises: [
      { type: "mcq", diff: "medium", title: "Diagnostic rapide", prompt: "Ton API ramasse 30 % de 5xx entre 10h et 11h. Première commande :", options: ["awk '$9 ~ /^5/ {print $7}' access.log | head (quelles URL échouent)", "nginx -s reload", "certbot renew", "Changer d’algorithme"], answer: [0], explain: "Identifier d’abord QUELLES requêtes échouent : la cause suit." },
      { type: "order", diff: "easy", title: "Le diagnostic de lenteur", prompt: "Ordonne la démarche de diagnostic d’un proxy lent.", items: ["Reproduire et regarder error.log", "Extraire les rt= les plus hauts", "Isoler l’URL la plus lente", "Tester sans cache / avec cache pour comparer"], explain: "Logs → latences → URL → hypothèse → expérience." }
    ]
  };
  M.lessons.push(L);
})();
(function addLogL4() {
  const M = window.MODULES.find((m) => m.id === "logs-monitoring");
  const L = {
    id: "log-stub",
    title: "stub_status : la page de métriques",
    excerpt: "Activer stub_status, lire la sortie, monitorer avec un outil externe.",
    content: `
# stub_status : la page de métriques

NGINX mesure lui-même son activité : une URL spéciale expose des **compteurs** que vos outils de supervision peuvent scraper.

## L’activation

\`\`\`nginx
server {
    listen 80;
    server_name status.local;

    location = /nginx_status {
        stub_status;
        allow 127.0.0.1;      # RÉSERVÉ au monitoring
        allow 192.168.1.0/24;
        deny all;

        access_log off;
    }
}
\`\`\`

> [!warn] \`stub_status\` sans restriction IP, c’est exposer les métriques au monde entier. Toujours \`allow\`/\`deny\` (ou un secret) autour. Et idéalement un vhost dédié, pas ton site public.

## La sortie

\`\`\`bash
curl http://status.local/nginx_status

Active connections: 291
server accepts handled requests
 16630948 16630948 31070465
Reading: 6 Writing: 179 Waiting: 106
\`\`\`

| compteur | sens |
|---|---|
| Active connections | connexions ouvertes (total) |
| accepts | connexions acceptées depuis le démarrage |
| handled | connexions traitées (accepts - handled = refusées par manque de ressources) |
| requests | requêtes servies depuis le démarrage |
| Reading | requêtes en cours de lecture |
| Writing | réponses en cours d’écriture |
| Waiting | connexions keep-alive en attente (≈ clients connectés mais inactifs) |

**Lecture experte :**
- \`handled < accepts\` → des connexions refusées : file d’attente saturée, vérifier \`backlog\`/worker_connections.
- \`Writing\` élevé → gros volume d’envoi ; \`Waiting\` élevé → beaucoup de keepalive (normal).
- \`requests / uptime\` → le débit moyen.

## Passer au temps réel

\`\`\`bash
watch -n 1 ’curl -s http://status.local/nginx_status’
\`\`\`

(Sous Windows :PowerShell \`while ($true) { curl.exe -s http://status.local/nginx_status; Start-Sleep 1 }\`.)

## L’intégration supervision

- **Prometheus** : exporter \`nginx-prometheus-exporter\` (lit stub_status et expose des métriques).
- **Zabbix/Nagios/checkmk** : un simple script \`curl\` + grep sur les compteurs.
- **Alertes** : seuil sur \`Writing\` (engorgement) ou sur \`accepts - handled\` (refus).

## Un script d’alerte maison

\`\`\`bash
#!/bin/bash
R=$(curl -s http://status.local/nginx_status | awk ’/Reading:/{print $1}’)
W=$(curl -s http://status.local/nginx_status | awk ’/Reading:/{print $3}’)
if [ "$W" -gt 500 ]; then
  echo "ALERTE : $W écritures simultanées sur le serveur web" | mail -s "nginx" admins@exemple.fr
fi
\`\`\`

## Aller plus loin (NGINX Plus / OSS 1.24+)

La variante commerciale expose plus de métriques. En open source, \`stub_status\` + Prometheus couvre largement les besoins.

> [!tip] **Règle d’or** : les métriques sans alertes sont décoratives. Une seule alerte utile (ex. Writing > seuil) vaut mieux que dix dashboards muets.
`,
    quiz: [
      { q: "Que montre stub_status ?", options: ["Les logs", "Des compteurs : connexions, requêtes, lecture/écriture/attente", "La version de NGINX", "Le certificat"], correct: [1], explain: "Compteurs internes de NGINX, depuis son démarrage." },
      { q: "handled < accepts signifie :", options: ["Rien", "Des connexions ont été refusées (ressources/inondation)", "NGINX est redémarré", "Une erreur de config"], correct: [1], explain: "Un écart durable entre les deux signale une saturation." },
      { q: "Pourquoi restreindre l’accès à /nginx_status ?", options: ["Pour économiser du trafic", "Les métriques sont sensibles : allow/deny + IP", "Il ralentit NGINX", "Pas besoin"], correct: [1], explain: "Exposer les compteurs publiquement aide les attaquants à mesurer le service." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "La page de métriques", prompt: "Expose stub_status en le réservant aux IP de confiance.", skeleton: "server {\n    listen 80;\n    server_name status.local;\n\n    location = /nginx_status {\n        # expose stub_status\n        # réserve l’accès à 127.0.0.1 et au réseau 192.168.1.0/24\n    }\n}\n", required: ["stub_status", "allow", "deny"], hint: "stub_status; allow 127.0.0.1; allow 192.168.1.0/24; deny all; access_log off;" },
      { type: "mcq", diff: "medium", title: "Lire la sortie", prompt: "Active connections: 291 — Reading: 6 Writing: 179 Waiting: 106. Ton serveur :", options: ["En panne", "Très occupé à écrire des réponses (179) avec 106 connexions en attente (keepalive)", "Redémarré", "Pas de certificat"], answer: [1], explain: "Writing élevé = fort volume de réponses en cours ; Waiting = keepalive normaux." }
    ]
  };
  M.lessons.push(L);
})();
(function addLogL5() {
  const M = window.MODULES.find((m) => m.id === "logs-monitoring");
  const L = {
    id: "log-errors",
    title: "error_page : des pages d’erreur à ton image",
    excerpt: "Pages 404/50x personnalisées, internal, redirections, et la page de maintenance.",
    content: `
# error_page : des pages d’erreur à ton image

Un 404 par défaut de NGINX fait professionnel mitigé. \`error_page\` sert des **pages personnalisées** sans changer les codes (important pour le SEO).

## Le principe

\`\`\`nginx
server {
    root /srv/site;
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
}
\`\`\`

- le client reçoit toujours \`404\` (le code d’état ne change pas) ;
- NGINX sert \`/404.html\` depuis le root.

## La location interne (le standard pro)

\`\`\`nginx
server {
    root /srv/site;

    error_page 404 /404.html;
    location = /404.html { internal; }    # non servie directement en face

    error_page 500 502 503 504 /50x.html;
    location = /50x.html { internal; }
}
\`\`\`

> [!info] \`internal\` : la page n’est accessible QUE via error_page, jamais par une requête directe \`/404.html\`. Un visiteur curieux ne pourra pas la télécharger hors contexte.

## Rediriger ou pas ?

Deux styles possibles :

\`\`\`nginx
# 1. Réponse directe : le code d’état est conservé (SEO ok)
error_page 404 /404.html;

# 2. Redirection externe : le client change d’URL (rare, déconseillé pour 404)
error_page 404 =301 /introuvable;
\`\`\`

Avec \`=\` avant le code : \`error_page 404 =200 /404.html;\` force un 200 (utile ponctuellement pour les SPA, à manier avec précaution).

## La page de maintenance propre (rappel)

\`\`\`nginx
location / {
    return 503;
}
error_page 503 /maintenance.html;
location = /maintenance.html {
    root /srv/site;
    internal;
    add_header Retry-After 3600;
}
\`\`\`

Le \`Retry-After\` annonce aux robots quand revenir.

## Personnaliser en fonction du status

\`\`\`nginx
location /api/ {
    proxy_pass http://127.0.0.1:8000;
    # les erreurs de l’app → réponse JSON propre
    error_page 502 = /502.json;
    location = /502.json { internal; default_type application/json; return 200 ’{"error":"amont indisponible"}’; }
}
\`\`\`

En analysant : le proxy répond 502, NGINX sert un JSON d’erreur propre au client (pratique pour les apps mobiles).

## Les pièges

1. **Le code change si tu rediriges** vers une autre URL : \`error_page 404 /404.html;\` ne change pas le code ; \`error_page 404 =301 /x;\` le remplace.
2. **Location interne** : oublier \`internal\` = page accessible hors contexte ; l’ajouter = protégée.
3. **root différent** : si la page vit ailleurs, \`error_page 404 /404.html\` cherche dans le root du server ; mets un root dans la location interne si besoin.
4. **Les pages d’erreur ne s’appliquent pas aux 401 du Basic Auth** (réponse avant le traitement du contenu).

## Le réflexe de test

\`\`\`bash
curl -I http://site.local/page-qui-nexiste-pas     # 404 + contenu personnalisé
curl -s http://site.local/404.html                  # 404 (internal) si bien configuré
curl -I http://site.local/                          # 200 (page normale)
\`\`\`

> [!tip] **Règle d’or** : garde le bon code d’état (404/500 restent 404/500) et ne laisse jamais une erreur sans page — l’utilisateur mérite une explication, pas une page blanche.
`,
    quiz: [
      { q: "error_page 404 /404.html; :", options: ["Redirige vers /404.html en 301", "Sert /404.html en gardant le code 404", "Change le code en 200", "Supprime la page"], correct: [1], explain: "Le code d’état reste 404 pour le SEO ; seul le contenu change." },
      { q: "Le mot-clé internal dans une location sert à :", options: ["Accélérer", "Restreindre l’accès aux seules erreurs (error_page), pas aux requêtes directes", "Chiffrer", "Logger"], correct: [1], explain: "internal = réservé au traitement interne de NGINX." },
      { q: "error_page 404 =200 /404.html; :", options: ["Aucun effet", "Force la réponse à 200 tout en servant la page", "Interdit", "Une erreur de syntaxe"], correct: [1], explain: "Le '=' avant le statut remplace le code de réponse." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Les pages d’erreur", prompt: "Personnalise les pages 404 et 50x avec des locations internal.", skeleton: "server {\n    root /srv/site;\n    # 404 → /404.html (location internal)\n    # 500 502 503 504 → /50x.html (location internal)\n}\n", required: ["error_page"], hint: "error_page 404 /404.html; + location = /404.html { internal; } — idem 50x." },
      { type: "mcq", diff: "medium", title: "Choix du statut", prompt: "Tu veux faire répondre un 404 en 200 pour une SPA (routing client). Quelle écriture ?", options: ["error_page 404 /index.html;", "error_page 404 =200 /index.html;", "return 404 /index.html;", "try_files directement"], answer: [1], explain: "Le '=' devant le statut remplace le code de réponse." }
    ]
  };
  M.lessons.push(L);
})();
(function addLogL6() {
  const M = window.MODULES.find((m) => m.id === "logs-monitoring");
  const L = {
    id: "log-pratique",
    title: "Mise en pratique : observabilité complète",
    excerpt: "Format JSON, rotation, stub_status, pages d’erreur : le tableau de bord final.",
    content: `
# Mise en pratique : observabilité complète

Assemblons tout le module : logs riches et par vhost, rotation, métriques stub_status, pages d’erreur — et démontrons-le.

## 1. Le fichier de configuration

\`\`\`nginx
http {
    log_format detail ’$remote_addr - $remote_user [$time_iso8601] ’
                      ’"$request" $status $body_bytes_sent ’
                      ’"$http_referer" "$http_user_agent" ’
                      ’rt=$request_time ureq=$uri up="$upstream_addr" ’
                      ’urt="$upstream_response_time" host="$host"’;

    # rotation : logrotate (Linux) ou tâche planifiée (Windows, nginx -s reopen)

    server {
        listen 80;
        server_name obs.local;
        root /srv/site;
        access_log /var/log/nginx/obs.access.log detail;

        # métriques
        location = /status {
            stub_status;
            allow 127.0.0.1;
            deny all;
            access_log off;
        }

        # pages d’erreur
        error_page 404 /404.html;
        location = /404.html { internal; }
        error_page 500 502 503 504 /50x.html;
        location = /50x.html { internal; }
    }
}
\`\`\`

## 2. La démonstration pas à pas

\`\`\`bash
nginx -t && sudo nginx -s reload

# a. générer du trafic varié
curl -s http://obs.local/ > /dev/null
curl -s http://obs.local/page-inexistante > /dev/null      # 404
curl -s http://obs.local/status > /dev/null                # metrics

# b. lire les logs
tail -4 /var/log/nginx/obs.access.log

# c. les métriques
curl -s http://obs.local/status
# Active connections: ... Reading: ... Writing: ... Waiting: ...

# d. les erreurs
tail -3 /var/log/nginx/error.log

# e. analyse
awk ’{print $7}’ /var/log/nginx/obs.access.log | sort | uniq -c | sort -rn | head
\`\`\`

## 3. Construire un petit rapport d’état

\`\`\`bash
#!/bin/bash
LOG=/var/log/nginx/obs.access.log
echo "--- Requêtes par URL ---"
awk ’{print $7}’ "$LOG" | sort | uniq -c | sort -rn | head -5
echo "--- Erreurs 4xx/5xx ---"
awk ’$9 ~ /^[45]/ {print $9}’ "$LOG" | sort | uniq -c
echo "--- Métriques ---"
curl -s http://obs.local/status
echo "--- 5 plus lentes ---"
grep -o ’rt=[0-9.]*’ "$LOG" | sort -t= -k2 -rn | head -5
\`\`\`

## 4. Les erreurs à chasser

| observation | cause probable |
|---|---|
| 404 partout sur les assets | root ou chemin cassé (revue module Statique) |
| 502 répétés | app down ou upstream mal configuré |
| 504 | timeouts proxy (module Proxy) |
| 429 | rate limiting (module Sécurité) |
| handled < accepts | saturation des connexions |

## 5. L’extension monitoring

- Envoyer \`curl -s http://obs.local/status\` chaque minute vers un fichier ou un outil (cron/systemd timer).
- Prometheus + nginx-prometheus-exporter pour un graphe continu.
- Alertes simples sur les 5xx (grep du journal).

> [!tip] **La promesse de ce module** : en 5 commandes, tu sais où ton serveur en est. Entraîne-toi jusqu’à les faire les yeux fermés — c’est ce qui fait les administrateurs sereins.
`,
    quiz: [
      { q: "Ta rotation des logs repose sur logrotate + quel signal ?", options: ["USR1 (nginx -s reopen)", "USR2", "HUP seulement", "Aucun"], correct: [0], explain: "reopen rouvre les fichiers de logs après rotation." },
      { q: "L’ordre des opérations de la démo :", options: ["Logs d’abord, puis trafic", "nginx -t → reload → générer du trafic → lire logs/métriques", "Rien", "stub_status avant tout"], correct: [1], explain: "Valider → recharger → générer → observer." },
      { q: "Que fait l’analyse awk '{print $7}' ?", options: ["Compte les IP", "Affiche l’URL (colonne 7) par occurrence", "Les codes", "La latence"], correct: [1], explain: "La colonne 7 du combined est l’URI demandée." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "L’observatoire", prompt: "Assemble l’observatoire : log_format détaillé et stub_status restreint.", skeleton: "http {\n    # a. log_format « detail » avec rt= et up=\n    # b. vhost : access_log obs.access.log detail\n    # c. location = /status : stub_status, réservé 127.0.0.1, sans access_log\n}\n", required: ["log_format", "stub_status", "access_log"], hint: "log_format detail '...rt=$request_time up=\"$upstream_addr\"...'; access_log /var/log/nginx/obs.access.log detail; location = /status { stub_status; allow 127.0.0.1; deny all; access_log off; } — attention { dans un bloque : lis les exemples de la leçon." },
      { type: "order", diff: "easy", title: "La chasse aux 5xx", prompt: "Ordonne la démarche quand le site renvoie des 502.", items: ["Vérifier que l’app tourne (port 8000)", "Regarder error.log (connect() failed ?)", "Tester curl direct sur l’app", "Corriger (redémarrer l’app, config) et recharger"], explain: "État → logs → test direct → correctif." }
    ]
  };
  M.lessons.push(L);
})();
(function addLogProj() {
  const M = window.MODULES.find((m) => m.id === "logs-monitoring");
  M.project = {
    title: "Mini-projet du module : le poste d’observation",
    goal: "Équiper un serveur local d’une observabilité complète : logs par vhost au format détaillé, rotation, stub_status protégé, pages d’erreur — et produire un mini-rapport d’activité.",
    objectives: [
      "Créer un vhost obs.local (root simple) avec un log_format « detail » (rt, up, host, time_iso8601) et un access_log dédié",
      "location = /status avec stub_status, allow 127.0.0.1 + deny all, access_log off — vérifier par curl",
      "Pages d’erreur : 404 → /404.html et 50x → /50x.html, locations internal",
      "Configurer la rotation des logs (logrotate sous Linux avec USR1/reopen ; sous Windows, tâche planifiée + nginx -s reopen) et la tester (un fichier .1.gz apparaît)",
      "Générer du trafic varié (200, 404, métriques) et lire les 5 dernières lignes du log",
      "Produire un mini-rapport (script ou commandes annotées) : top 5 URL, erreurs 4xx/5xx, métriques stub_status",
      "Vérifier errors propres dans error.log (rien de suspect au niveau warn+)",
      "Bonus : alerte simple (script) si > 20 erreurs 5xx en 5 minutes"
    ],
    answer: "Config de référence : voir la leçon 6. Vérifications clés :\n- curl -s http://obs.local/status → Active connections... (démo)\n- curl -s http://obs.local/page-inexistante -o /dev/null -w '%{http_code}' → 404 (avec le contenu personnalisé)\n- le log access ligne type : 127.0.0.1 - - [2025-11-01T10:00:00+00:00] \"GET / HTTP/1.1\" 200 612 \"-\" \"curl/8\" rt=0.001 up=\"-\" host=\"obs.local\"\n- rotation : /var/log/nginx/obs.access.log.1.gz existe après le test (logrotate -f /etc/logrotate.d/nginx ou tâche Windows)\n- awk '{print $7}' ... | sort | uniq -c | sort -rn | head → classement des URL"
  };
})();
