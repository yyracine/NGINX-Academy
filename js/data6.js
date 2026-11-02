/* Nginx Academy — Module 6 : 🔒 TLS / HTTPS */
(function addTlsL1() {
  const M = window.MODULES.find((m) => m.id === "tls");
  const L = {
    id: "tls-principes",
    title: "TLS : les principes en 20 minutes",
    excerpt: "Chiffrement asymétrique, certificat, autorité de certification, chaîne de confiance.",
    content: `
# TLS : les principes en 20 minutes

HTTPS = HTTP **dans un tunnel chiffré** (TLS, l’ancien SSL). Comprendre le modèle de confiance est indispensable pour configurer NGINX sans erreurs.

## 1. Deux fameuses clés

Le TLS utilise de la **cryptographie asymétrique** :

- une **clé privée** : secrète, ne quitte jamais le serveur ;
- un **certificat** : public, contient la clé publique + identité du domaine + signature de l’autorité.

\`curl -k\` = accepter n’importe quel certificat (à éviter sauf debug) ; \`-k\` = "insecure".

## 2. L’autorité de certification (CA)

Pourquoi le navigateur fait-il confiance à ton certificat ? Parce qu’il est **signé** par une autorité (Let’s Encrypt, Sectigo, DigiCert…) que le navigateur connaît déjà. Le certificat contient même la **chaîne** jusqu’à la racine :

\`\`\`
certificat du site (signé par l’intermédiaire)
   └─ certificat intermédiaire (signé par la racine)
        └─ certificat racine (dans le magasin du navigateur)
\`\`\`

## 3. Les deux rôles de NGINX

- **Serveur TLS** : présente son certificat, négocie la session (poignée de main), puis tunnel chiffré.
- **Terminaison TLS** : reverse proxy qui déchiffre pour l’app (qui reste en http interne) — vu au module proxy.

## 4. Ce que protège TLS

| attaque | ce que TLS bloque |
|---|---|
| écoute passive (sniffing) | oui — tout est chiffré |
| détournement de session | oui — le cookie ne circule plus en clair |
| DNS spoofing | non, il faut en plus vérifier le nom (et DNSSEC) |
| attaque sur l’app | non — TLS protège le transport, pas le code |

## 5. SAN et validation du nom

Le certificat liste les **noms** qu’il couvre (SAN = Subject Alternative Name) : \`exemple.fr\`, \`www.exemple.fr\`. Symptôme classique : \`ssl_certificate\` configure pour \`www.exemple.fr\` et visite de \`exemple.fr\` → erreur de nom. Il faut un certificat couvrant les deux (ou un certificat wildcard \`*.exemple.fr\`).

> [!warn] Le certificat ne dépend **pas** du port ni de l’IP : il est lié au **nom de domaine** (SNI). Un même NGINX peut servir des certificats différents par server block — c’est le **SNI** (Server Name Indication) qui permet au client d’annoncer le domaine dès la poignée de main.
`,
    quiz: [
      { q: "Quelle est la différence entre clé privée et certificat ?", options: ["Aucune", "La clé privée est secrète, le certificat est public (clé publique + identité + signature)", "Le certificat est chiffré, la clé non", "La clé est plus grande"], correct: [1], explain: "La clé privée ne quitte jamais le serveur ; le certificat est distribué et vérifié." },
      { q: "Pourquoi le navigateur accepte ton certificat signé par Let's Encrypt ?", options: ["Parce que le domaine est payant", "Parce que Let's Encrypt est dans le magasin de confiance du navigateur (via la chaîne)", "Parce que l’IP est vérifiée", "Il l’accepte toujours"], correct: [1], explain: "La chaîne remonte à une racine de confiance connue du navigateur." },
      { q: "Tu visites exemple.fr avec un certificat ne couvrant que www.exemple.fr. Qu’arrive-t-il ?", options: ["Rien", "Alerte de nom : le SAN ne correspond pas", "Le site met 2x plus de temps", "HTTP/2 se désactive"], correct: [1], explain: "Le navigateur vérifie que le nom visité est dans le SAN du certificat." }
    ],
    exercises: [
      { type: "order", diff: "easy", title: "La poignée de main TLS", prompt: "Ordonne la séquence de la poignée de main TLS 1.3 simplifiée.", items: ["Le client salue (ClientHello) et dit le domaine (SNI)", "Le serveur répond (ServerHello) + certificat", "Échanges de clés éphémères", "Le tunnel chiffré commence"], explain: "Salutation → certificat → échange de clés → tunnel." },
      { type: "mcq", diff: "medium", title: "Ports et noms", prompt: "Ton certificat couvre api.exemple.fr. Une requête https://api.exemple.fr:8443 réussit-elle, et pourquoi ?", options: ["Non, TLS refuse les ports >443", "Oui, le port n’importe pas : c’est le nom (SNI) qui compte", "Oui seulement si le port est déclaré dans le certificat", "Non, il faut un certificat par port"], answer: [1], explain: "Le certificat est lié au nom (SAN), pas au port." }
    ]
  };
  M.lessons.push(L);
})();
(function addTlsL2() {
  const M = window.MODULES.find((m) => m.id === "tls");
  const L = {
    id: "tls-obtenir",
    title: "Obtenir un certificat : Let's Encrypt ou auto-signé",
    excerpt: "certbot, renouvellement automatique, auto-signé avec openssl (Linux et Windows).",
    content: `
# Obtenir un certificat : Let’s Encrypt ou auto-signé

Deux chemins : un **certificat public gratuit** (Let’s Encrypt) pour un domaine réel, ou un **auto-signé** pour l’entraînement local.

## 1. Let’s Encrypt avec certbot (Linux, domaine réel)

\`\`\`bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d exemple.fr -d www.exemple.fr
\`\`\`

certbot modifie la config, installe le certificat (dans /etc/letsencrypt/live/exemple.fr/) et configure le renouvellement :

\`\`\`bash
sudo certbot renew --dry-run    # test du renouvellement
\`\`\`

Deux modes : \`--nginx\` (intègre TLS dans tes server blocks) ou \`--webroot\` (défi HTTP, tu gardes la main sur la config).

> [!tip] \`certbot renew\` n’est déclenché par un timer systemd que si la config du site **charge bien** : \`nginx -t\` doit passer, sinon le renouvellement échoue silencieusement.

## 2. Auto-signé (entraînement local, Linux)

\`\`\`bash
mkdir -p /etc/nginx/certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/selfsigned.key \
    -out /etc/nginx/certs/selfsigned.crt \
    -subj "/CN=localhost"
\`\`\`

Le navigateur affichera une alerte (aucune CA de confiance) : parfait pour tester la config.

## 3. Auto-signé sous Windows

\`\`\`powershell
cd C:/nginx
mkdir certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 ^
    -keyout certs/selfsigned.key ^
    -out certs/selfsigned.crt ^
    -subj "/CN=localhost"
\`\`\`

Il faut un binaire openssl (Git Bash en embarque un : \`openssl version\`).

## 4. Fichiers : qui possède quoi

| fichier | rôle | droits conseillés |
|---|---|---|
| \`exemple.fr.crt\` / \`fullchain.pem\` | certificat + chaîne | lisible par tout le monde ? non — 644 |
| \`exemple.fr.key\` (privé) | la clé secrète | **600**, owner root ou l’utilisateur nginx |
| \`dhparam.pem\` (optionnel) | sécurité DHE | 644, généré une fois |

\`\`\`bash
sudo chmod 600 /etc/letsencrypt/live/exemple.fr/privkey.pem
\`\`\`

## 5. Attention au chemin openssl

\`nginx -t\` échoue en \`cannot load certificate key\` quand :
- la clé n’est pas lisible (droits trop ouverts/fermés),
- le fichier n’est pas au bon chemin relatif,
- la clé et le certificat ne correspondent pas (regénère les deux ensemble).

> [!warn] Sous Windows, les chemins de ssl_certificate sont résolus **relatifs au dossier de NGINX** (C:/nginx) : écris donc \`ssl_certificate certs/selfsigned.crt;\` ou le chemin absolu complet.
`,
    quiz: [
      { q: "Quelle commande obtient un certificat public gratuit pour des domaines existants ?", options: ["openssl s_client", "sudo certbot --nginx -d exemple.fr", "nginx -t", "curl -k https://exemple.fr"], correct: [1], explain: "certbot valide la propriété du domaine et installe le certificat." },
      { q: "Pourquoi une alerte navigateur avec un certificat auto-signé ?", options: ["Le certificat est expiré", "Aucune autorité du magasin du navigateur ne l’a signé", "Il est trop petit", "Le domaine n’existe pas"], correct: [1], explain: "Un auto-signé n’a pas de chaîne vers une CA reconnue : le navigateur refuse par prudence." },
      { q: "Quels droits pour la clé privée ?", options: ["644", "777", "600 (lecture seule pour l’owner)", "100"], correct: [2], explain: "La clé privée doit être illisible pour les autres : 600." }
    ],
    exercises: [
      { type: "order", diff: "easy", title: "Le cycle certbot", prompt: "Ordonne les étapes.", items: ["certbot demande un certificat à Let's Encrypt", "Let's Encrypt valide la propriété du domaine", "Le certificat est installé et NGINX rechargé", "90 jours plus tard, certbot renew génère un nouveau certificat"], explain: "Demande → validation → installation → renouvellement." },
      { type: "mcq", diff: "medium", title: "Erreur classique", prompt: "nginx -t : cannot load certificate key. Cause la plus fréquente ?", options: ["Le certificat est expiré", "Droits/chemin de la clé, ou clé et certificat incohérents", "Le port 443 est occupé", "Le DNS"], answer: [1], explain: "Vérifie les droits (600), le chemin, et que clé+certificat ont été générés ensemble." }
    ]
  };
  M.lessons.push(L);
})();
(function addTlsL3() {
  const M = window.MODULES.find((m) => m.id === "tls");
  const L = {
    id: "tls-config",
    title: "Configurer un serveur HTTPS",
    excerpt: "listen 443 ssl, ssl_certificate, ssl_certificate_key, SNI multi-certificats.",
    content: `
# Configurer un serveur HTTPS

## Le minimum vital

\`\`\`nginx
server {
    listen 443 ssl;
    server_name exemple.fr;

    ssl_certificate     /etc/letsencrypt/live/exemple.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/exemple.fr/privkey.pem;

    root /srv/site;
}
\`\`\`

Trois lignes suffisent : le port avec \`ssl\`, le certificat, la clé.

## Le port doit être là où l’on t’écoute

- \`listen 443 ssl;\` : NGINX parle TLS sur 443.
- \`listen 80;\` : http. Pour un vhost, on écrit **deux server blocks** : un qui écoute 80 (redirection) et un qui écoute 443 (contenu) — ou un seul server qui écoute les deux avec \`ssl\` conditionnel (à éviter : perte de sécurité).

> [!warn] Oublier \`ssl\` dans \`listen 443\` → NGINX écoute en clair sur 443 : le navigateur affiche une erreur de protocole. \`nginx -t\` ne le détecte pas toujours ! Vérifie avec \`curl -v https://…\`.

## Plusieurs certificats : le SNI en action

\`\`\`nginx
server {
    listen 443 ssl;
    server_name exemple.fr;
    ssl_certificate     /etc/nginx/certs/exemple.crt;
    ssl_certificate_key /etc/nginx/certs/exemple.key;
}

server {
    listen 443 ssl;
    server_name blog.exemple.fr;
    ssl_certificate     /etc/nginx/certs/blog.crt;
    ssl_certificate_key /etc/nginx/certs/blog.key;
}
\`\`\`

Chaque server block présente **son** certificat selon le domaine annoncé par le client (SNI). Les anciens clients sans SNI reçoivent le certificat du **premier** server block déclaré.

## http2 (optionnel mais recommandé)

\`\`\`nginx
listen 443 ssl http2;
\`\`\`

HTTP/2 multiplexe les requêtes sur une seule connexion : pages plus rapides. (NGINX moderne : \`http2 on;\` dans le bloc server.)

## Config commune du TLS (niveau http pour tout le monde)

\`\`\`nginx
http {
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ...
}
\`\`\`

Mise en cache des sessions TLS : évite de refaire la poignée de main à chaque connexion.

## Vérifier sa config

\`\`\`bash
nginx -t                                  # syntaxe
curl -v https://exemple.fr/ > /dev/null   # négociation + certificat
openssl s_client -connect exemple.fr:443 -servername exemple.fr \
    < /dev/null 2>/dev/null | grep "subject=\|issuer="   # détail du cert
\`\`\`

Sous Windows, le même curl fonctionne ; openssl s_client aussi (binaire Git Bash).
`,
    quiz: [
      { q: "Que fait listen 443 ssl; ?", options: ["Ouvre un serveur TLS sur 443", "Redirige 443 vers 80", "Déclare un certificat", "Active HTTP/2"], correct: [0], explain: "Le mot-clé ssl active le chiffrement sur ce port." },
      { q: "Comment NGINX choisit-il le certificat quand plusieurs vhosts partagent 443 ?", options: ["Par l’IP du client", "Par le domaine annoncé (SNI)", "Par le port", "Par la date"], correct: [1], explain: "Le SNI du ClientHello sélectionne le server block." },
      { q: "sans http2, quel défaut ?", options: ["HTTPS ne marche pas", "1 seule requête à la fois par connexion TCP (mux absent)", "Le certificat est ignoré", "Les cookies ne passent pas"], correct: [1], explain: "HTTP/2 multiplexe ; sans lui, le parallélisme dépend des connexions multiples." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Le vhost HTTPS minimum", prompt: "Écris un vhost HTTPS minimal : écoute 443 en ssl avec certificat et clé.", skeleton: "server {\n    # écoute HTTPS sur 443 avec certificats /etc/nginx/certs/site.crt et site.key\n    server_name site.local;\n    root /srv/site;\n}\n", required: ["listen", "ssl_certificate", "ssl_certificate_key"], hint: "listen 443 ssl; ssl_certificate /etc/nginx/certs/site.crt; ssl_certificate_key /etc/nginx/certs/site.key;" },
      { type: "mcq", diff: "medium", title: "Diagnostic protocole", prompt: "curl -v https://site.local affiche : « connected to port 443 » puis « wrong version number ». Cause probable :", options: ["Le port 443 est servi en clair (listen 443 sans ssl)", "Le certificat est expiré", "Le DNS", "HTTP/2 désactivé"], answer: [0], explain: "Le serveur parle HTTP en clair sur 443 : le client TLS ne reconnaît pas le protocole." },
      { type: "config", diff: "medium", title: "Deux domaines, deux certificats", prompt: "Ajoute un second vhost HTTPS avec son propre certificat (blog.exemple.fr).", skeleton: "server {\n    listen 443 ssl;\n    server_name exemple.fr;\n    ssl_certificate /etc/nginx/certs/exemple.crt;\n    ssl_certificate_key /etc/nginx/certs/exemple.key;\n}\n\n# ajoute un second server block : blog.exemple.fr avec /etc/nginx/certs/blog.crt/.key\n", required: ["listen", "ssl_certificate", "ssl_certificate_key"], hint: "Duplique le bloc avec server_name blog.exemple.fr et les fichiers blog.*" }
    ]
  };
  M.lessons.push(L);
})();
(function addTlsL4() {
  const M = window.MODULES.find((m) => m.id === "tls");
  const L = {
    id: "tls-redirect",
    title: "Rediriger HTTP vers HTTPS",
    excerpt: "return 301, le vhost 80 qui ne sert qu’à rediriger, HSTS et préchargement.",
    content: `
# Rediriger HTTP vers HTTPS

Un site en HTTPS doit **refuser le clair**. La méthode reine : un server block sur 80 qui ne fait qu’une seule chose — rediriger.

## Le vhost de redirection

\`\`\`nginx
server {
    listen 80;
    server_name exemple.fr www.exemple.fr;
    return 301 https://$host$request_uri;
}
\`\`\`

- \`$host\` : conserve le domaine demandé.
- \`$request_uri\` : conserve le chemin ET la query string.
- \`301\` : permanent — le navigateur et les moteurs mémorisent la nouvelle URL.

## 301, 302, 308… quel statut ?

| statut | sémantique | usage |
|---|---|---|
| 301 | Permanent (GET/POST → GET) | redirection de domaine, migration http→https |
| 302 | Temporaire (GET/POST → GET) | maintenance, promos |
| 307 | Temporaire, **méthode préservée** | AH : conserve POST |
| 308 | Permanent, **méthode préservée** | migration en conservant POST |

Pour http→https, 301 est le standard.

## Cas particuliers

- **Sous-domaine non HTTPS récent** : garde le 301 dans le vhost 80 et un vhost 443 unique.
- **Quelques URLs à ne pas rediriger** (ex. \`/.well-known/acme-challenge/\` certbot webroot) : place une location avant le return.

\`\`\`nginx
server {
    listen 80;
    server_name exemple.fr;

    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}
\`\`\`

## HSTS : interdire le clair à long terme

\`\`\`nginx
server {
    listen 443 ssl;
    server_name exemple.fr;
    ...
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
}
\`\`\`

Après cette réponse, le navigateur **n’acceptera plus jamais** ton site en http, même pour y revenir plus tard. \`max-age\` en secondes (2 ans = 63 072 000). \`preload\` en plus, et le domaine peut être soumis à la liste de préchargement.

> [!warn] **HSTS est un contrat sérieux** : une fois HSTS actif, le http devient inopérant POUR LES VISITEURS AYANT VU la réponse HSTS — même côté admin. Teste ton HTTPS à fond avant d’activer un max-age long.

## Le piège du double HTTPS

\`return 301 https://$host$request_uri;\` dans un vhost qui écoute déjà 443 → boucle infinie de redirections (301 → 301 → 301…). La redirection 301 vit **exclusivement** dans un bloc écoutant 80 (ou en vérifiant \`$scheme\`).

## Vérifier

\`\`\`bash
curl -I http://exemple.fr/     # → 301 Location: https://exemple.fr/
curl -I https://exemple.fr/    # → 200 (ou 404), avec Strict-Transport-Security
curl -sk https://exemple.fr/ | grep -i strict
\`\`\`
`,
    quiz: [
      { q: "Quel statut pour la redirection permanente http → https ?", options: ["302", "301", "307", "200"], correct: [1], explain: "301 = permanent ; le client mémorise la nouvelle URL." },
      { q: "À quoi sert HSTS ?", options: ["À chiffrer plus fort", "À dire au navigateur : ne reviens jamais en http sur ce domaine (pendant max-age)", "À compresser les pages", "À bloquer les bots"], correct: [1], explain: "HSTS force https pour les visites futurs, sans même tester http." },
      { q: "Pourquoi ne pas mettre return 301 https:// dans un vhost écoutant déjà 443 ?", options: ["C’est plus lent", "Boucle infinie de redirections", "Le SSL le refuse", "Rien, c’est la bonne pratique"], correct: [1], explain: "Un vhost 443 recevrait des requêtes https : les rediriger vers https = boucle." }
    ],
    exercises: [
      { type: "config", diff: "easy", title: "Le vhost redirection", prompt: "Écris le vhost port 80 qui redirige tout vers https en conservant le chemin.", skeleton: "server {\n    listen 80;\n    server_name exemple.fr;\n    # redirige tout vers https en conservant le chemin\n}\n", required: ["listen", "return"], hint: "return 301 https://$host$request_uri;" },
      { type: "mcq", diff: "hard", title: "Choix de statut", prompt: "Une migration qui doit préserver les formulaires POST en cours :", options: ["301", "308", "302", "303"], answer: [1], explain: "308 est permanent et préserve la méthode. 301 basculerait un POST en GET." }
    ]
  };
  M.lessons.push(L);
})();
(function addTlsL5() {
  const M = window.MODULES.find((m) => m.id === "tls");
  const L = {
    id: "tls-securite",
    title: "TLS durci : protocoles, chiffrements, OCSP",
    excerpt: "TLS 1.2/1.3, ciphers, PFS, cache de session, OCSP stapling, audit.",
    content: `
# TLS durci : protocoles, chiffrements, OCSP

Un certificat n’est qu’une carte d’identité : la qualité de la serrure (protocoles et chiffrements) fait le reste.

## Les protocoles autorisés

\`\`\`nginx
ssl_protocols TLSv1.2 TLSv1.3;
\`\`\`

- **TLS 1.3** (2018) : poignée de main plus courte, moderne.
- **TLS 1.2** : toujours accepté pour les clients anciens.
- **TLS 1.1 et moins (SSLv3 !)** : **interdits** — vulnérabilités historiques (POODLE, BEAST…).

NGINX moderne n’accepte de toute façon que TLS 1.2/1.3 par défaut ; les écrire explicitement documente l’intention.

## La confidentialité persistante (PFS)

\`\`\`nginx
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers on;
\`\`\`

PFS (Perfect Forward Secrecy) : chaque session utilise une clé **éphémère** ; compromettre la clé privée ne permet pas de déchiffrer les sessions passées. Toute la liste commence par \`ECDHE\` (échange Diffie-Hellman éphémère).

## Cache et timers de session

\`\`\`nginx
ssl_session_cache   shared:SSL:10m;    # 10 Mo partagés entre workers
ssl_session_timeout 1d;               # 1 jour de réutilisation
\`\`\`

Une session TLS réutilisée = pas de nouvelle poignée de main = plus rapide pour les visiteurs qui reviennent.

## OCSP stapling : prouver la validité sans ralentir

\`\`\`nginx
ssl_stapling on;
ssl_stapling_verify on;
resolver 1.1.1.1 8.8.8.8 valid=300s;
\`\`\`

Au lieu de laisser le navigateur interroger l’autorité (lent, intrusif), NGINX **agrafe** la réponse de vérification au certificat. Nécessite le certificat de la CA (\`ssl_trusted_certificate\`).

## La suite complète (bonne base)

\`\`\`nginx
http {
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;
}
\`\`\`

## Auditer sa configuration

- \`openssl s_client -connect exemple.fr:443 -tls1_2\` (et \`-tls1_3\`) : vérifier la négociation.
- **SSL Labs** (ssllabs.com/ssltest) : notation A+ à viser.
- \`curl --tlsv1.1 https://exemple.fr/\` : DOIT échouer si TLS 1.1 est bien interdit.

> [!warn] Les vieux clients (IE < 11, Android < 5) ne parlent pas TLS 1.2/1.3 : interdire TLS 1.1 peut les exclure. En 2024+, l’écrasante majorité du trafic est TLS 1.2/1.3 — c’est un choix assumé.
`,
    quiz: [
      { q: "Quels protocoles TLS autorise-t-on ?", options: ["SSLv3 et TLS 1.0", "TLSv1.2 TLSv1.3", "TLS 1.3 uniquement", "Tout"], correct: [1], explain: "On refuse SSLv3/1.0/1.1 et on autorise 1.2 + 1.3." },
      { q: "Que garantit PFS (ECDHE) ?", options: ["Un chiffrement plus lent", "Que compromettre la clé privée ne déchiffre pas les sessions passées", "Que le certificat est plus long", "HTTP/2 obligatoire"], correct: [1], explain: "Clés éphémères à chaque session : sécurité prospective." },
      { q: "Le OCSP stapling sert à :", options: ["Générer des certificats", "Agrafer la vérification de validité du certificat à la réponse, sans que le navigateur contacte l’autorité", "Chiffrer les logs", "Ralentir les attaques"], correct: [1], explain: "Validité confirmée par NGINX lui-même, plus rapide et plus privé." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Le TLS durci", prompt: "Durcis TLS : protocoles 1.2/1.3, cache de session partagé et OCSP stapling.", skeleton: "http {\n    # a. autorise seulement TLS 1.2 et 1.3\n    # b. ajoute un cache de session partagé SSL:10m\n    # c. active l’OCSP stapling (resolver 1.1.1.1 8.8.8.8)\n}\n", required: ["ssl_protocols", "ssl_session_cache", "ssl_stapling"], hint: "ssl_protocols TLSv1.2 TLSv1.3; ssl_session_cache shared:SSL:10m; ssl_stapling on; ssl_stapling_verify on; resolver 1.1.1.1 8.8.8.8;" },
      { type: "mcq", diff: "hard", title: "Échec de négociation", prompt: "Un client Android 4 ne peut plus se connecter à ton site. Cause la plus probable :", options: ["Le certificat a expiré", "Il ne parle que TLS 1.0/1.1, désormais interdits", "Le DNS", "Le port"], answer: [1], explain: "TLS < 1.2 exclut de très vieux navigateurs : compromis de sécurité assumé." }
    ]
  };
  M.lessons.push(L);
})();
(function addTlsL6() {
  const M = window.MODULES.find((m) => m.id === "tls");
  const L = {
    id: "tls-pratique",
    title: "Mise en pratique : un site 100 % HTTPS",
    excerpt: "Certificat auto-signé, redirection 80→443, HSTS, audit du résultat.",
    content: `
# Mise en pratique : un site 100 % HTTPS

Objectif : rendre un site **entièrement HTTPS** localement — certificat auto-signé, redirection claire, HSTS, contrôle complet. Tout est transposable à un domaine réel avec certbot.

## 1. Générer le certificat auto-signé

\`\`\`bash
mkdir -p /etc/nginx/certs
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/monsite.key \
    -out /etc/nginx/certs/monsite.crt \
    -subj "/CN=monsite.local"
\`\`\`

Windows : même commande, chemins C:/nginx/certs/… (dossier à créer), openssl fourni par Git Bash.

## 2. La configuration

\`\`\`nginx
http {
    ssl_session_cache shared:SSL:10m;
    ssl_protocols TLSv1.2 TLSv1.3;

    server {
        listen 80;
        server_name monsite.local;
        return 301 https://$host$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name monsite.local;

        ssl_certificate     /etc/nginx/certs/monsite.crt;
        ssl_certificate_key /etc/nginx/certs/monsite.key;

        add_header Strict-Transport-Security "max-age=31536000" always;

        root /srv/monsite;
        index index.html;
    }
}
\`\`\`

> [!info] point d’attention : monsite.local doit pointer vers 127.0.0.1 dans le fichier hosts (Linux : /etc/hosts ; Windows : C:/Windows/System32/drivers/etc/hosts en mode administrateur), sinon le navigateur ignore le nom.

## 3. Tester

\`\`\`bash
nginx -t && sudo nginx -s reload

curl -I http://monsite.local/                 # 301 Location: https://monsite.local/
curl -v  https://monsite.local/ 2>&1 | grep -i "subject:\|issuer:\|stric"
openssl s_client -connect monsite.local:443 -servername monsite.local \
    < /dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
\`\`\`

Attendu : 301 propre, certificat \`CN=monsite.local\`, HSTS présent, dates valides.

## 4. Le navigateur se méfie (normal)

Alerte « certificat non reconnu » : c’est le comportement attendu pour un auto-signé. Contournement local possible : ajouter \`monsite.crt\` au magasin de confiance **de la machine** (fichier .crt → Installer un certificat → Autorités de certification racines de confiance) — réservé à l’entraînement local, jamais pour du public.

## 5. Aller plus loin (domaine réel)

1. \`certbot --nginx -d monsite.reel.fr\` remplace l’auto-signé par un certificat valide.
2. Supprime \`====> A AMÉLIORER\` : rien, ta config est propre.
3. Pense au renouvellement : \`certbot renew --dry-run\`.
4. Passe le test SSL Labs : note A visée.

> [!tip] **Routine pro** : avant de couper http, vérifie l’absence de ressources mixtes (une page https appelant une image http = contenu mixte bloqué). Version courte : \`curl -sk https://monsite.local/ | grep http://\` doit ne rien renvoyer.
`,
    quiz: [
      { q: "Comment pointer monsite.local vers sa propre machine ?", options: ["Dans le certificat", "Dans le fichier hosts (127.0.0.1 monsite.local)", "Dans nginx.conf uniquement", "Impossible"], correct: [1], explain: "La résolution locale passe par /etc/hosts ou C:/Windows/System32/drivers/etc/hosts." },
      { q: "Que montre curl -I http://monsite.local/ si la redirection est propre ?", options: ["200 OK", "301 avec Location: https://monsite.local/", "404", "502"], correct: [1], explain: "Le vhost 80 ne fait que rediriger vers le vhost 443." },
      { q: "Pourquoi l’alerte navigateur sur un certificat auto-signé est-elle normale ici ?", options: ["Erreur de config", "Aucune autorité de confiance n’a signé le certificat", "Le domaine est en .local", "Le port est faux"], correct: [1], explain: "C’est attendu : l’auto-signé n’a pas de chaîne vers une CA reconnue." }
    ],
    exercises: [
      { type: "config", diff: "hard", title: "Le site 100 % HTTPS", prompt: "Assemble le site 100 % HTTPS : redirection 80→443 et vhost SSL avec HSTS.", skeleton: "server {\n    listen 80;\n    server_name monsite.local;\n    # redirige tout vers https\n}\n\nserver {\n    # vhost https : 443 ssl http2, certificats /etc/nginx/certs/monsite.*\n    server_name monsite.local;\n    root /srv/monsite;\n    index index.html;\n}\n", required: ["listen", "ssl_certificate", "ssl_certificate_key", "return"], hint: "Vhost 80 : return 301 https://$host$request_uri; — Vhost 443 : listen 443 ssl http2; + les deux lignes ssl_certificate*." },
      { type: "order", diff: "medium", title: "La bascule vers HTTPS", prompt: "Ordonne le déploiement propre.", items: ["Générer un certificat (auto-signé ou Let's Encrypt)", "Configurer le vhost 443 avec certificat + HSTS", "Rediriger le vhost 80 avec return 301", "nginx -t puis reload", "Vérifier avec curl -I et openssl s_client"], explain: "Certificat → HTTPS → clair → validation → vérif." }
    ]
  };
  M.lessons.push(L);
})();
(function addTlsProj() {
  const M = window.MODULES.find((m) => m.id === "tls");
  M.project = {
    title: "Mini-projet du module : passer un site en HTTPS complet",
    goal: "Rendre un site local entièrement HTTPS : certificat, redirection http→https, HSTS, vérifications. (Transposable à un domaine réel avec certbot.)",
    objectives: [
      "Générer un certificat auto-signé (openssl) dans un dossier certs (Linux : /etc/nginx/certs ; Windows : C:/nginx/certs)",
      "Vhost 443 ssl http2 avec ssl_certificate/ssl_certificate_key, TLS 1.2/1.3, cache session partagé",
      "Vhost 80 ne contenant que la redirection return 301 https://$host$request_uri",
      "En-tête Strict-Transport-Security présent (max-age ≥ 31 536 000)",
      "nginx -t puis reload, sans erreur",
      "Démonstrations : curl -I http://… → 301 ; curl -v https://… → certificat + HSTS ; openssl s_client confirme subject/issuer",
      "Bonus : refaire le scénario sur un domaine réel avec certbot (ou documenter les étapes)"
    ],
    answer: "Config de référence :\nhttp {\n  ssl_session_cache shared:SSL:10m;\n  ssl_protocols TLSv1.2 TLSv1.3;\n  server {\n    listen 80;\n    server_name monsite.local;\n    return 301 https://$host$request_uri;\n  }\n  server {\n    listen 443 ssl http2;\n    server_name monsite.local;\n    ssl_certificate /etc/nginx/certs/monsite.crt;\n    ssl_certificate_key /etc/nginx/certs/monsite.key;\n    add_header Strict-Transport-Security \"max-age=31536000\" always;\n    root /srv/monsite;\n    index index.html;\n  }\n}\nGénération : openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/certs/monsite.key -out /etc/nginx/certs/monsite.crt -subj \"/CN=monsite.local\"\nhosts : 127.0.0.1 monsite.local (Linux /etc/hosts, Windows C:/Windows/System32/drivers/etc/hosts admin)\nVérifs : curl -I http://monsite.local/ → 301 https ; curl -sk https://monsite.local/ | grep -i strict → présent."
  };
})();
