import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, Keyboard, Menu, Search, X } from 'lucide-react';
import { GUIDE, CONTROLS, ENEMY_NAMES, fold, pageForTopic, pageText, type Block, type Figure, type L, type Page } from './guideContent.ts';
import { ALL_LEVEL_FACTS, type LevelFacts } from './levelFacts.ts';
import { GuideFigure, Label, shots, type ShotInfo } from './GuideFigure.tsx';
import { GUIDE_TOPICS, type GuideTopic } from '../../game/logic/tutorials.ts';
import { LEVELS } from '../../game/logic/levels.ts';
import { translate } from '../../i18n.ts';
import './PlayerGuide.css';

const READ_KEY = 'second-me-guide-read-v1';
/** Dispatch on document to open the guide from anywhere (AdventureApp listens): `document.dispatchEvent(new Event(OPEN_GUIDE_EVENT))`. */
export const OPEN_GUIDE_EVENT = 'open-player-guide';
export const openPlayerGuide = () => document.dispatchEvent(new Event(OPEN_GUIDE_EVENT));
const readStore = (): Set<string> => { try { const v = JSON.parse(localStorage.getItem(READ_KEY) ?? '[]'); return new Set(Array.isArray(v) ? v.filter(x => typeof x === 'string') : []); } catch { return new Set(); } };
const saveRead = (s: Set<string>) => { try { localStorage.setItem(READ_KEY, JSON.stringify([...s])); } catch { /* storage can be unavailable */ } };
const flat = GUIDE.flatMap(s => s.pages.map(p => ({ section: s, page: p })));
const key = (sectionId: string, pageId: string) => `${sectionId}/${pageId}`;
const tr = (x: L | string, lang: 'vi' | 'en') => typeof x === 'string' ? x : x[lang];

/**
 * The player's field guide: categories A–G, search, real annotated screenshots, a page per level and per boss.
 * Rendered into document.body (outside the scaled game stage) so it lays out against the real viewport; it stops every
 * key from reaching the game while open (the engine also freezes play while the in-level library is open).
 */
export function PlayerGuide({ lang, topic, onClose }: { lang: 'vi' | 'en'; topic?: GuideTopic | null; onClose: () => void }) {
  const vi = lang === 'vi';
  const start = (topic && pageForTopic(topic)) ?? { section: GUIDE[0].id, page: GUIDE[0].pages[0].id };
  const [at, setAt] = useState(start);
  const [query, setQuery] = useState('');
  const [drawer, setDrawer] = useState(false);
  const [zoom, setZoom] = useState<{ fig: Figure; extra?: (info: ShotInfo) => React.ReactNode } | null>(null);
  const [read, setRead] = useState(readStore);
  const root = useRef<HTMLDivElement>(null), main = useRef<HTMLElement>(null), search = useRef<HTMLInputElement>(null);
  const index = flat.findIndex(f => f.section.id === at.section && f.page.id === at.page);
  const current = flat[Math.max(0, index)];
  const results = useMemo(() => {
    const q = fold(query.trim());
    return q ? flat.filter(f => pageText(f.page, lang).includes(q) || fold(f.section.title[lang]).includes(q)) : null;
  }, [query, lang]);

  const go = (section: string, page: string) => { setAt({ section, page }); setDrawer(false); main.current?.scrollTo({ top: 0 }); };
  const step = (d: number) => { const n = flat[index + d]; if (n) go(n.section.id, n.page.id); };

  useEffect(() => {   // reading a page marks it read; the contents keep the open page in view
    root.current?.querySelector('.player-guide-nav button[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    const k = key(current.section.id, current.page.id);
    if (read.has(k)) return;
    const next = new Set(read); next.add(k); setRead(next); saveRead(next);
  }, [current]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLElement>('.player-guide-close')?.focus();
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement;
      e.stopPropagation();   // nothing reaches the game while the guide is open
      if (e.key === 'Escape') { e.preventDefault(); if (zoom) setZoom(null); else if (drawer) setDrawer(false); else onClose(); return; }
      if (typing) return;
      if (e.key === '/') { e.preventDefault(); search.current?.focus(); }
      else if (e.key === 'ArrowRight' && !zoom) { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft' && !zoom) { e.preventDefault(); step(-1); }
      else if (e.key === 'Tab') {
        const items = Array.from(root.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,[href]') ?? []).filter(el => el.offsetParent !== null);
        const first = items[0], last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    const block = (e: KeyboardEvent) => e.stopPropagation();
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', block, true);
    return () => { window.removeEventListener('keydown', onKey, true); window.removeEventListener('keyup', block, true); previous?.focus?.(); };
  }, [zoom, drawer, index, onClose]);

  const nav = <nav className="player-guide-nav" aria-label={vi ? 'Mục lục' : 'Contents'}>
    <label className="player-guide-search"><Search aria-hidden="true"/><input ref={search} type="search" value={query} onChange={e => setQuery(e.target.value)}
      placeholder={vi ? 'Tìm: echo, cổng, boss, phím…' : 'Search: echo, gate, boss, keys…'} aria-label={vi ? 'Tìm trong sổ tay' : 'Search the guide'}/></label>
    {results ? <div className="player-guide-results" role="list">
      {results.length ? results.map(f => <button role="listitem" key={key(f.section.id, f.page.id)} className={f === current ? 'is-current' : ''} onClick={() => go(f.section.id, f.page.id)}>
        <small>{f.section.letter} · {f.section.title[lang]}</small><span>{f.page.title[lang]}</span></button>)
        : <p>{vi ? 'Không tìm thấy mục nào.' : 'Nothing found.'}</p>}
    </div> : GUIDE.map(s => <section key={s.id} className="player-guide-cat">
      <h3><b>{s.letter}</b>{s.title[lang]}</h3>
      {s.pages.map(p => { const k = key(s.id, p.id); return <button key={k} className={s.id === current.section.id && p.id === current.page.id ? 'is-current' : ''} aria-current={s.id === current.section.id && p.id === current.page.id ? 'page' : undefined} onClick={() => go(s.id, p.id)}>
        <span>{s.id === 'levels' && p.id.startsWith('level-') ? levelTitle(Number(p.id.slice(6)), lang) : p.title[lang]}</span>{read.has(k) && <Check aria-label={vi ? 'đã đọc' : 'read'}/>}</button>; })}
    </section>)}
  </nav>;

  const ui = <div ref={root} className="player-guide-backdrop" onPointerDown={e => e.stopPropagation()}>
    <div className="player-guide" role="dialog" aria-modal="true" aria-labelledby="player-guide-title">
      <header className="player-guide-head">
        <button type="button" className="player-guide-menu" onClick={() => setDrawer(!drawer)} aria-expanded={drawer} aria-label={vi ? 'Mục lục' : 'Contents'}><Menu aria-hidden="true"/></button>
        <span className="player-guide-crest"><BookOpen aria-hidden="true"/></span>
        <div><small>{vi ? 'SỔ TAY TIẾNG VỌNG' : 'THE ECHO FIELD GUIDE'}</small><strong id="player-guide-title">{vi ? 'Hướng dẫn chơi' : 'How to play'}</strong></div>
        <button type="button" className="player-guide-keys" onClick={() => go('controls', 'pc')}><Keyboard aria-hidden="true"/><span>{vi ? 'Tra phím' : 'Keys'}</span></button>
        <button type="button" className="player-guide-close" onClick={onClose} aria-label={vi ? 'Đóng sổ tay' : 'Close the guide'}><X aria-hidden="true"/><span>{vi ? 'Đóng' : 'Close'}</span></button>
      </header>
      <div className="player-guide-body">
        <div className={`player-guide-side${drawer ? ' is-open' : ''}`}>{nav}</div>
        {drawer && <button type="button" className="player-guide-scrim" aria-label={vi ? 'Đóng mục lục' : 'Close contents'} onClick={() => setDrawer(false)}/>}
        <main ref={main} className="player-guide-main" tabIndex={-1}>
          <p className="player-guide-crumb">{current.section.letter} · {current.section.title[lang]}</p>
          <h2>{current.section.id === 'levels' && current.page.id.startsWith('level-') ? levelTitle(Number(current.page.id.slice(6)), lang) : current.page.title[lang]}</h2>
          {current.page.blocks.map((b, i) => <BlockView key={`${current.page.id}-${i}`} block={b} lang={lang} zoom={(fig, extra) => setZoom({ fig, extra })} go={go}/>)}
          <footer className="player-guide-pager">
            <button type="button" disabled={index <= 0} onClick={() => step(-1)}><ArrowLeft aria-hidden="true"/><span>{flat[index - 1]?.page.title[lang] ?? ''}</span></button>
            <button type="button" disabled={index >= flat.length - 1} onClick={() => step(1)}><span>{flat[index + 1]?.page.title[lang] ?? ''}</span><ArrowRight aria-hidden="true"/></button>
          </footer>
          {lang === 'en' && <p className="player-guide-note">Level names and in-game texts follow the language chosen in Settings.</p>}
        </main>
      </div>
    </div>
    {zoom && <div className="player-guide-zoom" role="dialog" aria-modal="true" aria-label={zoom.fig.alt[lang]} onClick={() => setZoom(null)}>
      <button type="button" className="player-guide-close" onClick={() => setZoom(null)} aria-label={vi ? 'Đóng ảnh' : 'Close picture'}><X aria-hidden="true"/></button>
      <div className="player-guide-zoom-frame" onClick={e => e.stopPropagation()}><GuideFigure fig={zoom.fig} lang={lang} extra={zoom.extra} large/></div>
    </div>}
  </div>;
  return createPortal(ui, document.body);
}

function levelTitle(id: number, lang: 'vi' | 'en') {
  const level = LEVELS.find(l => l.id === id);
  return `${lang === 'vi' ? 'Màn' : 'Level'} ${id} — ${level ? translate(level.subtitle, lang) : ''}`;
}

function BlockView({ block: b, lang, zoom, go }: { block: Block; lang: 'vi' | 'en'; zoom: (fig: Figure, extra?: (info: ShotInfo) => React.ReactNode) => void; go: (s: string, p: string) => void }) {
  const vi = lang === 'vi';
  switch (b.t) {
    case 'p': return <p>{b.text[lang]}</p>;
    case 'note': return <aside className={`player-guide-callout is-${b.tone ?? 'info'}`}>{b.text[lang]}</aside>;
    case 'list': return <ul>{b.items.map((x, i) => <li key={i}>{x[lang]}</li>)}</ul>;
    case 'figure': return <GuideFigure fig={b.fig} lang={lang} onZoom={() => zoom(b.fig)}/>;
    case 'steps': return <StepsView steps={b.steps} lang={lang} zoom={zoom}/>;
    case 'table': return <div className="player-guide-table" role="table">
      <div role="row" className="is-head">{b.head.map((h, i) => <span role="columnheader" key={i}>{tr(h, lang)}</span>)}</div>
      {b.rows.map((r, i) => <div role="row" key={i}>{r.map((c, j) => <span role="cell" key={j} data-label={tr(b.head[j] ?? '', lang)}>{tr(c, lang)}</span>)}</div>)}
    </div>;
    case 'controls': return <div className="player-guide-controls">
      {CONTROLS.map(g => <section key={g.group.vi}><h4>{g.group[lang]}</h4>
        {g.rows.filter(r => b.rows.includes(r)).map(r => <div key={r.keys + r.action.vi} className="player-guide-control">
          <kbd>{r.keys}</kbd><span>{r.action[lang]}</span></div>)}</section>)}
    </div>;
    case 'topic': { const c = GUIDE_TOPICS[b.id][lang]; return <details className="player-guide-topic"><summary>{vi ? 'Gợi ý trong game: ' : 'In-game hint: '}{c[0]}</summary><p>{c[1]}</p></details>; }
    case 'level': return <LevelView facts={ALL_LEVEL_FACTS.find(f => f.id === b.id)!} lang={lang} zoom={zoom} go={go}/>;
  }
}

function StepsView({ steps, lang, zoom }: { steps: { fig: Figure; text: L }[]; lang: 'vi' | 'en'; zoom: (fig: Figure) => void }) {
  const [i, setI] = useState(0);
  const vi = lang === 'vi';
  const s = steps[i];
  return <section className="player-guide-steps" aria-roledescription={vi ? 'các bước' : 'steps'}>
    <div className="player-guide-step-dots" role="tablist">{steps.map((_, k) => <button key={k} role="tab" aria-selected={k === i} className={k === i ? 'is-current' : ''} onClick={() => setI(k)}>{k + 1}</button>)}</div>
    <GuideFigure fig={s.fig} lang={lang} onZoom={() => zoom(s.fig)}/>
    <p className="player-guide-step-text"><b>{vi ? `Bước ${i + 1}/${steps.length}` : `Step ${i + 1}/${steps.length}`}</b> {s.text[lang]}</p>
    <div className="player-guide-step-nav">
      <button type="button" disabled={i === 0} onClick={() => setI(i - 1)}><ArrowLeft aria-hidden="true"/>{vi ? 'Bước trước' : 'Previous'}</button>
      <button type="button" disabled={i === steps.length - 1} onClick={() => setI(i + 1)}>{vi ? 'Bước tiếp' : 'Next'}<ArrowRight aria-hidden="true"/></button>
    </div>
  </section>;
}

const centre = (r: { x: number; y: number; w: number; h: number }) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const TRAP_NAMES: Record<string, L> = { vines: { vi: 'Rễ gai', en: 'Thorn roots' }, crusher: { vi: 'Hàm đá', en: 'Stone jaws' }, spikes: { vi: 'Bàn gai', en: 'Spikes' }, rocks: { vi: 'Đá rơi', en: 'Falling rocks' } };

/** A level page: real map shot with runes, gates, start and exit marked from the level data, then the data itself. */
function LevelView({ facts: f, lang, zoom, go }: { facts: LevelFacts; lang: 'vi' | 'en'; zoom: (fig: Figure, extra?: (info: ShotInfo) => React.ReactNode) => void; go: (s: string, p: string) => void }) {
  const vi = lang === 'vi';
  const level = LEVELS.find(l => l.id === f.id)!;
  const join = (xs: string[]) => xs.join(' + ');
  const marks = (info: ShotInfo) => {
    const k = info.w / 1280, s = k;
    return <g transform={`scale(${k})`}>
      {f.gates.map(g => <g key={g.n}><rect x={g.x - 4} y={g.y - 4} width={g.w + 8} height={g.h + 8} fill="none" stroke="#050d08" strokeWidth={8}/><rect x={g.x - 4} y={g.y - 4} width={g.w + 8} height={g.h + 8} fill="none" stroke="#7fe6ff" strokeWidth={4} strokeDasharray="10 6"/>
        <g transform={`translate(${Math.min(1240, g.x + g.w + 4)} ${Math.max(24, g.y - 4)})`}><rect x={-2} y={-17} width={40} height={28} fill="#7fe6ff" stroke="#050d08" strokeWidth={3}/><text x={18} y={4} textAnchor="middle" fontSize={17} fontWeight="700" fill="#06202a">{vi ? "C" : "G"}{g.n}</text></g></g>)}
      {f.runes.map(r => { const c = centre(r); return <g key={r.numeral}><circle cx={c.x} cy={c.y} r={34} fill="none" stroke="#050d08" strokeWidth={9}/><circle cx={c.x} cy={c.y} r={34} fill="none" stroke="#ffe07a" strokeWidth={4.5}/>
        <circle cx={c.x + 30} cy={c.y - 30} r={17} fill="#ffe07a" stroke="#050d08" strokeWidth={3}/><text x={c.x + 30} y={c.y - 23} textAnchor="middle" fontSize={r.numeral.length > 2 ? 14 : 18} fontWeight="700" fill="#2a1d08">{r.numeral}</text></g>; })}
      {!f.boss && <><circle cx={f.spawn.x} cy={f.spawn.y} r={28} fill="none" stroke="#050d08" strokeWidth={8}/><circle cx={f.spawn.x} cy={f.spawn.y} r={28} fill="none" stroke="#9dffb0" strokeWidth={4}/><Label x={f.spawn.x} y={f.spawn.y + 52} text={vi ? 'Bắt đầu' : 'Start'} s={1}/>
        <circle cx={centre(f.exit).x} cy={centre(f.exit).y} r={38} fill="none" stroke="#050d08" strokeWidth={8}/><circle cx={centre(f.exit).x} cy={centre(f.exit).y} r={38} fill="none" stroke="#ff9ce0" strokeWidth={4}/><Label x={centre(f.exit).x} y={centre(f.exit).y + 62} text={vi ? 'Lối ra' : 'Exit'} s={1}/></>}
    </g>;
  };
  const fig: Figure = { shot: `map-${f.id}`, alt: { vi: `Bản đồ màn ${f.id}`, en: `Map of level ${f.id}` },
    caption: f.boss ? undefined : { vi: 'Ảnh chụp đầu màn. Vòng vàng = ấn (số La Mã), khung xanh C1, C2… = cổng (ấn cần giữ ở danh sách “Thứ tự các cổng” bên dưới), xanh lá = điểm bắt đầu, hồng = lối ra.', en: 'Captured at the start. Gold = runes (numerals), blue frames G1, G2… = gates (the runes each needs are listed under “Gates in order”), green = start, pink = exit.' } };
  const maxHeld = Math.max(0, ...f.gates.map(g => g.needs.length));
  const enemyList = Object.entries(f.enemies).map(([k, n]) => `${ENEMY_NAMES[k]?.[lang] ?? k} ×${n}`).join(', ');
  const mistakes: L[] = [];
  if (f.gates.some(g => g.needs.length > 1)) mistakes.push({ vi: 'Thu hoặc làm hỏng một Echo đang giữ ấn mà cổng phía trước vẫn cần → cổng đóng lại.', en: 'Recalling or losing an Echo that holds a rune a later gate still needs → that gate closes.' });
  if (f.gates.some(g => g.empty)) mistakes.push({ vi: 'Quên để trống ấn được yêu cầu ("Nhả ấn") → cổng không mở dù đã giữ đủ ấn khác.', en: 'Forgetting to leave the required rune empty ("Release") → the gate stays shut although the others are held.' });
  if (f.gates.some(g => g.pulse)) mistakes.push({ vi: 'Tới cổng nhịp lúc thanh chắn đang hạ → đứng chờ sát cổng tới "Nhịp mở".', en: 'Reaching a timed gate while the barrier is down → wait beside it for the open beat.' });
  if (f.runes.some(r => r.guards)) mistakes.push({ vi: 'Đứng lên ấn bị phong ấn khi lính gác còn sống → ấn chưa hoạt động.', en: 'Standing on a sealed rune while its sentries live → it stays dark.' });
  if (maxHeld >= 4) mistakes.push({ vi: 'Hết chỗ Echo (giới hạn 4) → dùng X thu Echo không còn cần, hoặc dùng Nhẫn giới hạn Echo (6).', en: 'Running out of Echo slots (limit 4) → recall one you no longer need with X, or use an Echo limit ring (6).' });
  if (f.legSeconds) mistakes.push({ vi: `Đi lòng vòng hết giờ chặng (${f.legSeconds} giây) → ghi đường ngắn, nhặt đồng hồ cát.`, en: `Wandering until the leg timer (${f.legSeconds} s) runs out → record short paths, grab the hourglass.` });

  return <div className="player-guide-level">
    <p className="player-guide-lead">{translate(level.description, lang)}</p>
    {f.boss && <button type="button" className="player-guide-cta" onClick={() => go('levels', f.boss === 'guardian' ? 'boss-guardian' : 'boss-demon')}>
      {vi ? 'Xem hướng dẫn đánh boss chi tiết' : 'Open the full boss guide'}<ArrowRight aria-hidden="true"/></button>}
    <GuideFigure fig={fig} lang={lang} extra={f.boss ? undefined : marks} onZoom={() => zoom(fig, f.boss ? undefined : marks)}/>
    {!f.boss && <>
      <h3>{vi ? 'Dữ kiện màn (lấy từ dữ liệu game)' : 'Level facts (from the game data)'}</h3>
      <dl className="player-guide-facts">
        <div><dt>{vi ? 'Ấn' : 'Runes'}</dt><dd>{f.runes.map(r => r.numeral + (r.guards ? (vi ? ` (phong ấn, ${r.guards} lính gác)` : ` (sealed, ${r.guards} sentries)`) : '')).join(', ')}</dd></div>
        <div><dt>{vi ? 'Giữ cùng lúc nhiều nhất' : 'Most held at once'}</dt><dd>{maxHeld} {vi ? 'ấn' : 'runes'}</dd></div>
        <div><dt>{vi ? 'Thời gian mỗi chặng' : 'Time per leg'}</dt><dd>{f.legSeconds} {vi ? 'giây' : 's'}</dd></div>
        <div><dt>{vi ? 'Quái' : 'Enemies'}</dt><dd>{enemyList || (vi ? 'Không có' : 'None')}</dd></div>
        <div><dt>{vi ? 'Bẫy' : 'Traps'}</dt><dd>{f.traps.length ? f.traps.map(k => TRAP_NAMES[k]?.[lang] ?? k).join(', ') : (vi ? 'Không có' : 'None')}</dd></div>
        <div><dt>{vi ? 'Mở lối ra khi' : 'The exit opens when'}</dt><dd>{vi ? 'bạn đã tự chạm đủ các ấn theo thứ tự và đã qua cổng cuối' : 'you have reached every rune in order and crossed the last gate'}{f.exitClear === 'all' ? (vi ? ', và hạ hết quái' : ', and every enemy is down') : f.exitClear === 'guards' ? (vi ? ', và hạ hết lính gác của các ấn' : ', and every rune sentry is down') : ''}.</dd></div>
      </dl>
      <h3>{vi ? 'Thứ tự các cổng' : 'Gates in order'}</h3>
      <ol className="player-guide-gates">{f.gates.map(g => <li key={g.n}>
        <b>{vi ? 'Cổng' : 'Gate'} {g.n}</b>{vi ? ' cần giữ ' : ' needs '}<strong>{join(g.needs)}</strong>
        {g.empty && <>{vi ? ', để trống ' : ', with '}<strong>{g.empty}</strong>{vi ? '' : ' left empty'}</>}
        {g.pulse && <>{vi ? ` · mở theo nhịp ${g.pulse.open} giây mỗi chu kỳ ${g.pulse.period} giây` : ` · opens ${g.pulse.open} s in every ${g.pulse.period} s`}</>}
        {g.bridge && <>{vi ? ' · là cầu nâng' : ' · a lift bridge'}</>}
      </li>)}</ol>
      {mistakes.length > 0 && <><h3>{vi ? 'Lỗi dễ mắc' : 'Easy mistakes'}</h3><ul>{mistakes.map((m, i) => <li key={i}>{m[lang]}</li>)}</ul></>}
    </>}
  </div>;
}

export { type Page };
