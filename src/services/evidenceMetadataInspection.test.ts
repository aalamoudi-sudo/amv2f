import { describe, expect, it } from 'vitest';
import { summarizeEvidenceMetadataPresence } from '../../scripts/lib/evidenceMetadataInspection';

describe('field evidence EXIF presence inspection', () => {
  it('reports GPS and personal metadata as restricted status without returning values', () => {
    const result = summarizeEvidenceMetadataPresence({
      GPSLatitude: 24.123456,
      GPSLongitude: 46.123456,
      Artist: 'private-person'
    });
    expect(result).toEqual({
      gpsPresent: true,
      personalIdentifierMetadataPresent: true,
      gpsHandlingStatus: 'quarantined',
      privacyStatus: 'restricted'
    });
    expect(JSON.stringify(result)).not.toMatch(/24\.123456|46\.123456|private-person/);
  });

  it('marks metadata as absent only when no GPS or identity field exists', () => {
    expect(summarizeEvidenceMetadataPresence({ ImageWidth: 4032, ImageHeight: 3024 })).toEqual({
      gpsPresent: false,
      personalIdentifierMetadataPresent: false,
      gpsHandlingStatus: 'absent',
      privacyStatus: 'no-personal-data-recorded'
    });
  });
});
