/* Nginx Academy — rendu des quiz et exercices.
   API : LearnQuiz.renderQuiz(container, quiz, opts{answers, onAnswer})
         LearnQuiz.renderEx(container, ex, opts{past, onSolve})   */
(function () {
  'use strict';
  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function renderQuiz(container, quiz, opts) {
    const answers = opts.answers || {}; // qIdx -> {chosen:[], correct:bool}
    const onAnswer = opts.onAnswer || (() => {});
    const frag = document.createDocumentFragment();
    quiz.forEach((q, qi) => {
      const card = document.createElement('div');
      card.className = 'quiz-card';
      const multi = q.correct.length > 1;
      const answered = !!(answers[qi] && answers[qi].correct !== undefined);
      const st = answers[qi];
      let html = `<div class="quiz-q">${qi + 1}. ${q.q}</div>`;
      if (multi) html += `<div class="quiz-hint">Plusieurs bonnes réponses — choisis-les toutes.</div>`;
      html += `<div class="q-options">`;
      q.options.forEach((opt, oi) => {
        let cls = 'q-option';
        if (answered) {
          cls += ' locked';
          if (st.chosen.includes(oi)) cls += st.correct ? ' correct' : ' wrong';
          else if (q.correct.includes(oi)) cls += ' correct';
        } else if (st && st.chosen.includes(oi)) cls += ' selected';
        html += `<button class="${cls}" data-qi="${qi}" data-oi="${oi}" ${answered ? 'disabled' : ''}>
          <span class="q-letter">${LETTERS[oi]}</span><span>${opt}</span></button>`;
      });
      html += '</div>';
      if (answered) {
        html += `<div class="quiz-feedback ${st.correct ? 'good' : 'bad'}">${st.correct ? '✅ Bonne réponse ! ' : '❌ Pas tout à fait. '}${q.explain || ''}${st.correct ? '' : ' <em>(Réponses attendues : ' + st.correctAns.join(', ') + ')</em>'}</div>`;
      }
      card.innerHTML = html;
      card.querySelectorAll('.q-option:not(.locked)').forEach((btn) => {
        btn.addEventListener('click', () => {
          const qiN = +btn.dataset.qi, oiN = +btn.dataset.oi;
          const prev = answers[qiN] || { chosen: [] };
          let chosen;
          if (multi) {
            chosen = prev.chosen.includes(oiN) ? prev.chosen.filter((x) => x !== oiN) : [...prev.chosen, oiN];
            const hasWrong = chosen.some((c) => !q.correct.includes(c));
            const complete = chosen.length === q.correct.length && !hasWrong;
            if (hasWrong || complete) {
              // verrouille : réponse fausse ou toutes les bonnes cochées
              const res = { chosen, correct: complete, correctAns: q.correct.map((c) => LETTERS[c]) };
              answers[qiN] = res;
              onAnswer(qiN, res);
            } else {
              answers[qiN] = { chosen };   // sélection en cours, pas encore verrouillée
            }
            renderQuiz(container, quiz, opts);
            return;
          }
          chosen = [oiN];
          const correct = q.correct.includes(oiN);
          const res = { chosen, correct, correctAns: q.correct.map((c) => LETTERS[c]) };
          answers[qiN] = res;
          onAnswer(qi, res);
          renderQuiz(container, quiz, opts);
        });
      });
      frag.appendChild(card);
    });
    container.innerHTML = '';
    container.appendChild(frag);
  }

  function renderEx(container, ex, opts) {
    const past = opts.past || null; // {pass, tries}
    const onSolve = opts.onSolve || (() => {});
    const card = document.createElement('div');
    card.className = 'ex-card';
    card.innerHTML = `
      <div class="ex-head"><span class="ex-type ${ex.diff}">${ex.diff}</span><span class="ex-t">Exercice — ${ex.title || 'Sans titre'}</span></div>
      ${ex.prompt ? `<p class="ex-stmt">${ex.prompt}</p>` : ''}
      <div class="ex-body"></div>
      <div class="ex-foot"><button class="btn primary ex-check">Vérifier</button>
        <button class="btn ex-reset">Recommencer</button>
        ${past && past.pass ? '<span class="chip green">résolu ✓</span>' : ''}
      </div>
      <div class="ex-feedback hidden"></div>`;
    const body = card.querySelector('.ex-body');
    const feed = card.querySelector('.ex-feedback');
    const state = { tries: (past && past.tries) || 0 };

    if (ex.type === 'mcq') {
      const optsHtml = ex.options.map((o, i) => `
        <button class="q-option" data-i="${i}"><span class="q-letter">${LETTERS[i]}</span><span>${o}</span></button>`).join('');
      body.innerHTML = `<div class="q-options ex-options">${optsHtml}</div>`;
      let chosen = null;
      body.querySelectorAll('.q-option').forEach((b) => b.addEventListener('click', () => {
        body.querySelectorAll('.q-option').forEach((x) => x.classList.remove('selected'));
        b.classList.add('selected');
        chosen = +b.dataset.i;
      }));
      card.querySelector('.ex-check').addEventListener('click', () => {
        if (chosen === null) { feed.className = 'ex-feedback bad'; feed.classList.remove('hidden'); feed.textContent = 'Choisis d’abord une réponse.'; return; }
        state.tries++;
        const pass = ex.answer.includes(chosen);
        feed.classList.remove('hidden');
        feed.className = 'ex-feedback ' + (pass ? 'good' : 'bad');
        feed.innerHTML = pass ? `✅ Correct ! ${ex.explain || ''}` : `❌ Pas cette fois. ${ex.explain || ''}`;
        onSolve(pass, state.tries);
        if (pass) card.querySelector('.ex-check').disabled = true;
      });
    } else if (ex.type === 'order') {
      const items = ex.items.slice(0);
      let build = [];
      body.innerHTML = `<div class="order"><div class="order-pool"><div class="order-label mono">Clique dans l’ordre →</div></div>
        <div class="order-build"><div class="order-label mono">Ta séquence</div></div></div>`;
      const pool = body.querySelector('.order-pool');
      const buildBox = body.querySelector('.order-build');
      function render() {
        pool.innerHTML = '<div class="order-label">Clique dans l’ordre →</div>' + items.map((it, i) => `<button class="chip oi" data-i="${i}">${it}</button>`).join('');
        buildBox.innerHTML = '<div class="order-label">Ta séquence</div> ' + (build.length ? build.map((it, i) => `<span class="chip oi done">${i + 1}. ${it}</span>`).join(' ') : '<span class="order-empty">— vide —</span>');
        pool.querySelectorAll('.oi').forEach((b) => b.addEventListener('click', () => {
          if (b.classList.contains('used')) return;
          build = [...build, b.textContent];
          b.classList.add('used');
          render();
        }));
      }
      render();
      card.querySelector('.ex-check').addEventListener('click', () => {
        if (build.length !== items.length) { feed.className = 'ex-feedback bad'; feed.classList.remove('hidden'); feed.textContent = 'Place tous les éléments avant de vérifier.'; return; }
        state.tries++;
        const pass = build.every((v, i) => v === ex.items[i]);
        feed.classList.remove('hidden');
        feed.className = 'ex-feedback ' + (pass ? 'good' : 'bad');
        feed.innerHTML = pass ? `✅ Bon ordre ! ${ex.explain || ''}` : `❌ L’ordre n’est pas bon. ${ex.explain || ''}`;
        onSolve(pass, state.tries);
        if (pass) card.querySelector('.ex-check').disabled = true;
      });
      card.querySelector('.ex-reset').addEventListener('click', () => { build = []; items.length = 0; ex.items.forEach((x) => items.push(x)); render(); feed.classList.add('hidden'); });
    } else if (ex.type === 'config') {
      let sandbox = null;
      const wrap = document.createElement('div');
      body.appendChild(wrap);
      sandbox = NginxSandbox.create(wrap, { initial: ex.skeleton, title: ex.title, hint: ex.hint || '', snippet: true });
      sandbox.setText(ex.skeleton);
      const check = card.querySelector('.ex-check');
      check.addEventListener('click', () => {
        const r = sandbox.validate();
        state.tries++;
        const used = [];
        (function walk(n) { n.directives.forEach((d) => used.push(d.name)); n.children.forEach(walk); })(r.tree);
        const rqMissing = (ex.required || []).filter((req) => !used.includes(req));
        const pass = r.ok && rqMissing.length === 0;
        feed.classList.remove('hidden');
        feed.className = 'ex-feedback ' + (pass ? 'good' : 'bad');
        feed.innerHTML = pass
          ? `✅ Configuration valide et complète ! ${ex.explain || ''}`
          : `❌ ${r.errors.length ? r.errors.map((e) => `L${e.line} : ${e.msg}`).join(' · ') : ''}${rqMissing.length ? ' · Directive(s) manquante(s) : ' + rqMissing.join(', ') : ''}`;
        onSolve(pass, state.tries);
        if (pass) check.disabled = true;
      });
      check.disabled = false;
    }
    container.appendChild(card);
  }

  window.L
  window.LearnQuiz = { renderQuiz, renderEx };
})();
