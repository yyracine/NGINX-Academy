/* Nginx Academy — Module 5 : ⚖️ Load balancing */
(function addLbL1() {
  const M = window.MODULES.find((m) => m.id === "loadbalancing");
  const L = {
    id: "lb-pourquoi",
    title: "Pourquoi répartir la charge ?",
    excerpt: "Scalabilité horizontale, disponibilité, active/active vs active/passive.",
    content: `
# Pourquoi répartir la charge ?

Quand une application dépasse les capacités d’une machine, deux stratégies existent : **scaler verticalement** (plus de CPU/RAM sur la même machine) ou **horizontalement** (plusieurs machines ou processus). NGINX est le maestro de la seconde : il répartit les requêtes entre plusieurs instances **amont** (upstream).

## Le schéma

\`\`\`
                ┌── instance A (127.0.0.1:8001)
clients ──► NGINX ── instance B (127.0.0.1:8002)
                └── instance C (127.0.0.1:8003)
\`\`\`

Chaque instance exécute **la même application**. NGINX choisit laquelle servira chaque requête selon un algorithme (leçon 3).

## Pourquoi c’est puissant

1. **Capacité** : 3 instances × 200 req/s = ~600 req/s (si l’app est stateless).
2. **Disponibilité** : si une instance tombe, les autres continuent de servir.
3. **Mises à jour sans coupure** : on retire une instance du pool (drain), on la met à jour, on la réintègre.
4. **Coût** : des machines modestes coûtent souvent moins cher qu’une grosse machine unique.

## Active/active ou active/passive ?

- **Active/active** : toutes les instances servent. Maximise la capacité ; NGINX répartit.
- **Active/passive** : une seule sert, les autres attendent en secours près à prendre le relais (ex. haute disponibilité stricte, base de données).

> [!tip] Le load balancing d’HTTP est **stateless du point de vue du load balancer** : chaque requête peut partir vers n’importe quelle instance. Si ton app garde un état en mémoire (session de login locale), tu dois gérer la **persistance de session** (leçon 5).

## Le piège n°1 : les états locaux

Une app se souvient d’un utilisateur dans sa mémoire locale → la requête suivante part sur une autre instance → l’utilisateur est déconnecté. Solutions : session partagée (Redis/DB), cookie sticky, ou app stateless (recommandé — le token JWT par exemple).

## Le piège n°2 : l’équilibrage ne remplace pas la santé

NGINX ne fait pas de magie : il faut l’outiller pour **détecter** les instances mortes, lentées ou incohérentes (leçon 4).
`,
    quiz: [
      { q: "Qu’apporte la répartition de charge ? (plusieurs réponses)", options: ["Plus de capacité de traitement", "De la disponibilité (redondance)", "Une mise à jour sans coupure possible", "Une accélération du code de l’app"], correct: [0, 1, 2], explain: "Capacité, résilience, mises à jour progressives ; l’app elle-même est inchangée." },
      { q: "Une app garde ses sessions en mémoire locale. Quel problème cela pose-t-il ?", options: ["Aucun", "L’utilisateur peut être déconnecté à la requête suivante si elle part sur une autre instance", "NGINX refuse de charge-balancer", "Le certificat devient invalide"], correct: [1], explain: "État local = incohérence entre instances ; il faut de la persistance de session ou du stateless." },
      { q: "En active/passive…", options: ["Toutes les instances servent", "Une seule sert, les autres prennent le relais en cas de panne", "NGINX tourne en mode veille", "Les requêtes sont mises en file"], correct: [1], explain: "Active/passive = un serveur actif + des secours." }
    ],
    exercises: [
      { type: "order", diff: "easy", title: "Le cycle du load balancing", prompt: "Remets la séquence dans l’ordre.", items: ["3 instances démarrent sur les ports 8001-8003", "NGINX définit un groupe upstream avec les 3", "Le client envoie une requête", "NGINX choisit une instance selon l’algorithme", "L’instance répond et NGINX relaie"], explain: "Démarrage → pool → requête → choix → réponse." },
      { type: "mcq", diff: "easy", title: "Choix stratégique", prompt: "Tu as besoin de 600 req/s ; chaque instance gère ~200. Combien d’instances minimum ?", options: ["1", "2", "3", "10"], answer: [2], explain: "3 × 200 = 600 ; garde une marge : 4 serait plus confortable." }
    ]
  };
  M.lessons.push(L);
})();
(function addLbL2() {
  const M = window.MODULES.find((m) => m.id === "loadbalancing");
  const L = {
    id: "lb-upstream",
    title: "upstream : le groupe de serveurs",
    excerpt: "Syntaxe du bloc upstream, poids, backup, down, max_conns, fail_timeout.",
    content: `
# upstream : le groupe de serveurs

Le bloc \`upstream\` (contexte **http**) définit un **pool de serveurs amont**. La directive \`proxy_pass\` cible alors le nom du pool au lieu d’une URL fixe.

## Syntaxe

\`\`\`nginx
http {
    upstream backend {
        server 127.0.0.1:8001;
        server 127.0.0.1:8002;
        server 127.0.0.1:8003;
    }

    server {
        listen 80;
        server_name app.local;

        location / {
            proxy_pass http://backend;
        }
    }
}
\`\`\`

## Les options d’une ligne server

\`\`\`nginx
upstream backend {
    server 127.0.0.1:8001 weight=3;
    server 127.0.0.1:8002 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8003 backup;
    server 127.0.0.1:8004 down;
}
\`\`\`

| option | rôle |
|---|---|
| \`weight=N\` | l’instance reçoit N fois plus de requêtes (défaut 1) |
| \`max_fails=N\` | après N échecs, l’instance est écartée |
| \`fail_timeout=T\` | fenêtre de comptage des échecs ET durée d’écartement (défaut 10s) |
| \`backup\` | secours : ne sert que si toutes les principales sont indisponibles |
| \`down\` | désactivée sans la retirer du fichier |
| \`max_conns=N\` | limite de connexions simultanées vers cette instance |

## Traduisons deux besoins concrets

**Répartir 3/1 entre deux machines** (la première est plus puissante) :

\`\`\`nginx
upstream backend {
    server 127.0.0.1:8001 weight=3;
    server 127.0.0.1:8002 weight=1;
}
\`\`\`

**Une machine en maintenance sans toucher au fichier** : garde la ligne avec \`down\` et commente-la plus tard.

> [!info] \`upstream\` est spécifique aux modules proxy (http/tcp). Un bloc \`upstream\` en dehors du contexte http → erreur de \`nginx -t\`.

## L’adressage

- Par IP : \`server 192.168.1.10:80;\`
- Par domaine : \`server api.intranet:443;\` (avec \`proxy_ssl_server_name on\` si le vhost amont exige le SNI)
- En local pour s’entraîner : \`127.0.0.1:8001\`, \`8002\`…
- Ports par défaut : si tu n’écris pas de port, NGINX utilise 80 (http) ;
`,
    quiz: [
      { q: "Dans quel contexte place-t-on un bloc upstream ?", options: ["location", "http (ou stream)", "server", "events"], correct: [1], explain: "upstream déclare un pool global de serveurs, au niveau http (ou stream pour TCP)." },
      { q: "Avec weight=3 et weight=1 entre deux serveurs, sur 4 requêtes round-robin pondérées, la machine weight=1 en reçoit environ…", options: ["0", "1", "2", "3"], correct: [1], explain: "Les poids se répartissent 3 pour 1 : 3/4 des requêtes vont à la première, 1/4 à la seconde." },
      { q: "Que fait backup ?", options: ["L’instance est ignorée définitivement", "L’instance ne sert que si toutes les principales sont indisponibles", "L’instance reçoit deux fois plus", "L’instance n’accepte que du HTTPS"], correct: [1], explain: "backup = secours, servi en dernier recours." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Un pool de 2 serveurs", prompt: "Déclare un groupe upstream avec deux serveurs et utilise-le dans proxy_pass.", skeleton: "http {\n    # déclare ici le groupe upstream backend avec 127.0.0.1:8001 et 127.0.0.1:8002\n\n    server {\n        listen 80;\n        server_name app.local;\n        location / {\n            proxy_pass http://backend;\n        }\n    }\n}\n", required: ["upstream", "server", "proxy_pass"], hint: "upstream backend { server 127.0.0.1:8001; server 127.0.0.1:8002; }" },
      { type: "mcq", diff: "medium", title: "Poids et secours", prompt: "upstream avec : 8001 weight=2, 8002, 8003 backup. 8001 et 8002 tombent. Que se passe-t-il ?", options: ["Le site est en panne", "8003 prend le relais", "NGINX redémarre 8001", "502 pour tout le monde jusqu’à leur retour"], answer: [1], explain: "backup ne sert que lorsque toutes les instances principales échouent : 8003 reprend le service." },
      { type: "config", diff: "medium", title: "Pool robuste", prompt: "Ajoute un poids à 8002 et un serveur de secours (backup) au pool.", skeleton: "http {\n    upstream backend {\n        server 127.0.0.1:8001;\n        # ajoute : 8002 avec un poids de 2, et 8003 en secours\n    }\n    server {\n        listen 80;\n        server_name app.local;\n        location / {\n            proxy_pass http://backend;\n        }\n    }\n}\n", required: ["upstream", "proxy_pass", "backup"], hint: "server 127.0.0.1:8002 weight=2; server 127.0.0.1:8003 backup;" }
    ]
  };
  M.lessons.push(L);
})();
(function addLbL3() {
  const M = window.MODULES.find((m) => m.id === "loadbalancing");
  const L = {
    id: "lb-algos",
    title: "Les algorithmes de répartition",
    excerpt: "round_robin, least_conn, ip_hash, hash, random : choisir selon son besoin.",
    content: `
# Les algorithmes de répartition

Sans rien préciser, NGINX fait du **round-robin** : chaque requête part vers l’instance suivante. Mais selon le besoin, on change d’algorithme.

## round_robin (défaut)

\`\`\`nginx
upstream backend {
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}
\`\`\`

Requêtes : A→8001, B→8002, C→8001, D→8002… Simple et excellent par défaut, tant que les instances sont équivalentes (penser à weight sinon).

## least_conn

\`\`\`nginx
upstream backend {
    least_conn;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}
\`\`\`

Envoie la requête à l’instance ayant le **moins de connexions actives**. Idéal quand les requêtes ont des durées très variables (certaines traînent 30s, d’autres 10ms).

## ip_hash

\`\`\`nginx
upstream backend {
    ip_hash;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}
\`\`\`

Une même IP client est **toujours** dirigée vers la même instance (hachage de l’IP). Persistance rudimentaire de session, au prix d’une répartition parfois déséquilibrée (une entreprise derrière une seule IP = tout sur la même instance).

## hash (cible personnalisée)

\`\`\`nginx
upstream backend {
    hash $request_uri consistent;
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
}
\`\`\`

On choisit la clé de hachage (ici l’URI). \`consistent\` (hachage cohérent) minimise les bascules de répartition quand on ajoute/retire une instance. Parfait pour du cache applicatif par URL.

## random

Deux tirages aléatoires parmi les instances, on garde celle qui a le moins de connexions. Utile pour éviter les pics simultanés du round-robin.

## La table de décision

| besoin | algorithme |
|---|---|
| par défaut, instances équivalentes | round_robin |
| requêtes de durées très inégales | least_conn |
| session collante par IP (simple) | ip_hash |
| cache par URL, sharding | hash $request_uri consistent |
| maximum d’aléa | random |

> [!warn] ip_hash n’est **pas** une vraie gestion de session : derrière un NAT, toute une entreprise partage la même IP. Pour une persistance fiable, utilise un cookie (sticky commercial) ou une session centralisée.
`,
    quiz: [
      { q: "Quel est l’algorithme par défaut de NGINX ?", options: ["least_conn", "round_robin", "ip_hash", "random"], correct: [1], explain: "Round-robin par défaut : rotation simple dans l’ordre." },
      { q: "Jamais de réglage, tes requêtes sont très inégales (certaines 30s). Quel algorithme choisir ?", options: ["round_robin", "least_conn", "ip_hash", "hash $request_uri"], correct: [1], explain: "least_conn envoie au serveur le moins chargé en connexions actives." },
      { q: "Tu veux qu’une même IP retombe toujours sur la même instance.", options: ["least_conn", "ip_hash", "random", "round_robin"], correct: [1], explain: "ip_hash hachit l’IP du client : persistance simple mais imparfaite." }
    ],
    exercises: [
      { type: "order", diff: "easy", title: "Round-robin", prompt: "3 instances A, B, C en round-robin. Ordonne la destination des requêtes 1 à 4.", items: ["1 → A", "2 → B", "3 → C", "4 → A"], explain: "Rotation pure : A, B, C, puis on recommence." },
      { type: "mcq", diff: "medium", title: "Le bon choix", prompt: "C’est une API de génération d’images : certaines requêtes prennent 40s, d’autres 0,1s. Tu choisis…", options: ["ip_hash", "least_conn", "hash $request_uri consistent", "round_robin"], answer: [1], explain: "least_conn évite d’empiler les longues requêtes sur la même instance." }
    ]
  };
  M.lessons.push(L);
})();
(function addLbL4() {
  const M = window.MODULES.find((m) => m.id === "loadbalancing");
  const L = {
    id: "lb-health",
    title: "Health checks : détecter l’instance malade",
    excerpt: "Checks passifs (max_fails/fail_timeout), keepalive amont, retries automatiques.",
    content: `
# Health checks : détecter l’instance malade

Un pool qui contient une instance morte ne sert à rien s’il continue de lui envoyer des requêtes. NGINX vérifie la santé de ses instances de deux façons.

## Les checks passifs (gratuits, intégrés)

NGINX ne fait pas de sondes : il **constate** les échecs des vraies requêtes.

\`\`\`nginx
upstream backend {
    server 127.0.0.1:8001 max_fails=3 fail_timeout=30s;
    server 127.0.0.1:8002 max_fails=3 fail_timeout=30s;
}
\`\`\`

- \`max_fails=N\` : nombre d’échecs (connexion refusée, timeout, 5xx) tolérés.
- \`fail_timeout=T\` : deux rôles — la **fenêtre** de comptage des échecs, et la durée pendant laquelle l’instance est écartée du pool.
- Pendant l’écartement, les requêtes vont aux autres instances ; après \`fail_timeout\`, NGINX réessaie l’instance.

> [!info] Valeurs par défaut : max_fails=1, fail_timeout=10s. Écarte-toi de max_fails=1 : un seul timeout éphémère sort l’instance du pool ; 3 est un bon compromis.

## Retry automatique

Quand une instance échoue en cours de réponse, NGINX peut **réessayer sur une autre** :

\`\`\`nginx
location / {
    proxy_pass http://backend;
    proxy_next_upstream error timeout http_500 http_502 http_503;
    proxy_next_upstream_tries 3;
}
\`\`\`

\`proxy_next_upstream\` liste les erreurs qui déclenchent un nouvel essai sur l’instance suivante. Prudence : une requête **écrite** (POST) réessayée peut être exécutée deux fois si l’échec venait après traitement — utile surtout pour le GET.

## keepalive : réutiliser les connexions amont

\`\`\`nginx
upstream backend {
    server 127.0.0.1:8001;
    server 127.0.0.1:8002;
    keepalive 32;          # connexions inactives conservées
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
\`\`\`

Sans keepalive, chaque requête ouvre une nouvelle connexion vers l’instance : coûteux. Avec \`keepalive 32\`, NGINX garde jusqu’à 32 connexions libres prêtes à l’emploi.

## Les checks actifs (NGINX Plus / modules tiers)

NGINX **open source** ne fait pas de sondes périodiques. Si tu veux vérifier un \`/healthz\` toutes les 5s, il te faut NGINX Plus (\`health_check\`) ou un module tiers. En open source, combine :

- checks passifs (les échecs écartent l’instance),
- une **sonde applicative externe** (cron, outil de monitoring) qui surveille chaque instance,
- ou un simple \`location /healthz { return 200; }\` par app pour tes outils de supervision.

## Le minimum garantit

1. \`max_fails=3 fail_timeout=30s\` sur chaque server du pool.
2. \`proxy_next_upstream\` pour les erreurs transitoires.
3. \`keepalive\` + HTTP/1.1 pour ne pas gaspiller les connexions.
4. Une sonde externe si la haute disponibilité est critique.
`,
    quiz: [
      { q: "max_fails=3 fail_timeout=30s signifie :", options: ["L’instance est née à 3h30", "Après 3 échecs dans la fenêtre de 30s, l’instance est écartée 30s du pool", "L’instance répond en 3s max", "3 instances maximum"], correct: [1], explain: "Les deux valeurs s’utilisent ensemble : comptage et écurement." },
      { q: "Que fait proxy_next_upstream error timeout ; ?", options: ["Il bloque les erreurs", "Il réessaie la requête sur une autre instance en cas d’erreur/timeout", "Il journalise les échecs", "Il envoie un mail"], correct: [1], explain: "La requête est retentée sur l’instance suivante du pool." },
      { q: "Pourquoi proxy_http_version 1.1 + un keepalive 32 ?", options: ["Pour le load balancing", "Pour réutiliser des connexions vers les instances au lieu d’en rouvrir à chaque requête", "Pour activer HTTP/2", "Obligatoire"], correct: [1], explain: "Le keepalive amont économise les poignées de main TCP à chaque requête." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Pool résilient", prompt: "Rends le pool tolérant aux pannes : comptage des échecs, temps de secours et retry sur l’instance suivante.", skeleton: "upstream backend {\n    server 127.0.0.1:8001 max_fails=1 fail_timeout=5s;\n    # rends 8002 plus tolérant : 3 échecs sur 30s\n}\n\nserver {\n    listen 80;\n    server_name app.local;\n    location / {\n        proxy_pass http://backend;\n        # ajoute : réessayer sur l’instance suivante en cas d’erreur ou timeout\n    }\n}\n", required: ["proxy_pass", "proxy_next_upstream", "fail_timeout"], hint: "server 127.0.0.1:8002 max_fails=3 fail_timeout=30s; et proxy_next_upstream error timeout;" },
      { type: "mcq", diff: "medium", title: "Comportement pendant l’écartement", prompt: "Instance A écartée pour fail_timeout. Que reçoit un client pendant ce temps ?", options: ["502 pendant toute la durée", "La requête va vers une instance saine", "NGINX réessaie A indéfiniment", "Le client attend"], answer: [1], explain: "Les requêtes sont redirigées vers les instances saines : c’est le but de l’écartement." }
    ]
  };
  M.lessons.push(L);
})();
(function addLbL5() {
  const M = window.MODULES.find((m) => m.id === "loadbalancing");
  const L = {
    id: "lb-sessions",
    title: "Les sessions à travers le pool",
    excerpt: "ip_hash, cookie sticky (Plus), session centralisée, et la vraie bonne pratique.",
    content: `
# Les sessions à travers le pool

Le load balancing répartit la charge, mais les utilisateurs ont des **sessions**. Trois écoles pour garder un utilisateur raccroché à la même instance.

## École 1 : la session collante (sticky)

L’instance choisie est **mémorisée** pour l’utilisateur, les requêtes suivantes retournent vers elle.

- \`ip_hash\` (gratuit) : même IP → même instance. Fragile : NAT, VPN, IPv6, répartition inégale.
- **Cookie sticky** (\`sticky cookie\` de NGINX Plus / cookie app-managed) : l’instance est notée dans un cookie — le choix survit aux changements d’IP.

Un exemple maison avec un cookie géré par NGINX est possible via un module tiers ; NGINX open source ne propose pas \`sticky\`.

## École 2 : la session partagée (la mieux)

L’état de session vit **hors des instances** : base de données Redis, Memcached, ou la base de l’app. Chaque instance est interchangeables. C’est la solution recommandée :

- n’importe quel algorithme marche (round_robin, least_conn),
- une instance peut tomber sans rien casser,
- mise à l’échelle horizontale sans arrière-pensée.

## École 3 : l’application stateless

Le saint graal : aucun état serveur. Le client porte tout (cookie signé, **JWT**). Les instances n’ont plus besoin de se connaître. Redis n’est même plus nécessaire pour la session (il reste utile pour les données partagées).

## Cas du POST : prudence avec les retries

\`proxy_next_upstream\` réessaie une requête sur une autre instance. Pour un **POST**, si l’échec est survenu APRÈS le traitement, le retry peut **dupliquer** l’opération (double paiement, double envoi).

\`\`\`nginx
location / {
    proxy_pass http://backend;
    proxy_next_upstream error timeout;
    proxy_next_upstream_tries 2;
    # évite de retenter les écritures à risque ? impossible de discriminer : 
    # mets plutôt une idempotence côté app (clé de requête)
}
\`\`\`

La bonne pratique : rendre les endpoints d’écriture **idempotents** (un identifiant de requête dédupliqué par l’app).

## Tableau récapitulatif

| besoin | solution |
|---|---|
| session simple, IP stable | ip_hash |
| persistance fiable par utilisateur | cookie sticky (Plus) ou cookie d’app |
| haute disponibilité stricte | sessions centralisées (Redis) ou app stateless |
| API publique sans session | round_robin / least_conn |

> [!tip] **Règle d’or** : plus ton application est **stateless**, plus ton load balancing est simple. Conçois pour l’horizontalité dès le départ.
`,
    quiz: [
      { q: "Pourquoi ip_hash est-il imparfait ?", options: ["Il est lent", "Une même IP peut cacher des centaines d’utilisateurs (NAT/VPN) et répartit mal", "Il ne marche qu’en HTTP/2", "Il ne fonctionne qu’avec une seule instance"], correct: [1], explain: "Derrière un NAT, tout le monde partage l’IP : déséquilibre garanti." },
      { q: "La solution la plus robuste pour les sessions :", options: ["ip_hash", "round_robin", "Sessions centralisées (Redis) ou app stateless", "backup"], correct: [2], explain: "L’état hors des instances rend chaque instance interchangeable." },
      { q: "Ton POST est exécuté, puis la connexion tombe. Avec proxy_next_upstream, quel risque ?", options: ["Aucun", "La requête est retentée sur une autre instance : l’opération peut être exécutée deux fois", "Les données sont perdues", "502 définitif"], correct: [1], explain: "Le retry sur écriture peut dupliquer : rends tes écritures idempotentes." }
    ],
    exercises: [
      { type: "mcq", diff: "hard", title: "Architecture de session", prompt: "3 instances + sessions en mémoire. Chez un client ? Ou plutôt : tu veux que les utilisateurs d’un VPN (une IP partagée par 500 personnes) restent connectés. La meilleure option open source :", options: ["ip_hash", "Sessions centralisées (Redis) ou stateless + JWT", "weight sur une instance", "random"], answer: [1], explain: "Avec une IP partagée, ip_hash concentrerait tout sur une instance : centralise la session ou rends l’app stateless." },
      { type: "order", diff: "medium", title: "La session centralisée", prompt: "Ordonne le chemin avec des sessions Redis.", items: ["Le client se connecte (POST /login)", "NGINX laisse l’instance A traiter", "La clé de session est stockée dans Redis", "Le client reçoit un cookie qui référence la clé", "Requête suivante : NGINX peut choisir l’instance B, qui lit la session dans Redis"], explain: "Login → traitement → stockage centralisé → cookie → n’importe quelle instance relit la session." }
    ]
  };
  M.lessons.push(L);
})();
(function addLbL6() {
  const M = window.MODULES.find((m) => m.id === "loadbalancing");
  const L = {
    id: "lb-pratique",
    title: "Mise en pratique : 3 instances derrière un pool",
    excerpt: "Installer 3 backends, configurer le pool, observer la rotation et le failover.",
    content: `
# Mise en pratique : 3 instances derrière un pool

Objectif : mettre en place un vrai équilibrage entre **3 instances locales**, observer la rotation, puis couper une instance et constater le failover.

## 1. Préparer 3 backends distincts

Le plus simple : trois dossiers avec un \`index.html\` identifiant chaque instance, servis par trois NGINX… ou un seul NGINX sur trois serveurs virtuels, ou trois serveurs Python :

\`\`\`bash
# méthode 1 : python (3 fenêtres)
mkdir -p /tmp/inst1 /tmp/inst2 /tmp/inst3
echo "INSTANCE 1" > /tmp/inst1/index.html
echo "INSTANCE 2" > /tmp/inst2/index.html
echo "INSTANCE 3" > /tmp/inst3/index.html
(cd /tmp/inst1 && python -m http.server 8001)
(cd /tmp/inst2 && python -m http.server 8002)
(cd /tmp/inst3 && python -m http.server 8003)
\`\`\`

> [!info] Sous Windows : \`cd C:\`tmp ... \` remplace \`/tmp\` par \`C:/nginx/html/inst1\` etc. ; python -m http.server fonctionne à l’identique.

## 2. La configuration du pool

\`\`\`nginx
http {
    upstream pool {
        least_conn;
        server 127.0.0.1:8001 max_fails=3 fail_timeout=30s;
        server 127.0.0.1:8002 max_fails=3 fail_timeout=30s;
        server 127.0.0.1:8003 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    server {
        listen 80;
        server_name pool.local;

        location / {
            proxy_pass http://pool;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
            proxy_set_header Host $host;
        }
    }
}
\`\`\`

## 3. Tester la rotation

\`\`\`bash
for i in $(seq 1 9); do curl -s http://pool.local/; done
\`\`\`

Avec least_conn (3 connexions simultanées… ici séquentielles), tu verras la rotation vers INSTANCE 1, 2, 3. Avec round_robin : 1,2,3,1,2,3… L’INSTANCE apparaît dans chaque réponse : preuve que le pool répartit.

## 4. Tester le failover

1. Coupe l’instance 1 (Ctrl+C sur son terminal, ou \`taskkill\` sous Windows).
2. Rejoue la boucle curl : le pool continue de répondre avec les instances 2 et 3.
3. Attends > \`fail_timeout\` et remets l’instance 1 : elle revient automatiquement dans le pool.

## 5. Observer dans les logs

\`\`\`bash
grep pool.local /var/log/nginx/access.log | tail -20
\`\`\`

Sous Windows : \`C:/nginx/logs/access.log\`. Chaque ligne montre l’upstream utilisé : \`"upstream": "127.0.0.1:8002"\` si tu actives le \`$upstream_addr\` dans ton log_format (module Logs).

## 6. Vérifications finales

- \`nginx -t\` avant tout rechargement.
- \`curl -I http://pool.local/\` → 200.
- Coupe TOUTES les instances : le pool renvoie \`502 Bad Gateway\` (et non un timeout interminable) : c’est le comportement attendu.

> [!tip] En production, une instance « lente » n’est pas détectée par les checks passifs classiques (elle répond, mais lentement) : couple least_conn à une sonde externe mesurant la latence.
`,
    quiz: [
      { q: "Ta boucle curl montre INSTANCE 1, 2, 3, 1, 2, 3... L’algorithme actif est :", options: ["ip_hash", "round_robin", "least_conn forcé", "random"], correct: [1], explain: "Rotation stricte dans l’ordre = round_robin (ou least_conn à charge égale)." },
      { q: "Après avoir coupé l’instance 1, que se passe-t-il ?", options: ["502 pendant 30s puis retour", "Le pool continue avec les instances 2 et 3", "NGINX redémarre l’instance", "Le site est indisponible"], correct: [1], explain: "L’instance est écartée après les échecs ; les autres continuent de servir." },
      { q: "Toutes les instances sont coupées. Le client reçoit :", options: ["Une attente infinie", "502 Bad Gateway rapidement", "301", "200 avec une page vide"], correct: [1], explain: "NGINX constate qu’aucun amont ne répond et renvoie 502." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Le pool de production", prompt: "Construis un pool de production résilient avec tolérance aux pannes et keepalive amont.", skeleton: "http {\n    upstream api {\n        # 3 instances 127.0.0.1:8100/8101/8102\n        # tolérance : 3 échecs sur 30s\n        # réutilise 16 connexions\n    }\n\n    server {\n        listen 80;\n        server_name api.local;\n        location / {\n            proxy_pass http://api;\n            proxy_http_version 1.1;\n            proxy_set_header Connection \"\";\n        }\n    }\n}\n", required: ["upstream", "proxy_pass", "fail_timeout", "keepalive"], hint: "Pour chaque serveur : server 127.0.0.1:8100 max_fails=3 fail_timeout=30s; puis keepalive 16; à l’intérieur du bloc upstream." },
      { type: "mcq", diff: "medium", title: "Diagnostic 502 intermittent", prompt: "Par moments, 502 sur 1 requête sur 10, le reste du temps tout va bien. Cause la plus plausible :", options: ["Une instance instable qui tombe souvent : max_fails trop bas (1) et rejoint vite le pool", "Le SSL", "Les cookies", "Le DNS"], answer: [0], explain: "Avec max_fails=1, la moindre erreur éphémère écarte l’instance une seconde : augmente max_fails et fail_timeout." }
    ]
  };
  M.lessons.push(L);
})();
(function addLbProj() {
  const M = window.MODULES.find((m) => m.id === "loadbalancing");
  M.project = {
    title: "Mini-projet du module : un pool haute disponibilité",
    goal: "Mettre en place 3 instances locales d’une même application, les répartir derrière un upstream NGINX avec tolérance de panne, et démontrer le failover.",
    objectives: [
      "Créer 3 instances locales (3 dossiers avec index.html distincts, servis sur 8001-8003 — python -m http.server ou serveurs NGINX virtuels)",
      "Définir un upstream avec les 3 serveurs (max_fails=3 fail_timeout=30s, keepalive 16) et choisir un algorithme justifié",
      "Server block : proxy_pass vers le pool + HTTP/1.1 + en-tête Host + Connection vide",
      "Valider avec nginx -t puis recharger",
      "Boucle de 9 requêtes curl : montrer la rotation entre les instances",
      "Couper une instance : la boucle continue sur les autres (capture d’écran/notes)",
      "Redémarrer l’instance : elle réintègre le pool automatiquement",
      "Bonus : écrire un court rapport justifiant le choix de l’algorithme et des valeurs de tolérance"
    ],
    answer: "Config de référence :\nhttp {\n  upstream pool {\n    least_conn;\n    server 127.0.0.1:8001 max_fails=3 fail_timeout=30s;\n    server 127.0.0.1:8002 max_fails=3 fail_timeout=30s;\n    server 127.0.0.1:8003 max_fails=3 fail_timeout=30s;\n    keepalive 16;\n  }\n  server {\n    listen 80;\n    server_name pool.local;\n    location / {\n      proxy_pass http://pool;\n      proxy_http_version 1.1;\n      proxy_set_header Connection \"\";\n      proxy_set_header Host $host;\n    }\n  }\n}\nTests : for i in $(seq 1 9); do curl -s http://pool.local/; done → les 3 instances apparaissent. Arrêt d’une instance (Ctrl+C) → les suivantes répondent encore. python -m http.server 8001 depuis le bon dossier (cd) sous Linux comme Windows."
  };
})();
