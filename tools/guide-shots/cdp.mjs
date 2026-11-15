// Minimal Chrome DevTools Protocol driver (Node 24: built-in fetch + WebSocket, no dependencies).
// Used by the guide screenshot script and the touch-control checks; needs `npm run dev` on :3000.
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function launch({ port = 9333, headless = true } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'guide-shots-'));
  const proc = spawn(CHROME, [
    ...(headless ? ['--headless=new'] : []), `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars',
    '--window-size=1920,1080', 'about:blank'], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 50 && !version; i++) { await sleep(200); version = await fetch(`http://127.0.0.1:${port}/json/version`).then(r => r.json()).catch(() => null); }
  if (!version) throw new Error('Chrome did not start');
  const target = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json());
  const page = await connect(target.webSocketDebuggerUrl);
  return { page, close: async () => { try { page.ws.close(); } catch {} proc.kill(); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch {} } };
}

async function connect(url) {
  const ws = new WebSocket(url);
  await new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  let id = 0; const pending = new Map(); const listeners = [];
  ws.onmessage = m => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { const { ok, fail } = pending.get(msg.id); pending.delete(msg.id); msg.error ? fail(new Error(msg.error.message)) : ok(msg.result); }
    else for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })); });
  const page = {
    ws, send,
    on: fn => listeners.push(fn),
    /** Runs `expr` (string or function source) in the page and returns its JSON value; awaits promises. */
    async eval(expr) {
      const r = await send('Runtime.evaluate', { expression: typeof expr === 'function' ? `(${expr})()` : expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async viewport(width, height, { mobile = false, touch = false, scale = 1 } = {}) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile, screenOrientation: { type: width > height ? 'landscapePrimary' : 'portraitPrimary', angle: width > height ? 90 : 0 } });
      await send('Emulation.setTouchEmulationEnabled', { enabled: touch, maxTouchPoints: touch ? 5 : 1 });
      await send('Emulation.setEmitTouchEventsForMouse', { enabled: false });
    },
    async goto(url) { await send('Page.enable'); await send('Page.navigate', { url }); await sleep(1500); },
    async waitFor(expr, timeout = 20000) {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await page.eval(expr).catch(() => false)) return true; await sleep(150); }
      throw new Error('Timed out waiting for: ' + expr);
    },
    async shot(file, clip, { format = 'webp', quality = 82 } = {}) {
      const r = await send('Page.captureScreenshot', { format, quality: format === 'png' ? undefined : quality, ...(clip ? { clip: { ...clip, scale: clip.scale ?? 1 } } : {}), captureBeyondViewport: false });
      writeFileSync(file, Buffer.from(r.data, 'base64'));
      return file;
    },
    async key(code, key, { hold = 0, shift = false } = {}) {
      const vk = KEYCODES[code] ?? 0, modifiers = shift ? 8 : 0;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: vk, modifiers, text: key.length === 1 ? key : undefined });
      if (hold) await sleep(hold);
      await send('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: vk, modifiers });
    },
    async click(x, y, { button = 'left', shift = false } = {}) {
      const modifiers = shift ? 8 : 0;
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, modifiers });
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button, clickCount: 1, modifiers });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button, clickCount: 1, modifiers });
    },
    /** Touch points: [{x,y,id}] — 'touchStart' | 'touchMove' | 'touchEnd'. */
    touch(type, points) { return send('Input.dispatchTouchEvent', { type, touchPoints: points.map(p => ({ x: p.x, y: p.y, id: p.id ?? 0, radiusX: 4, radiusY: 4, force: 1 })) }); },
    async tap(x, y, id = 9) { await page.touch('touchStart', [{ x, y, id }]); await sleep(60); await page.touch('touchEnd', []); },
  };
  return page;
}

const KEYCODES = { KeyE: 69, KeyQ: 81, KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, KeyX: 88, KeyC: 67, KeyV: 86, KeyR: 82, KeyP: 80, KeyT: 84, KeyM: 77,
  Space: 32, Escape: 27, Enter: 13, ShiftLeft: 16, Digit1: 49, Digit2: 50, Digit3: 51, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };
