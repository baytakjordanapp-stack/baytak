const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', 'public');
const srv = http.createServer((q, s) => { let p = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (p.endsWith('/')) p += 'index.html'; fs.readFile(p, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' }[path.extname(p)] || 'text/plain' }); s.end(d); } }); }).listen(0);
(async () => {
  const port = srv.address().port, b = await chromium.launch(), fake = fs.readFileSync(path.join(__dirname, 'fake.js'), 'utf8');
  const errs = []; let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  async function open(configured) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 800 }, serviceWorkers: 'block' }); const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && !/font|net::/i.test(m.text()) && errs.push(m.text()));
    await pg.route('https://www.gstatic.com/**', (r) => r.fulfill({ contentType: 'text/javascript', body: fake }));
    await pg.route('https://fonts.googleapis.com/**', (r) => r.abort());
    if (configured) await pg.route('**/js/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: "export const firebaseConfig={apiKey:'x'};export const OPTIONS={photos:true,maxPhotos:5,maxListingsPerUser:30,listingDays:60,fetchLimit:100,contactEmail:'a@b.c'};" }));
    await pg.goto('http://localhost:' + port + '/index.html'); return pg;
  }
  // 1) غير مربوط: عروض تجريبية
  let pg = await open(false); await pg.waitForSelector('.card');
  ok(await pg.locator('.card').count() === 3, 'demo rent cards'); ok(await pg.locator('.note').count() >= 1, 'demo notice shown');
  await pg.click('#t-sale'); ok(await pg.locator('.card').count() === 3, 'demo sale cards');
  await pg.selectOption('#f-city', 'عمّان'); ok(await pg.locator('.card').count() === 1, 'city filter');
  await pg.click('.card'); ok(await pg.locator('#detail[open]').count() === 1, 'detail opens'); await pg.keyboard.press('Escape');
  // 2) مربوط (وهمي): دخول، نشر، عرض، تجديد، حذف
  pg = await open(true); await pg.waitForSelector('#who button');
  ok(await pg.locator('.card').count() === 3, 'empty db falls back to demo');
  await pg.click('#addBtn'); ok(await pg.locator('#formDlg[open]').count() === 0, 'form blocked when signed out');
  await pg.waitForSelector('.me');
  await pg.click('#addBtn'); await pg.waitForSelector('#formDlg[open]');
  await pg.fill('#n-area', 'عبدون'); await pg.fill('#n-price', '400'); await pg.fill('#n-phone', 'abc'); await pg.click('#submitBtn');
  ok((await pg.textContent('#formErr')).includes('رقم'), 'bad phone rejected');
  await pg.fill('#n-phone', '+962 79 123 4567'); await pg.fill('#n-map', 'https://evil.com/maps'); await pg.click('#submitBtn');
  ok((await pg.textContent('#formErr')).includes('خرائط'), 'bad map rejected');
  await pg.fill('#n-map', 'https://maps.app.goo.gl/abc123'); await pg.fill('#n-desc', '<img src=x onerror=alert(1)>');
  await pg.setInputFiles('#n-photos', path.join(root, 'icons', 'icon-512.png')); await pg.waitForSelector('#thumbs img');
  ok(await pg.locator('#thumbs img').count() === 1, 'photo added to form');
  await pg.click('#submitBtn'); await pg.waitForSelector('#formDlg:not([open])',{state:'attached'});
  await pg.waitForSelector('.card:not(:has(.badge.ex))');
  ok(await pg.locator('.card').count() === 1, 'listing published and shown (demo gone)');
  ok(await pg.locator('.card img.photo[src^="data:image/jpeg;base64,"]').count() === 1, 'card shows photo thumb');
  const stored = await pg.evaluate(() => Object.keys(window.__db['listings/' + Object.keys(window.__db.listings)[0] + '/photos'] || {}).length);
  ok(stored === 1, 'photo doc stored in subcollection');
  await pg.click('.card'); await pg.waitForSelector('#detail[open]');
  ok(await pg.locator('#detail a[href^="https://wa.me/962791234567"]').count() === 1, 'whatsapp link normalized');
  ok(await pg.locator('#detail a[href="https://maps.app.goo.gl/abc123"]').count() === 1, 'map link used');
  ok(await pg.locator('#detail img[src="x"]').count() === 0, 'no html injection');
  ok(await pg.locator('#detail .gallery img[src^="data:image/jpeg"]').count() === 1, 'detail gallery shows photo');
  await pg.keyboard.press('Escape');
  await pg.click('#t-mine'); await pg.waitForSelector('.card');
  await pg.click('.card'); await pg.getByRole('button', { name: 'تعليم كمؤجّر' }).click(); await pg.waitForSelector('.badge.done');
  ok(true, 'mark done');
  await pg.click('.card'); await pg.getByRole('button', { name: 'حذف العرض' }).click(); await pg.getByRole('button', { name: /مرة ثانية/ }).click();
  await pg.waitForSelector('.empty'); ok((await pg.textContent('.empty')).includes('ما نشرت'), 'delete works');
  ok(await pg.evaluate(() => Object.values(window.__db).every((c) => Object.keys(c).length === 0)), 'photos deleted with listing');
  await pg.screenshot({ path: path.join(__dirname, 'shot.png') });
  // admin + static pages
  for (const f of ['privacy.html', 'terms.html', 'admin.html']) { const p2 = await open(true); await p2.goto('http://localhost:' + port + '/' + f); await p2.waitForTimeout(300); }
  console.log('ERRORS:', JSON.stringify(errs)); ok(errs.length === 0, 'no console/page errors');
  await b.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
