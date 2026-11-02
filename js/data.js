/* Nginx Academy — programme des modules.
   Structure : { id, emoji, title, summary, lessons: [{ id, title, content (markdown), quiz, exercises }], project }
   Les leçons complètes sont rédigées au fil des itérations. */
window.MODULES = [
  {
    id: 'fondamentaux',
    emoji: '🌐',
    title: 'Les fondamentaux du web',
    summary: 'HTTP, requêtes/réponses, serveurs web, rôle de NGINX.',
    lessons: [],
    project: null
  },
  {
    id: 'configuration',
    emoji: '⚙️',
    title: 'Syntaxe et structure de configuration',
    summary: 'Blocs main / http / server / location, directives, variables, commentaires.',
    lessons: [],
    project: null
  },
  {
    id: 'statique',
    emoji: '🗂️',
    title: 'Serving de contenu statique',
    summary: 'root, index, try_files, types MIME, autoindex, cache navigateur.',
    lessons: [],
    project: null
  },
  {
    id: 'proxy',
    emoji: '🔀',
    title: 'Reverse proxy',
    summary: 'proxy_pass, en-têtes, WebSocket, timeouts, proxy derrière un réseau interne.',
    lessons: [],
    project: null
  },
  {
    id: 'loadbalancing',
    emoji: '⚖️',
    title: 'Load balancing',
    summary: 'upstream, algorithmes (round-robin, least_conn, ip_hash), health checks, retries.',
    lessons: [],
    project: null
  },
  {
    id: 'tls',
    emoji: '🔒',
    title: 'TLS / HTTPS',
    summary: 'Certificats, redirection, HSTS, TLS 1.3, en-têtes de sécurité.',
    lessons: [],
    project: null
  },
  {
    id: 'redirections',
    emoji: '↪️',
    title: 'Redirections et réécritures',
    summary: 'return vs rewrite, matching des locations, regex, mapping d’URLs.',
    lessons: [],
    project: null
  },
  {
    id: 'performance',
    emoji: '🚀',
    title: 'Cache et performance',
    summary: 'proxy_cache, gzip/brotli, expires, HTTP/2, tuning des workers et timeouts.',
    lessons: [],
    project: null
  },
  {
    id: 'securite',
    emoji: '🛡️',
    title: 'Sécurité approfondie',
    summary: 'Auth basic, rate limiting, contrôle d’accès par IP, headers, hardening.',
    lessons: [],
    project: null
  },
  {
    id: 'logs-monitoring',
    emoji: '📊',
    title: 'Logs et monitoring',
    summary: 'Formats de logs, error_page, stub_status, journalisation structurée.',
    lessons: [],
    project: null
  },
  {
    id: 'projets',
    emoji: '🏆',
    title: 'Projets d’évaluation',
    summary: 'Trois projets complets pour valider la maîtrise de NGINX.',
    lessons: [],
    project: null
  }
];