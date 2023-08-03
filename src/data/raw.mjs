import { readFileSync } from 'node:fs';
import sharp from 'sharp';
export const raw256x256 = readFileSync(new URL('../../input/5-31-19.raw', import.meta.url));

export function raw256() {
  return sharp(raw256x256, { raw: { width: 256, height: 256, channels: 3 } });
}
