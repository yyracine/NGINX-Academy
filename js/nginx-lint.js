/* Nginx Academy — validateur de configuration NGINX (JS pur) + arbre de schéma.
   Usage : NginxLint.validate(text) -> { errors:[], warnings:[], tree } */
(function () {
  'use strict';

  const KNOWN = new Set([
    'access_log','add_header','alias','allow','api','auth_basic','auth_basic_user_file',
    'autoindex','charset','client_body_buffer_size','client_body_timeout','client_header_buffer_size',
    'client_max_body_size','default_type','deny','error_log','error_page','etag','expires','fastcgi_pass',
    'geo','gzip','gzip_comp_level','gzip_disable','gzip_min_length','gzip_proxied','gzip_types','gzip_vary',
    'if','if_modified_since','include','index','internal','keepalive','keepalive_requests','keepalive_timeout',
    'large_client_header_buffers','last_modified','limit_conn','limit_conn_zone','limit_except','limit_rate',
    'limit_req','limit_req_zone','listen','location','log_format','log_not_found','log_subrequest','map',
    'merge_slashes','open_file_cache','open_file_cache_evict','open_file_cache_min_uses','pid',
    'port_in_redirect','proxy_buffer_size','proxy_buffering','proxy_buffers','proxy_cache','proxy_cache_path',
    'proxy_cache_valid','proxy_connect_timeout','proxy_http_version','proxy_pass','proxy_pass_header',
    'proxy_read_timeout','proxy_redirect','proxy_send_timeout','proxy_set_header','resolver','return',
    'rewrite','root','satisfy','sendfile','sendfile_max_chunk','server','server_name','server_tokens',
    'set','ssl','ssl_certificate','ssl_certificate_key','ssl_ciphers','ssl_dhparam','ssl_prefer_server_ciphers',
    'ssl_protocols','ssl_session_cache','ssl_session_tickets','ssl_session_timeout','ssl_stapling',
    'ssl_stapling_verify','ssl_trusted_certificate','stub_status','tcp_nodelay','tcp_nopush','try_files',
    'types','types_hash_bucket_size','types_hash_max_size','upstream','use','user','variables_hash_bucket_size',
    'worker_connections','worker_processes','worker_rlimit_nofile','charset_types','server_names_hash_bucket_size',
    'server_name_in_redirect','absolute_redirect','disable_symlinks','logrotate','more_clear_headers','http2'
  ]);

  // contextes autorisés pour les blocs
  const BLOCK_PARENTS = {
    events: ['root'], http: ['root'], server: ['http'], location: ['server', 'location'],
    upstream: ['http'], types: ['http'], map: ['http'], if: ['location'], geo: ['http'],
    log_format: ['http'], limit_req_zone: ['http'], limit_conn_zone: ['http'], proxy_cache_path: ['http'],
    stream: ['root']
  };

  // contextes autorisés pour les directives (généreux : violation => avertissement, pas erreur)
  const CTX = {
    rootOnly: new Set(['user','worker_processes','pid','worker_rlimit_nofile']),
    eventsOnly: new Set(['worker_connections','use']),
    serverOnly: new Set(['listen','server_name','ssl_certificate','ssl_certificate_key','ssl_trusted_certificate','ssl_dhparam']),
    srvLoc: new Set(['root','index','server_tokens','ssl','ssl_protocols','ssl_ciphers','ssl_prefer_server_ciphers',
      'ssl_session_cache','ssl_session_timeout','ssl_session_tickets','ssl_stapling','ssl_stapling_verify',
      'auth_basic','auth_basic_user_file','satisfy','autoindex','charset']),
    locOnly: new Set(['alias','try_files','proxy_pass','fastcgi_pass','internal','rewrite','return','expires',
      'proxy_set_header','proxy_http_version','proxy_read_timeout','proxy_send_timeout','proxy_connect_timeout',
      'proxy_buffer_size','proxy_buffering','proxy_buffers','proxy_cache','proxy_cache_valid','proxy_redirect',
      'proxy_hide_header','allow','deny','limit_req','limit_conn','limit_rate','error_page','add_header'])
  };
  const generic = new Set(['access_log','error_log','include','log_not_found','log_subrequest','gzip','gzip_types',
    'gzip_min_length','gzip_comp_level','gzip_proxied','gzip_vary','gzip_disable','sendfile','tcp_nopush',
    'tcp_nodelay','keepalive_timeout','keepalive_requests','client_max_body_size','client_body_buffer_size',
    'client_body_timeout','client_header_buffer_size','large_client_header_buffers','default_type','etag',
    'if_modified_since','last_modified','merge_slashes','open_file_cache','open_file_cache_evict',
    'open_file_cache_min_uses','port_in_redirect','absolute_redirect','server_name_in_redirect','types_hash_max_size',
    'types_hash_bucket_size','variables_hash_bucket_size','server_names_hash_bucket_size','limit_rate']);

  function ctxOf(d) {
    if (CTX.rootOnly.has(d)) return ['root'];
    if (CTX.eventsOnly.has(d)) return ['events'];
    if (CTX.serverOnly.has(d)) return ['server'];
    if (CTX.srvLoc.has(d)) return ['server','location'];
    if (CTX.locOnly.has(d)) return ['server','location'];
    return null; // générique partout
  }

  function stripComment(line) {
    let inS = null, out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inS) { out += ch; if (ch === inS) inS = null; continue; }
      if (ch === '"' || ch === "'") { inS = ch; out += ch; continue; }
      if (ch === '#') break;
      out += ch;
    }
    return out;
  }

// Parse le texte en arbre de blocs + directives ; remplit errors/warnings
  function tokenizeLine(code) {
    const toks = [];
    let i = 0;
    const len = code.length;
    let cur = null; // directive en cours d'assemblage
    while (i < len) {
      const ch = code[i];
      if (ch === ' ' || ch === '\t') { i++; continue; }
      if (ch === '{') {
        toks.push({ type: 'blockOpen', name: cur ? cur.name : null, args: cur ? cur.args : '' });
        cur = null;
        i++; continue;
      }
      if (ch === '}') { toks.push({ type: 'close' }); i++; continue; }
      if (ch === ';') { if (cur) { toks.push({ type: 'directive', name: cur.name, args: cur.args, semi: true }); cur = null; } i++; continue; }
      // mot (ou chaîne avec espaces)
      let j = i;
      let quote = null;
      if (ch === '"' || ch === "'") { quote = ch; j++; while (j < len && code[j] !== quote) j++; if (j < len) j++; }
      else while (j < len && !/[\s;{}]/.test(code[j])) j++;
      const word = code.slice(i, j);
      if (!cur) cur = { name: word, args: '' };
      else cur.args += (cur.args ? ' ' : '') + word;
      i = j;
    }
    if (cur) toks.push({ type: 'directive', name: cur.name, args: cur.args, semi: false });
    return toks;
  }

  const SNIPPET_ROOT = new Set(['http', 'server', 'location', 'upstream', 'map', 'events', 'types', 'if', 'geo', 'stream']);

  function parse(text, errors, warnings, snippet) {
    const lines = text.replace(/\r\n/g, '\n').split('\n');
    const root = { kind: 'root', name: 'config', children: [], directives: [], line: 0 };
    const stack = [{ node: root, ctx: 'root', line: 0 }];

    for (let i = 0; i < lines.length; i++) {
      const ln = i + 1;
      const code = stripComment(lines[i]).trim();
      if (!code) continue;
      let toks;
      try { toks = tokenizeLine(code); } catch (e) { errors.push({ line: ln, msg: 'Ligne invalide.' }); continue; }
      for (let ti = 0; ti < toks.length; ti++) {
        const tok = toks[ti];
        const current = stack[stack.length - 1];

        if (tok.type === 'close') {
          if (stack.length === 1) errors.push({ line: ln, msg: "Fermeture '}' sans bloc ouvert." });
          else stack.pop();
          continue;
        }
        if (tok.type === 'blockOpen') {
          const name = tok.name;
          if (!name) { errors.push({ line: ln, msg: "Bloc '{' sans directive (exemple attendu : « location / { »)." }); continue; }
          const parents = BLOCK_PARENTS[name];
          if (!KNOWN.has(name) && !parents) {
            errors.push({ line: ln, msg: `Directive inconnue « ${name} ». Vérifie l'orthographe (ou ajoute-la à la liste).` });
          }
          let badCtx = !!(parents && !parents.includes(current.ctx));
          if (badCtx && snippet && current.ctx === 'root' && SNIPPET_ROOT.has(name)) badCtx = false;
          if (badCtx) {
            errors.push({ line: ln, msg: `Bloc « ${name} » invalide ici (autorisé dans : ${parents.join(', ')}).` });
          }
          const node = { kind: 'block', name, args: tok.args || '', children: [], directives: [], line: ln };
          current.node.children.push(node);
          stack.push({ node, ctx: name, line: ln });
          continue;
        }
        // directive
        const name = tok.name;
        if (!KNOWN.has(name)) {
          errors.push({ line: ln, msg: `Directive inconnue « ${name} ». Vérifie l'orthographe (ou ajoute-la à la liste des directives).` });
        }
        if (!tok.semi) {
          errors.push({ line: ln, msg: `Directive « ${name} » : point-virgule « ; » manquant en fin de ligne.` });
        }
        const ctxs = ctxOf(name);
        if (ctxs && !ctxs.includes(current.ctx)) {
          const strict = CTX.rootOnly.has(name) || CTX.eventsOnly.has(name) || CTX.serverOnly.has(name);
          const msg = `« ${name} » est invalide dans un bloc « ${current.ctx} » (attendu : ${ctxs.join(', ')}).`;
          if (strict) errors.push({ line: ln, msg }); else warnings.push({ line: ln, msg });
        }
        current.node.directives.push({ name, args: tok.args, line: ln });
      }
    }

    if (stack.length > 1) {
      errors.push({ line: stack[stack.length - 1].line, msg: 'Bloc non refermé : il manque un « } ».' });
    }
    return root;
  }

  function renderTree(node, depth, html) {
    const pad = '  '.repeat(depth);
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (node.kind === 'root') {
      html.push(`${pad}<span class="sch-root">config</span>`);
    } else {
      html.push(`${pad}<span class="sch-block">${esc(node.name)} ${esc(node.args)}</span> {`);
    }
    node.directives.forEach((d) => {
      html.push(`${pad + '  '}<span class="sch-dir">${esc(d.name)}</span>${d.args ? ' ' + esc(d.args) : ''};`);
    });
    node.children.forEach((c) => {
      renderTree(c, depth + 1, html);
      html.push(`${pad + '  '}}`);
    });
    if (node.kind === 'root' && node.children.length) html.push('}');
  }

  function showHelp() {
    return 'Directives connues : ' + [...KNOWN].sort().join(', ');
  }

  window.NginxLint = {
    validate(text, opts) {
      const errors = [], warnings = [];
      const snippet = !!(opts && opts.snippet);
      const tree = parse(text, errors, warnings, snippet);
      return {
        ok: errors.length === 0,
        errors, warnings, tree,
        treeHtml() {
          const html = [];
          renderTree(tree, 0, html);
          return html.join('\n');
        }
      };
    },
    showHelp
  };
})();
