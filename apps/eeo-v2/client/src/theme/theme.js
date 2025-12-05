// Central theme tokens for the app (colors, spacing, radii, typography)
export const theme = {
  colors: {
  primary: '#1f2a57',
    primaryAccent: '#2563eb',
    primaryAccentAlt: '#1d4ed8',
    primaryAccentAltHover: '#1e40af',
    danger: '#dc2626',
    dangerSoft: '#fee2e2',
    gold: '#FFD700',
    surfaceLight: '#f8f9fa',
    surfaceAlt: '#f3f4f6',
    badgeGreenStart: '#166534',
    badgeGreenEnd: '#115226',
    badgeGreenBorder: '#0f4a21',
    draftOrange: '#c2410c',
    draftOrangeBorder: '#9a3412',
    amber: '#fbbf24',
    darkBg: '#1e293b',
    darkBorder: '#334155',
    gray100: '#f1f5f9',
    gray200: '#e2e8f0',
    gray300: '#cbd5e1',
    gray500: '#64748b',
    gray700: '#334155',
    bgBody: '#f0f0f0'
  },
  radius: { sm: '4px', md: '8px', lg: '14px', pill: '999px' },
  spacing: (n) => `${0.25 * n}rem`,
  font: { base: 'system-ui, Arial, sans-serif', mono: "Menlo, Consolas, 'Courier New', monospace" }
};

export default theme;
