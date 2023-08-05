'use strict';
/*
Adapted from d3-contour https://github.com/d3/d3-contour

Copyright 2012-2023 Mike Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
*/
// Object.defineProperty(exports, '__esModule', { value: true });
let Fragment = /** @class */ (function () {
  function Fragment(start, end) {
    this.start = start;
    this.end = end;
    this.points = [];
    this.append = this.append.bind(this);
    this.prepend = this.prepend.bind(this);
  }
  Fragment.prototype.append = function (x, y) {
    this.points.push(Math.round(x), Math.round(y));
  };
  Fragment.prototype.prepend = function (x, y) {
    this.points.splice(0, 0, Math.round(x), Math.round(y));
  };
  Fragment.prototype.lineString = function () {
    return this.toArray();
  };
  Fragment.prototype.isEmpty = function () {
    return this.points.length < 2;
  };
  Fragment.prototype.appendFragment = function (other) {
    let _a;
    (_a = this.points).push.apply(_a, other.points);
    this.end = other.end;
  };
  Fragment.prototype.toArray = function () {
    return this.points;
  };
  return Fragment;
})();
let CASES = [
  [],
  [
    [
      [1, 2],
      [0, 1],
    ],
  ],
  [
    [
      [2, 1],
      [1, 2],
    ],
  ],
  [
    [
      [2, 1],
      [0, 1],
    ],
  ],
  [
    [
      [1, 0],
      [2, 1],
    ],
  ],
  [
    [
      [1, 2],
      [0, 1],
    ],
    [
      [1, 0],
      [2, 1],
    ],
  ],
  [
    [
      [1, 0],
      [1, 2],
    ],
  ],
  [
    [
      [1, 0],
      [0, 1],
    ],
  ],
  [
    [
      [0, 1],
      [1, 0],
    ],
  ],
  [
    [
      [1, 2],
      [1, 0],
    ],
  ],
  [
    [
      [0, 1],
      [1, 0],
    ],
    [
      [2, 1],
      [1, 2],
    ],
  ],
  [
    [
      [2, 1],
      [1, 0],
    ],
  ],
  [
    [
      [0, 1],
      [2, 1],
    ],
  ],
  [
    [
      [1, 2],
      [2, 1],
    ],
  ],
  [
    [
      [0, 1],
      [1, 2],
    ],
  ],
  [],
];
function index(width, x, y, point) {
  x = x * 2 + point[0];
  y = y * 2 + point[1];
  return x + y * (width + 1) * 2;
}
function ratio(a, b, c) {
  return (b - a) / (c - a);
}
/**
 * Generates contour lines from a HeightTile
 *
 * @param interval Vertical distance between contours
 * @param tile The input height tile, where values represent the height at the top-left of each pixel
 * @param extent Vector tile extent (default 4096)
 * @param buffer How many pixels into each neighboring tile to include in a tile
 * @returns an object where keys are the elevation, and values are a list of `[x1, y1, x2, y2, ...]`
 * contour lines in tile coordinates
 */
export function generateIsolines(interval, tile, extent, buffer) {
  if (extent === void 0) {
    extent = 4096;
  }
  if (buffer === void 0) {
    buffer = 1;
  }
  if (!interval) {
    return {};
  }
  console.log({ extent, buffer, interval });
  let multiplier = extent / (tile.width - 1);
  let tld, trd, bld, brd;
  let r, c;
  let segments = {};
  let fragmentByStartByLevel = new Map();
  let fragmentByEndByLevel = new Map();
  function interpolate(point, threshold, accept) {
    if (point[0] === 0) {
      // left
      accept(multiplier * (c - 1), multiplier * (r - ratio(bld, threshold, tld)));
    } else if (point[0] === 2) {
      // right
      accept(multiplier * c, multiplier * (r - ratio(brd, threshold, trd)));
    } else if (point[1] === 0) {
      // top
      accept(multiplier * (c - ratio(trd, threshold, tld)), multiplier * (r - 1));
    } else {
      // bottom
      accept(multiplier * (c - ratio(brd, threshold, bld)), multiplier * r);
    }
  }
  // Most marching-squares implementations (d3-contour, gdal-contour) make one pass through the matrix per threshold.
  // This implementation makes a single pass through the matrix, building up all of the contour lines at the
  // same time to improve performance.
  for (r = 1 - buffer; r < tile.height + buffer; r++) {
    trd = tile.get(0, r - 1);
    brd = tile.get(0, r);
    let minR = Math.min(trd, brd);
    let maxR = Math.max(trd, brd);
    for (c = 1 - buffer; c < tile.width + buffer; c++) {
      tld = trd;
      bld = brd;
      trd = tile.get(c, r - 1);
      brd = tile.get(c, r);
      let minL = minR;
      let maxL = maxR;
      minR = Math.min(trd, brd);
      maxR = Math.max(trd, brd);
      if (isNaN(tld) || isNaN(trd) || isNaN(brd) || isNaN(bld)) {
        continue;
      }
      let min = Math.min(minL, minR);
      let max = Math.max(maxL, maxR);
      let start = Math.ceil(min / interval) * interval;
      let end = Math.floor(max / interval) * interval;
      for (let threshold = start; threshold <= end; threshold += interval) {
        let tl = tld > threshold;
        let tr = trd > threshold;
        let bl = bld > threshold;
        let br = brd > threshold;
        for (let _i = 0, _a = CASES[(tl ? 8 : 0) | (tr ? 4 : 0) | (br ? 2 : 0) | (bl ? 1 : 0)]; _i < _a.length; _i++) {
          let segment = _a[_i];
          var fragmentByStart = fragmentByStartByLevel.get(threshold);
          if (!fragmentByStart) fragmentByStartByLevel.set(threshold, (fragmentByStart = new Map()));
          let fragmentByEnd = fragmentByEndByLevel.get(threshold);
          if (!fragmentByEnd) fragmentByEndByLevel.set(threshold, (fragmentByEnd = new Map()));
          let start_1 = segment[0];
          let end_1 = segment[1];
          let startIndex = index(tile.width, c, r, start_1);
          let endIndex = index(tile.width, c, r, end_1);
          let f = void 0,
            g = void 0;
          if ((f = fragmentByEnd.get(startIndex))) {
            fragmentByEnd.delete(startIndex);
            if ((g = fragmentByStart.get(endIndex))) {
              fragmentByStart.delete(endIndex);
              if (f === g) {
                // closing a ring
                interpolate(end_1, threshold, f.append);
                if (!f.isEmpty()) {
                  var list = segments[threshold];
                  if (!list) {
                    segments[threshold] = list = [];
                  }
                  list.push(f.lineString());
                }
              } else {
                // connecting 2 segments
                f.appendFragment(g);
                fragmentByEnd.set((f.end = g.end), f);
              }
            } else {
              // adding to the end of f
              interpolate(end_1, threshold, f.append);
              fragmentByEnd.set((f.end = endIndex), f);
            }
          } else if ((f = fragmentByStart.get(endIndex))) {
            fragmentByStart.delete(endIndex);
            // extending the start of f
            interpolate(start_1, threshold, f.prepend);
            fragmentByStart.set((f.start = startIndex), f);
          } else {
            // starting a new fragment
            let newFrag = new Fragment(startIndex, endIndex);
            interpolate(start_1, threshold, newFrag.append);
            interpolate(end_1, threshold, newFrag.append);
            fragmentByStart.set(startIndex, newFrag);
            fragmentByEnd.set(endIndex, newFrag);
          }
        }
      }
    }
  }
  for (let _b = 0, _c = fragmentByStartByLevel.entries(); _b < _c.length; _b++) {
    var _d = _c[_b],
      level = _d[0],
      fragmentByStart = _d[1];
    var list = null;
    for (let _e = 0, _f = fragmentByStart.values(); _e < _f.length; _e++) {
      let value = _f[_e];
      if (!value.isEmpty()) {
        if (list == null) {
          list = segments[level] || (segments[level] = []);
        }
        list.push(value.lineString());
      }
    }
  }
  return segments;
}
