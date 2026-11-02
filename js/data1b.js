/* Module 1 — compléments : qu’est-ce que NGINX ? + Windows vs Linux */
(function () {
  'use strict';
  const M = window.MODULES.find((m) => m.id === 'fondamentaux');
  if (!M) return;

  const L1 = {
    id: 'qu-est-ce-que-nginx',
    title: 'Qu’est-ce que NGINX ? Et comment l’obtenir ?',
    excerpt: 'Définition, histoire, rôles — et installation sur Linux, Windows ou macOS.',
    content: `
# Qu’est-ce que NGINX ? Et comment l’obtenir ?

## La définition en une phrase

**NGINX (prononcé « engine-x ») est un serveur web open-source devenu l’application serveur la plus utilisée du monde** : il sert ou proxifie une grande part des sites web (plus d’un tiers des sites selon les études de part de marché).

Il est né en 2002 dans la tête d'**Igor Sysoev**, ingénieur russe, face à un problème concret : les serveurs de l’époque s’écroulaient sous les connexions simultanées. De là viennent ses deux grandes forces :

- **rapidité et faible consommation** : architecture événementielle, très peu de mémoire ;
- **versatilité** : il ne sert pas que des pages web, il peut faire **reverse proxy**, **load balancer**, **cache** et **terminateur TLS** (détaillé dans le module 2).

> [!info] Le nom : « engine-x » = « moteur X », un clin d'œil à son moteur de traitement innovant et aux projets « x » de l’époque. Depuis 2019, le logo officiel est « nginx » tout en minuscules.

## Comment l’obtenir — selon ton système

### 🐧 Linux (Debian / Ubuntu)

\`\`\`bash
sudo apt update
sudo apt install -y nginx
nginx -v                        # vérifie la version installée
\`\`\`

Sur Fedora / RHEL / Rocky :

\`\`\`bash
sudo dnf install -y nginx
\`\`\`

> [!tip] Les paquets officiels de nginx.org (dépôt apt/dnf) livrent des versions plus récentes que celles des dépôts système. Pour apprendre, la version du dépôt système suffit largement.

### 🪟 Windows

NGINX fournit des **binaires officiels** sous forme d’archive ZIP (pas d’installeur) :

1. Télécharge le fichier \`nginx-1.2x.x.zip\` sur **nginx.org/en/download.html** (colonne Windows).
2. Décompresse dans \`C:/nginx/\` : tu obtiens \`C:/nginx/nginx.exe\`, \`C:/nginx/conf/nginx.conf\`…
3. Ouvre une console dans \`C:/nginx/\` et lance :

\`\`\`batch
start nginx        :: démarre NGINX (une fenêtre console reste ouverte : c’est normal, c’est le serveur)
nginx -t           :: teste la configuration
nginx -s reload    :: recharge la configuration
nginx -s stop      :: arrête le serveur
\`\`\`

4. Vérifie dans le navigateur : **http://localhost/** doit afficher la page d’accueil NGINX.

> [!info] Sur Windows comme sur Linux, les chemins à séparateur **/** fonctionnent (Windows les accepte nativement) : c’est ce que nous utiliserons partout dans ce cours pour rester lisibles.

> [!warn] Sur Windows, NGINX tourne **au premier plan** dans sa console : ne ferme pas la fenêtre pour arrêter le serveur, utilise \`nginx -s stop\`. Il n’y a pas de service système officiel.
> Alternative recommandée pour s’entraîner dans des conditions proches de la production : **WSL (sous-système Linux)** — tu obtiens un vrai environnement Linux, identique à un serveur réel.

### 🍎 macOS

\`\`\`bash
brew install nginx
\`\`\`

## Vérifier que tout est en ordre

\`\`\`bash
nginx -v        # nginx version: nginx/1.2x.x
curl -I http://localhost    # HTTP/1.1 200 OK
\`\`\`

> [!warn] Commande identique sur tous les systèmes : \`nginx -t\` (tester la configuration) et \`nginx -v\` (afficher la version). C’est la porte d’entrée de toute la suite du cours.
`
  };
  M.lessons.unshift(L1);

  L1.quiz = [
    {
      q: 'Que fait principalement NGINX ?',
      options: ['Un antivirus', 'Un serveur web (et reverse proxy, load balancer, cache)', 'Un compilateur', 'Un langage de programmation'],
      correct: [1],
      explain: 'NGINX est un serveur web polyvalent : statique, proxy, répartition de charge, cache, TLS.'
    },
    {
      q: 'Pourquoi s’appelle-t-il NGINX ?',
      options: ['« Nginx » = « NeXus », un projet SIG', 'C’est un jeu sur « engine-x », le moteur de traitement', 'C’est l’acronyme d’un consortium', 'C’est le nom d’un cocktail'],
      correct: [1],
      explain: 'engine-x : hommage au moteur de traitement des connexions, révolutionnaire à l’époque.'
    },
    {
      q: 'Sur Windows, comment obtient-on NGINX officiellement ?',
      options: ['Un installeur MSI sur le Microsoft Store', 'Une archive ZIP à télécharger sur nginx.org/en/download.html', 'Via PowerShell uniquement', 'Il n’existe pas de version Windows'],
      correct: [1],
      explain: 'Les binaires Windows sont livrés en ZIP ; on décompresse puis on lance nginx.exe.'
    },
    {
      q: 'Quelle commande (identique partout) valide la configuration ?',
      options: ['nginx -t', 'nginx --validate', 'nginx -check', 'configtest nginx'],
      correct: [0],
      explain: 'nginx -t teste syntaxe et cohérence — LE réflexe avant tout rechargement.'
    }
  ];

  L1.exercises = [
    {
      type: 'mcq', diff: 'easy', title: 'Le bon outil pour apprendre sur Windows',
      prompt: 'Tu veux t’entraîner sur Windows dans un environnement le plus proche possible de la production Linux. Que choisis-tu ?',
      options: ['WSL (sous-système Linux pour Windows)', 'L’éditeur Bloc-notes', 'Un serveur FTP', 'Rien : impossible sous Windows'],
      answer: [0],
      explain: 'WSL donne un vrai Linux (apt, /etc/nginx, systemd) : l’environnement idéal pour ce cours.'
    },
    {
      type: 'mcq', diff: 'medium', title: 'La console Windows',
      prompt: 'Sous Windows, tu as lancé nginx.exe et une fenêtre console est restée ouverte. Que faire pour arrêter proprement le serveur ?',
      options: ['Fermer la fenêtre console', 'nginx -s stop', 'Supprimer le dossier C:/nginx', 'Redémarrer l’ordinateur'],
      answer: [1],
      explain: 'La fenêtre console EST le serveur. On l’arrête avec nginx -s stop.'
    }
  ];
})();

/* --- Leçon 2 : NGINX sur Windows vs Linux --- */
(function addL1b_2() {
  const M = window.MODULES.find((m) => m.id === 'fondamentaux');
  const L2 = {
    id: 'windows-vs-linux',
    title: 'NGINX sur Windows vs Linux',
    excerpt: 'Chemins, commandes, services : les correspondances exactes entre les deux mondes.',
    content: `
# NGINX sur Windows vs Linux

NGINX est né pour Linux, mais il fonctionne très bien sous Windows pour apprendre et développer. La **syntaxe des configurations est identique** ; seuls changent les chemins, les commandes système et la manière de le lancer. Ce tableau est ta référence tout au long du cours.

## Tableau de correspondance

| Tâche | 🐧 Linux (Debian/Ubuntu) | 🪟 Windows (binaire officiel) |
|---|---|---|
| Installation | \`sudo apt install nginx\` | ZIP extrait dans \`C:/nginx/\` |
| Config principale | \`/etc/nginx/nginx.conf\` | \`C:/nginx/conf/nginx.conf\` |
| Configs additionnelles | \`/etc/nginx/conf.d/*.conf\` | \`C:/nginx/conf/conf.d/*.conf\` (à créer) |
| Vhosts | \`sites-available/\` + \`sites-enabled/\` (symlinks) | pas de convention ; fichiers \`*.conf\` dans \`conf.d\` |
| Racine des sites | \`/usr/share/nginx/html\` | \`C:/nginx/html/\` |
| Logs | \`/var/log/nginx/access.log\` et \`error.log\` | \`C:/nginx/logs/access.log\` et \`error.log\` |
| PID | \`/run/nginx.pid\` | \`C:/nginx/logs/nginx.pid\` |
| Démarrer | \`systemctl start nginx\` | \`start nginx\` (ou \`nginx.exe\`) |
| Arrêter | \`systemctl stop nginx\` | \`nginx -s stop\` |
| Recharger | \`systemctl reload nginx\` | \`nginx -s reload\` |
| Tester la config | \`nginx -t\` | \`nginx -t\` (identique) |
| Au démarrage du système | \`systemctl enable nginx\` (service) | rien (pas de service officiel) |
| Fichier hosts (vhosts de test) | \`/etc/hosts\` | \`C:/Windows/System32/drivers/etc/hosts\` |
| Outil de test HTTP | \`curl\` | \`curl\` (présent depuis Windows 10) |

## Les différences qui comptent vraiment

### 1. Pas de service système sous Windows

Sous Linux, \`systemd\` surveille NGINX et le relance. Sous Windows, NGINX vit **dans sa console** : si tu la fermes, le serveur s’arrête.

> [!tip] Veux-tu un « vrai » service Windows ? Utilise un gestionnaire comme **NSSM** (Non-Sucking Service Manager) : \`nssm install nginx C:\nginx\nginx.exe\`. C’est un outil tiers éprouvé, utilisé en production Windows.

### 2. Pas de sites-available / sites-enabled

C’est une convention Debian, pas une fonctionnalité NGINX. Sous Windows, on met simplement tous les \`server\` blocks dans des fichiers \`*.conf\` inclus par \`conf/nginx.conf\`. Le résultats est le même.

### 3. Chemin des logs et du PID

Tout reste **dans le dossier d’installation** (\`logs/\`) au lieu de \`/var/log\`. La directive reste \`error_log logs/error.log;\` : NGINX résout les chemins **relatifs à son dossier de travail**.

> [!warn] Sous Windows, les chemins relatifs (\`logs/error.log\`) sont presque toujours préférables aux absolus (\`/var/log/…\`) : le serveur ne connaît pas les conventions Unix.

### 4. Le fichier hosts

Pour tester des noms de domaine locaux (nos \`server_name\` de démonstration), on édite :

- 🐧 \`/etc/hosts\` (avec \`sudo\`)
- 🪟 \`C:/Windows/System32/drivers/etc/hosts\` (éditeur en mode **administrateur**)

\`\`\`text
127.0.0.1  site-a.local site-b.local demo.local
\`\`\`

## La règle d’or de ce cours

Les **exemples de configuration** sont écrits une fois, avec des chemins génériques (\`root /var/www/site;\`). À chaque fois, demande-toi : *« quel serait l’équivalent sur MON système ? »* — la réponse est toujours dans le tableau ci-dessus.
`
  };
  M.lessons.splice(1, 0, L2);

  L2.quiz = [
    {
      q: 'Sur Windows, où se trouverait le fichier de configuration principal ?',
      options: ['C:/Windows/nginx.conf', 'C:/nginx/conf/nginx.conf', '/etc/nginx/nginx.conf', 'C:/nginx/nginx.conf'],
      correct: [1],
      explain: 'Par convention, tout est dans le dossier d’installation : conf/nginx.conf.'
    },
    {
      q: 'Sur Windows, comment relance-t-on une configuration modifiée ?',
      options: ['winservices nginx reload', 'nginx -s reload', 'systemctl reload nginx', 'Il faut redémarrer l’ordinateur'],
      correct: [1],
      explain: 'les commandes nginx -s … (stop, reload, reopen) sont identiques sous Windows.'
    },
    {
      q: 'Où sont les logs sous Windows ?',
      options: ['C:/Windows/Logs', 'Dans le dossier d’installation, sous logs/', '/var/log/nginx/', 'Dans la console uniquement'],
      correct: [1],
      explain: 'NGINX écrit ses logs dans logs/ relatif à son dossier : access.log, error.log, nginx.pid.'
    },
    {
      q: 'Quelle différence essentielle entre Linux et Windows pour NGINX ?',
      options: ['La syntaxe des configurations', 'Le service système : systemd vs console à gérer', 'Les noms de directives', 'Le port par défaut'],
      correct: [1],
      explain: 'La config est identique ; c’est la supervision (service vs console) et les chemins qui diffèrent.'
    },
    {
      q: 'Quel outil tiers permet un vrai service Windows pour NGINX ?',
      options: ['NSSM', 'Docker Desktop uniquement', 'taskkill', 'Pas de solution possible'],
      correct: [0],
      explain: 'NSSM enveloppe nginx.exe en service Windows (redémarrage, démarrage au boot).'
    }
  ];

  L2.exercises = [
    {
      type: 'mcq', diff: 'easy', title: 'La bonne adresse',
      prompt: 'Tu es sous Windows et tu cherches les logs d’erreur. Où regardes-tu ?',
      options: ['/var/log/nginx/error.log', 'C:/nginx/logs/error.log', 'C:/Windows/error.log', 'Ils ne sont pas écrits sous Windows'],
      answer: [1],
      explain: 'Sous Windows, les logs sont dans logs/ à côté de nginx.exe.'
    },
    {
      type: 'mcq', diff: 'medium', title: 'Contexte : t’entraîner',
      prompt: 'Sur ton PC Windows, tu veux tester un vhost « demo.local » : quelle ligne ajouter et où ?',
      options: [
        '127.0.0.1 demo.local dans C:/Windows/System32/drivers/etc/hosts',
        'demo.local 127.0.0.1 dans le nginx.conf',
        'Rien : hosts est inutile sous Windows',
        'Une entrée dans le registre'
      ],
      answer: [0],
      explain: 'Le hosts Windows (à éditer en administrateur) associe demo.local à 127.0.0.1.'
    }
  ];
})();
