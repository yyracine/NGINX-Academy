# Kit de correction — Projets d’évaluation Nginx Academy

Barèmes détaillés pour la correction/auto-évaluation des 3 projets. Chaque critère est décomposé en 4 niveaux (0 à 3).

---

## Projet 1 — Premier serveur, premier site — Facile → Intermédiaire

_Déployer un serveur NGINX qui sert un site vitrine statique propre : virtual host dédié, erreurs personnalisées, cache navigateur._

Total : 50 points répartis sur 6 critères.

### Grille détaillée

**Installation et démarrage corrects** (5 pts)

- [0] 0 — NGINX non installé ou ne démarre pas ; aucune commande montrée.
- [1] 1 — Installé mais démarrage/version non vérifiés (nginx -v, service status absents).
- [2] 2 — Installé, service actif, nginx -v + reload démontrés.
- [3] 3 — 2 + les fichiers d'/var/www/vitrine sont créés et le plan du rapport est posé.

**Virtual host fonctionnel : vitrine.local sert le bon contenu** (10 pts)

- [0] 0 — Aucun server block, ou le site ne répond pas.
- [1] 1 — Un block répond mais sans server_name dédié (IP par défaut).
- [2] 2 — server_name vitrine.local + root + index corrects, testé par curl -H "Host: vitrine.local".
- [3] 3 — 2 + test négatif (un autre Host ne reçoit pas le site) et journée nginx -t avant reload.

**Erreurs personnalisées + internal corrects** (10 pts)

- [0] 0 — error_page absent.
- [1] 1 — error_page présent mais sans location internal (page servie directement).
- [2] 2 — 404.html et 50x.html avec locations internal ; curl /404.html hors-contexte répond 404.
- [3] 3 — 2 + le code d'état reste 404/50x (vérifié par curl -I) et la page est jolie.

**Politique de cache cohérente, vérifiée par curl** (10 pts)

- [0] 0 — Aucun en-tête de cache.
- [1] 1 — expires utilisé sans distinction assets/HTML.
- [2] 2 — assets (nommés/hachés) expires 1y + immutable ; HTML no-cache ; vérifié par curl -I.
- [3] 3 — 2 + justification écrite du choix (pourquoi les hash) et 304 testé.

**alias /medias/ fonctionnel** (5 pts)

- [0] 0 — alias absent.
- [1] 1 — alias présent mais path erroné ou 404.
- [2] 2 — alias fonctionnel : /medias/img.jpg sert le bon fichier hors root.
- [3] 3 — 2 + différence alias vs root expliquée dans le rapport.

**Rapport : commandes, config finale, tests** (10 pts)

- [0] 0 — Pas de rapport.
- [1] 1 — Rapport minimal, sans preuves (sorties curl).
- [2] 2 — Commandes + sorties + config finale commentée.
- [3] 3 — 2 + interprétation (que montrent les en-têtes, que révèlent les logs), difficultés rencontrées et solutions.

### Démarche recommandée

1. Installer NGINX (apt install nginx / Zip Windows) et vérifier nginx -v.
2. Créer l'arborescence /var/www/vitrine (index.html, styles.css, assets/).
3. Écrire le server block (listen 80 ; server_name vitrine.local ; root ; index).
4. Ajouter error_page 404/50x + locations internal + pages HTML.
5. Ajouter la politique de cache (assets 1y immutable, HTML no-cache).
6. Ajouter location /medias/ { alias chemin-hors-root; }.
7. nginx -t → reload → batterie curl -I (headers 200/404/alias).
8. Rédiger le rapport avec les sorties.

### Commandes de vérification

```bash
nginx -v && sudo nginx -t
curl -I -H "Host: vitrine.local" http://127.0.0.1/
curl -I -H "Host: vitrine.local" http://127.0.0.1/page-inexistante  (→ 404 + HTML perso)
curl -I -H "Host: vitrine.local" http://127.0.0.1/assets/app.css  (→ immutable)
curl -I -H "Host: vitrine.local" http://127.0.0.1/medias/photo.jpg  (→ 200, fichier hors root)
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/404.html  (→ 404, internal)
```

### Erreurs fréquentes et pénalités

- **server_name oublié : tous les hôtes reçoivent le site (et l'IP directe aussi). Mettre default_server ailleurs ou server_name explicite.** — Pénalité : -5 à -10 sur le critère vhost
- **error_page sans internal : la page d'erreur est téléchargeable hors contexte.** — -5 sur erreurs
- **expires 1y partout y compris HTML : une mise à jour du site est invisible.** — -5 sur cache
- **reload sans nginx -t : une config cassée met le serveur à terre.** — Rapport : professionnalisme
- **alias avec chemin relatif à root au lieu d'un chemin absolu → 404.** — -5 sur alias

---

## Projet 2 — SPA + reverse proxy + hôte partagé — Intermédiaire → Avancé

_Architecture type production : SPA servie statiquement, API Node derrière reverse proxy, deux domaines sur la même IP._

Total : 50 points répartis sur 5 critères.

### Grille détaillée

**SPA + try_files corrects** (10 pts)

- [0] 0 — Pas de SPA servie.
- [1] 1 — try_files absent : les routes internes (ex. /profil) renvoient 404.
- [2] 2 — location / { try_files $uri $uri/ /index.html; } : toutes les routes retombent sur index.html.
- [3] 3 — 2 + assets versionnés, test des routes profondes (curl sur une route), no-cache sur index.html.

**Reverse proxy /api/* fonctionnel + headers vérifiés** (15 pts)

- [0] 0 — Pas de proxy.
- [1] 1 — proxy_pass présent mais sans headers ni vérification.
- [2] 2 — /api/* → backend, Host/X-Real-IP/X-Forwarded-For transmis et vérifiés CÔTÉ BACKEND (log ou endpoint echo).
- [3] 3 — 2 + X-Forwarded-Proto géré, test de l'URI (slashes), 502 simulé et compris.

**Deux vhosts distincts + default_server** (10 pts)

- [0] 0 — Un seul vhost.
- [1] 1 — Deux vhosts mais sans default_server explicite.
- [2] 2 — Deux vhosts + l'un porte default_server ; chaque domaine sert sa racine.
- [3] 3 — 2 + le default_server renvoie 444 pour les domaines inconnus, tests Host négatifs.

**client_max_body_size scoped sur l'API** (5 pts)

- [0] 0 — Absent (et non testé).
- [1] 1 — Présent au niveau server (applique trop large).
- [2] 2 — Dans location /api/ uniquement (2m) et testé avec un upload > 2 Mo → 413.
- [3] 3 — 2 + justifié et test complémentaire : upload < 2 Mo passe.

**Rapport avec config complète et tests** (10 pts)

- [0] 0 — Sans rapport.
- [1] 1 — Config collée sans explications.
- [2] 2 — Config commentée + sorties curl des 3 voies (SPA, API, vhosts).
- [3] 3 — 2 + scénario de panne (backend coupé → 502 expliqué), choix d'architecture justifiés.

### Démarche recommandée

1. Créer les deux racines (dist/ de la SPA, site du second domaine) et l'API locale (port 3000).
2. Vhost principal : SPA + location /api/ proxy_pass + proxy_http_version 1.1.
3. Transmettre les en-têtes (Host, X-Real-IP, X-Forwarded-For) et les vérifier côté backend.
4. Second vhost avec sa racine (pas de /api/).
5. Choisir le default_server ; tester l'IP directe et les domaines inconnus.
6. Scoper client_max_body_size sur /api/ et tester l'upload 413.
7. nginx -t → reload → batterie curl ; rapport.

### Commandes de vérification

```bash
curl -I -H "Host: spa.local" http://127.0.0.1/profil/  (→ 200 index.html)
curl -H "Host: spa.local" http://127.0.0.1/api/health  (→ JSON + X-Forwarded-For côté app)
curl -s -o /dev/null -w "%{http_code}" -H "Host: api-echo.local" http://127.0.0.1/  → comparer
curl -I http://127.0.0.1/  (→ 444 ou le default_server choisi)
curl -s -o /dev/null -w "%{http_code}" --data-binary @2Mo.jpg -H "Host: spa.local" http://127.0.0.1/api/upload  (→ 413)
```

### Erreurs fréquentes et pénalités

- **proxy_pass avec chemin : /api/ transmis incomplet côté app (affaire des slashs). Vérifier par log backend.** — -5 à -10 sur le proxy
- **Headers non vérifiés : l'app croit que tout vient de 127.0.0.1.** — -5 sur proxy
- **try_files oublié : les routes SPA cassent après F5.** — -10 sur SPA
- **client_max_body_size global : limite inutilement la SPA ou n'est jamais atteinte.** — -3
- **Deux vhosts sans default_server : le premier vhost prend les domaines inconnus.** — -5
- **Ne pas tester le cas backend coupé (502) : la robustesse reste théorique.** — Rapport

---

## Projet 3 — Site public complet : HTTPS + cache + sécurité — Avancé

_Challenge final : site public (ou local simulé) avec HTTPS, redirection 80→443, cache agressif et règles de sécurité._

Total : 55 points répartis sur 5 critères.

### Grille détaillée

**HTTPS opérationnel + redirection 80→443** (15 pts)

- [0] 0 — Pas de HTTPS ni redirection.
- [1] 1 — listen 443 ssl mais redirection 80→443 absente ou incomplète.
- [2] 2 — Deux blocs : 80 { return 301 https://$host$request_uri; } et 443 ssl ; curl -I http:// → 301 https.
- [3] 3 — 2 + test sans boucle (aucun 301 en cascade), client TLS vérifié (curl -v https), domaine inconnu → 444.

**Config TLS correcte (certs, protocoles, HSTS)** (10 pts)

- [0] 0 — Certificat non référencé ou clé introuvable.
- [1] 1 — ssl_certificate/key présents mais TLS 1.0/1.1 encore actifs, pas de HSTS.
- [2] 2 — TLSv1.2 TLSv1.3, HSTS (max-age ≥ 1 an) with always, cert auto-signé accepté en local.
- [3] 3 — 2 + ssl_session_cache partagé, vérification openssl s_client, explication du choix HSTS.

**Politique de cache et compression vérifiées** (10 pts)

- [0] 0 — Rien de tout cela.
- [1] 1 — gzip ou cache seul.
- [2] 2 — gzip (text/*), assets hashés 1y immutable, HTML no-cache : vérifiés par curl -I (Content-Encoding gzip + Cache-Control).
- [3] 3 — 2 + mesure simple du gain (taille avant/après gzip), cas des images non compressées justifié.

**Sécurité : fichiers sensibles bloqués, server_tokens off** (10 pts)

- [0] 0 — Rien.
- [1] 1 — server_tokens off OU deny sur les fichiers cachés seul.
- [2] 2 — server_tokens off global + location ~ /\. { deny all; } : curl /.git/config → 403.
- [3] 3 — 2 + une défense en plus (Basic Auth sur un /admin/, rate limit, en-têtes X-Frame/nosniff) testée.

**Rapport d'audit détaillé** (10 pts)

- [0] 0 — Absent.
- [1] 1 — Liste de commandes sans résultats.
- [2] 2 — Sorties curl -I complètes + log d'audit + config finale commentée.
- [3] 3 — 2 + décisions documentées (pourquoi TLS 1.2/1.3, pourquoi immutable), limites connues, suite possible (certbot réel).

### Démarche recommandée

1. Générer un certificat auto-signé (openssl) ou Let's Encrypt, le placer dans certs/.
2. Écrire le bloc 80 (redirection 301) et le bloc 443 ssl (certs, TLS 1.2/1.3, HSTS).
3. Activer gzip (types text/*) et vérifier le Content-Encoding.
4. Politique de cache : assets hashés 1y + immutable ; HTML no-cache.
5. Sécurité : server_tokens off ; deny des fichiers cachés ; option bonus.
6. nginx -t → reload → audit complet (curl -I, openssl s_client, serveurs de test).
7. Rédiger le rapport d'audit avec preuves.

### Commandes de vérification

```bash
curl -I http://127.0.0.1/  (→ 301 Location: https://…)
curl -sk -I https://127.0.0.1/  (→ 200 + Strict-Transport-Security)
openssl s_client -connect 127.0.0.1:443 -servername localhost -tls1_2 < /dev/null | grep -i "subject=\|Verify"
curl -sk -o /dev/null -w "%{http_code}" https://127.0.0.1/.git/config  (→ 403)
curl -sk -H "Accept-Encoding: gzip" -I https://127.0.0.1/assets/app.css  (→ Content-Encoding: gzip)
curl -sk -I https://127.0.0.1/  | grep -i "server:"  (→ nginx, sans version)
```

### Erreurs fréquentes et pénalités

- **Certificat et clé incohérents (regénérés séparément) → nginx -t échoue.** — Blocant
- **Redirection 80→443 dans le bloc qui écoute déjà 443 → boucle de redirections.** — -10 sur HTTPS
- **HSTS avant validation complète : les visiteurs ne pourront plus revenir en http.** — -5, note de prudence
- **gzip_types incomplet : le JSON/JS part non compressé.** — -5 sur compression
- **Add_header dans une location qui remplace ceux du server (règle d'héritage).** — -5 sécurité
- **Droits de la clé privée trop ouverts (644/777).** — -5 sécurité
- **Pas de test du blocage .git/.env après ajout (le 403 est le seul vrai test).** — Rapport

---

