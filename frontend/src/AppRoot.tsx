import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavBar, type NavTab } from './components/NavBar';
import { applyDefaultFont, useAppFonts } from './fonts';
import DashboardScreen from './screens/DashboardScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SmartNoteScreen from './screens/SmartNoteScreen';
import { colors } from './theme';

const ONBOARDED_KEY = 'magkanote:onboarded';

type Route =
  | { screen: 'dashboard' }
  | { screen: 'smartnote'; recipeId?: string };

/**
 * App entry point: loads fonts, checks whether onboarding has already been
 * shown (persisted in AsyncStorage so it only appears once per install),
 * then renders onboarding or the main app (Dashboard <-> SmartNote, behind
 * a bottom tab bar).
 *
 * Requires: npx expo install @react-native-async-storage/async-storage
 */
export default function AppRoot() {
  const fontsLoaded = useAppFonts();
  const [onboarded, setOnboarded] = useState<boolean | null>(null); // null = still checking
  const [route, setRoute] = useState<Route>({ screen: 'dashboard' });

  useEffect(() => {
    if (!fontsLoaded) return;
    applyDefaultFont();
  }, [fontsLoaded]);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((value) => setOnboarded(value === 'true'))
      .catch(() => setOnboarded(false)); // storage unavailable: fail open, just show onboarding
  }, []);

  const finishOnboarding = () => {
    setOnboarded(true);
    AsyncStorage.setItem(ONBOARDED_KEY, 'true').catch(() => {
      // Not fatal: onboarding will just show again next launch.
    });
  };

  if (!fontsLoaded || onboarded === null) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!onboarded) {
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen onDone={finishOnboarding} />
      </>
    );
  }

  const activeTab: NavTab = route.screen === 'dashboard' ? 'dashboard' : 'smartnote';
  const backToDashboard = () => setRoute({ screen: 'dashboard' });

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      <View style={styles.body}>
        {route.screen === 'dashboard' && (
          <DashboardScreen
            onNew={() => setRoute({ screen: 'smartnote' })}
            onOpenRecipe={(id) => setRoute({ screen: 'smartnote', recipeId: id })}
          />
        )}
        {route.screen === 'smartnote' && (
          <SmartNoteScreen
            key={route.recipeId ?? 'new'} // fresh state per recipe (or per new note)
            recipeId={route.recipeId}
            onSaved={backToDashboard}
            onBack={backToDashboard}
          />
        )}
      </View>

      <NavBar
        active={activeTab}
        onNavigate={(tab) => setRoute(tab === 'dashboard' ? { screen: 'dashboard' } : { screen: 'smartnote' })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  app: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
});