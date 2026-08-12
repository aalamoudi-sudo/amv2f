import path from 'node:path';
import process from 'node:process';
import {
  verifyLocalSnapshot,
  verifyMeasuredDuplicate,
  type LocalSnapshotExpectation
} from './lib/sourceSnapshotVerification';

const root = process.cwd();
const snapshots: LocalSnapshotExpectation[] = [
  {
    sourceAssetId: 'SOURCE-ASSET-KAP-DWG-DRIVE-001',
    filePath: path.join(root, 'tmp/kap-source-intake/1zrRan5Y-KAIG-FLOOR-PLAN.dwg'),
    recordedByteSize: 99_452_545,
    recordedSha256: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d'
  },
  {
    sourceAssetId: 'SOURCE-ASSET-KAP-ZONING-CANDIDATE-001',
    filePath: path.join(root, 'tmp/kap-source-intake/1trS-onk0-KAGA-ZONING-PLAN-UPDATE-27-7.pdf'),
    recordedByteSize: 188_146_868,
    recordedSha256: '1f37e95a7d00c38df4700a8a1ba66aac606639e8b43b5b9ee2bd59c1d35ae6ad'
  },
  {
    sourceAssetId: 'SOURCE-ASSET-KAP-CONCEPT-PRESENTATION-001',
    filePath: path.join(root, 'tmp/kap-source-intake/14pveTeH-kap-concept-v9.pdf'),
    recordedByteSize: 6_222_013,
    recordedSha256: '1227420de01002fe2fa91001bd6373afd93c7c8f73778d0085e00d1f58560582'
  },
  {
    sourceAssetId: 'DERIVED-KAP-ZONING-PREVIEW-001',
    filePath: path.join(root, 'public/local-assets/kap/kaga-zoning-candidate.jpg'),
    recordedByteSize: 605_721,
    recordedSha256: '2b34dfa56ae479817d536d56172cb250f0b19efcf324e43c5b9ac15bf5f21772'
  },
  {
    sourceAssetId: 'DERIVED-KAP-CONCEPT-PREVIEW-001',
    filePath: path.join(root, 'public/local-assets/kap/kap-concept-masterplan-reference.jpg'),
    recordedByteSize: 290_926,
    recordedSha256: 'a81ceb0fde9ec2a591d644e0e7591275b709dc9f8b048873a5c3b9467bfc8d2f'
  }
];

const verified = [];
for (const snapshot of snapshots) verified.push(await verifyLocalSnapshot(snapshot));

const dwg = verified.find((snapshot) => snapshot.sourceAssetId === 'SOURCE-ASSET-KAP-DWG-DRIVE-001');
if (!dwg) throw new Error('Verified DWG snapshot was not returned.');
const duplicate = verifyMeasuredDuplicate(dwg, {
  sourceAssetId: 'SOURCE-KAP-DWG-PROVISIONAL-001',
  byteSize: 99_452_545,
  sha256: 'a96a455b83f3ee538af81bfed69d61300a0eca20fda699ae634f967467b33a2d'
});

process.stdout.write(`${JSON.stringify({
  verifiedAt: new Date().toISOString(),
  snapshots: verified.map(({ sourceAssetId, byteSize, sha256, verifiedFromBytes }) => ({
    sourceAssetId,
    byteSize,
    sha256,
    verifiedFromBytes
  })),
  dwgDuplicate: duplicate
}, null, 2)}\n`);
