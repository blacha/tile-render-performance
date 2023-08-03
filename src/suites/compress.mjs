import { Raw } from '../data/raw.mjs';

export const Compression = {
  name: 'compress',

  benchmarks: {
    '256x256.png': async () => {
      return await Raw.x256().png().toBuffer();
    },
    '256x256.webp': async () => {
      return await Raw.x256().webp().toBuffer();
    },
    '256x256.90.webp': async () => {
      return await Raw.x256().webp({ quality: 90 }).toBuffer();
    },
    '256x256.lossless.webp': async () => {
      return await Raw.x256().webp({ lossless: true }).toBuffer();
    },
    '256x256.jpeg': async () => {
      return await Raw.x256().jpeg().toBuffer();
    },
    '256x256.avif': async () => {
      return await Raw.x256().avif().toBuffer();
    },
    '512x512.png': async () => {
      return await Raw.x512().png().toBuffer();
    },
    '512x512.webp': async () => {
      return await Raw.x512().webp().toBuffer();
    },
    '512x512.90.webp': async () => {
      return await Raw.x512().webp({ quality: 90 }).toBuffer();
    },
    '512x512.lossless.webp': async () => {
      return await Raw.x512().webp({ lossless: true }).toBuffer();
    },
    '512x512.jpeg': async () => {
      return await Raw.x512().jpeg().toBuffer();
    },
    '512x512.avif': async () => {
      return await Raw.x512().avif().toBuffer();
    },
  },
};
