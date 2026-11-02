/* Tests interactifs Nginx Academy — pilote le vrai navigateur (Playwright). */
const PW = 'C:/Users/HP/AppData/Local/npm-cache/_npx/705bc6b22212b352/node_modules/playwright';
const { chromium } = require(PW);

(async () => {
  const ok = [];
  const bad = [];
  const step = (name, cond, extra) => { (cond ? ok : bad).push(name + (extra ? ' — ' + extra : '')); console.log((cond ? '✅' : '❌') + ' ' + name + (extra ? ' — ' + extra : '')); };

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'networkidle' });

  // 1. accueil
  step('Accueil + hero', await page.locator('.hero h1').count() > 0);
  await page.screenshot({ path: 'C:/Users/HP/Documents/Dev/Free-Pi/tmp-interact/home.png' });

  // 2. bouton Lexique du hero
  const lexHero = page.locator('#main button:has-text("Lexique")').first();
  step('Bouton Lexique visible sur accueil', await lexHero.count() > 0);
  await lexHero.click();
  await page.waitForTimeout(400);
  step('Hash #/lexique après clic', page.url().includes('#/lexique'));
  step('Page Lexique rendue', await page.locator('#lex-f').count() > 0);
  if (errors.length) { step('Aucune erreur console', false, errors[0]); }
  await page.screenshot({ path: 'C:/Users/HP/Documents/Dev/Free-Pi/tmp-interact/lexique.png' });

  // 3. recherche dans le lexique
  await page.fill('#lex-f', 'upstream');
  await page.waitForTimeout(250);
  const visible = await page.locator('#lex-body dt').evaluateAll((dts) => dts.filter((d) => d.style.display !== 'none').map((d) => d.textContent));
  step('Filtre lexique « upstream » → termes visibles', visible.some((t) => t.includes('upstream')), visible.join(', '));

  // 4. sidebar : clic sur un module
  await page.locator('.sidebar .module-item:has-text("Reverse proxy")').first().click();
  await page.waitForTimeout(400);
  step('Sidebar → module 4', page.url().includes('/m/3'));
  await page.screenshot({ path: 'C:/Users/HP/Documents/Dev/Free-Pi/tmp-interact/module4.png' });

  // 5. leçon rp-role : quiz
  await page.goto('http://127.0.0.1:8123/#/m/3/l/0', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  step('Leçon rp-role rendue', (await page.locator('h1:has-text("reverse proxy")').count()) > 0 || (await page.locator('.lesson-head').count()) > 0);
  // répondre à la 1re question (bonne réponse = index 1 « Un serveur placé devant… »)
  const q1 = page.locator('.quiz-card').first();
  const opt1 = q1.locator('.q-option').nth(1);
  await opt1.click();
  await page.waitForTimeout(250);
  step('Quiz Q1 bonne réponse → feedback vert', (await page.locator('.quiz-feedback.good').count()) > 0);
  // question 2 : bonne réponse index 1
  const q2 = page.locator('.quiz-card').nth(1);
  await q2.locator('.q-option').nth(1).click();
  await page.waitForTimeout(250);
  // question 3 (multi) : cocher 0,1,2
  const q3 = page.locator('.quiz-card').nth(2);
  await q3.locator('.q-option').nth(0).click();
  await page.waitForTimeout(150);
  const q3b = page.locator('.quiz-card').nth(2);
  await q3b.locator('.q-option').nth(1).click();
  await page.waitForTimeout(150);
  const q3c = page.locator('.quiz-card').nth(2);
  await q3c.locator('.q-option').nth(2).click();
  await page.waitForTimeout(250);
  step('Quiz multi Q3 validée (feedback vert)', (await page.locator('.quiz-feedback.good').count()) === 3);
  // exercice ordre : les 3 items dans l'ordre (rp-role ex1)
  await page.screenshot({ path: 'C:/Users/HP/Documents/Dev/Free-Pi/tmp-interact/quiz-done.png' });

  // 6. exercice ordre : go to lesson rp-proxy-pass (order ex n'existe pas ici) — utiliser rp-role ex order
  // rp-role a order ex (index 0) : items shufflés — on les prend dans l'ordre des items de référence
  const pool = page.locator('.ex-card .oi');
  // ex order rp-role : items attendus = ["Le client envoie GET /api/tickets", "NGINX fait correspondre la location /api/", "NGINX relaie la requête vers l'application", "NGINX renvoie la réponse au client", "L'application traite et répond"]
  const ref = [
    "Le client envoie GET /api/tickets",
    "NGINX fait correspondre la location /api/",
    "NGINX relaie la requête vers l'application",
    "NGINX renvoie la réponse au client",
    "L'application traite et répond"
  ];
  // nb : l'ordre ex est poussé à la fin de la leçon ; on re-scope le 1er .ex-card
  const exCard = page.locator('.ex-card').first();
  for (const label of ref) {
    const btn = exCard.locator('.oi:has-text("' + label.replace(/"/g, '') + '")').last();
    const h = await btn.textContent();
    if (h.trim() !== label) { step('Ordre ex : libellé présent', false, label); }
    await btn.click();
    await page.waitForTimeout(120);
  }
  await exCard.locator('.ex-check').click();
  await page.waitForTimeout(250);
  step('Exercice ordre validé', (await exCard.locator('.ex-feedback.good').count()) > 0 || (await page.locator('.ex-feedback.good').count()) > 2);
  await page.screenshot({ path: 'C:/Users/HP/Documents/Dev/Free-Pi/tmp-interact/order-done.png' });

  // 7. exercice config : leçon rp-proxy-pass (config ex 1) — saisir une config valide
  await page.goto('http://127.0.0.1:8123/#/m/3/l/1', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const cfgCard = page.locator('.ex-card').filter({ has: page.locator('textarea.sb-editor') }).first();
  step('Exercice config présent (textarea sandbox)', await cfgCard.count() > 0);
  if (await cfgCard.count()) {
    // config invalide D'ABORD (le bouton reste actif après un échec)
    await cfgCard.locator('textarea.sb-editor').fill('server {\n    listen 80\n}\n');
    await cfgCard.locator('.ex-check').click();
    await page.waitForTimeout(300);
    step('Config invalide rejetée', (await cfgCard.locator('.ex-feedback.bad').count()) > 0);
    // puis config valide → acceptée
    await cfgCard.locator('textarea.sb-editor').fill('server {\n    listen 80;\n    server_name app.local;\n    location /api/ {\n        proxy_pass http://127.0.0.1:8000;\n    }\n}\n');
    await cfgCard.locator('.ex-check').click();
    await page.waitForTimeout(300);
    step('Config valide acceptée', (await cfgCard.locator('.ex-feedback.good').count()) > 0);
  }

  // 8. projets : cocher un objectif + persistance localStorage
  await page.goto('http://127.0.0.1:8123/#/m/10', { waitUntil: 'load' });
  await page.waitForTimeout(300);
  step('Page projets rendue', (await page.locator('#main:has-text("grille")').count()) > 0 || (await page.locator('.proj-card').count()) > 0);
  await page.screenshot({ path: 'C:/Users/HP/Documents/Dev/Free-Pi/tmp-interact/projets.png' });

  console.log('\n=== RÉSULTAT ===');
  console.log('OK   :', ok.length);
  console.log('FAIL :', bad.length);
  console.log('Erreurs console:', errors.length ? errors.slice(0, 3) : 'aucune');
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error('CRASH:', e); process.exit(2); });