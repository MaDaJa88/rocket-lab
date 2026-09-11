import { CanvasTexture, SRGBColorSpace } from "three";

type Ctx = CanvasRenderingContext2D;

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Horizontal latitude bands: each colour fills an equal slice with a soft edge into the next. */
function bands(ctx: Ctx, w: number, h: number, colors: string[], softness = 0.35) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  const n = colors.length;
  for (let i = 0; i < n; i += 1) {
    const start = i / n;
    const end = (i + 1) / n;
    const soft = ((end - start) * softness) / 2;
    grad.addColorStop(Math.min(1, start + soft), colors[i]);
    grad.addColorStop(Math.max(0, end - soft), colors[i]);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function blotches(
  ctx: Ctx,
  w: number,
  h: number,
  rng: () => number,
  count: number,
  color: string,
  rx: [number, number],
  ry: [number, number],
  alpha = 1,
) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let i = 0; i < count; i += 1) {
    const x = rng() * w;
    const y = h * (0.12 + rng() * 0.76);
    const a = rx[0] + rng() * (rx[1] - rx[0]);
    const b = ry[0] + rng() * (ry[1] - ry[0]);
    ctx.beginPath();
    ctx.ellipse(x, y, a * w, b * h, rng() * 0.6 - 0.3, 0, Math.PI * 2);
    ctx.fill();
    // wrap horizontally so the seam stays hidden
    if (x + a * w > w) {
      ctx.beginPath();
      ctx.ellipse(x - w, y, a * w, b * h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function craters(ctx: Ctx, w: number, h: number, rng: () => number, count: number, dark: string, light: string) {
  for (let i = 0; i < count; i += 1) {
    const x = rng() * w;
    const y = h * (0.06 + rng() * 0.88);
    const r = (2 + Math.pow(rng(), 2.2) * 22) * (w / 1024);
    ctx.fillStyle = dark;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.22, y - r * 0.18, r * 0.62, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function polarCaps(ctx: Ctx, w: number, h: number, color: string, size: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(w * 0.5, 0, w * 0.62, h * size, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(w * 0.5, h, w * 0.62, h * size * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
}

const PAINTERS: Record<string, (ctx: Ctx, w: number, h: number) => void> = {
  jupiter(ctx, w, h) {
    bands(ctx, w, h, [
      "#c9b195", "#d8c3a6", "#b58a62", "#e9dcc6", "#c48d66", "#f0e6d4", "#b97a52",
      "#e6d5bc", "#c39a73", "#ecdfc9", "#b98d68", "#d5bfa0", "#c6ad92",
    ], 0.5);
    const rng = seeded(7);
    blotches(ctx, w, h, rng, 26, "#f4ecdd", [0.03, 0.09], [0.008, 0.02], 0.35);
    blotches(ctx, w, h, rng, 18, "#a86f4c", [0.03, 0.08], [0.008, 0.018], 0.3);
    // Great Red Spot
    ctx.fillStyle = "#c2573d";
    ctx.beginPath();
    ctx.ellipse(w * 0.66, h * 0.6, w * 0.062, h * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#dd7b5e";
    ctx.beginPath();
    ctx.ellipse(w * 0.665, h * 0.6, w * 0.04, h * 0.032, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  saturn(ctx, w, h) {
    bands(ctx, w, h, [
      "#d8c69a", "#e6d5ad", "#d3bc86", "#efe2c2", "#cdb37c", "#e9dab6", "#d4be8c",
      "#e2d0a6", "#d9c592", "#e8d9b4", "#cfb680",
    ], 0.6);
    const rng = seeded(9);
    blotches(ctx, w, h, rng, 16, "#f3eada", [0.04, 0.1], [0.006, 0.014], 0.25);
  },
  uranus(ctx, w, h) {
    bands(ctx, w, h, ["#b9eaee", "#a6e0e6", "#9dd8e0", "#a9e1e7", "#9fd9e1", "#b0e4e9", "#c2eef1"], 0.8);
  },
  neptune(ctx, w, h) {
    bands(ctx, w, h, ["#4a78e4", "#3f6fe0", "#325fd0", "#4a7ae8", "#2c54c2", "#3e6ddc", "#4676e2"], 0.7);
    const rng = seeded(13);
    blotches(ctx, w, h, rng, 6, "#f0f5ff", [0.04, 0.12], [0.004, 0.009], 0.5);
    ctx.fillStyle = "#223f96";
    ctx.beginPath();
    ctx.ellipse(w * 0.3, h * 0.62, w * 0.05, h * 0.035, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  mars(ctx, w, h) {
    ctx.fillStyle = "#c46a42";
    ctx.fillRect(0, 0, w, h);
    const rng = seeded(3);
    blotches(ctx, w, h, rng, 14, "#8e4a2f", [0.05, 0.16], [0.05, 0.14], 0.55);
    blotches(ctx, w, h, rng, 10, "#d8916a", [0.05, 0.14], [0.04, 0.1], 0.5);
    blotches(ctx, w, h, rng, 6, "#7a3f2a", [0.02, 0.06], [0.02, 0.05], 0.5);
    polarCaps(ctx, w, h, "#f3ede4", 0.07);
  },
  luna(ctx, w, h) {
    ctx.fillStyle = "#b6b0a3";
    ctx.fillRect(0, 0, w, h);
    const rng = seeded(5);
    blotches(ctx, w, h, rng, 7, "#8b867c", [0.06, 0.16], [0.08, 0.2], 0.7);
    craters(ctx, w, h, rng, 110, "#8f897d", "#d2ccbe");
  },
  mercury(ctx, w, h) {
    ctx.fillStyle = "#9c968e";
    ctx.fillRect(0, 0, w, h);
    const rng = seeded(17);
    blotches(ctx, w, h, rng, 6, "#84807a", [0.06, 0.14], [0.08, 0.18], 0.6);
    craters(ctx, w, h, rng, 70, "#7d786f", "#bcb7ad");
  },
  venus(ctx, w, h) {
    bands(ctx, w, h, ["#ecdcae", "#e5d3a0", "#f0e2b8", "#dfcb90", "#ecdcae", "#e8d6a4"], 0.9);
    const rng = seeded(19);
    blotches(ctx, w, h, rng, 20, "#f5ebc8", [0.06, 0.16], [0.01, 0.03], 0.35);
  },
  pluto(ctx, w, h) {
    ctx.fillStyle = "#c9ad8c";
    ctx.fillRect(0, 0, w, h);
    const rng = seeded(29);
    blotches(ctx, w, h, rng, 9, "#6c4536", [0.05, 0.14], [0.06, 0.16], 0.6);
    blotches(ctx, w, h, rng, 6, "#e0c9ac", [0.04, 0.1], [0.04, 0.1], 0.5);
    // Tombaugh Regio, the bright heart
    ctx.fillStyle = "#f1e9da";
    ctx.beginPath();
    ctx.ellipse(w * 0.44, h * 0.5, w * 0.06, h * 0.13, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(w * 0.52, h * 0.52, w * 0.055, h * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
  },
};

const SIZE: Record<string, [number, number]> = {
  jupiter: [1024, 512],
  saturn: [1024, 512],
  luna: [1024, 512],
};

export function createWorldTexture(id: string) {
  const [w, h] = SIZE[id] ?? [512, 256];
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const paint = PAINTERS[id];
    if (paint) paint(ctx, w, h);
    else {
      ctx.fillStyle = "#9a9a9a";
      ctx.fillRect(0, 0, w, h);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Soft radial glow used for the Sun's glare sprites. */
export function createGlareTexture() {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.08, "rgba(255,250,235,0.9)");
    grad.addColorStop(0.22, "rgba(255,232,192,0.38)");
    grad.addColorStop(0.5, "rgba(255,214,164,0.1)");
    grad.addColorStop(1, "rgba(255,200,150,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
