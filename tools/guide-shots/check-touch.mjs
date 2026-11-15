// Plays the touch controls with real (emulated) touch events on a phone-sized landscape viewport and checks that every
// button reaches the engine. Usage: node tools/guide-shots/check-touch.mjs [outDir]   (dev server on :3000)
import { launch, sleep } from './cdp.mjs';
import { mkdirSync } from 'node:fs';

const out = process.argv[2] ?? 'tools/guide-shots/out';
mkdirSync(out, { recursive: true });
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' · ' + detail : ''}`); };

const { page, close } = await launch({ port: 9334 });
try {
  await page.viewport(844, 390, { mobile: true, touch: true, scale: 2 });
  await page.goto('http://localhost:3000/');
  await page.waitFor('!!window.__engine');
  check('touch device detected', await page.eval(`document.querySelector('.game-stage')?.dataset.touchControls === 'true'`));
  await page.eval(`(() => { const e = window.__engine; e.levelLoading = false; e.tutorialEnabled = false; e.campaign.award(1); e.campaign.pendingRuneChoices = []; e.selectLevel(1); })()`);
  await page.waitFor(`window.__engine.screen === 'playing' && !!document.querySelector('.skill-record')`);
  await sleep(600);
  const center = sel => page.eval(`(() => { const r = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
  const state = () => page.eval(`(() => { const e = window.__engine; return { x: e.player.x, y: e.player.y, rec: e.recorder.getStatus(), echoes: e.echoes.length, sel: e.selectedEcho,
    status: e.echo?.status, ping: !!e.pingTarget, combo: !!e.combo?.active, cd: e.attackCooldown, dodge: e.dodgeCooldown, screen: e.screen, swap: e.swapCooldown, muted: e.isMuted }; })()`);

  // Joystick: hold a finger in the lower-left zone and drag right.
  const zone = await page.eval(`(() => { const r = document.querySelector('.touch-stick-zone').getBoundingClientRect(); return { x: r.left + 90, y: r.bottom - 70 }; })()`);
  const before = await state();
  await page.touch('touchStart', [{ x: zone.x, y: zone.y, id: 1 }]);
  await page.touch('touchMove', [{ x: zone.x + 45, y: zone.y, id: 1 }]);
  await sleep(500);
  let s = await state();
  check('joystick moves the hero', s.x > before.x + 20, `x ${before.x.toFixed(0)} → ${s.x.toFixed(0)}`);
  // Multi-touch: attack with a second finger while the first keeps steering.
  const attack = await center('.skill-attack');
  await page.touch('touchStart', [{ x: zone.x + 45, y: zone.y, id: 1 }, { x: attack.x, y: attack.y, id: 2 }]);
  await sleep(120);
  s = await state();
  await page.touch('touchEnd', [{ x: zone.x + 45, y: zone.y, id: 1 }]);
  await sleep(300);
  const s2 = await state();
  check('attack while steering (two fingers)', s.combo || s.cd > 0, `combo ${s.combo}, cooldown ${s.cd.toFixed(2)}`);
  check('hero kept moving during the attack', s2.x > s.x - 1, `x ${s.x.toFixed(0)} → ${s2.x.toFixed(0)}`);
  await page.touch('touchEnd', []);
  await sleep(300);

  // Record → walk → stop → summon, all by touch.
  await page.tap((await center('.skill-record')).x, (await center('.skill-record')).y);
  await sleep(150);
  check('record button starts recording', (await state()).rec === 'recording');
  await page.touch('touchStart', [{ x: zone.x, y: zone.y, id: 1 }]);
  await page.touch('touchMove', [{ x: zone.x, y: zone.y - 45, id: 1 }]);
  await sleep(700);
  await page.touch('touchEnd', []);
  const rec = await center('.skill-record');
  await page.tap(rec.x, rec.y);
  await sleep(150);
  check('record button saves the recording', (await state()).rec !== 'recording', (await state()).rec);
  for (let i = 0; i < 2; i++) { const echo = await center('.skill-echo'); await page.tap(echo.x, echo.y); await sleep(250); }
  s = await state();
  check('summon button calls Echoes', s.echoes === 2, `${s.echoes} Echoes`);
  await page.shot(`${out}/touch-hud-echo-strip.png`, null, { format: 'png' });

  // The new Echo strip.
  check('Echo strip shown with Echoes on the field', !!(await center('.touch-echo-strip')));
  const selBefore = (await state()).sel;
  await page.tap((await center('.echo-select')).x, (await center('.echo-select')).y); await sleep(150);
  check('select Echo button changes the selection', (await state()).sel !== selBefore, `${selBefore} → ${(await state()).sel}`);
  const statusBefore = (await state()).status;
  await page.tap((await center('.echo-pause')).x, (await center('.echo-pause')).y); await sleep(150);
  check('pause/play button toggles the selected Echo', (await state()).status !== statusBefore, `${statusBefore} → ${(await state()).status}`);
  await page.tap((await center('.echo-pause')).x, (await center('.echo-pause')).y); await sleep(150);
  const posBefore = await state();
  await page.tap((await center('.echo-swap')).x, (await center('.echo-swap')).y); await sleep(200);
  s = await state();
  check('swap button swaps (or reports a blocked path)', s.swap > 0 || await page.eval(`/hoán đổi|swap/i.test(window.__engine.bannerMessage)`), `cooldown ${s.swap.toFixed(1)} · moved ${Math.hypot(s.x - posBefore.x, s.y - posBefore.y).toFixed(0)}px`);
  await page.tap((await center('.echo-mark')).x, (await center('.echo-mark')).y); await sleep(150);
  check('mark button arms mark mode', await page.eval(`document.querySelector('.echo-mark')?.getAttribute('aria-pressed') === 'true'`));
  const canvasSpot = await page.eval(`(() => { const r = document.querySelector('canvas').getBoundingClientRect(); return { x: r.left + r.width * .62, y: r.top + r.height * .3 }; })()`);
  await page.tap(canvasSpot.x, canvasSpot.y); await sleep(200);
  s = await state();
  check('next tap on the arena marks the target (no attack)', s.ping, `ping ${s.ping}`);

  // Skill, dodge, recall, pause, inventory → time potion, restart.
  const mana = await page.eval('window.__engine.mana.value');
  await page.tap((await center('.skill-skill')).x, (await center('.skill-skill')).y); await sleep(200);
  check('skill button uses the skill', await page.eval('window.__engine.skillCooldown > 0'), `MP ${mana.toFixed(0)} → ${(await page.eval('window.__engine.mana.value')).toFixed(0)}`);
  const dodgeBtn = await center('.skill-dodge');
  if (dodgeBtn) { await page.tap(dodgeBtn.x, dodgeBtn.y); await sleep(100); check('dodge button dodges (enemies alive)', (await state()).dodge > 0); }
  const recall = await center('.skill-recall');
  check('recall button is on screen', !!recall, JSON.stringify(recall));
  if (recall) { const n = (await state()).echoes; await page.tap(recall.x, recall.y); await sleep(150); check('recall button removes the oldest Echo', (await state()).echoes === n - 1); }
  await page.tap((await center('.hud-tools button[aria-label="Tạm dừng"]')).x, (await center('.hud-tools button[aria-label="Tạm dừng"]')).y); await sleep(300);
  check('pause button pauses', (await state()).screen === 'paused');
  await page.shot(`${out}/touch-pause.png`, null, { format: 'png' });
  const retry = await page.eval(`(() => { const b = [...document.querySelectorAll('.pause-menu-options button')].find(b => /Chơi lại/.test(b.textContent)); const r = b?.getBoundingClientRect(); return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null; })()`);
  await page.tap(retry.x, retry.y); await sleep(400);
  s = await state();
  check('retry from the pause menu restarts the level', s.screen === 'playing' && s.echoes === 0);
  await page.eval(`window.__engine.campaign.timeItems = 1; window.__engine.legTimeRemaining = 5`);
  await page.tap((await center('.hud-tools button[aria-label="Túi đồ"]')).x, (await center('.hud-tools button[aria-label="Túi đồ"]')).y); await sleep(500);
  await page.shot(`${out}/touch-inventory.png`, null, { format: 'png' });
  const potion = await page.eval(`(() => { const b = [...document.querySelectorAll('.trail-inventory button')].find(b => b.closest('article')?.querySelector('.supply-icon.time')); b?.scrollIntoView({block:'center'}); const r = b?.getBoundingClientRect(); return r && r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2, disabled: b.disabled } : null; })()`);
  check('inventory has a usable time-potion button', potion && !potion.disabled, JSON.stringify(potion));
  if (potion && !potion.disabled) { const t = await page.eval('window.__engine.legTimeRemaining'); await page.tap(potion.x, potion.y); await sleep(200); check('time potion adds time', (await page.eval('window.__engine.legTimeRemaining')) > t + 1); }
} catch (err) {
  check('script error', false, err.message);
} finally {
  await close();
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} PASS`);
process.exitCode = failed ? 1 : 0;
