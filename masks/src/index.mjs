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
 * @param {sharp.OutputInfo} info
 * @returns {{ data: number[], alpha: number, total: number} }
 */
export function generateMaskBuffered(inp, info, buffer = 1) {
  if (info.channels !== 4) throw new Error('need alpha channel');
  performance.mark('mask:start');
  const width = info.width + buffer * 2;
  const height = info.height + buffer * 2;
  const output = new Uint8Array(width * height);
  let alphaCount = 0;
  let total = 0;

  for (let y = 0; y < info.height + buffer; y++) {
    for (let x = 0; x < info.width + buffer; x++) {
      const sourceX = x - buffer;
      const sourceY = y - buffer;
      if (sourceX < 0 || sourceY < 0) continue;
      if (sourceX >= info.width) continue;
      if (sourceY >= info.height) continue;

      // console.log(sourceX, sourceY,  * 4 + 3);

      const index = sourceY * info.width + sourceX;
      const source = inp[index * 4 + 3];
      if (source !== 0) output[y * width + x] = 1;
      else alphaCount++;
    }
    // if (y > 1) break;
  }

  performance.mark('mask:end');
  return { data: output, alpha: alphaCount, total };
}
/**
 * Generate a image mask 0 where image alpha is 0 other wise 1
 *
 * @param {number[]} inp
 * @param {sharp.OutputInfo} info
 * @returns {{ data: number[], alpha: number, total: number} }
 */
export function generateMask(inp, info) {
  if (info.channels !== 4) throw new Error('need alpha channel');
  performance.mark('mask:start');
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
  performance.mark('mask:end');
  return { data: output, alpha: alphaCount, total };
}

/**
 * Convert the mask into a webp image
 * @param {number[]} mask
 * @param {sharp.OutputInfo} info
 */
export async function maskToWebp(mask, info) {
  performance.mark('webp:start');
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
  performance.mark('webp:image:end');

  const buf = await sharp(img, { raw: { channels: 4, width: info.width, height: info.height } })
    .webp()
    .toBuffer();

  performance.mark('webp:end');
  return buf;
}

/**
 * @param {{ z: number, x: number, y: number}} tile
 * @param {number[]} data
 */
function fromIsoLine(tile, data) {
  performance.mark('isoline:start');
  const lines = generateIsolines(
    0.5,
    {
      get(x, y) {
        return data[y * 256 + x] ?? 1;
      },
      width: 256,
      height: 256,
    },
    256,
  );
  performance.mark('isoline:end');

  const origin = GoogleTms.tileToSource(tile);
  const scale = GoogleTms.pixelScale(tile.z);

  performance.mark('geojson:start');
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
  performance.mark('geojson:end');

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
  performance.mark('image:start');
  const buf = await sharp(data).raw().toBuffer({ resolveWithObject: true });
  performance.mark('image:end');

  const mask = generateMask(buf.data, buf.info);
  console.log(tile, { alpha: mask.alpha });

  if (process.argv.includes('--dump')) {
    const webp = await maskToWebp(mask.data);
    writeFileSync(`./${tile.z}-${tile.x}-${tile.y}.webp`, webp);
  }

  fromIsoLine(tile, mask.data);

  const metrics = [
    performance.measure('image', 'image:start', 'image:end'),
    performance.measure('mask', 'mask:start', 'mask:end'),
    performance.measure('webp', 'webp:start', 'webp:end'),
    performance.measure('isoline', 'isoline:start', 'isoline:end'),
    performance.measure('geojson', 'geojson:start', 'geojson:end'),
  ];

  //   performance.measure;
  console.log('performance:');
  metrics.forEach((m) => m && console.log('  ', m.name, Number(m.duration.toFixed(3), 'ms')));
}
