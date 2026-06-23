import {
  CanvasTexture,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace
} from 'three';
import type { BodyConstructionState } from '../../game/content/bodyConstruction';

type RigView = 'front' | 'back';

type PartOptions = {
  width: number;
  height: number;
  x: number;
  y: number;
  z: number;
  view: RigView;
  draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
};

const OUTLINE = '#142033';
const DETAIL = '#24324a';
const HIGHLIGHT = 'rgba(255, 255, 255, 0.35)';

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function createCanvas(size = 160): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function textureFromDrawer(draw: (ctx: CanvasRenderingContext2D, width: number, height: number) => void): CanvasTexture {
  const canvas = createCanvas();
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Character rig canvas unavailable');
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw(ctx, canvas.width, canvas.height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function pathRounded(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function fillStroke(ctx: CanvasRenderingContext2D, fill: string, line = OUTLINE, width = 7): void {
  ctx.fillStyle = fill;
  ctx.strokeStyle = line;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fill();
  ctx.stroke();
}

function addDetailLine(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number, alpha = 0.35): void {
  ctx.save();
  ctx.strokeStyle = `rgba(36, 50, 74, ${alpha})`;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}

function drawCapsule(ctx: CanvasRenderingContext2D, fill: string, shadow: string, detail = 0.4): void {
  pathRounded(ctx, 42, 12, 76, 136, 38);
  fillStroke(ctx, fill);
  ctx.fillStyle = shadow;
  ctx.globalAlpha = 0.28;
  pathRounded(ctx, 75, 18, 30, 124, 18);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (detail > 0.45) {
    addDetailLine(ctx, 66, 45, 58, 102, detail * 0.28);
  }
}

function drawLimb(ctx: CanvasRenderingContext2D, fill: string, shadow: string, muscle = 1, isForearm = false): void {
  const bulge = clamp((muscle - 1) * 16, -8, 14);
  ctx.beginPath();
  ctx.moveTo(54 - bulge * 0.2, 16);
  ctx.bezierCurveTo(82 + bulge, 14, 98 + bulge, 38, 94, 74);
  ctx.bezierCurveTo(90, 118, 78 + bulge * 0.2, 148, 58, 146);
  ctx.bezierCurveTo(38 - bulge * 0.45, 144, 38 - bulge, 112, 42, 74);
  ctx.bezierCurveTo(44, 44, 38, 22, 54 - bulge * 0.2, 16);
  fillStroke(ctx, fill);
  ctx.fillStyle = shadow;
  ctx.globalAlpha = 0.26;
  ctx.beginPath();
  ctx.ellipse(78, 72, 15 + bulge * 0.25, 48, 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (!isForearm && muscle > 1.06) {
    addDetailLine(ctx, 58, 40, 70, 92, 0.18 + (muscle - 1) * 0.26);
  }
}

function drawTorso(ctx: CanvasRenderingContext2D, state: BodyConstructionState, view: RigView): void {
  const { identity, metrics, muscles } = state;
  const chest = 42 + metrics.chestWidth * 28;
  const waist = 42 + metrics.waistWidth * 35;
  const hip = 44 + metrics.hipWidth * 28;
  const skin = hex(identity.skinColor);
  const shadow = hex(identity.skinShadow);
  ctx.beginPath();
  ctx.moveTo(80 - chest / 2, 20);
  ctx.quadraticCurveTo(80, 6, 80 + chest / 2, 20);
  ctx.lineTo(80 + waist / 2, 102);
  ctx.lineTo(80 + hip / 2, 142);
  ctx.quadraticCurveTo(80, 154, 80 - hip / 2, 142);
  ctx.lineTo(80 - waist / 2, 102);
  ctx.closePath();
  fillStroke(ctx, view === 'front' ? hex(identity.outfitBase) : hex(identity.outfitShadow));
  ctx.fillStyle = skin;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.ellipse(80, 38, chest * 0.32, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = hex(identity.outfitAccent);
  pathRounded(ctx, 80 - waist * 0.42, 100, waist * 0.84, 13, 6);
  ctx.fill();

  if (view === 'front') {
    const def = metrics.definition;
    if (muscles.chest > 1.02) {
      addDetailLine(ctx, 80, 31, 80, 58, def * 0.42);
      addDetailLine(ctx, 56, 50, 74, 58, def * 0.28);
      addDetailLine(ctx, 104, 50, 86, 58, def * 0.28);
    }
    if (muscles.core > 1.02) {
      addDetailLine(ctx, 80, 68, 80, 96, def * 0.36);
      addDetailLine(ctx, 68, 76, 92, 76, def * 0.22);
      addDetailLine(ctx, 69, 90, 91, 90, def * 0.22);
    }
  } else {
    const lat = metrics.latWidth * 55;
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.moveTo(80 - lat, 34);
    ctx.quadraticCurveTo(80 - lat * 0.7, 82, 80 - waist * 0.38, 112);
    ctx.lineTo(80, 96);
    ctx.quadraticCurveTo(80 + lat * 0.7, 82, 80 + lat, 34);
    ctx.lineTo(80 + chest * 0.32, 28);
    ctx.quadraticCurveTo(80, 52, 80 - chest * 0.32, 28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    addDetailLine(ctx, 80, 42, 80, 112, metrics.lineIntensity * 0.26);
    addDetailLine(ctx, 58, 58, 48, 94, metrics.lineIntensity * 0.2);
    addDetailLine(ctx, 102, 58, 112, 94, metrics.lineIntensity * 0.2);
  }

  ctx.fillStyle = HIGHLIGHT;
  ctx.beginPath();
  ctx.ellipse(62, 35, 14, 7, -0.24, 0, Math.PI * 2);
  ctx.fill();
}

function drawHead(ctx: CanvasRenderingContext2D, state: BodyConstructionState, view: RigView): void {
  const skin = hex(state.identity.skinColor);
  const shadow = hex(state.identity.skinShadow);
  ctx.beginPath();
  ctx.ellipse(80, 82, 43, 50, 0, 0, Math.PI * 2);
  fillStroke(ctx, skin);
  ctx.fillStyle = shadow;
  ctx.globalAlpha = 0.2;
  ctx.beginPath();
  ctx.ellipse(96, 90, 16, 32, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  if (view === 'front') {
    ctx.fillStyle = OUTLINE;
    ctx.beginPath();
    ctx.ellipse(65, 78, 5, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(95, 78, 5, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a3f3a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(80, 96, 15, 0.12, Math.PI - 0.12);
    ctx.stroke();
  } else {
    ctx.fillStyle = shadow;
    ctx.globalAlpha = 0.16;
    ctx.beginPath();
    ctx.ellipse(80, 92, 29, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawHair(ctx: CanvasRenderingContext2D, state: BodyConstructionState, view: RigView): void {
  const hair = hex(state.identity.hairColor);
  const style = state.identity.hair;
  const tall = ['afro', 'high-puff', 'high-top', 'mohawk', 'spiky'].includes(style);
  const long = ['long-straight', 'long-wavy', 'ponytail', 'braids', 'locs'].includes(style);
  const side = ['side-part', 'swept-back', 'sweep', 'bangs'].includes(style);
  ctx.fillStyle = hair;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (tall) {
    ctx.ellipse(80, 58, 49, 47, 0, 0, Math.PI * 2);
  } else if (long && view === 'back') {
    ctx.ellipse(80, 90, 48, 70, 0, 0, Math.PI * 2);
  } else {
    ctx.ellipse(80, 61, 45, 36, 0, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(118, 74, 108, 92);
    ctx.quadraticCurveTo(80, 77, 52, 92);
    ctx.quadraticCurveTo(42, 74, 35, 61);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (side && view === 'front') {
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.beginPath();
    ctx.ellipse(98, 58, 20, 8, -0.45, 0, Math.PI * 2);
    ctx.fill();
  }
  if (long && view === 'front') {
    ctx.fillStyle = hair;
    pathRounded(ctx, 28, 72, 24, 58, 12);
    ctx.fill();
    pathRounded(ctx, 108, 72, 24, 58, 12);
    ctx.fill();
  }
}

function drawShoe(ctx: CanvasRenderingContext2D, fill: string, accent: string): void {
  pathRounded(ctx, 30, 62, 100, 50, 20);
  fillStroke(ctx, fill);
  ctx.fillStyle = accent;
  pathRounded(ctx, 46, 68, 52, 12, 6);
  ctx.fill();
}

function createPart(options: PartOptions): Mesh {
  const texture = textureFromDrawer(options.draw);
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false
  });
  const mesh = new Mesh(new PlaneGeometry(options.width, options.height), material);
  mesh.position.set(options.x, options.y, options.z);
  if (options.view === 'back') {
    mesh.rotation.y = Math.PI;
  }
  mesh.userData.characterRigPart = true;
  return mesh;
}

function addSymmetricPart(root: Group, options: Omit<PartOptions, 'x'> & { x: number; mirror?: boolean }): void {
  const left = createPart({ ...options, x: -Math.abs(options.x) });
  const right = createPart({ ...options, x: Math.abs(options.x) });
  if (options.mirror !== false) {
    right.scale.x = -1;
  }
  root.add(left, right);
}

function addView(root: Group, state: BodyConstructionState, view: RigView): void {
  const { metrics, identity, muscles } = state;
  const skin = hex(identity.skinColor);
  const shadow = hex(identity.skinShadow);
  const accent = hex(identity.outfitAccent);
  const shoe = hex(identity.shoeColor);
  const layerSign = view === 'front' ? 1 : -1;
  const z = (layer: number): number => layer * 0.012 * layerSign;
  const height = metrics.height;
  const baseY = 0.02;
  const legY = baseY + 0.48 * height;
  const torsoY = baseY + 1.18 * height;
  const headY = baseY + 1.92 * height;
  const shoulderY = baseY + 1.52 * height;
  const hipY = baseY + 0.82 * height;

  const gluteBoost = view === 'back' ? (muscles.glutes - 1) * 0.12 : 0;
  root.add(createPart({
    view,
    width: metrics.hipWidth + gluteBoost + 0.34,
    height: 0.42,
    x: 0,
    y: hipY,
    z: z(1),
    draw: (ctx) => {
      pathRounded(ctx, 34, 40, 92, 76, 30);
      fillStroke(ctx, view === 'back' ? shadow : hex(identity.outfitShadow));
      if (view === 'back') {
        addDetailLine(ctx, 80, 58, 80, 118, 0.16 + metrics.definition * 0.16);
      }
    }
  }));

  addSymmetricPart(root, {
    view,
    width: metrics.thighWidth,
    height: metrics.legLength * 0.72,
    x: metrics.hipWidth * 0.25,
    y: legY,
    z: z(2),
    draw: (ctx) => drawLimb(ctx, skin, shadow, view === 'back' ? muscles.hamstrings : muscles.quads)
  });

  addSymmetricPart(root, {
    view,
    width: metrics.calfWidth,
    height: metrics.legLength * 0.56,
    x: metrics.hipWidth * 0.23,
    y: baseY + 0.22 * height,
    z: z(3),
    draw: (ctx) => drawLimb(ctx, skin, shadow, muscles.calves, true)
  });

  addSymmetricPart(root, {
    view,
    width: 0.36,
    height: 0.18,
    x: metrics.hipWidth * 0.27,
    y: baseY + 0.03,
    z: z(8),
    draw: (ctx) => drawShoe(ctx, shoe, accent)
  });

  root.add(createPart({
    view,
    width: metrics.chestWidth + metrics.latWidth + 0.25,
    height: metrics.torsoHeight,
    x: 0,
    y: torsoY,
    z: z(4),
    draw: (ctx) => drawTorso(ctx, state, view)
  }));

  addSymmetricPart(root, {
    view,
    width: 0.3 * muscles.shoulders,
    height: 0.28,
    x: metrics.shoulderWidth * 0.52,
    y: shoulderY,
    z: z(7),
    draw: (ctx) => {
      ctx.beginPath();
      ctx.ellipse(80, 80, 52, 38, 0.08, 0, Math.PI * 2);
      fillStroke(ctx, skin);
      if (metrics.lineIntensity > 0.5) {
        addDetailLine(ctx, 58, 82, 96, 68, metrics.lineIntensity * 0.3);
      }
    }
  });

  addSymmetricPart(root, {
    view,
    width: metrics.upperArmWidth,
    height: metrics.armLength * 0.52,
    x: metrics.shoulderWidth * 0.6,
    y: baseY + 1.08 * height,
    z: z(6),
    draw: (ctx) => drawLimb(ctx, skin, shadow, view === 'back' ? muscles.triceps : muscles.biceps)
  });

  addSymmetricPart(root, {
    view,
    width: metrics.forearmWidth,
    height: metrics.armLength * 0.44,
    x: metrics.shoulderWidth * 0.62,
    y: baseY + 0.69 * height,
    z: z(7),
    draw: (ctx) => drawLimb(ctx, skin, shadow, muscles.forearms, true)
  });

  addSymmetricPart(root, {
    view,
    width: 0.16,
    height: 0.15,
    x: metrics.shoulderWidth * 0.62,
    y: baseY + 0.43 * height,
    z: z(9),
    draw: (ctx) => {
      ctx.beginPath();
      ctx.ellipse(80, 80, 36, 31, 0, 0, Math.PI * 2);
      fillStroke(ctx, accent);
    }
  });

  root.add(createPart({
    view,
    width: 0.26 + metrics.trapHeight,
    height: 0.24,
    x: 0,
    y: baseY + 1.62 * height,
    z: z(5),
    draw: (ctx) => {
      ctx.beginPath();
      ctx.ellipse(80, 94, 42, 36, 0, 0, Math.PI * 2);
      fillStroke(ctx, skin);
    }
  }));

  root.add(createPart({
    view,
    width: 0.54 * metrics.headScale,
    height: 0.58 * metrics.headScale,
    x: 0,
    y: headY,
    z: z(10),
    draw: (ctx) => drawHead(ctx, state, view)
  }));

  root.add(createPart({
    view,
    width: 0.66 * metrics.headScale,
    height: 0.72 * metrics.headScale,
    x: 0,
    y: headY + 0.04,
    z: z(11),
    draw: (ctx) => drawHair(ctx, state, view)
  }));

  root.add(createPart({
    view,
    width: metrics.shoulderWidth + 0.28,
    height: 0.1,
    x: 0,
    y: baseY + 1.72 * height,
    z: z(12),
    draw: (ctx) => {
      pathRounded(ctx, 28, 62, 104, 34, 15);
      fillStroke(ctx, accent, OUTLINE, 5);
    }
  }));
}

export function createCharacterRig2d(state: BodyConstructionState): Group {
  const group = new Group();
  const scale = 0.92;
  addView(group, state, 'front');
  addView(group, state, 'back');
  group.scale.set(scale, scale, scale);
  group.userData.characterRig2d = true;
  return group;
}
