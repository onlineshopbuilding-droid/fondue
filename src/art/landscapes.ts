/**
 * Parallax landscapes. Strips are 1600 wide and tile horizontally: silhouettes are periodic, and
 * every decoration stays clear of the left and right edges.
 */
import { svg, type Art } from './types';

const INK = '#2b2118';
const W = 1600;
const H = 320;

type P = [number, number];

/** Closed polygon under a straight-edged, periodic skyline. */
function jag(pts: P[]): string {
  const first = pts[0];
  const last = pts[pts.length - 1];
  const ext: P[] = [[last[0] - W, last[1]], ...pts, [first[0] + W, first[1]], [pts[1][0] + W, pts[1][1]]];
  return `M${ext[0][0]} 340L${ext.map(([x, y]) => `${x} ${y}`).join('L')}L${ext[ext.length - 1][0]} 340Z`;
}

/** Closed shape under a smooth, periodic skyline. */
function soft(pts: P[]): string {
  const n = pts.length;
  const ext: P[] = [
    [pts[n - 2][0] - W, pts[n - 2][1]],
    [pts[n - 1][0] - W, pts[n - 1][1]],
    ...pts,
    [pts[0][0] + W, pts[0][1]],
    [pts[1][0] + W, pts[1][1]],
  ];
  const mid = (a: P, b: P): string => `${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2}`;
  let d = `M${ext[0][0]} 340L${mid(ext[0], ext[1])}`;
  for (let i = 1; i < ext.length - 1; i++) d += `Q${ext[i][0]} ${ext[i][1]} ${mid(ext[i], ext[i + 1])}`;
  return `${d}L${ext[ext.length - 1][0]} 340Z`;
}

/** Skyline height at x, for planting things on a ridge. */
function hAt(pts: P[], x: number): number {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[i + 1];
    if (x >= ax && x <= bx) return Math.round(ay + ((by - ay) * (x - ax)) / (bx - ax));
  }
  return pts[0][1];
}

const fill = (d: string, f: string) => `<path d="${d}" fill="${f}"/>`;
const outlined = (b: string, col: string, w = 3) =>
  `<g stroke="${col}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${b}</g>`;
const noStroke = (d: string, f: string, o = 1) => `<path d="${d}" fill="${f}" stroke="none"${o < 1 ? ` opacity="${o}"` : ''}/>`;
const strip = (body: string): Art => ({ svg: svg(W, H, body), w: W, h: H, px: 0, py: H });
const place = (id: string, x: number, y: number, s: number, f?: string) =>
  `<use href="#${id}" transform="translate(${x} ${y})scale(${s})"${f ? ` fill="${f}"` : ''}/>`;
/** A jagged cap for a peak; draw it inside the mountain's clip. */
const cap = (x: number, y: number, drop: number) =>
  `M${x - 90} ${y - 10}h180v${drop}l-22-13-22 19-23-15-23 20-22-20-23 16-22-13-23 8z`;
const clipped = (id: string, d: string, inner: string) => `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;
/** Many small round dots in one path, drawn by the stroke's round cap. */
const dots = (xs: P[], col: string, w: number) =>
  `<path d="${xs.map(([x, y]) => `M${x} ${y}h.01`).join('')}" stroke="${col}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;

const FIR = 'M-4 0V-8H-22L-10-28H-17L-7-46H-12L0-68 12-46H7L17-28H10L22-8H4V0Z';
const firDef = `<defs><path id="f" d="${FIR}"/></defs>`;
const snowFirDef = `<defs><g id="s"><path d="${FIR}"/><path d="M0-68L12-46H6L3-52-2-46-7-50-12-46ZM-10-28L-7-34-2-29 3-34 7-29 10-28 7-40H-7ZM-22-8L-14-20-8-13-2-20 4-13 10-20 14-14 22-8 10-28H-10Z" fill="#e6eef8" stroke="none"/></g></defs>`;

// ---------------------------------------------------------------------------------------------
// Meadow
// ---------------------------------------------------------------------------------------------

const meadowFarBack: P[] = [[0, 180], [120, 100], [230, 170], [350, 70], [470, 160], [590, 90], [700, 165], [840, 55], [980, 170], [1090, 95], [1200, 165], [1330, 80], [1470, 170], [1540, 130]];
const meadowFarFront: P[] = [[0, 230], [90, 190], [190, 145], [300, 215], [430, 130], [560, 225], [660, 180], [760, 120], [890, 220], [1010, 160], [1120, 225], [1250, 135], [1380, 220], [1490, 175]];
const meadowFarBackD = jag(meadowFarBack);
const meadowFarFrontD = jag(meadowFarFront);

const meadowFar = strip(
  outlined(
    fill(meadowFarBackD, '#8aa6b5') +
      clipped('a', meadowFarBackD, noStroke([[120, 100], [350, 70], [590, 90], [840, 55], [1090, 95], [1330, 80]].map(([x, y]) => cap(x, y, 46)).join(''), '#f3efe2')) +
      fill(meadowFarFrontD, '#6b8e9a') +
      clipped('b', meadowFarFrontD, noStroke([[190, 145], [430, 130], [760, 120], [1010, 160], [1250, 135]].map(([x, y]) => cap(x, y, 34)).join(''), '#e6ecdf')),
    '#4d6c7a',
  ),
);

const meadowMidHill: P[] = [[0, 225], [140, 200], [300, 235], [480, 195], [660, 240], [840, 205], [1020, 235], [1200, 195], [1400, 235], [1520, 210]];
const meadowFirs = [70, 110, 150, 260, 320, 395, 440, 530, 600, 720, 770, 880, 930, 1060, 1110, 1190, 1250, 1340, 1440, 1510];
const meadowMid = strip(
  firDef +
    outlined(
      fill(soft(meadowMidHill), '#5a8a5c') +
        meadowFirs.map((x, i) => place('f', x, hAt(meadowMidHill, x) + 10, 0.8 + (i % 3) * 0.17, i % 2 ? '#2f5f4c' : '#3a6e52')).join('') +
        // A tiny hay hut, for scale.
        fill('M660 240V222H694V240Z', '#c7a26a') +
        fill('M652 224L677 204 702 224Z', '#a4563a'),
      '#2c4f3c',
    ),
);

const meadowNearHill: P[] = [[0, 280], [180, 262], [360, 292], [560, 268], [760, 296], [960, 266], [1160, 292], [1360, 262], [1500, 288]];
const meadowNear = strip(
  firDef +
    outlined(
      fill(soft(meadowNearHill), '#7fa352') +
        [[120, 1.8], [190, 1.35], [980, 1.9], [1040, 1.3], [1420, 1.6]]
          .map(([x, s]) => place('f', x, hAt(meadowNearHill, x) + 14, s, '#2f6248'))
          .join('') +
        // Split-rail fence.
        '<path d="M430 268V296M490 270V298M550 272V300M610 274V300M424 276L616 282M426 287L616 292" fill="none" stroke-width="7"/>' +
        '<path d="M430 268V296M490 270V298M550 272V300M610 274V300M424 276L616 282M426 287L616 292" fill="none" stroke="#a87a48" stroke-width="3.5"/>' +
        dots([[260, 295], [300, 305], [700, 306], [820, 300], [1250, 302], [1300, 296]], '#f3e6c8', 7) +
        dots([[230, 306], [340, 302], [760, 310], [860, 308], [1200, 306]], '#e0a630', 7) +
        dots([[280, 310], [680, 298], [890, 300], [1330, 308]], '#b5502e', 7),
      INK,
    ),
);

// ---------------------------------------------------------------------------------------------
// Canyon
// ---------------------------------------------------------------------------------------------

const canyonFarPts: P[] = [[0, 225], [70, 215], [100, 105], [280, 100], [312, 215], [430, 225], [462, 145], [540, 140], [578, 228], [710, 215], [742, 75], [950, 80], [985, 220], [1110, 228], [1142, 130], [1300, 125], [1338, 222], [1480, 215], [1512, 160], [1570, 158]];
const canyonFarD = jag(canyonFarPts);
const stripe = (y: number, t: number, col: string, o = 1) =>
  `<path d="M-20 ${y}Q400 ${y + 10} 800 ${y}T1620 ${y}" fill="none" stroke="${col}" stroke-width="${t}"${o < 1 ? ` opacity="${o}"` : ''}/>`;

const canyonFar = strip(
  outlined(
    fill(canyonFarD, '#c08a6c') +
      clipped('a', canyonFarD, stripe(116, 8, '#d7a888') + stripe(146, 12, '#a86f58') + stripe(186, 10, '#d7a888')),
    '#8a5a4a',
  ),
);

const canyonMidPts: P[] = [[0, 262], [90, 250], [120, 190], [230, 186], [262, 258], [370, 266], [402, 150], [470, 146], [504, 262], [640, 270], [672, 200], [840, 196], [876, 266], [1010, 272], [1040, 165], [1120, 160], [1152, 262], [1300, 268], [1332, 205], [1470, 200], [1504, 262]];
const canyonMidD = jag(canyonMidPts);
const hoodoo = (x: number, base: number) =>
  fill(`M${x - 14} ${base}L${x - 9} ${base - 58}H${x + 9}L${x + 14} ${base}Z`, '#a04e33') +
  `<ellipse cx="${x}" cy="${base - 62}" rx="22" ry="11" fill="#7a4250"/>`;

const canyonMid = strip(
  outlined(
    hoodoo(320, 270) + hoodoo(590, 275) + hoodoo(960, 276) + hoodoo(1250, 272) +
      fill(canyonMidD, '#a8563a') +
      clipped('a', canyonMidD, stripe(216, 9, '#c47a55') + stripe(240, 7, '#853f2c')),
    '#5b2d22',
  ),
);

const canyonNearHill: P[] = [[0, 290], [200, 274], [420, 298], [640, 278], [860, 300], [1080, 276], [1300, 298], [1480, 280]];
const boulder = (x: number, y: number, rx: number, ry: number, f: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f}"/>`;
const scrub = (x: number, y: number) =>
  `<path d="M${x - 22} ${y}C${x - 28} ${y - 14} ${x - 12} ${y - 24} ${x} ${y - 22}C${x + 14} ${y - 26} ${x + 28} ${y - 12} ${x + 22} ${y}Z" fill="#7d7a35"/>`;
const canyonNear = strip(
  outlined(
    boulder(150, 276, 42, 26, '#8d4630') + boulder(760, 282, 54, 30, '#7a3c2c') + boulder(1190, 272, 38, 24, '#8d4630') +
      fill(soft(canyonNearHill), '#c97d4e') +
      scrub(320, 296) + scrub(560, 292) + scrub(1000, 296) + scrub(1400, 292) +
      boulder(450, 304, 22, 12, '#9a5136') + boulder(1110, 306, 26, 12, '#9a5136'),
    INK,
  ) + dots([[80, 302], [240, 310], [640, 302], [880, 310], [1320, 306], [1500, 308]], '#a35a38', 6),
);

// ---------------------------------------------------------------------------------------------
// Marsh
// ---------------------------------------------------------------------------------------------

const fog = (y: number, o: number) =>
  noStroke(soft([[0, y], [260, y - 12], [520, y + 10], [800, y - 10], [1060, y + 12], [1340, y - 8]]), '#e4e6d2', o);

const marshFar = strip(
  outlined(
    fill(soft([[0, 190], [200, 130], [400, 175], [640, 115], [860, 180], [1100, 125], [1340, 175], [1500, 150]]), '#8fa49b') +
      fill(soft([[0, 225], [240, 190], [500, 225], [760, 180], [1020, 228], [1280, 188], [1500, 222]]), '#73897f'),
    '#5b7168',
  ) +
    fog(170, 0.4) +
    fog(225, 0.5),
);

const deadTree = (x: number, y: number, s: number) =>
  `<g transform="translate(${x} ${y})scale(${s})"><path d="M0 0C-2-30 4-50-2-90M-1-48L-26-74M-26-74L-44-78M-26-74L-30-96M1-66L26-92M26-92L44-96M26-92L24-112M-2-90L-12-114M-2-90L10-116" fill="none" stroke="#2f352f" stroke-width="10"/><path d="M0 0C-2-30 4-50-2-90M-1-48L-26-74M-26-74L-44-78M-26-74L-30-96M1-66L26-92M26-92L44-96M26-92L24-112M-2-90L-12-114M-2-90L10-116" fill="none" stroke="#5a5a4b" stroke-width="4.5"/></g>`;

const marshMidHill: P[] = [[0, 262], [180, 240], [380, 268], [600, 238], [820, 270], [1040, 242], [1260, 268], [1460, 244]];
const marshMid = strip(
  outlined(
    fill(soft(marshMidHill), '#5a7566') +
      [[120, 1.25], [340, 0.95], [590, 1.4], [860, 1], [1060, 1.3], [1330, 1.05], [1490, 0.9]]
        .map(([x, s]) => deadTree(x, hAt(marshMidHill, x) + 6, s))
        .join(''),
    '#34473e',
  ) + fog(262, 0.4),
);

const reeds = (x: number, y: number, flip = 1) =>
  `<path d="M${x} ${y}Q${x - 2 * flip} ${y - 34} ${x - 8 * flip} ${y - 62}M${x + 8} ${y}Q${x + 10} ${y - 40} ${x + 10 + 4 * flip} ${y - 78}M${x + 16} ${y}Q${x + 20 * flip} ${y - 30} ${x + 30 * flip} ${y - 54}" fill="none" stroke-width="4"/>` +
  `<rect x="${x + 10 + 4 * flip - 4}" y="${y - 100}" width="8" height="26" rx="4" fill="#6e4626"/>` +
  `<rect x="${x - 8 * flip - 3}" y="${y - 80}" width="7" height="20" rx="3.5" fill="#6e4626"/>`;
const pad = (x: number, y: number) => `<ellipse cx="${x}" cy="${y}" rx="24" ry="7" fill="#4f7f55"/>`;
const marshNear = strip(
  outlined(
    fill(soft([[0, 290], [300, 284], [640, 292], [980, 284], [1300, 292]]), '#3f6660') +
      fill(soft([[0, 306], [160, 280], [340, 310], [540, 278], [760, 312], [980, 282], [1200, 312], [1420, 282]]), '#5d6a43') +
      reeds(120, 300) + reeds(200, 306, -1) + reeds(530, 296) + reeds(610, 304, -1) + reeds(950, 298) + reeds(1020, 306, -1) + reeds(1410, 298) +
      pad(340, 304) + pad(420, 298) + pad(780, 306) + pad(1220, 306),
    INK,
  ),
);

// ---------------------------------------------------------------------------------------------
// Snowy pines, in night-blue tones
// ---------------------------------------------------------------------------------------------

const snowFarPts: P[] = [[0, 190], [130, 90], [260, 180], [400, 60], [540, 170], [660, 100], [790, 180], [930, 50], [1080, 175], [1200, 95], [1330, 180], [1460, 75], [1560, 150]];
const snowFarD = jag(snowFarPts);
const snowFar = strip(
  outlined(
    fill(snowFarD, '#46618f') +
      clipped('a', snowFarD, noStroke(snowFarPts.filter(([, y]) => y < 110).map(([x, y]) => cap(x, y, 56)).join(''), '#c8d6ea')),
    '#2c4069',
  ),
);

const snowMidHill: P[] = [[0, 232], [160, 206], [340, 240], [540, 200], [740, 240], [940, 208], [1140, 242], [1340, 204], [1500, 234]];
const snowMidPines = [60, 105, 170, 240, 300, 380, 450, 515, 590, 680, 760, 830, 905, 985, 1060, 1130, 1215, 1290, 1375, 1450, 1530];
const snowMid = strip(
  snowFirDef +
    outlined(
      fill(soft(snowMidHill), '#a9bfdb') +
        snowMidPines.map((x, i) => place('s', x, hAt(snowMidHill, x) + 10, 0.85 + (i % 3) * 0.2, i % 2 ? '#22405f' : '#2b4d70')).join(''),
      '#1b2f4d',
    ),
);

const snowNearHill: P[] = [[0, 282], [200, 264], [420, 296], [640, 266], [860, 296], [1080, 266], [1300, 294], [1480, 270]];
const snowNear = strip(
  snowFirDef +
    outlined(
      fill(soft(snowNearHill), '#dde7f4') +
        [[110, 1.9], [190, 1.4], [660, 2], [730, 1.45], [1090, 1.7], [1440, 1.9]]
          .map(([x, s]) => place('s', x, hAt(snowNearHill, x) + 14, s, '#1e3a56'))
          .join('') +
        '<path d="M300 306q30-10 60 0M860 310q40-12 80 0M1240 308q30-10 60 0" fill="none" stroke="#a9bfdb"/>',
      '#1a2740',
    ),
);

// ---------------------------------------------------------------------------------------------
// Ground strips: the road carries the depth lanes, 20 to 64 px below the strip's top edge.
// ---------------------------------------------------------------------------------------------

interface GroundStyle {
  base: string;
  verge: string;
  road: string;
  rut: string;
  stone: string;
  outline: string;
  decor: string;
}

function ground(s: GroundStyle): Art {
  const body =
    `<path d="M-5 135V4Q160 -2 320 4T640 3T960 4T1285 3V135Z" fill="${s.base}"/>` +
    `<path d="M-5 4Q160 -2 320 4T640 3T960 4T1285 3" fill="none" stroke="${s.outline}" stroke-width="3.5"/>` +
    `<path d="M-5 16Q300 11 640 16T1285 14V88Q900 94 640 88T-5 90Z" fill="${s.road}" stroke="${s.outline}" stroke-width="3.5"/>` +
    `<path d="M-5 34Q320 29 640 34T1285 32M-5 68Q320 73 640 68T1285 70" fill="none" stroke="${s.rut}" stroke-width="5" stroke-dasharray="70 26 34 18" stroke-linecap="round"/>` +
    dots([[60, 24], [190, 58], [305, 44], [420, 78], [560, 26], [655, 54], [790, 76], [905, 40], [1030, 62], [1150, 24], [1250, 78], [120, 80], [480, 48], [980, 24]], s.stone, 7) +
    `<path d="M-5 100Q320 106 640 100T1285 102V135H-5Z" fill="${s.verge}"/>` +
    s.decor;
  return { svg: svg(1280, 130, body), w: 1280, h: 130, px: 0, py: 0 };
}

const tufts = (xs: P[], col: string) =>
  `<path d="${xs.map(([x, y]) => `M${x} ${y}l-7-13M${x} ${y}v-16M${x} ${y}l7-13`).join('')}" fill="none" stroke="${col}" stroke-width="3.5" stroke-linecap="round"/>`;

const TUFT_ROW: P[] = [[50, 118], [170, 110], [310, 122], [460, 112], [600, 124], [720, 112], [860, 122], [1000, 112], [1130, 124], [1240, 114]];

const meadowGround = ground({
  base: '#7fa352', verge: '#6b9148', road: '#b08a5a', rut: '#8d6b45', stone: '#d3b98c', outline: INK,
  decor: tufts(TUFT_ROW, '#3f6b45') + dots([[110, 112], [260, 122], [540, 114], [800, 124], [1060, 118], [1200, 124]], '#f3e6c8', 7) + dots([[390, 122], [660, 114], [940, 124]], '#b5502e', 7),
});
const canyonGround = ground({
  base: '#c97d4e', verge: '#b66b42', road: '#dcae78', rut: '#b98857', stone: '#f0d2a3', outline: INK,
  decor: dots([[90, 112], [230, 122], [380, 110], [530, 124], [700, 112], [840, 124], [1010, 114], [1180, 124]], '#8d4630', 11) + tufts([[310, 124], [950, 122]], '#7d7a35'),
});
const marshGround = ground({
  base: '#5d6a43', verge: '#4c5a3a', road: '#7b6a4c', rut: '#5a4c37', stone: '#9b8c6c', outline: INK,
  decor: tufts(TUFT_ROW, '#2f4a33') + `<path d="M180 112a60 9 0 1 0 120 0a60 9 0 1 0-120 0ZM760 118a70 9 0 1 0 140 0a70 9 0 1 0-140 0Z" fill="#3f6660" stroke="${INK}" stroke-width="3"/>`,
});
const snowGround = ground({
  base: '#dde7f4', verge: '#c9d6e8', road: '#9fb1c9', rut: '#7a8fac', stone: '#c5d2e4', outline: '#1a2740',
  decor: dots([[130, 116], [420, 122], [700, 114], [1020, 122]], '#ffffff', 12) + tufts([[280, 124], [880, 122]], '#22405f'),
});

// ---------------------------------------------------------------------------------------------

export const LANDSCAPE_ART: Record<
  'meadow' | 'canyon' | 'marsh' | 'snowpine',
  { far: Art; mid: Art; near: Art; ground: Art; tint: { day: [string, string]; dusk: [string, string]; night: [string, string] } }
> = {
  meadow: {
    far: meadowFar,
    mid: meadowMid,
    near: meadowNear,
    ground: meadowGround,
    tint: { day: ['#7fc0d6', '#e8efd2'], dusk: ['#6b5b8a', '#f2ac6b'], night: ['#1b2747', '#46587f'] },
  },
  canyon: {
    far: canyonFar,
    mid: canyonMid,
    near: canyonNear,
    ground: canyonGround,
    tint: { day: ['#78b3c8', '#f5d6a4'], dusk: ['#7a3f5e', '#f08c4d'], night: ['#231a3a', '#6b4053'] },
  },
  marsh: {
    far: marshFar,
    mid: marshMid,
    near: marshNear,
    ground: marshGround,
    tint: { day: ['#9db5aa', '#dadec2'], dusk: ['#5c5f63', '#c9a17d'], night: ['#1a2a2e', '#405750'] },
  },
  snowpine: {
    far: snowFar,
    mid: snowMid,
    near: snowNear,
    ground: snowGround,
    tint: { day: ['#8fb0d6', '#dfe9f2'], dusk: ['#3f4a7e', '#c58fa7'], night: ['#0f1a38', '#2d4573'] },
  },
};

const cloud = (w: number, h: number, shapes: string): Art => ({
  svg: svg(
    w,
    h,
    `<g fill="#6f6a5f" stroke="#6f6a5f" stroke-width="6" stroke-linejoin="round" opacity=".55">${shapes}</g><g fill="#f6efdc">${shapes}</g>`,
  ),
  w,
  h,
  px: w / 2,
  py: h / 2,
});

export const CLOUDS: Art[] = [
  cloud(200, 90, '<circle cx="46" cy="60" r="24"/><circle cx="84" cy="40" r="32"/><circle cx="126" cy="48" r="28"/><circle cx="160" cy="62" r="20"/><rect x="30" y="58" width="146" height="24" rx="12"/>'),
  cloud(220, 100, '<circle cx="42" cy="70" r="20"/><circle cx="76" cy="52" r="26"/><circle cx="118" cy="40" r="34"/><circle cx="160" cy="58" r="26"/><circle cx="190" cy="72" r="16"/><rect x="26" y="68" width="176" height="24" rx="12"/>'),
  cloud(180, 80, '<circle cx="40" cy="50" r="20"/><circle cx="74" cy="36" r="26"/><circle cx="112" cy="42" r="24"/><circle cx="142" cy="54" r="16"/><rect x="24" y="50" width="134" height="22" rx="11"/>'),
];
