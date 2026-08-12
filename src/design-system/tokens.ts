export const mayadeenColorTokens = {
  canvas: '#071113',
  surface1: '#0D191C',
  surface2: '#122226',
  surface3: '#183036',
  borderSubtle: '#22373C',
  borderStrong: '#31515A',
  textPrimary: '#F3F7F6',
  textSecondary: '#A8B8B6',
  textMuted: '#758785',
  textInverse: '#04110E',
  brandPrimary: '#2FD6B5',
  brandHover: '#25C3A5',
  brandPressed: '#1EAA90',
  focusRing: '#73E7D1',
  spatialPrimary: '#5AA9FF',
  truthVerified: '#42C98A',
  truthReported: '#5AA9FF',
  truthCandidate: '#A98BFF',
  truthScenario: '#F2B84B',
  truthUnknown: '#91A09F',
  severityNormal: '#42C98A',
  severityAttention: '#F2B84B',
  severityCritical: '#FF6B6B',
  severityBlocked: '#D97878',
  severityInformation: '#5AA9FF'
} as const;

export const commandTypography = {
  display: '32px/40px',
  pageTitle: '24px/32px',
  sectionTitle: '18px/28px',
  cardTitle: '16px/24px',
  body: '14px/22px',
  label: '12px/18px',
  technical: '13px/20px'
} as const;

export const commandSpacing = [4, 8, 12, 16, 24, 32, 48] as const;

function rgb(hex: string): [number, number, number] {
  const value = hex.slice(1);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminanceChannel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const relativeLuminance = (hex: string) => {
    const channels = rgb(hex).map(luminanceChannel);
    const red = channels[0]!;
    const green = channels[1]!;
    const blue = channels[2]!;
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const first = Math.max(foregroundLuminance, backgroundLuminance);
  const second = Math.min(foregroundLuminance, backgroundLuminance);
  return (first + 0.05) / (second + 0.05);
}
