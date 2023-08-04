import { GoogleTms } from '@basemaps/geo';
import { readFileSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { ContourMipmap } from './contor.mjs';
import { generateIsolines } from './isoline.mjs';

export const WebMercatorBounds = 20037500;
export const EarthRadius = 6378137;
const RadToDeg = 180 / Math.PI;

/**
 *
 * @param {number} wX
 * @param {number} wY
 * @returns {{lat: number, lng: number}}
 */
function webMercatorToLatLong(wX, wY) {
  const lat = (Math.PI * 0.5 - 2.0 * Math.atan(Math.exp(-wY / EarthRadius))) * RadToDeg;
  return { lat, lng: (wX * RadToDeg) / EarthRadius };
}

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
 * @param {{ z: number, x: number, y: number}} tile
 * @param {number[]} data
 */
function fromIsoLine(tile, data) {
  console.time('isolines');
  const lines = generateIsolines(
    0.5,
    {
      get(x, y) {
        return data[y * 256 + x] ?? -1;
      },
      width: 256,
      height: 256,
    },
    256,
  );
  console.timeEnd('isolines');

  const origin = GoogleTms.tileToSource(tile);
  const scale = GoogleTms.pixelScale(tile.z);

  const features = lines[0.5].map((coords) => {
    const output = [];

    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i];
      const y = coords[i + 1];
      const pt = webMercatorToLatLong(origin.x + x * scale, origin.y - y * scale);
      output.push([Number(pt.lng.toFixed(15)), Number(pt.lat.toFixed(15))]);
    }
    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [output],
      },
      properties: {},
    };
  });
  if (process.argv.includes('--dump')) {
    writeFileSync(
      `./${tile.z}-${tile.x}-${tile.y}.geojson`,
      JSON.stringify({
        type: 'FeatureCollection',
        features,
      }),
    );
  }
}
/**
 * @param {{ z: number, x: number, y: number}} tile
 * @param {number[]} data
 */
function fromContourMipmap(tile, data) {
  console.time('mipmap');
  const mipmap = new ContourMipmap(data, 256, 256);
  console.timeEnd('mipmap');

  const origin = GoogleTms.tileToSource(tile);
  const scale = GoogleTms.pixelScale(tile.z);

  const features = mipmap.intervals(0.5).map((level) => {
    const lines = mipmap.contour(level);

    const coordinates = lines.map((coords) =>
      coords.map(([x, y]) => {
        const pt = webMercatorToLatLong(origin.x + x * scale, origin.y - y * scale);
        return [Number(pt.lng.toFixed(15)), Number(pt.lat.toFixed(15))];
      }),
    );

    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates },
      properties: { level },
    };
  });

  console.log('Features', features);
  if (process.argv.includes('--dump')) {
    writeFileSync(
      `./${tile.z}-${tile.x}-${tile.y}.geojson`,
      JSON.stringify({
        type: 'FeatureCollection',
        features,
      }),
    );
  }
}

/**
 * @param {{ x: number, y :number, z : number}} tile
 */
async function processTile(tile) {
  const data = readFileSync(new URL(`../../input/nz.${tile.z}-${tile.x}-${tile.y}.webp`, import.meta.url));

  /** Convert to a raw RGBA buffer */
  const buf = await sharp(data).raw().toBuffer();

  const mask = generateMask(buf);
  console.log(tile, { alpha: mask.alpha });

  if (process.argv.includes('--dump')) {
    const webp = await maskToWebp(mask.data);
    writeFileSync(`./${tile.z}-${tile.x}-${tile.y}.webp`, webp);
  }

  fromIsoLine(tile, mask.data);
}

await processTile({ x: 31, y: 19, z: 5 });
await processTile({ x: 126, y: 79, z: 7 });
