import { Raw } from '../data/raw.mjs';

export const Compression = {
  name: 'compress',

  benchmarks: {
    '256x256.png': async () => {
      await Raw.x256().png().toBuffer();
    },
    '256x256.webp': async () => {
      await Raw.x256().webp().toBuffer();
    },
    '256x256.90.webp': async () => {
      await Raw.x256().webp({ quality: 90 }).toBuffer();
    },
    '256x256.jpeg': async () => {
      await Raw.x256().jpeg().toBuffer();
    },
    '256x256.avif': async () => {
      await Raw.x256().avif().toBuffer();
    },
    '512x512.png': async () => {
      await Raw.x512().png().toBuffer();
    },
    '512x512.webp': async () => {
      await Raw.x512().webp().toBuffer();
    },
    '512x512.webp': async () => {
      await Raw.x512().webp({ quality: 90 }).toBuffer();
    },
    '512x512.jpeg': async () => {
      await Raw.x512().jpeg().toBuffer();
    },
    '512x512.avif': async () => {
      await Raw.x512().avif().toBuffer();
    },
  },
};
