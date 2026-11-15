// Opens the player guide at several screen sizes (phones portrait via the rotate gate, phones landscape, tablet, desktop)
// and checks layout and behaviour: no sideways scrolling, readable text, big-enough buttons, search, step pager, zoom,
// keys not reaching the game, Escape closes. Usage: node tools/guide-shots/check-guide.mjs [outDir]
import { launch, sleep } from './cdp.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'tools/guide-shots/out';
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' · ' + detail : ''}`); };
const E = 'window.__engine';

const VIEWPORTS = [
  { name: '360x800', w: 360, h: 800, touch: true }, { name: '390x844', w: 390, h: 844, touch: true }, { name: '430x932', w: 430, h: 932, touch: true },
  { name: '800x360', w: 800, h: 360, touch: true }, { name: '844x390', w: 844, h: 390, touch: true }, { name: '932x430', w: 932, h: 430, touch: true },
  { name: '768x1024', w: 768, h: 1024, touch: true }, { name: '1366x768', w: 1366, h: 768, touch: false }, { name: '1920x1080', w: 1920, h: 1080, touch: false },
];

const { page, close } = await launch({ port: 9336 });
const ev = x => page.eval(x);
const layout = () => ev(`(() => {
  const g = document.querySelector('.player-guide'); if (!g) return null;
  const main = document.querySelector('.player-guide-main');
  const small = [...g.querySelectorAll('p,li,span,dd,summary')].filter(el => el.offsetParent && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 13).length;
  const tiny = [...g.querySelectorAll('button')].filter(b => b.offsetParent && !b.closest('.player-guide-side:not(.is-open)')).filter(b => { const r = b.getBoundingClientRect(); return r.width && (r.height < 36 || r.width < 36); }).map(b => b.className || b.textContent.trim()).slice(0, 5);
  return { pageOverflow: document.documentElement.scrollWidth - innerWidth, mainOverflow: main.scrollWidth - main.clientWidth, small, tiny,
    width: g.getBoundingClientRect().width, nav: getComputedStyle(document.querySelector('.player-guide-side')).position };
})()`);

try {
  for (const v of VIEWPORTS) {
    await page.viewport(v.w, v.h, { mobile: v.touch, touch: v.touch, scale: 1 });
    await page.goto('http://localhost:3000/');
    await page.waitFor('!!window.__engine');
    const portrait = v.touch && v.h > v.w;
    if (portrait) {
      await page.waitFor(`!!document.querySelector('.landscape-guide')`, 8000);
      const r = await ev(`(() => { const r = document.querySelector('.landscape-guide').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      await page.tap(r.x, r.y);
    } else {
      // The real entry point outside a level: the Guide button in the camp heading.
      await ev(`${E}.goToLobby()`);
      await page.waitFor(`!!document.querySelector('.camp-guide')`, 8000);
      await sleep(400);
      const r = await ev(`(() => { const r = document.querySelector('.camp-guide').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (v.touch) await page.tap(r.x, r.y); else await page.click(r.x, r.y);
    }
    await page.waitFor(`!!document.querySelector('.player-guide')`, 5000).catch(() => {});
    await sleep(500);
    const l = await layout();
    check(`${v.name}: guide opens${portrait ? ' from the rotate gate' : ''}`, !!l);
    if (!l) continue;
    check(`${v.name}: no sideways scrolling`, l.pageOverflow <= 0 && l.mainOverflow <= 1, `page ${l.pageOverflow}, main ${l.mainOverflow}`);
    check(`${v.name}: no text under 13px`, l.small === 0, `${l.small} elements`);
    check(`${v.name}: buttons at least 36px`, l.tiny.length === 0, l.tiny.join(' | '));
    await page.shot(`${out}/guide-${v.name}.png`, null, { format: 'png' });
    // Go to the level-1 walkthrough (a steps block with real pictures) and the level-4 map page.
    await ev(`(() => { const s = document.querySelector('.player-guide-search input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, 'từng bước'); s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(200);
    const found = await ev(`[...document.querySelectorAll('.player-guide-results button')].map(b => b.textContent)`);
    check(`${v.name}: search finds the first-level walkthrough`, found.some(t => /từng bước/i.test(t)), found.slice(0, 3).join(' | '));
    if (l.nav === 'absolute') await ev(`document.querySelector('.player-guide-menu').click()`);
    await sleep(250);
    await ev(`[...document.querySelectorAll('.player-guide-results button')].find(b => /từng bước/i.test(b.textContent))?.click()`);
    await sleep(600);
    const steps = await ev(`document.querySelectorAll('.player-guide-step-dots button').length`);
    check(`${v.name}: walkthrough shows 6 steps`, steps === 6, `${steps}`);
    await ev(`[...document.querySelectorAll('.player-guide-step-nav button')].at(-1).click()`); await sleep(300);
    check(`${v.name}: next step works`, await ev(`/Bước 2\\//.test(document.querySelector('.player-guide-step-text').textContent)`));
    await sleep(500);
    await page.shot(`${out}/guide-${v.name}-steps.png`, null, { format: 'png' });
    await ev(`document.querySelector('.player-guide-steps .guide-zoom')?.click()`); await sleep(400);
    check(`${v.name}: picture opens enlarged`, await ev(`!!document.querySelector('.player-guide-zoom img')`));
    await page.key('Escape', 'Escape'); await sleep(250);
    check(`${v.name}: Escape closes the enlarged picture first`, await ev(`!document.querySelector('.player-guide-zoom') && !!document.querySelector('.player-guide')`));
    const l2 = await layout();
    check(`${v.name}: steps page has no sideways scrolling`, l2 && l2.pageOverflow <= 0 && l2.mainOverflow <= 1, l2 ? `page ${l2.pageOverflow}, main ${l2.mainOverflow}` : '');
    await page.key('Escape', 'Escape'); await sleep(300);
    check(`${v.name}: Escape closes the guide`, await ev(`!document.querySelector('.player-guide')`));
  }

  // In a level (desktop): the guide freezes play and keys never reach the game.
  await page.viewport(1366, 768, { mobile: false, touch: false });
  await page.goto('http://localhost:3000/');
  await page.waitFor('!!window.__engine');
  await ev(`(() => { const e = ${E}; e.levelLoading = false; e.currentLevelIdx = 0; e.restartLevel(); })()`);
  await page.waitFor(`${E}.screen === 'playing'`);
  await sleep(600);
  const btn = await ev(`(() => { const r = document.querySelector('.level-one-utilities button[aria-label="Sổ tay hướng dẫn"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await page.click(btn.x, btn.y); await sleep(500);
  check('in level: the HUD guide button opens the guide', await ev(`!!document.querySelector('.player-guide')`));
  const before = await ev(`({ x: ${E}.player.x, t: ${E}.legTimeRemaining, rec: ${E}.recorder.getStatus() })`);
  await page.key('KeyD', 'd', { hold: 600 }); await page.key('KeyE', 'e'); await sleep(400);
  const after = await ev(`({ x: ${E}.player.x, t: ${E}.legTimeRemaining, rec: ${E}.recorder.getStatus() })`);
  check('in level: keys do not move the hero or record while the guide is open', after.x === before.x && after.rec === before.rec, `x ${before.x}→${after.x}, ${before.rec}→${after.rec}`);
  check('in level: the leg timer is frozen while the guide is open', after.t === before.t, `${before.t}→${after.t}`);
  await page.key('Escape', 'Escape'); await sleep(300);
  check('in level: Escape closes the guide and play resumes', await ev(`!document.querySelector('.player-guide') && ${E}.screen === 'playing' && !${E}.guides.blocking`));
  await page.key('KeyD', 'd', { hold: 400 }); await sleep(100);
  check('in level: the hero moves again after closing', (await ev(`${E}.player.x`)) > after.x + 10);
  // A quick hint's "Details" opens the guide at that topic.
  await ev(`(() => { const e = ${E}; e.guides.seen.clear(); e.guides.offer('echo'); })()`); await sleep(400);
  const more = await ev(`!!document.querySelector('.mechanic-hint-more')`);
  check('quick hint shows a Details button', more);
  if (more) {
    await ev(`document.querySelector('.mechanic-hint-more').click()`); await sleep(500);
    check('Details opens the guide on the Echo page', await ev(`/Echo hoạt động/.test(document.querySelector('.player-guide-main h2')?.textContent ?? '')`), await ev(`document.querySelector('.player-guide-main h2')?.textContent`));
  }
} catch (err) {
  check('script error', false, err.message);
} finally {
  await close();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exitCode = failed ? 1 : 0;
