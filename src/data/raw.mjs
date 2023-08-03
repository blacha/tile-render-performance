import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { Webp256x256 } from './webp.mjs';

export const Raw = {
  x256: () => sharp(Raw.data[256], { raw: { width: 256, height: 256, channels: 3 } }),
  x512: () => sharp(Raw.data[512], { raw: { width: 512, height: 512, channels: 3 } }),

  data: {
    512: null,
    256: null,
  },

  async init() {
    Raw.data[256] = await sharp(Webp256x256).raw().toBuffer();
    Raw.data[512] = await sharp(Webp256x256).resize(512).raw().toBuffer();
  },
};
