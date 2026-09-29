/**
 * Design tokens for the "Lutò" visual identity (from the onboarding Figma file).
 * Dark, warm palette: deep greens for surfaces, turmeric gold as the brand
 * accent, calamansi green for "cheaper/savings", tomato red for contrast.
 *
 * Old token names (primary, text, card, bg, etc.) are kept as aliases so
 * every existing component restyles automatically just by picking up this
 * file — nothing else needed to change color-wise.
 */
export const colors = {
  // Base surfaces, darkest to lightest
  bg: '#0C1A10',
  surface: '#142019',
  card: '#1C2D1F',
  cardAlt: '#233327',

  // Brand accent: turmeric gold
  accent: '#E8A01A',
  accentMuted: 'rgba(232,160,26,0.15)',
  accentBorder: 'rgba(232,160,26,0.25)',
  onAccent: '#1A0E00', // text/icons placed on top of a gold background

  // Calamansi green: success, savings, "this one's cheaper"
  green: '#4DBF6E',
  greenMuted: 'rgba(77,191,110,0.14)',
  greenBorder: 'rgba(77,191,110,0.25)',

  // Tomato red: the pricier option, alerts
  red: '#E05A3A',
  redMuted: 'rgba(224,90,58,0.14)',
  redBorder: 'rgba(224,90,58,0.25)',

  // Text
  cream: '#F5EFE0',
  muted: 'rgba(245,239,224,0.45)',
  faint: 'rgba(245,239,224,0.12)',
  border: 'rgba(245,239,224,0.08)',

  // --- Aliases so existing component styles need no per-line changes ---
  text: '#F5EFE0', // = cream
  primary: '#E8A01A', // = accent
  primaryLight: 'rgba(232,160,26,0.15)', // = accentMuted
  danger: '#E05A3A', // = red
  warnBg: 'rgba(224,90,58,0.14)', // = redMuted
};

export const radius = 14;
export const radiusSm = 10;
export const radiusPill = 22;

/**
 * Font families. These come from @expo-google-fonts/fraunces and
 * @expo-google-fonts/outfit — see src/fonts.ts for the loading hook and
 * app.json setup notes.
 *
 * `display` (Fraunces) is a serif used for headings, with an italic cut used
 * for emphasis words (see the onboarding slides). `body` (Outfit) is a
 * geometric sans used for everything else.
 */
export const fonts = {
  display: 'Fraunces_400Regular',
  displayItalic: 'Fraunces_400Regular_Italic',
  displayMedium: 'Fraunces_500Medium',
  displaySemibold: 'Fraunces_600SemiBold',
  body: 'Outfit_400Regular',
  bodyLight: 'Outfit_300Light',
  bodyMedium: 'Outfit_500Medium',
  bodySemibold: 'Outfit_600SemiBold',
};
