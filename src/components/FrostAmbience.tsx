import { useEffect, useRef, type CSSProperties } from 'react';
import { MapFx } from './JourneyAmbience.tsx';
import { FrostMapFlow } from './FrostMapFlow.tsx';

const at = (x: number, y: number, delay: number, duration = 4): CSSProperties => ({
  left: `${(x / 1536) * 100}%`,
  top: `${(y / 1024) * 100}%`,
  animationDelay: `${-delay}s`,
  animationDuration: `${duration}s`,
});

const LAVA_VEINS: [number, number][] = [
  [146, 178], [168, 184], [196, 184], [220, 176],
  [128, 212], [162, 220], [198, 222], [238, 210],
  [112, 248], [154, 256], [204, 258], [254, 244],
];

function VolcanoEruption({ still }: { still?: boolean }) {
  const smokeRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const sc = smokeRef.current, lc = lightRef.current;
    const sctx = sc?.getContext('2d'), lctx = lc?.getContext('2d');
    if (!sc || !lc || !sctx || !lctx) return;

    const t0 = performance.now();
    const drawEllipticalGlow = (
      ctx: CanvasRenderingContext2D,
      cx: number,
      cy: number,
      rx: number,
      ry: number,
      c0: string,
      c1: string,
    ) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, c0);
      g.addColorStop(0.55, c1);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      if (document.hidden) return;
      const t = still ? 1.5 : (performance.now() - t0) / 1000;
      sctx.clearRect(0, 0, sc.width, sc.height);
      lctx.clearRect(0, 0, lc.width, lc.height);

      const pulse = 0.86 + 0.14 * (Math.sin(t * 3.1) * 0.55 + Math.sin(t * 7.3) * 0.45);
      const surge = Math.pow(0.5 + 0.5 * Math.sin(t * 1.7), 3);

      // 1. Rising multi-lobe volcanic smoke plume on pixel-grid canvas (180x170 -> 360x340)
      for (let i = 0; i < 16; i++) {
        const period = 5.6;
        const p = ((t / period) + i / 16) % 1;
        const lane = (i % 3) - 1;
        const baseX = 183 + lane * 13 + Math.sin(i * 2.3) * 5;
        const sway = Math.sin(p * 5.2 + i * 1.7) * (4 + p * 13) + p * lane * 9;
        const cx = (baseX + sway) * 0.5;
        const cy = (134 - p * 120) * 0.5;
        const rx = (14 + p * 29) * 0.5;
        const ry = (10 + p * 17) * 0.5;
        const fade = p < 0.14 ? p / 0.14 : p > 0.72 ? (1 - p) / 0.28 : 1;
        const heat = Math.max(0, 1 - p * 1.48) * (pulse + surge * 0.25);

        const lobes = [
          { ox: 0, oy: 0, s: 1.0 },
          { ox: -rx * 0.44, oy: ry * 0.16, s: 0.76 },
          { ox: rx * 0.44, oy: ry * 0.12, s: 0.78 },
        ];
        for (const lb of lobes) {
          const lrx = rx * lb.s, lry = ry * lb.s;
          const lcx = cx + lb.ox, lcy = cy + lb.oy;
          // Draw dark soot upper body
          drawEllipticalGlow(
            sctx,
            lcx,
            lcy - lry * 0.1,
            lrx,
            lry,
            `rgba(26, 20, 21, ${(0.42 * fade).toFixed(3)})`,
            `rgba(22, 17, 18, ${(0.22 * fade).toFixed(3)})`,
          );
          // Draw magma-lit warm crimson/amber underside near the crater throat
          if (heat > 0.04) {
            const r = Math.min(255, Math.round(140 + heat * 95));
            const g = Math.min(255, Math.round(32 + heat * 45));
            drawEllipticalGlow(
              sctx,
              lcx,
              lcy + lry * 0.28,
              lrx * 0.9,
              lry * 0.75,
              `rgba(${r}, ${g}, 12, ${(0.38 * fade * Math.min(1, heat)).toFixed(3)})`,
              `rgba(95, 20, 8, ${(0.18 * fade * Math.min(1, heat)).toFixed(3)})`,
            );
          }
        }
      }

      // 2. Screen-blended crater firelight & throat underglow (strictly on the caldera & smoke base)
      lctx.globalCompositeOperation = 'lighter';
      drawEllipticalGlow(
        lctx,
        185,
        150,
        66,
        22,
        `rgba(255, 115, 20, ${(0.44 * pulse + 0.12 * surge).toFixed(3)})`,
        `rgba(210, 45, 5, ${(0.20 * pulse).toFixed(3)})`,
      );
      drawEllipticalGlow(
        lctx,
        185,
        153,
        44,
        14,
        `rgba(255, 210, 80, ${(0.38 * pulse + 0.14 * surge).toFixed(3)})`,
        `rgba(255, 120, 20, ${(0.16 * pulse).toFixed(3)})`,
      );
      drawEllipticalGlow(
        lctx,
        183,
        118,
        52,
        32,
        `rgba(235, 58, 12, ${(0.32 * pulse + 0.10 * surge).toFixed(3)})`,
        `rgba(140, 22, 4, ${(0.14 * pulse).toFixed(3)})`,
      );

      // 3. Travelling heat shimmer along the painted lava veins
      for (let v = 0; v < LAVA_VEINS.length; v++) {
        const [vx, vy] = LAVA_VEINS[v];
        const vp = 0.55 + 0.45 * Math.sin(t * 3.8 - v * 0.85);
        drawEllipticalGlow(
          lctx,
          vx,
          vy,
          17,
          17,
          `rgba(255, 105, 18, ${(0.22 * vp).toFixed(3)})`,
          `rgba(180, 35, 5, ${(0.08 * vp).toFixed(3)})`,
        );
      }

      // 4. Bubbling magma flares along the crater rim
      for (let b = 0; b < 6; b++) {
        const bp = ((t * (1.1 + (b % 3) * 0.25)) + b * 0.31) % 1;
        const bfade = Math.sin(bp * Math.PI);
        const bx = 144 + b * 16 + Math.sin(b * 4.1 + Math.floor(t)) * 4;
        const by = 148 + (b % 2) * 5 - bp * 6;
        drawEllipticalGlow(
          lctx,
          bx,
          by,
          8,
          6,
          `rgba(255, 165, 45, ${(0.55 * bfade).toFixed(3)})`,
          `rgba(255, 65, 10, ${(0.24 * bfade).toFixed(3)})`,
        );
        sctx.fillStyle = `rgba(255, 242, 165, ${(0.9 * bfade).toFixed(3)})`;
        sctx.fillRect(Math.round(bx * 0.5), Math.round(by * 0.5), 1, 1);
      }

      // 5. Erupting sparks & incandescent cinders with real light halos
      for (let i = 0; i < 26; i++) {
        const dur = 1.7 + (i % 5) * 0.34;
        const p = ((t / dur) + i * 0.131) % 1;
        const spawnX = 138 + ((i * 37) % 94);
        const spawnY = 145 + ((i * 19) % 12);
        const spread = ((spawnX - 185) / 46) * 26 + Math.sin(i * 3.1) * 11;
        const rise = 72 + (i % 5) * 20;
        const sx = spawnX + spread * p + Math.sin(p * 6.8 + i) * 3.5;
        const sy = spawnY - rise * (1 - Math.pow(1 - p, 1.35));
        const flicker = 0.7 + 0.3 * Math.sin(t * 26 + i * 4.7);
        const fade = (p < 0.08 ? p / 0.08 : p > 0.74 ? (1 - p) / 0.26 : 1) * flicker;
        if (fade <= 0.05) continue;

        // Firelight halo on screen canvas (lights up surrounding smoke & crater rim)
        const haloR = i % 3 === 0 ? 10 : 7.5;
        drawEllipticalGlow(
          lctx,
          sx,
          sy,
          haloR,
          haloR,
          `rgba(255, 155, 38, ${(0.62 * fade).toFixed(3)})`,
          `rgba(255, 60, 8, ${(0.28 * fade).toFixed(3)})`,
        );

        // Crisp pixel tail & incandescent core on pixel canvas
        const px = Math.round(sx * 0.5);
        const py = Math.round(sy * 0.5);
        const vx = spread / rise;
        const tx = Math.round((sx - vx * 2.4) * 0.5);
        const ty = Math.round((sy + 2.4) * 0.5);

        sctx.fillStyle = `rgba(255, ${Math.round(92 * (1 - p * 0.45))}, 14, ${(0.82 * fade).toFixed(3)})`;
        sctx.fillRect(tx, ty, 1, 1);

        const cg = Math.round(252 - p * 130);
        const cb = Math.round(210 * Math.max(0, 1 - p * 1.75));
        sctx.fillStyle = `rgba(255, ${cg}, ${cb}, ${(0.98 * fade).toFixed(3)})`;
        sctx.fillRect(px, py, 1, 1);
      }
    };

    render();
    if (still) return;
    const id = setInterval(render, 1000 / 24);
    return () => clearInterval(id);
  }, [still]);

  return (
    <>
      <canvas
        ref={smokeRef}
        width={180}
        height={170}
        className="map-volcano-canvas map-volcano-smoke-canvas"
      />
      <canvas
        ref={lightRef}
        width={360}
        height={340}
        className="map-volcano-canvas map-volcano-light-canvas"
      />
    </>
  );
}

// Crystal glints: fiery ruby on volcano side, diamond ice on snow side
const crystalGlints = [
  // Fire crystals & Demon cave runes
  { x: 820, y: 840, fire: true },
  { x: 1040, y: 940, fire: true },
  { x: 1165, y: 865, fire: true },
  { x: 1375, y: 960, fire: true },
  { x: 1495, y: 500, fire: true },
  { x: 1295, y: 715, fire: true },
  { x: 1475, y: 755, fire: true },
  // Ice crystals on snow side
  { x: 160, y: 340, fire: false },
  { x: 260, y: 160, fire: false },
  { x: 340, y: 480, fire: false },
];

export function FrostAmbience({ still }: { still?: boolean }) {
  if (still) return null;

  return (
    <div className="journey-ambience frost-ambience" aria-hidden="true">
      <FrostMapFlow />
      {/* 1. Mystical Blue Portal - Cyan Glowing Aura & Swirling Vortex (Top-Left) */}
      <i className="map-portal-cyan-glow" style={at(156, 143, 0, 3.2)} />
      <MapFx name="portal" x={156} y={143} scaleX={1.58} scaleY={1.24} still={still} />
      <i className="map-portal-spark" style={at(150, 134, 0, 2.5)} />
      <i className="map-portal-spark" style={at(164, 146, 0.8, 2.8)} />
      <i className="map-portal-spark" style={at(148, 158, 1.6, 2.2)} />

      {/* 2. Upper Cliff Campfire (Left) */}
      <i className="map-campfire-glow" style={at(393, 271, 0, 2.2)} />
      <i className="map-ember" style={at(393, 260, 0, 2.4)} />
      <i className="map-ember" style={at(398, 265, 0.8, 3.0)} />
      <i className="map-ember" style={at(388, 255, 1.5, 2.8)} />

      {/* 3. Lower Snow Ledge Campfire (Bottom-Left) */}
      <i className="map-campfire-glow" style={at(178, 660, 0.5, 2.4)} />
      <i className="map-ember" style={at(178, 648, 0, 2.5)} />
      <i className="map-ember" style={at(183, 652, 0.9, 3.1)} />

      {/* 4. Volcano Caldera Molten Firelight, Billowing Smoke & Erupting Sparks (Top-Right) */}
      <VolcanoEruption still={still} />

      {/* 5. Canyon Stone Post Torch Flame (Right) */}
      <i className="map-torch-glow" style={at(1088, 750, 0, 2.1)} />
      <i className="map-ember ember-volcano" style={at(1088, 735, 0, 2.2)} />
      <i className="map-ember ember-volcano" style={at(1092, 740, 0.7, 2.7)} />

      {/* 6. Sinister Fiery Demon Cave Arch Aura (Bottom-Right) */}
      <i className="map-demon-cave-glow" style={at(1356, 765, 0, 2.8)} />

      {/* 7. Ruby Crystal & Ice Diamond Glints */}
      {crystalGlints.map((g, i) => (
        <i
          key={`glint-${i}`}
          className={`map-ice-glint ${g.fire ? 'glint-ruby' : 'glint-ice'}`}
          style={at(g.x, g.y, i * 0.35, 2.2 + (i % 3) * 0.4)}
        />
      ))}

      {/* 8. Dual Climate: Snowflakes on Left Half, Volcanic Cinders on Right Half */}
      {Array.from({ length: 24 }, (_, i) => (
        <i
          key={`frost-snow-${i}`}
          className={`map-snow ${i % 3 === 0 ? 'snow-large' : i % 2 === 0 ? 'snow-med' : 'snow-small'}`}
          style={at((i * 31) % 680 + 25, (i * 43) % 960 + 20, i * 0.53, 4.6 + (i % 5) * 0.5)}
        />
      ))}

      {Array.from({ length: 16 }, (_, i) => (
        <i
          key={`volcano-cinder-${i}`}
          className="map-ember ember-volcano"
          style={at(920 + (i * 37) % 540, 520 + (i * 29) % 420, i * 0.58, 3.0 + (i % 4) * 0.5)}
        />
      ))}

      {/* 9. Chasm Gorge Mist */}
      <i className="map-mist map-frost-mist-river" style={at(460, 820, 0, 14)} />
    </div>
  );
}
