import type { LevelData } from '../logic/types.ts';

type Point = readonly [number, number];
type Terrain = {
  soil: string[];
  path: string[];
  fleck: string;
  lanes: readonly (readonly Point[])[];
};

const terrain: Terrain[] = [
  {
    soil: ['#172e25', '#233d2c', '#2c4832', '#385238'],
    path: ['#344136', '#474b37', '#56543b', '#615b41'], fleck: '#829567',
    lanes: [[[64, 420], [230, 402], [315, 360], [665, 360], [835, 373], [1040, 393], [1220, 343]],
      [[230, 402], [260, 292], [385, 212], [550, 205]]],
  },
  {
    soil: ['#152f2c', '#1e3d34', '#25493d', '#315448'],
    path: ['#313e37', '#40493c', '#505540', '#5f5d48'], fleck: '#748b69',
    lanes: [[[95, 549], [261, 492], [475, 465], [625, 402], [623, 248], [794, 188], [1000, 202], [1215, 157]],
      [[625, 248], [437, 201], [245, 205], [95, 233]], [[475, 465], [718, 550], [1100, 559]]],
  },
  {
    soil: ['#202b37', '#2a3744', '#354352', '#404d5e'],
    path: ['#38404c', '#4a4e5b', '#555966', '#626270'], fleck: '#7d829b',
    lanes: [[[1170, 173], [920, 200], [660, 203], [274, 207], [274, 365], [282, 535], [660, 536], [1070, 566]],
      [[282, 535], [100, 605]], [[921, 200], [1080, 300]]],
  },
  {
    soil: ['#282b24', '#39382a', '#47402e', '#514934'],
    path: ['#494032', '#574a35', '#67553a', '#735f42'], fleck: '#9b8153',
    lanes: [[[1135, 112], [1095, 494], [970, 515], [802, 514], [700, 209], [637, 204], [468, 200], [418, 511], [338, 514], [158, 530], [157, 346], [158, 181]],
      [[700, 209], [788, 103]], [[1095, 494], [1205, 586]]],
  },
  {
    soil: ['#253039', '#303b45', '#394653', '#43515c'],
    path: ['#3b454c', '#484e54', '#535b62', '#5b656c'], fleck: '#889399',
    lanes: [[[1200, 344], [1134, 533], [1050, 201], [955, 170], [821, 500], [770, 549], [633, 200], [575, 161], [440, 503], [385, 551], [252, 200], [136, 219]],
      [[955, 170], [923, 63]], [[385, 551], [367, 654]]],
  },
  {
    soil: ['#192d42', '#243c53', '#2b4861', '#365670'],
    path: ['#324a63', '#405d76', '#4b6980', '#58768b'], fleck: '#83a8b8',
    lanes: [],
  },
];

const hash = (x: number, y: number, seed: number) => {
  let value = Math.imul(x + seed * 19, 374761393) + Math.imul(y + seed, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
};

function noise(x: number, y: number, size: number, seed: number) {
  const ix = Math.floor(x / size), iy = Math.floor(y / size);
  const fx = x / size - ix, fy = y / size - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(ix, iy, seed), b = hash(ix + 1, iy, seed);
  const c = hash(ix, iy + 1, seed), d = hash(ix + 1, iy + 1, seed);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

function laneDistance(x: number, y: number, lanes: Terrain['lanes']) {
  let closest = Infinity;
  for (const line of lanes) for (let i = 1; i < line.length; i++) {
    const [ax, ay] = line[i - 1], [bx, by] = line[i];
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const sx = x - ax - dx * t, sy = y - ay - dy * t;
    closest = Math.min(closest, sx * sx + sy * sy);
  }
  return Math.sqrt(closest);
}

/** Ground is rendered once per map on a coarse pixel grid, before interactive objects. */
export function drawTerrain(ctx: CanvasRenderingContext2D, w: number, h: number, level: LevelData) {
  let skin: Terrain;
  if (level.id >= 7) {
    const lanes: readonly (readonly Point[])[] = [[
      [level.playerSpawn.x, level.playerSpawn.y],
      ...level.plates.map((p) => [p.x + 25, p.y + 25] as Point),
      [level.exit.x + 30, level.exit.y + 30],
    ]];
    if (level.id <= 9) {
      // 07, 08, 09: Snowy Mountain, High Cliff Pass & Stairs
      skin = {
        soil: ['#9cb4c0', '#b2c7d2', '#c7dbe3', '#deeef3'],
        path: ['#58839e', '#6d9cb5', '#88b5cc', '#a4c9d8'],
        fleck: '#f6ffff',
        lanes,
      };
    } else if (level.id === 10) {
      // 10: Suspension Bridge over Waterfall Gorge (Dark wet rock & stone approach)
      skin = {
        soil: ['#283b42', '#364c54', '#47636e', '#597885'],
        path: ['#3e352f', '#57483e', '#705c4e', '#8a7260'],
        fleck: '#a8ecfc',
        lanes,
      };
    } else if (level.id === 11) {
      // 11: Medieval Stone Watchtower Plateau (Ancient stone courtyard & mountain ash)
      skin = {
        soil: ['#2b2b2b', '#3b3b3c', '#4e4e50', '#626265'],
        path: ['#473f36', '#5e5246', '#756555', '#8c7a68'],
        fleck: '#d8cfbe',
        lanes,
      };
    } else {
      // 12: Volcanic Canyon & Flame Brazier (Dark basalt, molten cracks, red/orange embers)
      skin = {
        soil: ['#1c1010', '#2d1816', '#42221d', '#582b24'],
        path: ['#541810', '#7a2214', '#a8321c', '#cf4a24'],
        fleck: '#ff9922',
        lanes,
      };
    }
  } else {
    skin = terrain[Math.max(0, Math.min(5, level.id - 1))];
  }
  const floor = document.createElement('canvas');
  const width = floor.width = Math.ceil(w / 4), height = floor.height = Math.ceil(h / 4);
  const g = floor.getContext('2d')!;
  const seed = level.id + 41;
  const boss = level.id === 6;
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    const x = column * 1280 / width, y = row * 720 / height;
    const broad = noise(x, y, 126, seed), detail = noise(x, y, 28, seed + 1);
    const grain = hash(column, row, seed);
    const radius = Math.hypot((x - 640) / 1.34, y - 355);
    const distance = boss ? radius - 206 : laneDistance(x, y, skin.lanes);
    const onPath = distance < 39 + (detail - .5) * 38;
    const ring = boss && (Math.abs(radius - 202) < 3 || Math.abs(radius - 224) < 2);
    const value = Math.min(3, Math.floor((broad * .65 + detail * .24 + grain * .11) * 4));
    g.fillStyle = ring ? skin.fleck : (onPath ? skin.path : skin.soil)[value];
    if (!ring && grain > .992 && detail > .56) g.fillStyle = skin.fleck;
    g.fillRect(column, row, 1, 1);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(floor, 0, 0, w, h);
  ctx.restore();
}
