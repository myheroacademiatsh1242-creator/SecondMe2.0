/** Load only the images needed to reveal the lobby or the selected level. */
import type { CharacterClass } from '../logic/campaign.ts';

export type LoadStage = 'core' | 'environment' | 'characters' | 'audio' | 'init';
export const STAGES: LoadStage[] = ['core', 'environment', 'characters', 'audio', 'init'];

interface Task { stage: LoadStage; name: string; weight: number; done: number; run(report: (f: number) => void): Promise<void> }

export interface Preload {
  /** 0..1, from completed work only. */
  progress: number;
  done: boolean;
  /** Per stage: [finished tasks, total tasks]. */
  counts: Record<LoadStage, [number, number]>;
  /** The earliest stage with unfinished work (what the screen says it is doing). */
  stage: LoadStage;
  totalFiles: number;
  loadedFiles: number;
  failed: string[];
  startedAt: number;
  finishedAt: number | null;
  whenDone: Promise<void>;
}

const BASE = import.meta.env?.BASE_URL ?? '/';
const CONCURRENCY = 6;
const TIMEOUT_MS = 6000;
type FileEntry = { path: string; bytes: number };
/** Decoded images by path, kept so the browser keeps them ready for the game's own images. */
const decoded = new Map<string, HTMLImageElement>();
let current: Preload | null = null;
let index: Promise<FileEntry[]> | null = null;

function assetIndex(): Promise<FileEntry[]> {
  index ??= fetch(`${BASE}assets/index.json`, { cache: 'no-store' })
    .then(r => (r.ok ? r.json() : []))
    .catch(() => [] as FileEntry[]);
  return index;
}

function stageOf(path: string): LoadStage {
  if (/\/(music|voice|sfx)\//.test(path)) return 'audio';
  if (/\/(blue-wizard|soldier|frost-guardian|mechanical|magic-effects)\//.test(path)) return 'characters';
  if (/\/(loading|menu)\//.test(path)) return 'core';
  return 'environment';
}

function withTimeout<T>(p: Promise<T>, name: string): Promise<T | void> {
  let timer = 0;
  return Promise.race([p, new Promise<void>((_, reject) => { timer = window.setTimeout(() => reject(new Error(`timeout: ${name}`)), TIMEOUT_MS); })])
    .finally(() => window.clearTimeout(timer));
}

function imageTask(path: string, bytes: number): Task {
  return {
    stage: stageOf(path), name: path, weight: Math.max(bytes, 1), done: 0,
    run: () => new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.decoding = 'async';
      const ready = () => { decoded.set(path, img); resolve(); };
      img.onload = () => { (img.decode ? img.decode() : Promise.resolve()).then(ready, ready); };
      img.onerror = () => reject(new Error(`image failed: ${path}`));
      img.src = BASE + path;
    }),
  };
}

/** Starts (once) and returns the shared first load; later calls get the same, possibly finished, one. */
export function startPreload(opts: { delayMs?: number } = {}): Preload {
  current ??= begin(async () => (await assetIndex()).filter(f => f.path === 'assets/ui/journey-forest-map.png' && !decoded.has(f.path)), opts.delayMs ?? 0);
  return current;
}

/** What entering a level needs. */
export interface LevelLoadSpec { levelId: number; character: CharacterClass; lang: 'en' | 'vi'; delayMs?: number }

const HERO_FOLDER: Record<CharacterClass, string> = { mage: 'blue-wizard', swordsman: 'soldier', mechanical: 'mechanical' };
/** Critical images only. Music, voices and sound effects load through their playback systems. */
export function levelUses(path: string, spec: LevelLoadSpec): boolean {
  const [, folder, rest] = path.split('/', 3);
  if (folder === 'forest' || folder === 'nature' || folder === 'magic-effects' || folder === 'biomes') return true;
  if (folder === HERO_FOLDER[spec.character]) return !rest.startsWith('Kael_');
  if (folder === 'aeris') return spec.character === 'mage';
  if (folder === 'enemies') return spec.levelId >= 2 && spec.levelId !== 6;
  if (folder === 'frost-guardian') return spec.levelId === 6;
  if (folder === 'demon-boss') return spec.levelId === 13 && ['sheet-fire.png', 'cave-arena.png', 'slime-idle.png', 'slime-transform-strip-fire.png'].includes(rest);
  if (folder === 'volcano') {
    return spec.levelId >= 10 && spec.levelId <= 12 && (
      path === 'assets/volcano/v2/basalt-atlas.png' ||
      (spec.levelId === 10 && path === 'assets/volcano/v2/wind-bridge-reference.png') ||
      path === `assets/volcano/v2/icefire-${spec.levelId}.png`
    );
  }
  return false;
}

export function startLevelPreload(spec: LevelLoadSpec): Preload {
  return begin(async () => (await assetIndex()).filter(f => levelUses(f.path, spec) && !decoded.has(f.path)), spec.delayMs ?? 0);
}

type Plan = () => Promise<FileEntry[]>;

function begin(plan: Plan, delayMs: number): Preload {
  let resolveDone!: () => void;
  const state: Preload = {
    progress: 0, done: false, stage: 'core', totalFiles: 0, loadedFiles: 0, failed: [],
    counts: { core: [0, 0], environment: [0, 0], characters: [0, 0], audio: [0, 0], init: [0, 0] },
    startedAt: performance.now(), finishedAt: null,
    whenDone: new Promise<void>(r => { resolveDone = r; }),
  };
  void run(state, plan, delayMs).then(() => {
    state.progress = 1; state.done = true; state.finishedAt = performance.now();
    resolveDone();
  });
  return state;
}

async function run(state: Preload, plan: Plan, delayMs: number) {
  // The asset list itself (tiny) comes first. Progress stays 0 until the list is known, so
  // the total never grows later and the bar can only move forward. No list: init still runs.
  const files = await plan();

  const tasks: Task[] = files.map(f => imageTask(f.path, f.bytes));
  const order = (t: Task) => STAGES.indexOf(t.stage);
  tasks.sort((a, b) => order(a) - order(b));
  const total = tasks.reduce((s, t) => s + t.weight, 0);
  state.totalFiles = files.length;
  for (const t of tasks) state.counts[t.stage][1]++;

  const update = () => {
    let sum = 0;
    for (const t of tasks) sum += t.weight * t.done;
    state.progress = Math.min(1, total ? sum / total : 1);
    state.stage = STAGES.find(s => state.counts[s][0] < state.counts[s][1]) ?? 'init';
  };
  const finish = (t: Task, error?: unknown) => {
    t.done = 1;
    state.counts[t.stage][0]++;
    if (t.stage !== 'init') state.loadedFiles++;
    if (error) {
      state.failed.push(t.name);
      if (import.meta.env?.DEV) console.warn('[loading]', t.name, error);
    }
    update();
  };
  const exec = (t: Task) => withTimeout(t.run(f => { t.done = Math.max(t.done, Math.min(0.999, f)); update(); }), t.name)
    .then(() => finish(t), e => finish(t, e));

  let next = 0;
  const pause = () => new Promise<void>(r => window.setTimeout(r, delayMs));
  const worker = async () => {
    while (next < tasks.length) {
      const t = tasks[next++];
      if (delayMs) await pause();   // dev-only slow-network stand-in (see LoadingScreen)
      await exec(t);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker));
  update();
}

/** For tests: forget the shared preload. */
export function resetPreloadForTests() { current = null; index = null; decoded.clear(); }
