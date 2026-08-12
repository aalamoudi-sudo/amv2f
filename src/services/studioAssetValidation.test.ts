import { describe, expect, it } from 'vitest';
import { fictionalValidPanoramaInput } from '../data/experienceDeliveryAcceleratorFixtures';
import { createStudioDependencyReport, validateGlbBytes, validateGltfDocument, validatePanorama } from './studioAssetValidation';

function glb(document: unknown, binary = new Uint8Array()): Uint8Array {
  const jsonText = JSON.stringify(document);
  const jsonBytes = new TextEncoder().encode(jsonText);
  const jsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const binaryLength = Math.ceil(binary.length / 4) * 4;
  const total = 12 + 8 + jsonLength + (binary.length ? 8 + binaryLength : 0);
  const output = new Uint8Array(total);
  const view = new DataView(output.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  output.fill(0x20, 20, 20 + jsonLength);
  output.set(jsonBytes, 20);
  if (binary.length) {
    const offset = 20 + jsonLength;
    view.setUint32(offset, binaryLength, true);
    view.setUint32(offset + 4, 0x004e4942, true);
    output.set(binary, offset + 8);
  }
  return output;
}

const validDocument = {
  asset: { version: '2.0' },
  scenes: [{ nodes: [0] }],
  nodes: [{ mesh: 0 }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
  accessors: [{ bufferView: 0, min: [-1, 0, -1], max: [1, 2, 1] }],
  bufferViews: [{ buffer: 0, byteLength: 36 }],
  buffers: [{ byteLength: 36 }],
  textures: [], animations: []
};

describe('EX.1F studio validation harness', () => {
  it('validates a small GLB container and reports scene statistics', () => {
    const result = validateGlbBytes(glb(validDocument, new Uint8Array(36)), { sourceFingerprint: 'a'.repeat(64) });
    expect(result).toMatchObject({ valid: true, status: 'runtime-compatible', statistics: { sceneCount: 1, nodeCount: 1, meshCount: 1, primitiveCount: 1 } });
    expect(result.boundingBox).toEqual({ min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 2, z: 1 } });
  });

  it('rejects malformed GLB and missing glTF dependencies', () => {
    expect(validateGlbBytes(new Uint8Array([1, 2, 3]), { sourceFingerprint: 'b'.repeat(64) })).toMatchObject({ valid: false, status: 'invalid' });
    const missing = validateGltfDocument({ ...validDocument, buffers: [{ byteLength: 36, uri: 'geometry.bin' }] }, { sourceFingerprint: 'c'.repeat(64) });
    expect(missing).toMatchObject({ valid: false, status: 'missing-dependencies' });
    expect(missing.issues.map((candidate) => candidate.code)).toContain('studio-gltf-missing-dependency');
  });

  it('rejects external resources and flags oversized scene complexity', () => {
    const external = validateGltfDocument({ ...validDocument, images: [{ uri: 'https://vendor.invalid/texture.png' }] }, { sourceFingerprint: 'd'.repeat(64) });
    expect(external.issues.map((candidate) => candidate.code)).toContain('studio-gltf-external-uri');
    const traversal = validateGltfDocument({ ...validDocument, images: [{ uri: '../private/texture.png' }] }, { sourceFingerprint: 'd'.repeat(64), availableDependencies: new Set(['../private/texture.png']) });
    expect(traversal).toMatchObject({ valid: false, status: 'invalid' });
    expect(traversal.issues.map((candidate) => candidate.code)).toContain('studio-gltf-external-uri');
    const requiredExtension = validateGltfDocument({ ...validDocument, extensionsRequired: ['EXT_unavailable_runtime'] }, { sourceFingerprint: 'd'.repeat(64) });
    expect(requiredExtension.issues).toContainEqual(expect.objectContaining({ code: 'studio-gltf-required-extension-unsupported', blocking: true }));
    const oversized = validateGltfDocument(validDocument, { sourceFingerprint: 'e'.repeat(64), binaryBytes: 51 * 1024 * 1024 });
    expect(oversized.status).toBe('optimization-required');
  });

  it('resolves only the exact safe relative dependency path', () => {
    const document = { ...validDocument, images: [{ uri: 'textures/base.png' }] };
    expect(validateGltfDocument(document, { sourceFingerprint: 'd'.repeat(64), availableDependencies: new Set(['textures/base.png']), binaryBytes: 36 }).valid).toBe(true);
    expect(validateGltfDocument(document, { sourceFingerprint: 'd'.repeat(64), availableDependencies: new Set(['other/base.png']), binaryBytes: 36 }).issues)
      .toContainEqual(expect.objectContaining({ code: 'studio-gltf-missing-dependency', blocking: true }));
  });

  it('rejects invalid node, material and animation references before scene access', () => {
    const invalidReferences = validateGltfDocument({
      ...validDocument,
      nodes: [{ mesh: 9 }],
      meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 4 }] }],
      animations: [{ samplers: [{ input: 0, output: 8 }], channels: [{ sampler: 0, target: { node: 7, path: 'translation' } }] }]
    }, { sourceFingerprint: 'd'.repeat(64) });
    expect(invalidReferences.valid).toBe(false);
    expect(invalidReferences.issues.map((candidate) => candidate.code)).toEqual(expect.arrayContaining([
      'studio-gltf-node-mesh-reference-invalid',
      'studio-gltf-material-reference-invalid',
      'studio-gltf-animation-output-reference-invalid',
      'studio-gltf-animation-node-reference-invalid'
    ]));
  });

  it('accepts a governed 2:1 panorama and rejects a flat render submitted as panorama', () => {
    expect(validatePanorama(fictionalValidPanoramaInput)).toMatchObject({ valid: true, truePanorama: true, preferredResolutionMet: true });
    const flat = validatePanorama({ ...fictionalValidPanoramaInput, submittedAs: 'flat-render' });
    expect(flat).toMatchObject({ valid: false, truePanorama: false, status: 'invalid' });
    expect(flat.issues.map((candidate) => candidate.code)).toContain('studio-panorama-flat-submission');
  });

  it('blocks missing rights and quarantines GPS without exposing coordinates', () => {
    expect(validatePanorama({ ...fictionalValidPanoramaInput, rightsStatus: 'review-required' })).toMatchObject({ valid: false, status: 'rights-blocked' });
    const gps = validatePanorama({ ...fictionalValidPanoramaInput, gpsStatus: 'present' });
    expect(gps).toMatchObject({ valid: false, status: 'privacy-quarantined', gpsClientHandling: 'strip-required' });
    expect(JSON.stringify(gps)).not.toMatch(/latitude|longitude|coordinates/iu);
  });

  it('creates a redacted deterministic dependency report', () => {
    const first = createStudioDependencyReport('f'.repeat(64), [
      { name: '/private/studio/basecolor.png', dependencyType: 'texture', exists: true, privatePathPresent: true },
      { name: 'missing-normal.png', dependencyType: 'material-map', exists: false }
    ]);
    const second = createStudioDependencyReport('f'.repeat(64), [
      { name: '/private/studio/basecolor.png', dependencyType: 'texture', exists: true, privatePathPresent: true },
      { name: 'missing-normal.png', dependencyType: 'material-map', exists: false }
    ]);
    expect(first.contentHash).toBe(second.contentHash);
    expect(first).toMatchObject({ missingCount: 1, blocking: true });
    expect(JSON.stringify(first)).not.toContain('/private/studio');
  });
});
