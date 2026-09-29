import { Text, TextInput } from 'react-native';
import {
  useFonts as useFrauncesFonts,
  Fraunces_400Regular,
  Fraunces_400Regular_Italic,
  Fraunces_500Medium,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  useFonts as useOutfitFonts,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
} from '@expo-google-fonts/outfit';
import { fonts } from './theme';

/**
 * Loads the Fraunces + Outfit weights used across the app (see src/theme.ts
 * `fonts`). Call this once, at the app root, and don't render anything else
 * until it returns true — text renders with the OS default font until then,
 * which looks like a flash of the wrong typeface.
 *
 * Requires:
 *   npx expo install @expo-google-fonts/fraunces @expo-google-fonts/outfit expo-font
 */
export function useAppFonts(): boolean {
  const [frauncesLoaded] = useFrauncesFonts({
    Fraunces_400Regular,
    Fraunces_400Regular_Italic,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });
  const [outfitLoaded] = useOutfitFonts({
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
  });

  return frauncesLoaded && outfitLoaded;
}

/**
 * Makes Outfit the default font for every <Text> and <TextInput> that
 * doesn't set its own fontFamily, so components don't each need an explicit
 * fontFamily just to stop using the OS default. Call this once, after
 * useAppFonts() reports true (e.g. in AppRoot.tsx).
 *
 * Headings should still set fontFamily: fonts.display* explicitly — this
 * only covers the body font.
 */
export function applyDefaultFont() {
  const T: any = Text;
  const TI: any = TextInput;
  T.defaultProps = T.defaultProps || {};
  T.defaultProps.style = [{ fontFamily: fonts.body }, T.defaultProps.style];
  TI.defaultProps = TI.defaultProps || {};
  TI.defaultProps.style = [{ fontFamily: fonts.body }, TI.defaultProps.style];
}
