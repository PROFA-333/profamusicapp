type Palette = { accent: string; accent2: string; rgb: string };

const FALLBACK: Palette = { accent: '#a855f7', accent2: '#e879f9', rgb: '168 85 247' };
const cache = new Map<string, Palette | null>();

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hp = ((((hue % 360) + 360) % 360) / 60) % 6;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = lightness - c / 2;
  return [
    Math.round((rgb[0] + m) * 255),
    Math.round((rgb[1] + m) * 255),
    Math.round((rgb[2] + m) * 255),
  ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness];
  const delta = max - min;
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue: number;
  if (max === rn) hue = ((gn - bn) / delta + (gn < bn ? 6 : 0)) * 60;
  else if (max === gn) hue = ((bn - rn) / delta + 2) * 60;
  else hue = ((rn - gn) / delta + 4) * 60;
  return [hue, saturation, lightness];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function paletteFromHue(hue: number, saturation: number): Palette {
  const sat = clamp(saturation + 0.16, 0.5, 0.92);
  const rgb = hslToRgb(hue, sat, 0.62);
  return {
    accent: toHex(rgb),
    accent2: toHex(hslToRgb(hue + 30, sat * 0.85, 0.76)),
    rgb: `${rgb[0]} ${rgb[1]} ${rgb[2]}`,
  };
}

export function applyPalette(palette: Palette): void {
  const style = document.documentElement.style;
  style.setProperty('--accent', palette.accent);
  style.setProperty('--accent-2', palette.accent2);
  style.setProperty('--accent-rgb', palette.rgb);
}

export function resetTheme(): void {
  applyPalette(FALLBACK);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    const timer = setTimeout(() => reject(new Error('artwork timeout')), 8000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      reject(new Error('artwork failed'));
    };
    image.src = url;
  });
}

/** Pulls a usable accent out of the cover art so the player theme follows the song. */
export async function paletteFor(url?: string | null): Promise<Palette | null> {
  if (!url) return null;
  if (cache.has(url)) return cache.get(url) ?? null;

  let palette: Palette | null = null;
  try {
    const image = await loadImage(url);
    const size = 36;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('no canvas context');
    context.drawImage(image, 0, 0, size, size);
    const { data } = context.getImageData(0, 0, size, size);

    const buckets = new Map<number, { weight: number; hue: number; sat: number }>();
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3] / 255;
      if (alpha < 0.6) continue;
      const [hue, saturation, lightness] = rgbToHsl(data[index], data[index + 1], data[index + 2]);
      if (lightness < 0.12 || lightness > 0.9 || saturation < 0.18) continue;
      const bucket = Math.round(hue / 12) % 30;
      const weight = saturation * (1 - Math.abs(lightness - 0.55) * 0.9);
      const entry = buckets.get(bucket);
      if (entry) {
        entry.weight += weight;
        entry.hue += hue * weight;
        entry.sat += saturation * weight;
      } else {
        buckets.set(bucket, { weight, hue: hue * weight, sat: saturation * weight });
      }
    }

    let best: { weight: number; hue: number; sat: number } | null = null;
    for (const entry of buckets.values()) {
      if (!best || entry.weight > best.weight) best = entry;
    }
    if (best && best.weight > 0.6) {
      palette = paletteFromHue(best.hue / best.weight, best.sat / best.weight);
    }
  } catch {
    palette = null;
  }

  cache.set(url, palette);
  return palette;
}
