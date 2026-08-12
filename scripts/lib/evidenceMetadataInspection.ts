import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const gpsKeys = ['GPSLatitude', 'GPSLongitude', 'GPSPosition', 'GPSAltitude'];
const personalIdentifierKeys = ['Artist', 'Creator', 'OwnerName', 'PersonInImage'];

export interface EvidenceMetadataPresence {
  gpsPresent: boolean;
  personalIdentifierMetadataPresent: boolean;
  gpsHandlingStatus: 'quarantined' | 'absent';
  privacyStatus: 'restricted' | 'no-personal-data-recorded';
}

export function summarizeEvidenceMetadataPresence(metadata: Record<string, unknown>): EvidenceMetadataPresence {
  const gpsPresent = gpsKeys.some((key) => metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '');
  const personalIdentifierMetadataPresent = personalIdentifierKeys.some((key) =>
    metadata[key] !== undefined && metadata[key] !== null && metadata[key] !== '');
  return {
    gpsPresent,
    personalIdentifierMetadataPresent,
    gpsHandlingStatus: gpsPresent ? 'quarantined' : 'absent',
    privacyStatus: gpsPresent || personalIdentifierMetadataPresent ? 'restricted' : 'no-personal-data-recorded'
  };
}

export async function inspectLocalEvidenceMetadata(filePath: string): Promise<EvidenceMetadataPresence> {
  const { stdout } = await execFileAsync('exiftool', [
    '-json',
    '-n',
    '-GPSLatitude',
    '-GPSLongitude',
    '-GPSPosition',
    '-GPSAltitude',
    '-Artist',
    '-Creator',
    '-OwnerName',
    '-PersonInImage',
    filePath
  ], { maxBuffer: 1_048_576 });
  const parsed = JSON.parse(stdout) as Array<Record<string, unknown>>;
  if (parsed.length !== 1) throw new Error('Evidence metadata inspection did not return exactly one file record.');
  return summarizeEvidenceMetadataPresence(parsed[0]!);
}
