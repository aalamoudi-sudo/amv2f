interface Point {
  x: number;
  y: number;
}

interface SampledPoint extends Point {
  length: number;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));

function cubicPoint(start: Point, controlA: Point, controlB: Point, end: Point, t: number): Point {
  const inverse = 1 - t;
  return {
    x: inverse ** 3 * start.x + 3 * inverse ** 2 * t * controlA.x + 3 * inverse * t ** 2 * controlB.x + t ** 3 * end.x,
    y: inverse ** 3 * start.y + 3 * inverse ** 2 * t * controlA.y + 3 * inverse * t ** 2 * controlB.y + t ** 3 * end.y,
  };
}

function samplePath(path: string): SampledPoint[] {
  const tokens = path.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const samples: SampledPoint[] = [];
  let cursor = 0;
  let command = "";
  let current: Point = { x: 0, y: 0 };
  let totalLength = 0;

  const append = (point: Point) => {
    const previous = samples.at(-1);
    if (previous) totalLength += Math.hypot(point.x - previous.x, point.y - previous.y);
    samples.push({ ...point, length: totalLength });
  };

  while (cursor < tokens.length) {
    if (/^[A-Za-z]$/.test(tokens[cursor]!)) command = tokens[cursor++]!;
    if (command === "M") {
      current = { x: Number(tokens[cursor++]), y: Number(tokens[cursor++]) };
      append(current);
      command = "L";
    } else if (command === "L") {
      current = { x: Number(tokens[cursor++]), y: Number(tokens[cursor++]) };
      append(current);
    } else if (command === "C") {
      const controlA = { x: Number(tokens[cursor++]), y: Number(tokens[cursor++]) };
      const controlB = { x: Number(tokens[cursor++]), y: Number(tokens[cursor++]) };
      const end = { x: Number(tokens[cursor++]), y: Number(tokens[cursor++]) };
      const start = current;
      for (let step = 1; step <= 64; step += 1) append(cubicPoint(start, controlA, controlB, end, step / 64));
      current = end;
    } else {
      throw new Error(`Unsupported SVG path command: ${command || "missing"}`);
    }
  }

  return samples;
}

export function pointAtPathProgress(path: string, rawProgress: number): Point {
  const samples = samplePath(path);
  if (samples.length === 0) return { x: 0, y: 0 };
  const target = samples.at(-1)!.length * clamp(rawProgress);
  const upperIndex = samples.findIndex((sample) => sample.length >= target);
  if (upperIndex <= 0) return { x: samples[0]!.x, y: samples[0]!.y };
  const lower = samples[upperIndex - 1]!;
  const upper = samples[upperIndex]!;
  const span = upper.length - lower.length || 1;
  const ratio = (target - lower.length) / span;
  return {
    x: lower.x + (upper.x - lower.x) * ratio,
    y: lower.y + (upper.y - lower.y) * ratio,
  };
}

export function distanceBetweenPoints(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
