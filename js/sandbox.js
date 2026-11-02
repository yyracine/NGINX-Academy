/* Nginx Academy — bac à sable de configuration : éditeur + validation + schéma des blocs. */
(function () {
  'use strict';

  function create(container, opts) {
    opts = opts || {};
    const initial = opts.initial || '';
    container.classList.add('sandbox');
    container.innerHTML = `
      <div class="sb-head">
        <span class="sb-title">${opts.title || 'Éditeur de configuration'}</span>
        <span class="sb-actions">
          <button class="btn btn-sm" data-a="schema">Schéma des blocs</button>
          <button class="btn btn-sm" data-a="reset">Réinitialiser</button>
          <button class="btn btn-sm primary" data-a="check">Vérifier ✔</button>
        </span>
      </div>
      <div class="sb-toolbar">
        <button class="btn btn-sm" data-a="ins">insert</button>
        <button class="btn btn-sm" data-a="ins">server</button>
        <button class="btn btn-sm" data-a="ins">location</button>
        <button class="btn btn-sm" data-a="ins">proxy_pass</button>
        <button class="btn btn-sm" data-a="ins">root</button>
        <button class="btn btn-sm" data-a="ins">try_files</button>
        <span class="sb-lint-hint">Aide : ${opts.hint || ''}</span>
      </div>
      <textarea class="sb-editor mono" spellcheck="false" placeholder="Écris ou colle une configuration nginx…"></textarea>
      <div class="sb-result hidden"></div>
      <div class="sb-schema hidden"></div>`;
    const editor = container.querySelector('.sb-editor');
    editor.value = initial;
    const result = container.querySelector('.sb-result');
    const schemaBox = container.querySelector('.sb-schema');

    function insert(text) {
      const s = editor.selectionStart, e = editor.selectionEnd;
      editor.value = editor.value.slice(0, s) + text + editor.value.slice(e);
      editor.selectionStart = editor.selectionEnd = s + text.length;
      editor.focus();
    }

    container.addEventListener('click', (ev) => {
      const b = ev.target.closest('button[data-a]');
      if (!b) return;
      const a = b.dataset.a;
      if (a === 'check') {
        const r = NginxLint.validate(editor.value, { snippet: !!opts.snippet });
        result.classList.remove('hidden');
        if (r.ok) {
          result.className = 'sb-result good';
          result.innerHTML = `<strong>✓ Configuration valide.</strong> ${r.warnings.length ? r.warnings.map((w) => `<div class="w">⚠ ${w.line} : ${w.msg}</div>`).join('') : 'Aucun avertissement.'}${opts.onValid ? '<span class="extra"></span>' : ''}`;
          if (opts.onValid) opts.onValid(r, editor.value);
          return;
        }
        result.className = 'sb-result bad';
        result.innerHTML = `<strong>✗ ${r.errors.length} erreur${r.errors.length > 1 ? 's' : ''} :</strong>` +
          r.errors.map((err) => `<div class="e">Ligne ${err.line} — ${err.msg}</div>`).join('') +
          (r.warnings.length ? r.warnings.map((w) => `<div class="w">⚠ Ligne ${w.line} — ${w.msg}</div>`).join('') : '');
        if (opts.onInvalid) opts.onInvalid(r);
        return;
      }
      if (a === 'schema') {
        const r = NginxLint.validate(editor.value);
        schemaBox.classList.remove('hidden');
        schemaBox.innerHTML = `<pre class="mono">${r.treeHtml()}</pre>`;
        return;
      }
      if (a === 'reset') { editor.value = initial; result.classList.add('hidden'); schemaBox.classList.add('hidden'); return; }
      if (a === 'ins') {
        const tpl = {
          insert: 'insert ',
          server: 'server {\n  server_name example.com;\n}',
          location: 'location / {\n  root /var/www/html;\n}',
          proxy_pass: 'proxy_pass http://127.0.0.1:8080;',
          root: 'root /var/www/html;',
          try_files: 'try_files $uri $uri/ =404;'
        }[b.textContent.trim()];
        if (tpl) insert(tpl);
      }
    });

    return {
      getText: () => editor.value,
      setText: (t) => { editor.value = t; result.classList.add('hidden'); schemaBox.classList.add('hidden'); },
      focus: () => editor.focus(),
      validate: () => NginxLint.validate(editor.value, { snippet: !!opts.snippet })
    };
  }

  window.NginxSandbox = { create };
})();
