import { describe, expect, it } from 'vitest';
import {
  assertAllowlistedReviewEntry,
  assertExactEntryNames
} from '../../scripts/lib/reviewBundlePolicy';

describe('Stage 3E.4A review bundle allowlist', () => {
  it('rejects raw-image and tabular sentinel files', () => {
    expect(() => assertAllowlistedReviewEntry('raw-field-photo.jpg', 'screenshot')).toThrowError(/not allowlisted/);
    expect(() => assertAllowlistedReviewEntry('gps-export.csv', 'manifest')).toThrowError(/not allowlisted/);
  });

  it('rejects an unregistered PNG even when its extension is otherwise safe', () => {
    expect(() => assertExactEntryNames(
      ['01-registered.png', 'sentinel-unregistered.png', 'screenshots.json'],
      ['01-registered.png', 'screenshots.json'],
      '1366x768'
    )).toThrowError(/Unexpected review artifacts/);
  });

  it('accepts only exact registered screenshot and manifest names', () => {
    expect(() => assertAllowlistedReviewEntry('1366x768/01-registered.png', 'screenshot')).not.toThrow();
    expect(() => assertAllowlistedReviewEntry('1366x768/screenshots.json', 'manifest')).not.toThrow();
    expect(() => assertExactEntryNames(
      ['01-registered.png', 'screenshots.json'],
      ['screenshots.json', '01-registered.png'],
      '1366x768'
    )).not.toThrow();
  });
});
