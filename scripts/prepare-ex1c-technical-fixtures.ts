import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { deflateSync } from 'node:zlib';

const projectId = 'PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001';
const root = path.resolve('public/local-assets/experience-scenes', projectId);

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, 'ascii');
  const output = Buffer.alloc(12 + data.length);
  output.writeUInt32BE(data.length, 0);
  typeBuffer.copy(output, 4);
  data.copy(output, 8);
  output.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 8 + data.length);
  return output;
}

function makeTechnicalPng(width: number, height: number, panorama: boolean, approvedVariant = false): Buffer {
  const stride = width * 3 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    raw[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 3;
      const longitudeBand = Math.floor((x / width) * 12);
      const latitudeBand = Math.floor((y / height) * 6);
      const grid = x % Math.max(1, Math.floor(width / 24)) < 3 || y % Math.max(1, Math.floor(height / 12)) < 3;
      const horizon = Math.abs(y / height - 0.5) < 0.035;
      raw[offset] = grid ? 236 : (approvedVariant ? 62 : 18) + longitudeBand * 7;
      raw[offset + 1] = horizon ? 188 : (approvedVariant ? 82 : 58) + latitudeBand * 18;
      raw[offset + 2] = panorama ? (grid ? 180 : 92 + ((longitudeBand * 13) % 110)) : (grid ? 116 : approvedVariant ? 136 : 82);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function align4(value: number): number {
  return (value + 3) & ~3;
}

function makeTechnicalGlb(): Buffer {
  const faces = [
    { normal: [0, 0, 1], vertices: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
    { normal: [0, 0, -1], vertices: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]] },
    { normal: [1, 0, 0], vertices: [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]] },
    { normal: [-1, 0, 0], vertices: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
    { normal: [0, 1, 0], vertices: [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]] },
    { normal: [0, -1, 0], vertices: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] }
  ];
  const positions = new Float32Array(24 * 3);
  const normals = new Float32Array(24 * 3);
  const indices = new Uint16Array(36);
  faces.forEach((face, faceIndex) => {
    face.vertices.forEach((vertex, vertexIndex) => {
      positions.set(vertex, (faceIndex * 4 + vertexIndex) * 3);
      normals.set(face.normal, (faceIndex * 4 + vertexIndex) * 3);
    });
    const baseVertex = faceIndex * 4;
    indices.set([baseVertex, baseVertex + 1, baseVertex + 2, baseVertex, baseVertex + 2, baseVertex + 3], faceIndex * 6);
  });
  const positionBytes = Buffer.from(positions.buffer);
  const normalBytes = Buffer.from(normals.buffer);
  const indexBytes = Buffer.from(indices.buffer);
  const binary = Buffer.concat([positionBytes, normalBytes, indexBytes]);
  const gltf = {
    asset: { version: '2.0', generator: 'Mayadeen EX.1C deterministic technical fixture' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ name: 'TECHNICAL-FICTIONAL-CONFERENCE-CUBE', mesh: 0, translation: [0, 1, 0] }],
    meshes: [{ name: 'Technical fixture cube', primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ name: 'Technical teal', pbrMetallicRoughness: { baseColorFactor: [0.08, 0.56, 0.42, 1], metallicFactor: 0.1, roughnessFactor: 0.56 } }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionBytes.length, target: 34962 },
      { buffer: 0, byteOffset: positionBytes.length, byteLength: normalBytes.length, target: 34962 },
      { buffer: 0, byteOffset: positionBytes.length + normalBytes.length, byteLength: indexBytes.length, target: 34963 }
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-1, -1, -1], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR', min: [0], max: [23] }
    ]
  };
  const json = Buffer.from(JSON.stringify(gltf), 'utf8');
  const paddedJson = Buffer.alloc(align4(json.length), 0x20);
  json.copy(paddedJson);
  const paddedBinary = Buffer.alloc(align4(binary.length));
  binary.copy(paddedBinary);
  const totalLength = 12 + 8 + paddedJson.length + 8 + paddedBinary.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(paddedJson.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(paddedBinary.length, 0);
  binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHeader, paddedJson, binaryHeader, paddedBinary]);
}

async function fingerprint(filePath: string): Promise<{ sha256: string; byteSize: number }> {
  const bytes = await readFile(filePath);
  return { sha256: createHash('sha256').update(bytes).digest('hex'), byteSize: bytes.length };
}

async function main(): Promise<void> {
  const panoramaDirectory = path.join(root, 'panoramas');
  const renderDirectory = path.join(root, 'renders');
  const modelDirectory = path.join(root, 'models');
  const thumbnailDirectory = path.join(root, 'thumbnails');
  const derivedDirectory = path.join(root, 'derived');
  await Promise.all([panoramaDirectory, renderDirectory, modelDirectory, thumbnailDirectory, derivedDirectory].map((directory) => mkdir(directory, { recursive: true })));

  const flatPath = path.join(renderDirectory, 'technical-design-flat.png');
  const approvedFlatPath = path.join(renderDirectory, 'technical-design-approved.png');
  const panoramaPngPath = path.join(derivedDirectory, 'technical-conference-360-source.png');
  const panoramaPath = path.join(panoramaDirectory, 'technical-conference-360.jpg');
  const thumbnailPath = path.join(thumbnailDirectory, 'technical-conference-thumb.png');
  const glbPath = path.join(modelDirectory, 'technical-conference.glb');
  await writeFile(flatPath, makeTechnicalPng(1600, 900, false));
  await writeFile(approvedFlatPath, makeTechnicalPng(1600, 900, false, true));
  await writeFile(thumbnailPath, makeTechnicalPng(640, 360, false));
  await writeFile(panoramaPngPath, makeTechnicalPng(4096, 2048, true));
  const conversion = spawnSync('/usr/bin/sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', panoramaPngPath, '--out', panoramaPath], { encoding: 'utf8' });
  if (conversion.status !== 0) throw new Error(`TECHNICAL_PANORAMA_CONVERSION_FAILED: ${conversion.stderr.trim()}`);
  await rm(panoramaPngPath, { force: true });
  await writeFile(glbPath, makeTechnicalGlb());

  const metadata = {
    fixtureClassification: 'temporary-demo',
    labelAr: 'نموذج تقني خيالي للاختبار',
    projectId,
    panorama: { path: '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/panoramas/technical-conference-360.jpg', width: 4096, height: 2048, mimeType: 'image/jpeg', ...await fingerprint(panoramaPath) },
    flatRender: { path: '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/renders/technical-design-flat.png', width: 1600, height: 900, mimeType: 'image/png', ...await fingerprint(flatPath) },
    approvedFlatRender: { path: '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/renders/technical-design-approved.png', width: 1600, height: 900, mimeType: 'image/png', ...await fingerprint(approvedFlatPath) },
    thumbnail: { path: '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/thumbnails/technical-conference-thumb.png', width: 640, height: 360, mimeType: 'image/png', ...await fingerprint(thumbnailPath) },
    model: { path: '/local-assets/experience-scenes/PROJECT-REFERENCE-EXPERIENCE-CONFERENCE-001/models/technical-conference.glb', mimeType: 'model/gltf-binary', ...await fingerprint(glbPath) }
  };
  await writeFile(path.join(derivedDirectory, 'fixture-metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  console.log(JSON.stringify(metadata, null, 2));
}

await main();
