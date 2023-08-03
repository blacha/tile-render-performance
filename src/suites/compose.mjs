import sharp from 'sharp';
import { Raw } from '../data/raw.mjs';
import { Webp256x256 } from '../data/webp.mjs';

async function composite(ext, top, left, raw = false) {
  if (raw) {
    return {
      input: await sharp(Webp256x256).extract(ext).raw().toBuffer(),
      top,
      left,
      raw: {
        width: ext.width,
        height: ext.height,
        channels: 3,
      },
    };
  }
  return {
    input: await sharp(Webp256x256).extract(ext).toBuffer(),
    top,
    left,
  };
}

export const Compose = {
  name: 'compose',
  benchmarks: {
    '256x256 into 2x 128x128': async () => {
      return await sharp({
        create: { width: 256, height: 256, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
      })
        .composite(
          await Promise.all([
            composite({ top: 0, left: 0, width: 128, height: 128 }, 128, 128),
            composite({ top: 128, left: 128, width: 128, height: 128 }, 0, 0),
          ]),
        )
        .webp()
        .toBuffer();
    },
    '256x256 into 4x 128x128': async () => {
      return await sharp({
        create: { width: 256, height: 256, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
      })
        .composite(
          await Promise.all([
            composite({ top: 0, left: 0, width: 128, height: 128 }, 128, 128),
            composite({ top: 0, left: 128, width: 128, height: 128 }, 0, 128),
            composite({ top: 128, left: 0, width: 128, height: 128 }, 128, 0),
            composite({ top: 128, left: 128, width: 128, height: 128 }, 0, 0),
          ]),
        )
        .webp()
        .toBuffer();
    },
    '256x256 into 4x 128x128 raw': async () => {
      return await sharp({
        create: { width: 256, height: 256, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
      })
        .composite(
          await Promise.all([
            composite({ top: 0, left: 0, width: 128, height: 128 }, 128, 128, true),
            composite({ top: 0, left: 128, width: 128, height: 128 }, 0, 128, true),
            composite({ top: 128, left: 0, width: 128, height: 128 }, 128, 0, true),
            composite({ top: 128, left: 128, width: 128, height: 128 }, 0, 0, true),
          ]),
        )
        .webp()
        .toBuffer();
    },
    '256x256 scale 4x 128x128': async () => {
      async function scale(size, top, left) {
        return {
          input: await Raw.x256().resize(size).raw().toBuffer(),
          top,
          left,
          raw: {
            width: size,
            height: size,
            channels: 3,
          },
        };
      }

      return await sharp({
        create: { width: 256, height: 256, channels: 4, background: { r: 255, g: 0, b: 255, alpha: 1 } },
      })
        .composite(await Promise.all([scale(128, 128, 128), scale(128, 0, 128), scale(128, 128, 0), scale(128, 0, 0)]))
        .webp()
        .toBuffer();
    },
  },
};
