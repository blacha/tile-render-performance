const charA = 'A'.charCodeAt(0);
const charS = 'S'.charCodeAt(0);

const MapSheet = {
  /** Height of Topo 1:50k mapsheets (meters) */
  height: 36_000,
  /** Width of Topo 1:50k mapsheets (meters) */
  width: 24_000,
  /** Base scale Topo 1:50k mapsheets (meters) */
  scale: 50_000,
  /** Map Sheets start at AS and end at CK */
  code: { start: 'AS', end: 'CK' },
  /** The top left point for where map sheets start from in NZTM2000 (EPSG:2193) */
  origin: { x: 988000, y: 6234000 },
  gridSizeMax: 50000,
  roundCorrection: 0.01,
  /** Allowed grid sizes, these should exist in the LINZ Data service (meters) */
  gridSizes: [10_000, 5_000, 2_000, 1_000, 500],
};

function offset(sheetCode) {
  const ms = sheetCode.slice(0, 2);
  const x = Number(sheetCode.slice(2));

  const baseYOffset = charS - charA;
  const firstLetterOffset = (ms.charCodeAt(0) - charA) * 26;
  const secondLetterOffset = ms.charCodeAt(1) - charA;

  let y = firstLetterOffset + secondLetterOffset - baseYOffset;

  // There are three missing map sheets
  if (ms > 'CI') y -= 3;
  else if (ms > 'BO') y -= 2;
  else if (ms > 'BI') y--;

  return { x: MapSheet.width * x + MapSheet.origin.x, y: MapSheet.origin.y - MapSheet.height * y };
}

function tileSize(gridSize, x, y) {
  const scale = gridSize / MapSheet.scale;
  const offsetX = MapSheet.width * scale;
  const offsetY = MapSheet.height * scale;
  return { x: (x - 1) * offsetX, y: (y - 1) * offsetY, width: offsetX, height: offsetY };
}

const MapSheetRegex = /([A-Z]{2}\d{2})_(\d+)_(\d+)/;

export function mapSheetToBounds(fileName) {
  const match = fileName.match(MapSheetRegex);
  if (match == null) return null;
  if (match[1] == null) return null;

  const out = {
    mapSheet: match[1],
    gridSize: Number(match[2]),
    x: -1,
    y: -1,
    name: match[0],
    origin: { x: 0, y: 0 },
    width: 0,
    height: 0,
    bbox: [0, 0, 0, 0],
  };
  // 1:500 has X/Y is 3 digits not 2
  if (out.gridSize === 500) {
    out.y = Number(match[3]?.slice(0, 3));
    out.x = Number(match[3]?.slice(3));
  } else {
    out.y = Number(match[3]?.slice(0, 2));
    out.x = Number(match[3]?.slice(2));
  }
  if (isNaN(out.gridSize) || isNaN(out.x) || isNaN(out.y)) return null;

  const origin = offset(out.mapSheet);
  if (origin == null) return null;

  const tileOffset = tileSize(out.gridSize, out.x, out.y);
  out.origin.x = origin.x + tileOffset.x;
  out.origin.y = origin.y - tileOffset.y;
  out.width = tileOffset.width;
  out.height = tileOffset.height;
  // As in NZTM negative Y goes north, the minY is actually the bottom right point
  out.bbox = [out.origin.x, out.origin.y - tileOffset.height, out.origin.x + tileOffset.width, out.origin.y];
  return out;
}
