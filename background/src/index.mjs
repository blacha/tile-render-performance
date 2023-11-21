import { S3Client } from '@aws-sdk/client-s3';
import { Bounds, Nztm2000QuadTms, Projection } from '@basemaps/geo';
import { Tiler } from '@basemaps/tiler';
import { fsa } from '@chunkd/fs';
import { FsAwsS3 } from '@chunkd/fs-aws';
import { TileMakerSharp } from '@basemaps/tiler-sharp';
import sharp from 'sharp';

import { CogTiff } from '@cogeotiff/core';
import { mapSheetToBounds } from './mapsheet.mjs';
import { getSource, Stats } from './sources.mjs';

const client = new FsAwsS3(new S3Client({}));
client.noSignRequest = true;
fsa.register('s3://nz-imagery', client);

// const OutputSize = { width: 1400, height: 600 };

// const OutputSize = { width: 2540, height: 1440 };
// const OutputSize = { width: 3840, height: 2160, z: 16 };

// const OutputSize = { width: 1920, height: 540, z: 15 };

// const OutputSize = { width: 3840, height: 1080, z: 16 };

const OutputSize = { width: 7680, height: 2160, z: 17 };

const Point = [175.6885764, -36.8355588];

const Gsd = 0.1; // TODO Fetch from tiff
const z = OutputSize.z;

const tileMatrix = Nztm2000QuadTms;

async function main() {
  const collectionUrl = fsa.toUrl('s3://nz-imagery/waikato/thames-coromandel_2021_0.1m/rgb/2193/collection.json');
  const catalogUrl = fsa.toUrl('./catalog.json');
  const collection = await fsa.readJson(catalogUrl);
  //   await fsa.write(fsa.toUrl('./catalog.json'), JSON.stringify(collection));

  const tiffs = collection.links
    .filter((f) => f.rel === 'item')
    .map((link) => {
      const name = link.href.slice(2, link.href.length - 5);
      const sheet = mapSheetToBounds(name);
      return {
        href: new URL(link.href.replace('json', 'tiff'), collectionUrl).href,
        name,
        sheet,
        bounds: Bounds.fromBbox(sheet.bbox), //),
        boundsJson: Bounds.fromJson({ ...sheet.origin, width: sheet.width, height: sheet.height }),
      };
    });

  const nztmPoint = Projection.get(tileMatrix).fromWgs84(Point);
  const pixelScale = tileMatrix.pixelScale(z);
  console.log(pixelScale);

  // use the input as the center point, but round it to the closest pixel to make it easier to do math

  const nztmPointCenter = { x: Math.round(nztmPoint[0]), y: Math.round(nztmPoint[1]) };
  const nztmBounds = new Bounds(
    nztmPointCenter.x - (OutputSize.width / 2) * pixelScale,
    nztmPointCenter.y - (OutputSize.height / 2) * pixelScale,
    OutputSize.width * pixelScale,
    OutputSize.height * pixelScale,
  );

  const point = tileMatrix.sourceToPixels(nztmPoint[0], nztmPoint[1], z);
  const screenPoint = { x: Math.round(point.x), y: Math.round(point.y) };
  const screenBounds = new Bounds(
    screenPoint.x - OutputSize.width / 2,
    screenPoint.y - OutputSize.height / 2,
    OutputSize.width,
    OutputSize.height,
  );

  const sourceTiffs = tiffs.filter((f) => {
    // console.log(f.href, f.bounds.intersects(nztmBounds));
    return f.bounds.intersects(nztmBounds);
  });

  //   console.log({ sourceTiffs });
  //   const screenBounds

  const cogs = await Promise.all(sourceTiffs.map((f) => CogTiff.create(getSource(f.href))));
  const tiler = new Tiler(tileMatrix);
  const tileMaker = new TileMakerSharp(OutputSize.width, OutputSize.height);

  const compositions = [];
  for (const asset of cogs) {
    const result = tiler.getTiles(asset, screenBounds, z);
    if (result == null) continue;
    for (const r of result) {
      r.asset = asset; // FIXME why is this broken
      compositions.push(r);
    }

    asset.getTile = async (x, y, z) => {
      const ret = await asset.images[z].getTile(x, y);
      console.log(asset.source.url.href, { x, y, z });
      return ret;
    };
  }

  console.log('Fetching Tiles', compositions.length);
  //   console.log(compositions);

  const img = sharp({
    create: {
      width: OutputSize.width,
      height: OutputSize.height,
      channels: 4,
      background: { r: 255, g: 0, b: 255, alpha: 0.05 },
    },
  });

  const overlays = await Promise.all(
    compositions.map((comp) => tileMaker.composeTileTiff(comp, { in: 'lanczos3', out: 'lanczos3' })),
  ).then((items) => items.filter((f) => f != null));

  console.log('Composite&Compress');
  img.composite(overlays);
  const pngBuffer = await img.png().toBuffer();
  await fsa.write(fsa.toUrl('./output.png'), pngBuffer);
}

main().finally(() => {
  console.log('Stats', Stats);
});
