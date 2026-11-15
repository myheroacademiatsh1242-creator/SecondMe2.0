import { ImageOff, Maximize2 } from 'lucide-react';
import type { Annotation, At, Figure, L } from './guideContent.ts';
import SHOTS from './shots.json';

/** One captured screenshot: its pixel size and named positions (in its own pixels) recorded at capture time. */
export interface ShotInfo { w: number; h: number; marks?: Record<string, { x: number; y: number }>; staged?: L | null }
export const shots = SHOTS as Record<string, ShotInfo>;
export const shotUrl = (id: string) => `${import.meta.env.BASE_URL}assets/guide/${id}.webp`;

const point = (at: At, info: ShotInfo) => typeof at === 'string' ? info.marks?.[at] ?? null : at;

/** Annotations drawn over the untouched screenshot (SVG in the shot's own pixel space). */
function Overlay({ notes, info, lang, extra }: { notes: Annotation[]; info: ShotInfo; lang: 'vi' | 'en'; extra?: React.ReactNode }) {
  const s = info.w / 1280;   // strokes and labels keep the same weight on any shot size
  return <svg className="guide-overlay" viewBox={`0 0 ${info.w} ${info.h}`} preserveAspectRatio="none" aria-hidden="true">
    <defs><marker id="guide-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffe07a"/></marker></defs>
    {notes.map((n, i) => {
      if (n.kind === 'arrow') {
        const a = point(n.from, info), b = point(n.to, info);
        if (!a || !b) return null;
        return <g key={i}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#050d08" strokeWidth={9 * s} strokeLinecap="round"/>
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#ffe07a" strokeWidth={5 * s} strokeDasharray={`${14 * s} ${9 * s}`} markerEnd="url(#guide-arrow)"/>
          {n.text && <Label x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 18 * s} text={n.text[lang]} s={s}/>}</g>;
      }
      const p = point(n.at, info);
      if (!p) return null;
      if (n.kind === 'key') return <g key={i} transform={`translate(${p.x + 30 * s} ${p.y - 58 * s})`}>
        <rect x={0} y={0} width={40 * s} height={40 * s} rx={5 * s} fill="#f4e6b4" stroke="#050d08" strokeWidth={4 * s}/>
        <text x={20 * s} y={28 * s} textAnchor="middle" fontSize={24 * s} fontWeight="700" fill="#2a1d08">{n.key}</text></g>;
      const r = (n.r ?? 34) * s;
      return <g key={i}>
        <circle cx={p.x} cy={p.y} r={r} fill="none" stroke="#050d08" strokeWidth={9 * s}/>
        <circle cx={p.x} cy={p.y} r={r} fill="none" stroke="#ffe07a" strokeWidth={4.5 * s}/>
        {n.n !== undefined && <g transform={`translate(${p.x - r * .72} ${p.y - r * .72})`}><circle r={15 * s} fill="#ffe07a" stroke="#050d08" strokeWidth={3 * s}/>
          <text y={7 * s} textAnchor="middle" fontSize={20 * s} fontWeight="700" fill="#2a1d08">{n.n}</text></g>}
        {n.text && <Label x={p.x} y={p.y + r + 26 * s} text={n.text[lang]} s={s}/>}
      </g>;
    })}
    {extra}
  </svg>;
}

export function Label({ x, y, text, s }: { x: number; y: number; text: string; s: number }) {
  const w = (text.length * 11 + 18) * s;
  return <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={-19 * s} width={w} height={27 * s} fill="#0b1a12e8" stroke="#ffe07a" strokeWidth={2 * s}/>
    <text y={1 * s} textAnchor="middle" fontSize={18 * s} fontWeight="700" fill="#fff3c4">{text}</text></g>;
}

export function GuideFigure({ fig, lang, onZoom, extra, large = false }: { fig: Figure; lang: 'vi' | 'en'; onZoom?: () => void; extra?: (info: ShotInfo) => React.ReactNode; large?: boolean }) {
  const info = shots[fig.shot];
  const vi = lang === 'vi';
  if (!info) return <figure className="guide-figure is-missing">
    <div className="guide-shot-missing" role="img" aria-label={fig.alt[lang]}><ImageOff aria-hidden="true"/><span>{vi ? 'Chưa có hình minh họa cho mục này.' : 'No picture for this yet.'}</span></div>
    {fig.caption && <figcaption>{fig.caption[lang]}</figcaption>}
  </figure>;
  return <figure className={`guide-figure${large ? ' is-large' : ''}`}>
    <div className="guide-shot" style={{ aspectRatio: `${info.w} / ${info.h}` }}>
      <img src={shotUrl(fig.shot)} alt={fig.alt[lang]} loading="lazy" decoding="async" width={info.w} height={info.h}/>
      <Overlay notes={fig.notes ?? []} info={info} lang={lang} extra={extra?.(info)}/>
      {onZoom && <button type="button" className="guide-zoom" onClick={onZoom} aria-label={vi ? 'Phóng to ảnh' : 'Enlarge picture'}><Maximize2 aria-hidden="true"/></button>}
    </div>
    <figcaption>{fig.caption?.[lang]}{info.staged && <small className="guide-staged">{vi ? ' · Ảnh chụp từ game; bối cảnh được dựng sẵn để chụp: ' : ' · Captured in game; scene set up for the shot: '}{info.staged[lang]}</small>}</figcaption>
  </figure>;
}

export type { L };
