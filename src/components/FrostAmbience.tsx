import { type CSSProperties } from 'react';

const at = (x: number, y: number, delay: number, duration = 4): CSSProperties => ({
  left: `${(x / 1536) * 100}%`,
  top: `${(y / 1024) * 100}%`,
  animationDelay: `${-delay}s`,
  animationDuration: `${duration}s`,
});

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

// Each segment follows a painted stretch of water or lava on the map.
const flows = [
  { kind: 'water', from: [42, 61], to: [34, 70], duration: 3.4, count: 4 },
  { kind: 'waterfall', from: [34, 70], to: [30, 90], duration: 1.8, count: 7 },
  { kind: 'water', from: [30, 90], to: [21, 99], duration: 2.8, count: 4 },
  { kind: 'lava', from: [84, 15], to: [80, 36], duration: 3.1, count: 3 },
  { kind: 'lava', from: [83, 61], to: [78.8, 69], duration: 2.5, count: 3 },
  { kind: 'lavafall', from: [78.8, 69], to: [78.5, 76], duration: 1.5, count: 3 },
  { kind: 'lava', from: [78.5, 76], to: [72, 83], duration: 2.6, count: 3 },
  { kind: 'lava', from: [68, 85], to: [60, 97], duration: 3.3, count: 4 },
];

const smokePuffs = [
  { x: 1280, delay: .3, duration: 6.2, drift: -62, turn: -18 },
  { x: 1294, delay: 1.4, duration: 6.8, drift: -43, turn: 14 },
  { x: 1302, delay: 2.6, duration: 7.5, drift: -27, turn: -9 },
  { x: 1284, delay: 3.8, duration: 6.7, drift: -70, turn: 19 },
  { x: 1296, delay: 5.1, duration: 7.2, drift: -49, turn: -15 },
  { x: 1278, delay: 6.1, duration: 7.4, drift: -76, turn: 11 },
];

export function FrostAmbience({ still }: { still?: boolean }) {
  if (still) return null;

  return (
    <div className="journey-ambience frost-ambience" aria-hidden="true">
      {flows.flatMap(({kind, from, to, duration, count}, segment) =>
        Array.from({length: count}, (_, index) => (
          <i key={`flow-${segment}-${index}`} className={`frost-map-flow frost-map-${kind}`} style={{
            '--from-x': `${from[0] + (index % 3 - 1) * .65}%`,
            '--from-y': `${from[1]}%`,
            '--to-x': `${to[0] + (index % 3 - 1) * .65}%`,
            '--to-y': `${to[1]}%`,
            animationDuration: `${duration}s`,
            animationDelay: `${-index * duration / count}s`,
          } as CSSProperties} />
        )),
      )}
      <i className="frost-map-spray" style={at(460, 925, 0, 4.2)} />
      <i className="frost-map-spray" style={at(440, 950, 1.9, 4.8)} />
      <i className="frost-map-portal-ring" style={at(145, 151, 0, 3.4)} />
      <i className="frost-map-portal-ring" style={at(145, 151, 1.7, 3.4)} />
      {/* 1. Mystical Blue Portal - Cyan Glowing Aura (Top-Left) */}
      <i className="map-portal-cyan-glow" style={at(160, 160, 0, 3.2)} />
      <i className="map-portal-spark" style={at(155, 150, 0, 2.5)} />
      <i className="map-portal-spark" style={at(168, 165, 0.8, 2.8)} />
      <i className="map-portal-spark" style={at(150, 175, 1.6, 2.2)} />

      {/* 2. Upper Cliff Campfire (Left) */}
      <i className="map-campfire-glow" style={at(393, 271, 0, 2.2)} />
      <i className="map-ember" style={at(393, 260, 0, 2.4)} />
      <i className="map-ember" style={at(398, 265, 0.8, 3.0)} />
      <i className="map-ember" style={at(388, 255, 1.5, 2.8)} />

      {/* 3. Lower Snow Ledge Campfire (Bottom-Left) */}
      <i className="map-campfire-glow" style={at(178, 660, 0.5, 2.4)} />
      <i className="map-ember" style={at(178, 648, 0, 2.5)} />
      <i className="map-ember" style={at(183, 652, 0.9, 3.1)} />

      {/* 4. Volcano Caldera Molten Heart & Rising Ash (Top-Right) */}
      <i className="map-volcano-glow" style={at(1244, 211, 0, 2.2)} />
      {smokePuffs.map(({ x, delay, duration, drift, turn }, index) => (
        <i key={x} className={`map-volcano-smoke${index % 2 ? ' smoke-alt' : ''}`} style={{
          ...at(x, 124, delay, duration),
          '--smoke-drift': `${drift}%`,
          '--smoke-turn': `${turn}deg`,
        } as CSSProperties} />
      ))}

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

      {Array.from({ length: 24 }, (_, i) => (
        <i
          key={`volcano-cinder-${i}`}
          className="map-ember ember-volcano"
          style={at(850 + (i * 29) % 640, 100 + (i * 37) % 780, i * 0.58, 3.0 + (i % 4) * 0.5)}
        />
      ))}

      {/* 9. Chasm Gorge Mist & Volcanic Heat Haze */}
      <i className="map-mist map-frost-mist-river" style={at(460, 820, 0, 14)} />
      <i className="map-mist map-volcano-haze" style={at(1244, 180, 2, 12)} />
    </div>
  );
}
