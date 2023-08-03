import sharp from 'sharp';
import assert from 'node:assert';

function newFloat32(width, height, channels, init = false) {
  const bytes = new Float32Array(width * height * channels);
  if (init === false) return bytes;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      for (let c = 0; c < channels; c++) {
        bytes[offset + c] = x + 0.5;
      }
    }
  }

  return bytes;
}

export const Float32 = {
  name: 'float32',
  description: 'High bit count float32 images',
  benchmarks: {
    'resize 256x256 to 16x16': async () => {
      const buf = newFloat32(256, 256, 1, true);
      const ret = await sharp(buf, { channels: 1, raw: { width: 256, height: 256, channels: 1, depth: 'float' } })
        .resize({ width: 16, kernel: 'cubic' })
        .raw({ depth: 'float' })
        .extractChannel(0)
        .toBuffer({ resolveWithObject: true });

      assert.equal(ret.data.length, 16 * 16 * 4);
    },
    'resize 256x256 to 1024x1024 and extract 256x256': async () => {
      const buf = newFloat32(256, 256, 1);
      const ret = await sharp(buf, { channels: 1, raw: { width: 256, height: 256, channels: 1, depth: 'float' } })
        .resize({ width: 1024, kernel: 'cubic' })
        .extract({ top: 512, left: 512, width: 256, height: 256 })
        .raw({ depth: 'float' })
        .extractChannel(0)
        .toBuffer({ resolveWithObject: true });

      assert.equal(ret.data.length, 256 * 256 * 4);
    },
  },
};
