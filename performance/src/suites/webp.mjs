import sharp from 'sharp';
import { Webp256x256 } from '../data/webp.mjs';
export const Webp = {
  name: 'webp',

  benchmarks: {
    'load 256x256 from buffer': async () => {
      await sharp(Webp256x256).raw().toBuffer();
    },

    'resize 256x256 to 1024x1024 and extract 256x256': async () => {
      await sharp(Webp256x256)
        .resize({ width: 1024 })
        .extract({ left: 512, top: 512, width: 256, height: 256 })
        .raw()
        .toBuffer();
    },

    'resize 256x256 to 1024 and extract 256 and compress to webp ': async () => {
      return await sharp(Webp256x256)
        .resize({ width: 1024 })
        .extract({ left: 512, top: 512, width: 256, height: 256 })
        .webp()
        .toBuffer();
    },
  },
};
