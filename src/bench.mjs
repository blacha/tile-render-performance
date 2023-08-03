import { Bench } from 'tinybench';
import { Float32 } from './suites/float.mjs';
import { Webp } from './suites/webp.mjs';
import { Compose } from './suites/compose.mjs';
import { Compression } from './suites/compress.mjs';
import c from 'ansi-colors';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import { markdownTable } from 'markdown-table';
import { Raw } from './data/raw.mjs';

const b = new Bench({ iterations: process.argv.includes('--10') ? 10 : 100 });

const suites = [
  Compression,
  // Compose,
  // Float32,
  // Webp,
  //
];

await Raw.init();

for (const suite of suites) {
  if (suite.before) await suite.before();

  const tests = Object.entries(suite.benchmarks);
  tests.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [name, fn] of tests) {
    const ret = await fn(); // ensure the function runs without error

    if (process.argv.includes('--dump') && ret) {
      await fs.mkdir('./output/' + suite.name, { recursive: true });
      await fs.writeFile(join('output', suite.name, name + '.webp'), ret);
    }
    b.add(`${suite.name}: ${name}`, fn);
  }
}

await b.run();

function colorTime(x) {
  const outTime = x.toFixed(4) + 'ms';
  if (x > 50) return c.yellow(outTime);
  if (x > 3) return c.green(outTime);
  return c.dim(outTime);
}

for (const suite of suites) {
  console.log(c.dim(suite.name));
  for (const name of Object.keys(suite.benchmarks)) {
    const testName = `${suite.name}: ${name}`;
    const res = b.getTask(testName);

    console.log('  ', name, colorTime(res.result.mean), Number(res.result.variance.toFixed(3)));
  }
}

if (process.argv.includes('--markdown')) {
  console.log(
    markdownTable([
      ['test', 'duration (ms)', 'variance (ms)'],
      ...b.tasks.map((t) => {
        return [t.name, t.result.mean.toFixed(4), t.result.variance.toFixed(2)];
      }),
    ]),
  );
}
