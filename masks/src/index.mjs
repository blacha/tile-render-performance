import { GoogleTms } from '@basemaps/geo';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

/**
 * Generate a image mask 0 where image alpha is 0 other wise 1
 *
 * @param {number[]} inp
 * @returns {{ data: number[], alpha: number, total: number} }
 */
export function generateMask(inp) {
  const output = [];
  let alphaCount = 0;
  let total = 0;

  for (let i = 0; i < inp.length; i += 4) {
    total++;
    const alpha = inp[i + 3];
    if (alpha === 0) {
      output.push(0);
      alphaCount++;
    } else output.push(1);
  }
  return { data: output, alpha: alphaCount, total };
}

/**
 * Convert the mask into a webp image
 * @param {number[]} mask
 */
async function maskToWebp(mask) {
  const img = Buffer.alloc(mask.length * 4);
  for (let i = 0; i < mask.length; i++) {
    const byte = mask[i];
    if (byte === 0) {
      // Magenta!
      img[i * 4] = 255; // R
      img[i * 4 + 1] = 0; // G
      img[i * 4 + 2] = 255; // B
      img[i * 4 + 3] = 255; // Alpha
    }
  }
  return await sharp(img, { raw: { channels: 4, width: 256, height: 256 } })
    .webp()
    .toBuffer();
}

/**
 * @param {{ x: number, y :number, z : number}} tile
 */
async function processTile(tile) {
  const data = readFileSync(new URL(`../../input/nz.${tile.z}-${tile.x}-${tile.y}.webp`, import.meta.url));

  const origin = GoogleTms.tileToSource(tile);
  const scale = GoogleTms.pixelScale(tile.z);

  /** Convert to a raw RGBA buffer */
  const buf = await sharp(data).raw().toBuffer();

  const mask = generateMask(buf);
  console.log(tile, { alpha: mask.alpha });

  if (process.argv.includes('--dump')) {
    const webp = await maskToWebp(mask.data);
    writeFileSync(`./${tile.z}-${tile.x}-${tile.y}.webp`, webp);
  }
}

await processTile({ x: 31, y: 19, z: 5 });
