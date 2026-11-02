/* Nginx Academy — Guide d’utilisation (rendu dans #/guide) */
window.GUIDE_MD = `
# 📖 Guide d’utilisation — Nginx Academy

Bienvenue ! Cette application t’emmène de **zéro à une maîtrise solide de NGINX** : leçons écrites, quiz, exercices de difficulté croissante et projets d’évaluation. Voici comment t’en servir.

## 1. Naviguer dans la formation

- La **barre latérale** liste les modules. Chaque module contient des **leçons** ; chaque leçon se compose de trois parties : le **cours** (texte, schémas, configurations), le **quiz** (questions à choix multiples), et les **exercices** (de facile à difficile).
- Ta **progression** est affichée dans la barre du haut et sauvegardée **localement** sur ton navigateur (aucun compte, aucune donnée envoyée sur Internet).
- Les modules 4 à 10 (proxy, load balancing, TLS, redirections, performance, sécurité, logs) sont rédigés sur le même modèle : tu peux enchaîner.

## 2. Vérifier tes réponses

- **Quiz** : clique une réponse (ou plusieurs si indiqué). La correction est immédiate, avec une explication. Une leçon n’est « terminée » que lorsque tous ses quiz et exercices sont validés.
- **QCM d’exercice** : choisis puis clique **Vérifier**.
- **Ordre** : clique les éléments **dans l’ordre** que tu penses correct, ils s’affichent dans la zone « Ta séquence », puis **Vérifier**.
- **Exercices « config »** : utilise le **bac à sable** intégré (éditeur de configuration). Clique **Vérifier** pour lancer notre mini-linter : il détecte les blocs mal fermés, les points-virgules manquants, les directives inconnues et les contextes invalides, et affiche l'**arbre des blocs** (bouton **Schéma des blocs**). C’est un entraînement grandeur nature avant \`nginx -t\`.

## 3. Que te faut-il pour pratiquer ?

NGINX s’exécute sur les trois systèmes. Choisis ton camp :

- 🐧 **Linux (recommandé)** : \`sudo apt install nginx\` (Debian/Ubuntu) ou \`sudo dnf install nginx\` (Fedora). Config : /etc/nginx/nginx.conf. Logs : /var/log/nginx/.
- 🪟 **Windows** : télécharge le ZIP sur nginx.org/en/download.html, décompresse dans C:/nginx/ et lance \`nginx.exe\`. Config : C:/nginx/conf/nginx.conf. Logs : C:/nginx/logs/.
- 🍎 **macOS** : \`brew install nginx\`.
- 💡 Sur Windows, **WSL** te donne un vrai Linux pour t’entraîner dans les conditions de la production.

Dans tout le cours, les commandes et chemins **Linux et Windows sont affichés séparément** quand ils diffèrent. Les exemples de configuration, eux, sont universels.

## 4. Les projets d’évaluation

Le module 11 contient **trois projets** de difficulté croissante, à faire sur une vraie machine :

1. Coche les **objectifs** au fur et à mesure.
2. Utilise la **grille d’auto-évaluation** (0-3 points par critère) pour noter honnêtement ton travail, ou ouvre le **Kit de correction** (menu latéral) : barèmes détaillés, démarches, commandes de vérification et erreurs fréquentes pour chaque projet.
3. Compare avec la **solution modèle** (bouton « Voir la solution modèle »).
4. N’oublie pas de respecter le réflexe pro : \`nginx -t\` avant chaque rechargement, et \`curl -I\` pour vérifier.

## 5. Le certificat

Quand **toutes les leçons de tous les modules de cours** sont terminées (quiz et exercices inclus), l’option **Certificat** apparaît : saisis ton nom et imprime-le (ou exporte en PDF).

## 6. Installer l’application (PWA)

L’application est une **PWA** : elle peut s’installer et fonctionner **hors connexion**.

- Elle doit être servie en **http(s)** : sur la démo locale, garde le serveur web actif (http://127.0.0.1:8123).
- Clique le bouton **« Installer l’app »** dans la barre du haut (ou l’icône d’installation du navigateur : ⊕ dans la barre d’adresse Chrome/Edge).
- Une fois installée, elle s’ouvre en pleine fenêtre et fonctionne même sans réseau.

## 7. FAQ et pièges connus

**« nginx -t » signale une erreur que je ne comprends pas** — Lis la ligne indiquée : souvent un point-virgule oublié ou un bloc non refermé. Vérifie aussi que ta directive existe dans le bon contexte (server_name dans server, pas dans http).

**Différence Windows/Linux d’un exemple** — Repère le chemin : /var/www/… est Linux, C:/nginx/… (ou un chemin relatif) est Windows. La syntaxe de configuration, elle, ne change jamais.

**Je veux arrêter NGINX sous Windows** — Ferme-le par \`nginx -s stop\` (ne ferme pas la console en force).

**La progression a disparu ?** — Elle vit dans le localStorage du navigateur : vider les données du site l’efface. Utilise plutôt « Réinitialiser ma progression » dans la barre latérale.

**Puis-je travailler sans le serveur local ?** — Oui, l’appli fonctionne aussi en double-cliquant index.html (sauf l’installation PWA et le mode hors-ligne).

## 8. Ta routine d’apprentissage conseillée

1. Lis la leçon **sans** ouvrir les solutions.
2. Fais le **quiz** ; relis la leçon sur les erreurs.
3. Fais les **exercices**. Pour les configs : écris d’abord à la main dans le bac à sable, vérifie, puis compare avec l’ordre du cours.
4. À la fin d’un module, réalise le **mini-projet** sur ta machine.
5. Répète, et les modules avancés (proxy, load balancing, TLS) seront du gâteau.

Bonne formation ! 🚀
`;
