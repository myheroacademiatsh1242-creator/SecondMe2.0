// Captures the player guide's screenshots from the running game (dev server on :3000) and records, for each, the image
// size and named positions (hero, Echo, runes, gates, boss…) used to place annotations. Writes public/assets/guide/*.webp
// and src/components/guide/shots.json. Real input (keys, clicks, touches) drives the hero; window.__engine (dev only)
// is used only to open levels/screens directly and, for boss attack shots, to put the boss into that attack — those
// shots carry a `staged` note shown under the picture.
//   VITE_GAME_DEV_TOOLS=1 npm run dev   (window.__engine only exists then, see logic/devAccess.ts)
//   node tools/guide-shots/capture.mjs [only-prefix]
import { launch, sleep } from './cdp.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = 'public/assets/guide';
const REG = 'src/components/guide/shots.json';
const only = process.argv[2] ?? '';
mkdirSync(OUT, { recursive: true });
const shots = existsSync(REG) ? JSON.parse(readFileSync(REG, 'utf8')) : {};
const STAGED = {
  hero: { vi: 'đặt nhân vật cạnh quái để chụp lúc quái báo đòn', en: 'the hero was placed next to the enemy to catch its warning' },
  boss: { vi: 'boss được đặt vào đúng đòn này để chụp', en: 'the boss was put into this attack for the picture' },
  break: { vi: 'các trụ được phá ngay bằng một đòn mạnh để chụp', en: 'the pillars were broken instantly for the picture' },
  ritual: { vi: 'máu boss được đặt ở 60% để vào tế lễ', en: 'the boss was set to 60% health to start the ritual' },
};
const want = id => !only || id.startsWith(only);

const { page, close } = await launch({ port: 9335 });
const E = 'window.__engine';
const ev = expr => page.eval(expr);
const rect = sel => ev(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null; })()`);
let dpr = 1;

async function boot(w, h, mobile = false) {
  dpr = mobile ? 2 : 1;
  await page.viewport(w, h, { mobile, touch: mobile, scale: dpr });
  await page.goto('http://localhost:3000/');
  await page.waitFor('!!window.__engine');
  await ev(`${E}.levelLoading = false; ${E}.campaign.pendingRuneChoices = []; 0`);
}
async function enter(idx, tutorial = true) {
  await ev(`(() => { const e = ${E}; e.tutorialEnabled = ${tutorial}; e.currentLevelIdx = ${idx}; e.restartLevel(); })()`);
  await page.waitFor(`${E}.screen === 'playing'`);
  await sleep(900);
}
/** Canvas pixels (1280×720) → pixels of an image clipped to `clip` (CSS px) at `scale`. */
const mapper = async (clip, scale) => {
  const c = await rect('canvas');
  return p => ({ x: Math.round((c.x - clip.x + p.x * c.w / 1280) * scale), y: Math.round((c.y - clip.y + p.y * c.h / 720) * scale) });
};
/** mode 'canvas': just the arena at 1280×720 (marks stay in game pixels); 'view': the whole screen. */
async function shot(id, mode, marks = {}, staged = null, cssMarks = {}) {
  if (!want(id)) return;
  let clip, scale;
  if (mode === 'canvas') { const c = await rect('canvas'); clip = c; scale = 1280 / c.w; }
  else { const v = await ev('({ w: innerWidth, h: innerHeight })'); clip = { x: 0, y: 0, w: v.w, h: v.h }; scale = dpr; }
  const map = await mapper(clip, scale);
  const out = {};
  for (const [k, p] of Object.entries(marks)) if (p) out[k] = mode === 'canvas' ? { x: Math.round(p.x), y: Math.round(p.y) } : map(p);
  for (const [k, r] of Object.entries(cssMarks)) if (r) out[k] = { x: Math.round((r.x + r.w / 2 - clip.x) * scale), y: Math.round((r.y + r.h / 2 - clip.y) * scale) };
  await page.shot(`${OUT}/${id}.webp`, { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: mode === 'canvas' ? scale : 1 }, { quality: 80 });
  shots[id] = { w: Math.round(clip.w * scale), h: Math.round(clip.h * scale), marks: out, staged };
  console.log('shot', id, shots[id].w + '×' + shots[id].h, Object.keys(out).join(','));
}
const player = () => ev(`({ x: ${E}.player.x, y: ${E}.player.y })`);
async function walkTo(tx, ty, tol = 7) {
  for (let i = 0; i < 160; i++) {
    const p = await player();
    const dx = tx - p.x, dy = ty - p.y;
    if (Math.abs(dx) <= tol && Math.abs(dy) <= tol) return true;
    const vertical = Math.abs(dy) > tol;
    const [code, key] = vertical ? (dy < 0 ? ['KeyW', 'w'] : ['KeyS', 's']) : (dx < 0 ? ['KeyA', 'a'] : ['KeyD', 'd']);
    await page.key(code, key, { hold: Math.min(350, Math.max(25, Math.abs(vertical ? dy : dx) * 3.5)) });
  }
  throw new Error(`could not walk to ${tx},${ty}`);
}
const centre = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

try {
  // ---------------------------------------------------------------- Desktop
  await boot(1600, 900);

  // Level 1, step by step, with real keys.
  if (want('l1')) {
    await enter(0, true);
    const lvl = await ev(`({ plate: ${E}.currentLevel.plates[0], door: ${E}.currentLevel.doors[0], exit: ${E}.currentLevel.exit, spawn: ${E}.currentLevel.playerSpawn })`);
    const rune1 = centre(lvl.plate), gate1 = centre(lvl.door), exit = centre(lvl.exit), start = { x: lvl.spawn.x, y: lvl.spawn.y };
    await page.key('KeyE', 'e'); await sleep(250);
    await shot('l1-01-start', 'canvas', { player: await player(), rune1, start });
    await walkTo(start.x, rune1.y);
    await walkTo(rune1.x - 60, rune1.y);
    await shot('l1-02-walk', 'canvas', { player: await player(), rune1, start, corner: { x: start.x, y: rune1.y } });   // the route walked: up, then right
    await walkTo(rune1.x, rune1.y);
    await page.key('KeyE', 'e'); await sleep(300);
    await shot('l1-03-on-rune', 'canvas', { player: await player(), rune1 });
    await walkTo(rune1.x + 95, rune1.y);
    await page.key('KeyQ', 'q'); await sleep(450);
    await shot('l1-04-summon', 'canvas', { player: await player(), echo: await ev(`({ x: ${E}.echo.x, y: ${E}.echo.y })`), rune1 });
    await page.waitFor(`${E}.currentLevel.plates[0].isPressed && ${E}.currentLevel.doors[0].openProgress > .95`, 15000);
    await sleep(300);
    await shot('l1-05-echo-holds', 'canvas', { player: await player(), echo: await ev(`({ x: ${E}.echo.x, y: ${E}.echo.y })`), rune1, gate1 });
    await walkTo(rune1.x + 95, gate1.y);
    await walkTo(gate1.x + 90, gate1.y);
    await sleep(200);
    await shot('l1-06-cross', 'canvas', { player: await player(), echo: await ev(`({ x: ${E}.echo.x, y: ${E}.echo.y })`), gate1, exit });
  }

  // HUD and inventory (level 2).
  if (want('hud') || want('inventory') || want('enemy')) {
    await enter(1, false);
    await shot('hud-desktop', 'view');
    if (want('inventory')) {
      const bag = await rect('.level-one-utilities button[aria-label="Túi đồ"]');
      await page.click(bag.x + bag.w / 2, bag.y + bag.h / 2); await sleep(900);
      await shot('inventory', 'view');
      await page.key('Escape', 'Escape'); await sleep(300);
      await ev(`document.dispatchEvent(new Event('close-trail-inventory'))`); await sleep(400);
    }
    if (want('enemy')) {
      await enter(1, false);
      const foe = await ev(`(() => { const g = ${E}.enemies.find(e => e.kind === 'goblin'); return { x: g.x, y: g.y }; })()`);
      await ev(`(() => { const e = ${E}; e.player.x = ${foe.x + 55}; e.player.y = ${foe.y - 10}; e.invulnerability = 30; })()`);
      await page.waitFor(`${E}.enemies.some(e => e.mode === 'warning' && e.hp > 0)`, 8000);
      await sleep(150);
      const warn = await ev(`(() => { const g = ${E}.enemies.find(e => e.mode === 'warning'); return { x: g.targetX, y: g.targetY }; })()`);
      await shot('enemy-warning', 'canvas', { warning: warn, player: await player() }, STAGED.hero);
    }
  }

  // Every level's map at its start, without the hint boxes.
  for (let idx = 0; idx < 13; idx++) {
    if (!want(`map-${idx + 1}`) && !want('map')) continue;
    if (only && only !== 'map' && only !== `map-${idx + 1}`) continue;
    await enter(idx, false);
    await shot(`map-${idx + 1}`, 'canvas');
  }

  // Frost Guardian.
  if (want('boss1')) {
    await enter(5, false);
    await ev(`(() => { const e = ${E}; e.beginBossFight(); })()`);
    await sleep(1200);
    await ev(`(() => { const e = ${E}; e.player.x = 640; e.player.y = 560; e.invulnerability = 120; e.boss.x = 640; e.boss.y = 330; e.boss.mode = 'recover'; e.boss.timer = 3; })()`);
    await sleep(400);
    const b = async () => ev(`({ x: ${E}.boss.x, y: ${E}.boss.y })`);
    const pillars = await ev(`${E}.boss.pillars.map(p => ({ x: p.x, y: p.y }))`);
    await shot('boss1-overview', 'canvas', { boss: await b(), player: await player(), pillar1: pillars[0], pillar2: pillars[1], pillar3: pillars[2], pillar4: pillars[3] });
    await ev(`(() => { const e = ${E}, b = e.boss; e.player.x = 700; e.player.y = 430; b.x = 640; b.y = 330; b.mode = 'warning'; b.attack = 'melee'; b.warningDuration = 1.15; b.timer = 1.15; b.targetX = e.player.x; b.targetY = e.player.y; b.attackFacingRight = true; })()`);
    await sleep(500);
    await shot('boss1-slam', 'canvas', { boss: await b(), target: await player() }, STAGED.boss);
    await sleep(1500);
    await ev(`(() => { const e = ${E}, b = e.boss; e.player.x = 640; e.player.y = 600; b.mode = 'warning'; b.attack = 'triple'; b.warningDuration = 1.15; b.timer = .05; b.targetX = 640; b.targetY = 600; })()`);
    await sleep(700);
    await shot('boss1-rays', 'canvas', { boss: await b() }, STAGED.boss);
    await sleep(2500);
    await ev(`(() => { const e = ${E}, b = e.boss; b.iceRays = []; b.mode = 'warning'; b.attack = 'volley'; b.warningDuration = 1.15; b.timer = .05; b.targetX = 640; b.targetY = 600; })()`);
    await sleep(1100);
    await shot('boss1-volley', 'canvas', { boss: await b() }, STAGED.boss);
    await sleep(3000);
    await ev(`(() => { const e = ${E}, b = e.boss; b.projectiles = []; b.mode = 'stalking'; b.timer = 4; for (const p of b.pillars) e.damageCombatTarget(p.x, p.y, 999, 40); })()`);
    await sleep(350);
    await shot('boss1-open', 'canvas', { boss: await b() }, STAGED.break);
  }

  // Ember Demon.
  if (want('boss2')) {
    await enter(12, false);
    await ev(`(() => { const e = ${E}; for (const s of e.enemies) if (s.slimeHue === 0) s.hp = 0; })()`);
    await page.waitFor(`!!${E}.boss`, 6000);
    await ev(`${E}.beginBossFight()`);
    await sleep(1500);
    await ev(`(() => { const e = ${E}; e.player.x = 640; e.player.y = 560; e.invulnerability = 120; e.boss.x = 640; e.boss.y = 300; e.boss.mode = 'recover'; e.boss.timer = 3; })()`);
    await sleep(500);
    const b = async () => ev(`({ x: ${E}.boss.x, y: ${E}.boss.y })`);
    await shot('boss2-overview', 'canvas', { boss: await b(), player: await player() });
    await ev(`(() => { const e = ${E}, b = e.boss; e.player.x = 700; e.player.y = 400; b.x = 620; b.y = 300; b.mode = 'warning'; b.attack = 'melee'; b.timer = .85; b.targetX = e.player.x; b.targetY = e.player.y; b.demon.modeAge = 0; })()`);
    await sleep(400);
    await shot('boss2-cleave', 'canvas', { boss: await b(), target: await player() }, STAGED.boss);
    await sleep(1500);
    await ev(`(() => { const e = ${E}, b = e.boss; e.player.x = 300; e.player.y = 560; b.hp = Math.round(b.maxHp * .6); b.mode = 'recover'; b.timer = 2; b.demon.modeAge = 0; })()`);
    await page.waitFor(`${E}.boss.mode === 'ritual'`, 6000);
    await sleep(1100);
    await shot('boss2-ritual', 'canvas', { boss: await b(), ...Object.fromEntries((await ev(`${E}.boss.demon.cores.map(c => ({ x: c.x, y: c.y }))`)).map((c, i) => [`core${i + 1}`, c])) }, STAGED.ritual);
    await ev(`${E}.boss.timer = 0`);
    await page.waitFor(`${E}.boss.mode === 'charge_warning'`, 4000);
    await sleep(600);
    await shot('boss2-charge', 'canvas', { boss: await b() }, STAGED.ritual);
    await ev(`(() => { const b = ${E}.boss; b.mode = 'stunned'; b.timer = 4.5; b.demon.stunned = 4.5; b.demon.heatShield = 0; b.demon.overheated = false; b.demon.modeAge = 0; })()`);
    await sleep(400);
    await shot('boss2-stunned', 'canvas', { boss: await b() }, STAGED.boss);
  }

  // The item-packing window shown before every battle (the stock is given two potions so the slots are visible).
  if (want('battle-prep')) {
    await ev(`${E}.goToLobby()`); await sleep(1200);
    await ev(`(() => { const e = ${E}; e.campaign.timeItems = 2; e.campaign.supplies.healSmall = 3; e.requestBattleStart(() => {}); })()`);
    await page.waitFor(`!!document.querySelector('.battle-preparation')`, 6000);
    await sleep(1200);
    await shot('battle-prep', 'view', {}, { vi: 'kho được thêm 2 bình thời gian và 3 bình hồi phục nhỏ để thấy các ô', en: 'the stock was given 2 time potions and 3 small healing potions to show the slots' });
    await ev(`${E}.cancelBattleStart()`); await sleep(400);
  }

  // Camp screens.
  if (want('heroes') || want('shop')) {
    await ev(`${E}.goToLobby()`); await sleep(1500);
    if (want('heroes')) { await ev(`${E}.openCharacters()`); await sleep(1800); await shot('heroes', 'view'); await ev(`${E}.goToLobby()`); await sleep(1200); }
    if (want('shop')) { await ev(`${E}.openShop()`); await sleep(1800); await shot('shop', 'view'); }
  }

  // ---------------------------------------------------------------- Phone (landscape, touch)
  if (want('mobile')) {
    await boot(844, 390, true);
    await ev(`${E}.campaign.award(1); ${E}.campaign.pendingRuneChoices = []; 0`);
    await enter(1, false);
    const tapAt = async sel => { const r = await rect(sel); await page.tap(r.x + r.w / 2, r.y + r.h / 2); await sleep(200); };
    const zone = await rect('.touch-stick-zone');
    await tapAt('.skill-record');
    await page.touch('touchStart', [{ x: zone.x + 56, y: zone.y + zone.h - 70, id: 1 }]);
    await page.touch('touchMove', [{ x: zone.x + 56, y: zone.y + zone.h - 115, id: 1 }]);
    await sleep(800);
    await page.touch('touchEnd', []);
    await tapAt('.skill-record');
    await tapAt('.skill-echo'); await sleep(300);
    await tapAt('.skill-echo'); await sleep(900);
    await shot('mobile-hud', 'view', {}, null, {
      stick: await rect('.touch-stick'), echoStrip: await rect('.touch-echo-strip'), attack: await rect('.skill-attack'), pause: await rect('.hud-tools button[aria-label="Tạm dừng"]'),
    });
    await shot('mobile-echo', 'view', {}, null, {
      select: await rect('.echo-select'), pause: await rect('.echo-pause'), swap: await rect('.echo-swap'), mark: await rect('.echo-mark'),
    });
  }
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  writeFileSync(REG, JSON.stringify(shots, null, 1) + '\n');
  await close();
}
