/**
 * Design tokens for the "Lutò" visual identity, synced exactly to the
 * onboarding + dashboard + SmartNote Figma Make export (the `C` object at
 * the top of its App.tsx). Dark, warm palette: deep greens for surfaces,
 * turmeric gold as the brand accent, calamansi green for "cheaper/savings",
 * tomato red for contrast, dusty blue for informational callouts.
 *
 * Old token names (primary, text, card, bg, etc.) are kept as aliases so
 * anything still using them restyles automatically — nothing else needed to
 * change color-wise.
 */
export const colors = {
  // Base surfaces, darkest to lightest
  bg: '#0C1A10',
  surface: '#142019',
  card: '#1C2D1F',
  cardAlt: '#233327',

  // Brand accent: turmeric gold
  accent: '#E8A01A',
  accentMuted: 'rgba(232,160,26,0.14)',
  accentBorder: 'rgba(232,160,26,0.25)',
  onAccent: '#1A0E00', // text/icons placed on top of a gold background

  // Calamansi green: success, savings, "this one's cheaper"
  green: '#4DBF6E',
  greenMuted: 'rgba(77,191,110,0.13)',
  greenBorder: 'rgba(77,191,110,0.25)',

  // Tomato red: the pricier option, alerts, destructive actions
  red: '#E05A3A',
  redMuted: 'rgba(224,90,58,0.13)',
  redBorder: 'rgba(224,90,58,0.25)',

  // Dusty blue: informational tips/callouts
  blue: '#5B9CF6',
  blueMuted: 'rgba(91,156,246,0.13)',
  blueBorder: 'rgba(91,156,246,0.2)',

  // Text
  cream: '#F5EFE0',
  muted: 'rgba(245,239,224,0.45)',
  faint: 'rgba(245,239,224,0.07)',
  border: 'rgba(245,239,224,0.08)',
  borderMed: 'rgba(245,239,224,0.12)',

  // --- Aliases so existing component styles need no per-line changes ---
  text: '#F5EFE0', // = cream
  primary: '#E8A01A', // = accent
  primaryLight: 'rgba(232,160,26,0.14)', // = accentMuted
  danger: '#E05A3A', // = red
  warnBg: 'rgba(224,90,58,0.13)', // = redMuted
};

export const radius = 14;
export const radiusSm = 10;
export const radiusPill = 20;

/**
 * Font families. These come from @expo-google-fonts/fraunces and
 * @expo-google-fonts/outfit — see src/fonts.ts for the loading hook and
 * app.json setup notes.
 *
 * `display` (Fraunces) is a serif used for headings, with an italic cut used
 * for emphasis words. `body` (Outfit) is a geometric sans used for everything
 * else.
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