import { SourceFile } from '@chunkd/source-file';
import { writeFileSync } from 'node:fs';
import { CogTiff, TiffTag } from '@cogeotiff/core';
import sharp from 'sharp';
import { generateMaskBuffered, maskToWebp } from './index.mjs';
import { generateIsolines } from './isoline.mjs';
import { ContourMipmap } from './contor.mjs';
import { basename } from 'node:path';

/**
 * @param {string} path
 */
async function processTiff(path) {
  const tiff = await CogTiff.create(new SourceFile(path));

  const origin = tiff.images[0].origin;
  const epsg = tiff.images[0].epsg;

  const bigImage = tiff.images[tiff.images.length - 1];
  const tileSize = bigImage.tileSize;
  const tileCount = bigImage.tileCount;
  const scale = bigImage.resolution[0];

  const noData = bigImage.value(TiffTag.GdalNoData);
  console.log({ path, noData, scale, epsg, tileSize, tileCount });

  if (bigImage.tileCount.x !== 1 || bigImage.tileCount.y !== 1) throw new Error('Top image is more than 1x1');

  const tile = await bigImage.getTile(0, 0);
  const buf = await sharp(tile.bytes).raw().toBuffer({ resolveWithObject: true });

  const mask = generateMaskBuffered(buf.data, buf.info, 1);
  const maskInfo = { width: buf.info.width + 2, height: buf.info.height + 2 };

  const mipmap = new ContourMipmap(mask.data, maskInfo.width, maskInfo.height);
  const contours = mipmap.contour(1, { smoothCycles: 0 });
  const coordinates = contours.map((coords) =>
    coords.map(([x, y]) => {
      return [origin[0] + (x - 1) * scale, origin[1] - (y - 1) * scale];
    }),
  );

  const feature = {
    type: 'Feature',
    crs: {
      type: 'name',
      properties: {
        name: 'EPSG:' + epsg,
      },
    },
    geometry: { type: 'Polygon', coordinates },
    properties: {},
  };

  writeFileSync(basename(path) + '.geojson', JSON.stringify(feature));

  if (process.argv.includes('--mask')) {
    const webp = await maskToWebp(mask.data, maskInfo);
    writeFileSync(basename(path) + '.mask.webp', webp);
  }
}

for (const file of process.argv.slice(2)) {
  console.time(file);
  await processTiff(file);
  console.timeEnd(file);
}
