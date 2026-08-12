import { describe, expect, it } from 'vitest';
import {
  conferenceReferenceEventTheme,
  eventThemePackages,
  kapCandidateEventTheme,
  neutralFallbackEventTheme
} from '../data/eventThemePackages';
import {
  immutableOperationalSemantics,
  mayadeenShellBrandTokens,
  resolveEventThemePackage,
  validateEventThemePackage
} from './eventThemePackage';

function issueCodes(theme: unknown, eventId?: string): string[] {
  return validateEventThemePackage(theme, eventId).issues.map((issue) => issue.code);
}

describe('EventThemePackage contract', () => {
  it('accepts the source-linked KAP candidate without inventing founder approval', () => {
    const result = validateEventThemePackage(kapCandidateEventTheme, kapCandidateEventTheme.eventId);

    expect(result.valid).toBe(true);
    expect(result.theme?.status).toBe('candidate');
    expect(result.theme?.approvedBy).toBeNull();
    expect(result.theme?.approvedAt).toBeNull();
  });

  it('rejects semantic overrides, core brand changes, and unknown operational fields', () => {
    const semanticOverride = structuredClone(kapCandidateEventTheme) as unknown as Record<string, unknown>;
    (semanticOverride.eventTokens as Record<string, unknown>).verified = {
      background: '#46803F',
      foreground: '#FFFFFF',
      usageAr: 'تجاوز غير مسموح'
    };
    expect(issueCodes(semanticOverride)).toContain('THEME_SEMANTIC_OVERRIDE');

    const brandOverride = structuredClone(kapCandidateEventTheme);
    brandOverride.brandTokens.primaryAction.background = '#006E3F';
    expect(issueCodes(brandOverride)).toContain('THEME_CORE_BRAND_OVERRIDE');

    const unknownField = { ...structuredClone(kapCandidateEventTheme), readiness: 'ready' };
    expect(issueCodes(unknownField)).toContain('THEME_UNKNOWN_FIELD');
  });

  it('rejects missing or inaccessible foreground colors', () => {
    const missingForeground = structuredClone(kapCandidateEventTheme) as unknown as Record<string, unknown>;
    delete ((missingForeground.eventTokens as Record<string, unknown>).primary as Record<string, unknown>).foreground;
    expect(issueCodes(missingForeground)).toContain('THEME_FOREGROUND_REQUIRED');

    const inaccessible = structuredClone(kapCandidateEventTheme);
    inaccessible.eventTokens.page.foreground = '#F9F5EC';
    expect(issueCodes(inaccessible)).toContain('THEME_COLOR_CONTRAST');
  });

  it('rejects event leakage, unknown provenance, and remote unapproved imagery', () => {
    const leaked = structuredClone(kapCandidateEventTheme);
    leaked.imagery[0]!.eventId = conferenceReferenceEventTheme.eventId;
    expect(issueCodes(leaked, kapCandidateEventTheme.eventId)).toContain('THEME_EVENT_LEAKAGE');

    const unknownProvenance = structuredClone(kapCandidateEventTheme);
    unknownProvenance.imagery[0]!.provenanceStatus = 'unknown';
    unknownProvenance.imagery[0]!.rightsStatus = 'unknown';
    expect(issueCodes(unknownProvenance)).toEqual(expect.arrayContaining(['THEME_ASSET_PROVENANCE', 'THEME_ASSET_RIGHTS_UNKNOWN']));

    const remote = structuredClone(kapCandidateEventTheme);
    remote.imagery[0]!.uri = 'https://assets.invalid/kap.jpg';
    remote.imagery[0]!.remoteApprovalStatus = 'rejected';
    expect(issueCodes(remote)).toContain('THEME_REMOTE_ASSET');
  });

  it('keeps truth and severity semantics deeply immutable and outside every event theme', () => {
    expect(Object.isFrozen(immutableOperationalSemantics)).toBe(true);
    expect(Object.values(immutableOperationalSemantics).every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(mayadeenShellBrandTokens)).toBe(true);
    expect(Object.values(mayadeenShellBrandTokens).every(Object.isFrozen)).toBe(true);
    expect(kapCandidateEventTheme.eventTokens).not.toHaveProperty('verified');
    expect(conferenceReferenceEventTheme.eventTokens).not.toHaveProperty('critical');
  });

  it('isolates KAP from another event and uses a neutral fallback when no valid event theme exists', () => {
    const conference = resolveEventThemePackage(conferenceReferenceEventTheme.eventId, eventThemePackages, neutralFallbackEventTheme);
    expect(conference.resolution).toBe('event-theme');
    expect(conference.theme.themeId).toBe(conferenceReferenceEventTheme.themeId);
    expect(conference.theme.imagery).not.toEqual(expect.arrayContaining(kapCandidateEventTheme.imagery));
    expect(conference.theme.eventTokens.primary.background).not.toBe(kapCandidateEventTheme.eventTokens.primary.background);

    const unavailable = resolveEventThemePackage('EVENT-NO-THEME-001', eventThemePackages, neutralFallbackEventTheme);
    expect(unavailable.resolution).toBe('safe-fallback');
    expect(unavailable.theme.themeId).toBe(neutralFallbackEventTheme.themeId);
    expect(unavailable.theme.eventTokens.primary.background).not.toBe(kapCandidateEventTheme.eventTokens.primary.background);
  });
});
