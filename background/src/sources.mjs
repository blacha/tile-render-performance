import { SourceView } from '@chunkd/source';
import { SourceAwsS3 } from '@chunkd/source-aws';
import { SourceFile } from '@chunkd/source-file';
import { SourceHttp } from '@chunkd/source-http';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';

import * as middleware from '@chunkd/middleware';
import pLimit from 'p-limit';

export const Stats = {
  total: 0,
  hits: 0,
  misses: 0,
  bytes: { hits: 0, misses: 0 },
};

const Q = pLimit(25);
const requestQueue = {
  name: 'queue',
  async fetch(req, next) {
    return Q(() => next(req));
  },
};

const cacheMiddleware = {
  name: 'cache',
  /**
   *
   * @param {SourceRequest} req
   * @param {*} next
   * @returns
   */
  async fetch(req, next) {
    Stats.total++;
    const reqId =
      req.source.url.protocol.replace(':', '__') +
      req.source.url.hostname +
      '__' +
      createHash('sha256')
        .update(JSON.stringify({ url: req.source.url.href, offset: req.offset, length: req.length }))
        .digest('hex');
    try {
      const buf = await fs.readFile('./.cache/' + reqId);
      Stats.hits++;
      Stats.bytes.hits += buf.length;
      return buf.buffer;
    } catch (e) {
      const data = await next(req);
      const buf = Buffer.from(data);
      Stats.misses++;
      Stats.bytes.misses += buf.length;
      await fs.writeFile('./.cache/' + reqId, buf);
      return data;
    }
  },
};

function _getSource(s) {
  if (s.startsWith('http')) return new SourceHttp(s);
  if (s.startsWith('s3')) return new SourceAwsS3(s);
  return new SourceFile(s);
}

export function getSource(s) {
  return new SourceView(_getSource(s), [
    new middleware.SourceChunk({ size: 64 * 1024 }),
    cacheMiddleware,
    requestQueue,
  ]);
}
