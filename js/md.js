/* Nginx Academy — mini-rendu Markdown (paragraphes, titres, listes, code, tableaux, callouts)
   + coloration syntaxique des blocs ```nginx . Aucune dépendance. */
(function () {
  'use strict';

  const esc = (s) => s
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // --- coloration d'une ligne de configuration nginx ---
  function hlNginxLine(line) {
    // commentaire
    const ci = line.indexOf('#');
    if (ci === 0) return `<span class="tk-c">${esc(line)}</span>`;
    let head = ci > -1 ? esc(line.slice(0, ci)) : esc(line);
    const com = ci > -1 ? `<span class="tk-c">${esc(line.slice(ci))}</span>` : '';
    // premier token = directive
    const m = head.match(/^(\s*)([a-z_][a-z0-9_/-]*)([\s\S]*)$/);
    if (!m) return head + com;
    const rest = m[3].replace(/\s+/g, ' ').trim();
    let out = `${m[1]}<span class="tk-d">${m[2]}</span>`;
    if (rest) {
      out += ' ' + rest.split(/(\s+)/).map((tok) => {
        if (!tok.trim()) return tok;
        if (/^["'].*["']$/.test(tok)) return `<span class="tk-s">${tok}</span>`;
        if (tok.startsWith('$') || tok.startsWith('${')) return `<span class="tk-n">${tok}</span>`;
        if (/^\d+(\.\d+)?[a-z%]*$/.test(tok)) return `<span class="tk-n">${tok}</span>`;
        if (/^[{};]$/.test(tok) || /^[{}]/.test(tok) || /[{};]$/.test(tok)) return `<span class="tk-k">${tok}</span>`;
        return tok;
      }).join('');
    }
    return out + com;
  }

  function hlCodeBlock(lang, code) {
    if (lang === 'nginx') {
      return code.split('\n').map(hlNginxLine).join('\n');
    }
    return esc(code);
  }

  // --- inline: `code`, **bold**, *italic*, [lien](url) ---
  function inline(s) {
    const tokens = [];
    let i = 0;
    const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]*\]\([^)]*\))/g;
    let last = 0, m;
    while ((m = re.exec(s)) !== null) {
      if (m.index > last) tokens.push({ t: 'txt', v: s.slice(last, m.index) });
      const tok = m[0];
      if (tok.startsWith('`')) tokens.push({ t: 'code', v: tok.slice(1, -1) });
      else if (tok.startsWith('**')) tokens.push({ t: 'bold', v: tok.slice(2, -2) });
      else if (tok.startsWith('[')) {
        const mm = tok.match(/^\[([^\]]*)\]\(([^)]*)\)$/);
        tokens.push({ t: 'link', v: mm[1], u: mm[2] });
      } else tokens.push({ t: 'em', v: tok.slice(1, -1) });
      last = m.index + tok.length;
    }
    if (last < s.length) tokens.push({ t: 'txt', v: s.slice(last) });
    return tokens.map((t) => {
      switch (t.t) {
        case 'code': return `<code>${esc(t.v)}</code>`;
        case 'bold': return `<strong>${inline(t.v)}</strong>`;
        case 'em': return `<em>${inline(t.v)}</em>`;
        case 'link': return `<a href="${esc(t.u)}" target="_blank" rel="noopener">${inline(t.v)}</a>`;
        default: return esc(t.v);
      }
    }).join('');
  }

  // --- table ---
  function toTable(rows) {
    const cell = (c) => `<td>${inline(c.trim())}</td>`;
    const th = (c) => `<th>${inline(c.trim())}</th>`;
    const head = rows[0].split('|').filter((c, i, a) => !(i === 0 && !c.trim()) && !(i === a.length - 1 && !c.trim()));
    let h = '<table><thead><tr>' + head.map(th).join('') + '</tr></thead><tbody>';
    for (let r = 1; r < rows.length; r++) {
      const cells = rows[r].split('|').filter((c, i, a) => !(i === 0 && !c.trim()) && !(i === a.length - 1 && !c.trim()));
      h += '<tr>' + cells.map(cell).join('') + '</tr>';
    }
    return h + '</tbody></table>';
  }

  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9\u00e0-\u00ff]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function render(md) {
    const lines = md.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;
    const push = (s) => out.push(s);
    while (i < lines.length) {
      const line = lines[i];
      const t = line.trim();

      // bloc de code
      const fm = t.match(/^```(\w*)\s*$/);
      if (fm) {
        const lang = fm[1]; let buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) { buf.push(lines[i]); i++; }
        i++; // saute le ``` final
        push(`<pre><code class="lang-${lang || 'text'}">${hlCodeBlock(lang, buf.join('\n'))}</code></pre>`);
        continue;
      }
      // titre
      const hm = t.match(/^(#{1,6})\s+(.*)$/);
      if (hm) {
        const n = Math.min(hm[1].length + 1, 5); // h2..h5
        push(`<h${n} id="${slugify(hm[2])}">${inline(hm[2])}</h${n}>`);
        i++; continue;
      }
      // liste
      if (/^([-*]|\d+\.)\s+/.test(t) && !/^\d+\.[^ ]/.test(t)) {
        const ordered = /^\d+\./.test(t);
        push(ordered ? '<ol>' : '<ul>');
        while (i < lines.length) {
          const lt = lines[i].trim();
          if (ordered ? /^\d+\.\s+/.test(lt) : /^[-*]\s+/.test(lt)) {
            push(`<li>${inline(lt.replace(/^(\d+\.|[-*])\s+/, ''))}</li>`);
            i++;
          } else if (/^[-*]\s+/.test(lt) || /^\d+\.\s+/.test(lt)) break;
          else if (!lt) break;
          else if (/^\s\s/.test(lines[i])) { // continuation
            push(`<li>${inline(lt)}</li>`); i++;
          } else break;
        }
        push(ordered ? '</ol>' : '</ul>');
        continue;
      }
      // tableau
      if (t.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|?$/.test(lines[i + 1].trim())) {
        const rows = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(lines[i]); i++; }
        push(toTable(rows));
        continue;
      }
      // blockquote / callout
      if (t.startsWith('>')) {
        const buf = [];
        while (i < lines.length) {
          const lt = lines[i].trim();
          if (!lt.startsWith('>')) break;
          buf.push(lt.replace(/^>\s?/, ''));
          i++;
        }
        const head = buf.shift() || '';
        const cm = head.match(/^\[!(\w+)\]\s*(.*)$/);
        if (cm) {
          const kind = cm[1].toLowerCase();
          const label = cm[2] ? `<span class="co-t">${inline(cm[2])}</span>` : '';
          push(`<div class="callout ${kind}">${label}${buf.length ? buf.map((b) => inline(b)).join(' ') : ''}</div>`);
        } else {
          push(`<blockquote>${buf.length ? buf.concat([head]).map((b) => inline(b)).join('<br>') : inline(head)}</blockquote>`);
        }
        continue;
      }
      // paragraphe
      if (t) {
        const buf = [line];
        i++;
        while (i < lines.length && lines[i].trim()) {
          const nxt = lines[i].trim();
          if (/^```/.test(nxt)) break;
          buf.push(lines[i]); i++;
        }
        push(`<p>${inline(buf.join(' '))}</p>`);
        continue;
      }
      i++;
    }
    return out.join('');
  }

  window.mdParse = render;
})();