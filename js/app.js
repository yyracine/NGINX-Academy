/* Nginx Academy — moteur : progression, routage, leçons (mdParse), quiz, exercices, projets, certificat. */
(function () {
  'use strict';
  const LS = 'nginx-academy-v1';
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  let progress = load();
  function load() {
    try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; }
  }
  function save() { localStorage.setItem(LS, JSON.stringify(progress)); }
  progress.modules = progress.modules || {};

  // ---------- progression ----------
  function rec(mi, li) {
    progress.modules[mi] = progress.modules[mi] || {};
    progress.modules[mi].lessons = progress.modules[mi].lessons || {};
    let r = progress.modules[mi].lessons[li];
    if (!r || r === true) { r = { done: false, quiz: {}, ex: {} }; progress.modules[mi].lessons[li] = r; }
    return r;
  }
  function setQuiz(mi, li, qi, res) {
    const r = rec(mi, li);
    r.quiz[qi] = res;
    r.done = isDone(mi, li);
    save(); updateProgressUI(); refreshLessonChip(mi, li);
  }
  function setEx(mi, li, ei, res) {
    const r = rec(mi, li);
    r.ex[ei] = res;
    r.done = isDone(mi, li);
    save(); updateProgressUI(); refreshLessonChip(mi, li);
  }
  // Met à jour le badge « En cours / terminée » de la leçon courante, sans re-rendre la page
  function refreshLessonChip(mi, li) {
    const chip = document.querySelector('.lesson-head .chip');
    if (!chip || location.hash.indexOf(`#/m/${mi}/l/${li}`) !== 0) return;
    const done = isDone(mi, li);
    chip.className = 'chip ' + (done ? 'green' : 'muted');
    chip.textContent = done ? 'Leçon terminée ✓' : 'En cours';
  }
  function visit(mi, li) {
    const l = MODULES[mi].lessons[li];
    if (!l) return;
    if (!(l.quiz && l.quiz.length) && !(l.exercises && l.exercises.length)) {
      const r = rec(mi, li); r.done = true; save(); updateProgressUI();
    }
  }
  function isDone(mi, li) {
    const m = MODULES[mi], l = m && m.lessons[li];
    if (!l) return false;
    const r = progress.modules[mi] && progress.modules[mi].lessons && progress.modules[mi].lessons[li];
    if (!r) return false;
    if (r === true) return true;
    if (l.quiz && l.quiz.length) {
      for (let qi = 0; qi < l.quiz.length; qi++) {
        const qr = r.quiz && r.quiz[qi];
        if (!qr || !qr.correct) return false;
      }
    }
    if (l.exercises && l.exercises.length) {
      for (let ei = 0; ei < l.exercises.length; ei++) {
        const er = r.ex && r.ex[ei];
        if (!er || !er.pass) return false;
      }
    }
    return true;
  }
  function totalPct() {
    let done = 0, tot = 0;
    MODULES.forEach((m, mi) => { m.lessons.forEach((l, li) => { tot++; if (isDone(mi, li)) done++; }); });
    return tot ? Math.round((done / tot) * 100) : 0;
  }
  function modulePct(mi) {
    const m = MODULES[mi];
    if (!m || !m.lessons.length) return 0;
    const d = m.lessons.filter((l, li) => isDone(mi, li)).length;
    return Math.round((d / m.lessons.length) * 100);
  }
  function allCoursesDone() {
    return MODULES.filter((m) => m.id !== 'projets').every((m, mi) =>
      m.lessons.length > 0 && m.lessons.every((l, li) => isDone(mi, li)));
  }
  function updateProgressUI() {
    $('#progress-mini-bar').style.width = totalPct() + '%';
    $('#progress-mini-pct').textContent = totalPct() + ' %';
    $('#sidebar-count').textContent = totalPct() + ' %';
    renderSidebar();
  }

  // ---------- UI helpers ----------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
  }
  function openModal(html) { $('#modal-body').innerHTML = html; $('#modal-backdrop').classList.remove('hidden'); }
  function closeModal() { $('#modal-backdrop').classList.add('hidden'); }

  // ---------- sidebar ----------
  let activeNav = -1;
  function renderSidebar() {
    const ul = $('#module-nav');
    ul.innerHTML = '';
    const extra = (hash, num, title, meta) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.className = 'module-item' + (location.hash === hash ? ' active' : '');
      b.innerHTML = `<span class="num">${num}</span><span class="mi-txt"><span class="mi-title">${title}</span><span class="mi-meta">${meta}</span></span>`;
      b.addEventListener('click', () => { location.hash = hash; $('#sidebar').classList.remove('open'); });
      li.appendChild(b);
      ul.appendChild(li);
    };
    extra('#/guide', '📖', 'Guide d’utilisation', 'Bien démarrer avec l’app');
    extra('#/kit', '🧑🏫', 'Kit de correction', 'Corriger les 3 projets');
    MODULES.forEach((m, mi) => {
      const li = document.createElement('li');
      const b = document.createElement('button');
      const mDone = m.lessons.length > 0 && m.lessons.every((l, li2) => isDone(mi, li2));
      b.className = 'module-item' + (mi === activeNav ? ' active' : '') + (mDone ? ' done' : '');
      const pct = modulePct(mi);
      b.innerHTML =
        `<span class="num">${mDone ? '✓' : String(mi + 1).padStart(2, '0')}</span>` +
        `<span class="mi-txt"><span class="mi-title">${m.emoji} ${m.title}</span>` +
        `<span class="mi-meta">${m.id === 'projets' ? '3 projets · kit de correction' : (m.lessons.length ? m.lessons.length + ' leçon' + (m.lessons.length > 1 ? 's' : '') + ' · ' + pct + ' %' : '— en préparation —')}</span></span>` +
        (mDone ? '<span class="mi-check">●</span>' : '');
      b.addEventListener('click', () => { navigate(mi); $('#sidebar').classList.remove('open'); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    extra('#/lexique', '📚', 'Lexique du cours', "Tous les termes expliqués");
  }

  // ---------- routage ----------
  function navigate(mi, li) {
    location.hash = li === undefined ? `#/m/${mi}` : `#/m/${mi}/l/${li}`;
  }
  function route() {
    const h = location.hash;
    let m = h.match(/^#\/m\/(\d+)(?:\/l\/(\d+))?/);
    if (m) {
      activeNav = +m[1];
      const li = m[2] === undefined ? undefined : +m[2];
      const mod = MODULES[activeNav];
      if (mod && mod.id === 'projets') renderProjects();
      else if (li === undefined) renderModule(activeNav);
      else renderLesson(activeNav, li);
      renderSidebar();
      window.scrollTo(0, 0);
      return;
    }
    if (h === '#/cert') { renderCert(); activeNav = -1; renderSidebar(); return; }
    if (h === '#/guide') { renderGuide(); activeNav = -1; renderSidebar(); return; }
    if (h === '#/kit') { renderKit(); activeNav = -1; renderSidebar(); return; }
    if (h === '#/lexique') { renderLexique(); activeNav = -1; renderSidebar(); return; }
    renderHome();
    activeNav = -1;
    renderSidebar();
  }

  // ---------- pages ----------
  function renderHome() {
    const pct = totalPct();
    $('#main').innerHTML = `
      <div class="hero">
        <div class="hero-badge">🎓 Académie complète — 10 modules · 60 leçons · 3 projets</div>
        <h1>Maîtrisez <span class="grad">NGINX</span>, de la première configuration au déploiement</h1>
        <p class="sub">Leçons détaillées, exercices de difficulté croissante, quiz interactifs, bac à sable de configuration et projets d’évaluation — en français, Linux &amp; Windows.</p>
        <p class="hero-actions">
          <button class="btn primary" onclick="location.hash='#/m/0'">Commencer le module 1 →</button>
          <button class="btn" onclick="location.hash='#/guide'">📖 Guide</button>
          <button class="btn" onclick="location.hash='#/lexique'">📚 Lexique</button>
          ${pct === 100 ? '<button class="btn" onclick="location.hash=\'#/cert\'">Voir mon certificat 🎓</button>' : ''}
        </p>
        <div class="hero-progress">
          <div class="hero-progress-bar" style="width:${pct}%"></div>
          <span class="mono">Progression globale : ${pct} %</span>
        </div>
      </div>
      <div class="card-grid">
        ${MODULES.map((m, i) => {
          const p = modulePct(i);
          const full = p === 100;
          return `<button class="home-card${full ? ' done' : ''}" onclick="location.hash='#/m/${i}'">
            <span class="hc-emoji">${m.emoji}</span>
            <span class="hc-txt">
              <span class="hc-num">${String(i + 1).padStart(2, '0')} ${full ? '· terminé ✓' : ''}</span>
              <span class="hc-title">${m.title}</span>
              <span class="hc-meta">${m.summary}</span>
            </span>
            <span class="hc-bar"><i style="width:${m.lessons.length ? p : 4}%"></i></span>
            <span class="hc-chips">
              <span class="chip ${full ? 'green' : (m.lessons.length ? 'muted' : (m.id === 'projets' ? 'amber' : 'red'))}">${m.lessons.length ? p + ' %' : (m.id === 'projets' ? 'prêt' : 'à venir')}</span>
              ${m.lessons.length ? `<span class="chip muted">${m.lessons.length} leçon${m.lessons.length > 1 ? 's' : ''}</span>` : (m.id === 'projets' ? '<span class="chip muted">3 projets</span>' : '')}
            </span>
          </button>`;
        }).join('')}
      </div>
      <p class="foot-note">💡 L’app est installable (PWA) et fonctionne hors-ligne une fois installée.</p>`;
  }

  function renderModule(mi) {
    const m = MODULES[mi];
    if (!m) { renderHome(); return; }
    $('#main').innerHTML = `
      <div class="crumb"><a href="#" onclick="event.preventDefault();location.hash='#/'">Accueil</a> › <b>Module ${mi + 1}</b></div>
      <div class="lesson-head">
        <h1>${m.emoji} ${m.title}</h1>
        <p class="sub">${m.summary}</p>
        <p><span class="chip ${modulePct(mi) === 100 ? 'green' : 'muted'}">${modulePct(mi)} % complété</span></p>
      </div>
      ${m.lessons.length ? `
        <div class="prose">
          <h2>Leçons</h2>
          <ol class="lesson-list">
            ${m.lessons.map((l, li) => `
              <li>
                <button class="btn module-item lesson-row" onclick="location.hash='#/m/${mi}/l/${li}'">
                  <span class="lesson-row-main">${li + 1}. ${l.title}<br><span class="mi-meta">${l.excerpt || ''}</span></span>
                  <span class="lesson-row-state">${isDone(mi, li) ? '<span class="chip green">terminé ✓</span>' : '<span class="chip muted">à faire</span>'}</span>
                </button>
              </li>`).join('')}
          </ol>
        </div>
        ${m.project ? `
          <div class="project-card">
            <h2>🏆 Projet du module</h2>
            <p class="sub">${m.project.title}</p>
            <p>${m.project.goal}</p>
            <details>
              <summary style="cursor:pointer;font-weight:600">Objectifs & critères</summary>
              <p>${m.project.objectives.map((o) => `• ${o}`).join('<br>')}</p>
            </details>
          </div>` : ''}
      ` : m.id === 'projets' ? '' : `
        <div class="callout info"><span class="co-t">En préparation</span>
          Ce module est en cours de rédaction (leçons, exercices et quiz arrivent dans la prochaine itération).</div>
      `}
      <p>
        ${mi > 0 ? '<button class="btn" onclick="location.hash=\'#/m/' + (mi - 1) + '\'">← Précédent</button>' : ''}
        ${mi < MODULES.length - 1 ? '<button class="btn" style="float:right" onclick="location.hash=\'#/m/' + (mi + 1) + '\'">Suivant →</button>' : ''}
      </p>`;
  }

  function renderLesson(mi, li) {
    const m = MODULES[mi];
    if (!m || !m.lessons[li]) { renderModule(mi); return; }
    const l = m.lessons[li];
    const done = isDone(mi, li);

    $('#main').innerHTML = `
      <div class="crumb"><a href="#" onclick="event.preventDefault();location.hash='#/m/${mi}'">Module ${mi + 1}</a> › <b>${l.title}</b></div>
      <div class="lesson-head">
        <h1>${l.title}</h1>
        <p class="sub">${l.excerpt || ''}</p>
        <p>${done ? '<span class="chip green">Leçon terminée ✓</span>' : '<span class="chip muted">En cours</span>'}</p>
      </div>
      <div class="prose" id="lesson-content"></div>
      <div id="quiz-zone"></div>
      <div id="ex-zone"></div>
      <div class="lesson-nav">
        <button class="btn" onclick="location.hash='#/m/${mi}'">← Sommaire du module</button>
        ${li < m.lessons.length - 1 ? `<button class="btn primary" onclick="location.hash='#/m/${mi}/l/${li + 1}'">Leçon suivante →</button>` : ''}
      </div>`;

    const content = $('#lesson-content');
    content.innerHTML = mdParse(l.content.replace(/^\s*#\s+[^\n]+\n+/, ''));

    // echap ? non : le HTML des headings doit rester interprétable — mdParse gère tout.
    const recQ = (progress.modules[mi] && progress.modules[mi].lessons && progress.modules[mi].lessons[li]) || null;
    const answers = {};
    if (recQ && recQ.quiz) Object.keys(recQ.quiz).forEach((k) => { answers[k] = recQ.quiz[k]; });
    if (l.quiz && l.quiz.length) {
      $('#quiz-zone').insertAdjacentHTML('beforeend', '<div class="prose"><h2>🎯 Quiz de la leçon</h2></div><div id="quiz-root"></div>');
      LearnQuiz.renderQuiz($('#quiz-root'), l.quiz, {
        answers,
        onAnswer: (qi, res) => setQuiz(mi, li, qi, res)
      });
    }
    if (l.exercises && l.exercises.length) {
      $('#ex-zone').insertAdjacentHTML('beforeend', '<div class="prose"><h2>🧩 Exercices (difficulté croissante)</h2></div><div id="ex-root"></div>');
      const exRoot = $('#ex-root');
      l.exercises.forEach((ex, ei) => {
        const past = recQ && recQ.ex && recQ.ex[ei];
        LearnQuiz.renderEx(exRoot, ex, { past, onSolve: (pass, tries) => setEx(mi, li, ei, { pass, tries }) });
      });
    }
    visit(mi, li);
  }

  // ---------- guide ----------
  function renderGuide() {
    $('#main').innerHTML = `
      <div class="crumb"><a href="#" onclick="event.preventDefault();location.hash='#/'">Accueil</a> › <b>Guide d’utilisation</b></div>
      <div class="lesson-head"><h1>📖 Guide d’utilisation</h1></div>
      <div class="prose" id="guide-content"></div>
      <p style="margin-top:24px" class="lesson-nav"><button class="btn primary" onclick="location.hash='#/m/0'">Commencer le module 1 →</button></p>`;
    const gc = $('#guide-content');
    gc.innerHTML = (typeof window.GUIDE_MD === 'string') ? mdParse(window.GUIDE_MD.replace(/^\s*#\s+[^\n]+\n+/, '')) : '<div class="callout warn">Guide indisponible.</div>';
  }

  // ---------- kit de correction ----------
  function renderKit() {
    const K = (typeof window.KIT === 'object') ? window.KIT : [];
    const $m = $('#main');
    let html = `<div class="crumb"><a href="#" onclick="event.preventDefault();location.hash='#/'">Accueil</a> › <a href="#" onclick="event.preventDefault();location.hash='#/m/10'">Projets</a> › <b>Kit de correction</b></div>
      <div class="lesson-head"><h1>🧑‍🏫 Kit de correction — projets finaux</h1>
      <p class="sub">Grilles détaillées pour l’auto-évaluation et la correction des 3 projets. Pour chaque critère : barème 0-3 descriptif, démarche conseillée, commandes de vérification et erreurs fréquentes. Barème global : 50/50/55 points.</p></div>
      <div class="kit-nav">`;
    K.forEach((p) => { html += `<a class="btn btn-sm" href="#kit-${p.id}">${p.title.replace(/^Projet \d — /, '')}</a>`; });
    html += '</div>';
    K.forEach((p) => {
      html += `<div class="kit-card" id="kit-${p.id}">
        <h2>${p.title} <span class="tag">${p.level}</span></h2>
        <p class="kit-recap">${p.recap}</p>
        <p class="kit-total mono">${p.totaux}</p>
        <h3>📋 Grille d’évaluation détaillée</h3>`;
      p.grille.forEach((g) => {
        html += `<div class="kit-crit"><div class="kit-crit-head"><span>${g.crit}</span><span class="mono tag">${g.pts} pts</span></div>`;
        g.bar.forEach((b, i) => { html += `<div class="kit-bar"><b>${i}</b><span>${b}</span></div>`; });
        html += '</div>';
      });
      html += `<h3>🧭 Démarche recommandée</h3><ol class="kit-steps">` + p.demarche.map((d) => `<li>${d}</li>`).join('') + '</ol>';
      html += `<h3>🔍 Commandes de vérification</h3><pre class="mono kit-verifs">${p.verifs.join('\n')}</pre>`;
      html += `<h3>⚠️ Erreurs fréquentes</h3><div class="kit-errs">` + p.erreurs.map((e) => `<div class="kit-err"><b>${e[0]}</b> <span>${e[1]}</span></div>`).join('') + '</div>';
      html += `</div>`;
    });
    $m.innerHTML = html;
  }

  // ---------- lexique ----------
  function renderLexique() {
    const L = (typeof window.LEXIQUE === 'object') ? window.LEXIQUE : [];
    const groups = {};
    L.forEach(function (e) { if (!e || e.length < 3) return; (groups[e[0]] = groups[e[0]] || []).push([String(e[1]), String(e[2])]); });
    const letters = Object.keys(groups).sort();
    const main = $('#main');
    main.innerHTML = ''; // remplace le contenu précédent (pas d’accumulation)
    const head = document.createElement('div');
    head.className = 'lesson-head';
    head.innerHTML = "<h1>📚 Lexique du cours</h1>";
    const crumb = document.createElement('div');
    crumb.className = 'crumb';
    crumb.innerHTML = "<a href=\"#\" onclick=\"event.preventDefault();location.hash='#/'\">Accueil</a> › <b>Lexique</b>";
    main.appendChild(crumb);
    main.appendChild(head);
    const intro = document.createElement('p');
    intro.textContent = L.length + " termes utilisés dans le cours, expliqués simplement. Astuce : filtre par mot-clé pour retrouver une notion croisée (modules Proxy, Load balancing, TLS, Performance, Sécurité, Logs…).";
    main.appendChild(intro);
    const input = document.createElement('input');
    input.id = 'lex-f';
    input.className = 'lex-search';
    input.placeholder = 'Filtrer un terme (ex. proxy, cache, session…)…';
    main.appendChild(input);
    const nav = document.createElement('div');
    nav.className = 'lex-letters';
    letters.forEach(function (l) { const a = document.createElement('a'); a.href = '#lex-' + l; a.textContent = l; nav.appendChild(a); });
    main.appendChild(nav);
    const body = document.createElement('div');
    body.id = 'lex-body';
    letters.forEach(function (l) {
      const h2 = document.createElement('h2');
      h2.className = 'lex-letter';
      h2.id = 'lex-' + l;
      h2.textContent = l;
      body.appendChild(h2);
      const dl = document.createElement('dl');
      dl.className = 'lex-dl';
      groups[l].forEach(function (e) {
        const dt = document.createElement('dt');
        dt.textContent = e[0];
        const dd = document.createElement('dd');
        dd.textContent = e[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      body.appendChild(dl);
    });
    main.appendChild(body);
    input.addEventListener('input', function () {
      const q = input.value.trim().toLowerCase();
      $$('#lex-body dl').forEach(function (dl) {
        let show = false;
        dl.querySelectorAll('dt').forEach(function (dt) {
          const ok = !q || dt.textContent.toLowerCase().indexOf(q) !== -1 || (dt.nextElementSibling && dt.nextElementSibling.textContent.toLowerCase().indexOf(q) !== -1);
          dt.style.display = ok ? '' : 'none';
          if (dt.nextElementSibling) dt.nextElementSibling.style.display = ok ? '' : 'none';
          if (ok) show = true;
        });
        dl.style.display = show ? '' : 'none';
        const h2 = dl.previousElementSibling;
        if (h2 && h2.classList && h2.classList.contains('lex-letter')) h2.style.display = show ? '' : 'none';
      });
    });
  }

  // ---------- projets d’évaluation ----------
  function renderProjects() {
    const PJ = window.PROJECTS || [];
    progress.projects = progress.projects || {};
    const total = PJ.reduce((s, p) => s + p.grid.length, 0);
    $('#main').innerHTML = `
      <div class="crumb"><a href="#" onclick="event.preventDefault();location.hash='#/'">Accueil</a> › <b>Projets d’évaluation</b></div>
      <div class="lesson-head">
        <h1>🏆 Projets d’évaluation finaux</h1>
        <p class="sub">Trois projets de difficulté croissante pour valider la maîtrise de NGINX. Coche les objectifs au fur et à mesure, auto-évalue chaque critère, puis compare avec la solution modèle.</p>
        <p><a class="btn btn-sm" href="#/kit">🧑‍🏫 Kit de correction détaillé →</a></p>
      </div>
      <div class="prose">
        ${PJ.map((p, pi) => {
          const st = progress.projects[pi] || (progress.projects[pi] = { checks: {}, scores: {} });
          const checked = p.objectives.filter((o, oi) => st.checks[oi]).length;
          const scored = p.grid.reduce((s2, g, gi) => s2 + (+st.scores[gi] || 0), 0);
          const maxPts = p.grid.length * 3;
          const pctP = Math.round((checked / p.objectives.length) * 100);
          return `
          <div class="project-card" id="pj-${pi}">
            <h2>${p.level} — ${p.title}</h2>
            <p class="sub" style="color:var(--muted)">${p.goal}</p>
            <div class="row" style="margin:6px 0;gap:8px">
              <span class="chip amber">${pctP} % des objectifs cochés</span>
              <span class="chip ${scored >= maxPts * 0.7 ? 'green' : 'muted'}">auto-évaluation : ${scored}/${maxPts} pts</span>
            </div>
            <h3 style="margin-top:14px">Objectifs</h3>
            <ul class="obj-list">
              ${p.objectives.map((o, oi) => `
                <li>
                  <span class="obj-check ${st.checks[oi] ? 'on' : ''}" data-p="${pi}" data-c="${oi}">${st.checks[oi] ? '✓' : ''}</span>
                  <span>${o}</span>
                </li>`).join('')}
            </ul>
            <h3>Grille d’auto-évaluation (0–3 pts / critère)</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><th style="text-align:left;padding:6px">Critère</th><th style="width:110px">Points</th></tr>
              ${p.grid.map((g, gi) => `
                <tr><td style="padding:6px;border-top:1px solid var(--border)">${g}</td>
                <td><select data-p="${pi}" data-s="${gi}" style="width:100%;background:var(--panel2);color:var(--text);border:1px solid var(--border2);border-radius:6px;padding:4px">
                  ${[0, 1, 2, 3].map((v) => `<option value="${v}" ${+st.scores[gi] === v ? 'selected' : ''}>${v}</option>`).join('')}
                </select></td></tr>`).join('')}
            </table>
            <details class="answer"><summary>Voir la solution modèle</summary>
              <div class="ans-body">${p.answer.replace(/</g, '&lt;')}</div>
            </details>
          </div>`;
        }).join('')}
      </div>`;
    $('#main').addEventListener('click', (e) => {
      const chk = e.target.closest('.obj-check');
      if (!chk) return;
      const pi = +chk.dataset.p, ci = +chk.dataset.c;
      const st = progress.projects[pi];
      st.checks[ci] = !st.checks[ci];
      save();
      // refresh
      renderProjects();
    });
    $('#main').addEventListener('change', (e) => {
      if (!e.target.matches('select[data-p]')) return;
      const pi = +e.target.dataset.p, si = +e.target.dataset.s;
      progress.projects[pi].scores[si] = +e.target.value;
      save();
      renderProjects();
    });
  }

  // ---------- certificat ----------
  function renderCert() {
    if (!allCoursesDone()) {
      $('#main').innerHTML = `
        <div class="lesson-head"><h1>🎓 Certificat</h1></div>
        <div class="callout warn"><span class="co-t">Pas encore</span>
          Termine tous les modules de cours (les leçons de chaque module, quiz et exercices inclus) pour débloquer ton certificat.
          Progression actuelle : <b>${totalPct()} %</b>.</div>`;
      return;
    }
    progress.certName = progress.certName || '';
    $('#main').innerHTML = `
      <div class="certified" id="cert-area">
        <div style="font-size:42px">🎓</div>
        <h2>Certificat de réussite</h2>
        <p style="color:var(--muted)">Ce certifie que</p>
        <p class="name" style="font-size:22px">${progress.certName || '________________________'}</p>
        <p style="color:var(--muted)">a complété avec succès le parcours complet <b>Nginx Academy</b><br>
        — les ${MODULES.filter((m) => m.id !== 'projets').reduce((s, m) => s + m.lessons.length, 0)} leçons, ${'quiz'} et exercices, et a été initié aux projets d’évaluation.</p>
        <p style="font-size:20px;margin:8px 0">✓ ${totalPct()} % de progression</p>
        <label class="field" style="text-align:left">Ton nom : <input id="cert-name" value="${progress.certName.replace(/"/g, '&quot;')}" placeholder="Prénom Nom" style="width:100%;background:var(--panel2);border:1px solid var(--border2);color:var(--text);border-radius:7px;padding:8px 10px"></label>
        <p style="display:flex;gap:10px;justify-content:center;margin-top:10px">
          <button class="btn primary" onclick="window.print()">🖨 Imprimer / PDF</button>
        </p>
      </div>`;
    $('#cert-name').addEventListener('input', (e) => {
      progress.certName = e.target.value;
      save();
    });
  }

  // ---------- init ----------
  function init() {
    if (!window.MODULES || !MODULES.length) return;
    renderSidebar();
    route();
    updateProgressUI();
    $('#sidebar-count').textContent = totalPct() + ' %';

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW:', e));
    }
    let deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      $('#btn-install').classList.remove('hidden');
    });
    $('#btn-install').addEventListener('click', () => { if (deferredPrompt) deferredPrompt.prompt(); });
    window.addEventListener('appinstalled', () => { $('#btn-install').classList.add('hidden'); toast('Application installée ✔'); });

    const setOnline = () => $('#offline-dot').classList.toggle('off', !navigator.onLine);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOnline);
    setOnline();

    $('#btn-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
    $('#modal-close').addEventListener('click', closeModal);
    $('#modal-backdrop').addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') closeModal(); });
    $('#btn-reset').addEventListener('click', () => {
      openModal(`<h2>Réinitialiser ma progression ?</h2>
        <p>Cette action efface tout : leçons terminées, quiz, exercices, projets, certificat.</p>
        <p style="display:flex;gap:10px">
          <button class="btn danger" id="confirm-reset">Tout effacer</button>
          <button class="btn" onclick="document.getElementById('modal-close').click()">Annuler</button>
        </p>`);
      $('#confirm-reset').addEventListener('click', () => {
        progress = { modules: {} };
        save();
        closeModal();
        updateProgressUI();
        route();
        toast('Progression réinitialisée');
      });
    });
  }

  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', init);
})();
