import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavBar, type NavTab } from './components/NavBar';
import { applyDefaultFont, useAppFonts } from './fonts';
import AuthScreen, { type AuthMode } from './screens/AuthScreen';
import CommunityScreen from './screens/CommunityScreen';
import DashboardScreen from './screens/DashboardScreen';
import GroceryListScreen from './screens/GroceryListScreen';
import MarketDetailScreen from './screens/MarketdetailScreen';
import MarketsScreen from './screens/MarketsScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import SavingsScreen from './screens/SavingsScreen';
import SmartNoteScreen from './screens/SmartNoteScreen';
import type { CommunityRecipeCopy } from './communityCopies';
import SettingsScreen from './features/settings/SettingsScreen';
import { colors } from './theme';

const ONBOARDED_KEY = 'magkanote:onboarded';

type Route =
  | { screen: 'auth'; mode: AuthMode }
  | { screen: 'dashboard' }
  | { screen: 'community' }
  | { screen: 'markets' }
  | { screen: 'marketDetail'; marketId: string }
  | { screen: 'settings' }
  | { screen: 'groceryList' }
  | { screen: 'notifications' }
  | { screen: 'savings' }
  | { screen: 'smartnote'; recipeId?: string; recipeTitle?: string; recipeNotes?: string; communityCopy?: CommunityRecipeCopy };

/**
 * App entry point: loads fonts, checks whether onboarding has already been
 * shown (persisted in AsyncStorage so it only appears once per install),
 * then renders onboarding or the account-entry screen. Guest access opens
 * the main app (Dashboard, Community, Markets, and SmartNote behind a bottom
 * tab bar).
 *
 * Requires: npx expo install @react-native-async-storage/async-storage
 */
export default function AppRoot() {
  const fontsLoaded = useAppFonts();
  const [onboarded, setOnboarded] = useState<boolean | null>(null); // null = still checking
  const [route, setRoute] = useState<Route>({ screen: 'auth', mode: 'login' });

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
    setRoute({ screen: 'auth', mode: 'login' });
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

  const activeTab: NavTab =
    route.screen === 'community'
      ? 'community'
      : route.screen === 'dashboard' || route.screen === 'groceryList' || route.screen === 'notifications' || route.screen === 'savings'
      ? 'dashboard'
      : route.screen === 'markets' || route.screen === 'marketDetail'
      ? 'markets'
      : 'smartnote';
  const backToDashboard = () => setRoute({ screen: 'dashboard' });

  const showNavBar = route.screen !== 'auth' && route.screen !== 'settings';

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      <View style={styles.body}>
        {route.screen === 'auth' && (
          <AuthScreen
            mode={route.mode}
            onModeChange={(mode) => setRoute({ screen: 'auth', mode })}
            onContinue={() => setRoute({ screen: 'dashboard' })}
          />
        )}
        {route.screen === 'dashboard' && (
          <DashboardScreen
            onNew={() => setRoute({ screen: 'smartnote' })}
            onOpenSettings={() => setRoute({ screen: 'settings' })}
            onOpenGroceryList={() => setRoute({ screen: 'groceryList' })}
            onOpenNotifications={() => setRoute({ screen: 'notifications' })}
            onOpenSavings={() => setRoute({ screen: 'savings' })}
            onEditRecipe={(id, title, notes, copy) => id.startsWith('community-copy:')
              ? setRoute({ screen: 'smartnote', recipeTitle: title, recipeNotes: notes, communityCopy: copy })
              : setRoute({ screen: 'smartnote', recipeId: id })}
          />
        )}
        {route.screen === 'smartnote' && (
          <SmartNoteScreen
            key={`${route.recipeId ?? 'new'}:${route.recipeTitle ?? ''}:${route.recipeNotes ?? ''}:${route.communityCopy?.id ?? ''}`} // fresh state per recipe (or per new note)
            recipeId={route.recipeId}
            initialTitle={route.recipeTitle}
            initialNotes={route.recipeNotes}
            communityCopy={route.communityCopy}
            onSaved={backToDashboard}
            onBack={backToDashboard}
          />
        )}
        {route.screen === 'settings' && (
          <SettingsScreen onBack={backToDashboard} onLogout={() => setRoute({ screen: 'auth', mode: 'login' })} />
        )}
        {route.screen === 'community' && <CommunityScreen />}
        {route.screen === 'markets' && (
          <MarketsScreen onOpenMarket={(marketId) => setRoute({ screen: 'marketDetail', marketId })} />
        )}
        {route.screen === 'marketDetail' && (
          <MarketDetailScreen marketId={route.marketId} onBack={() => setRoute({ screen: 'markets' })} />
        )}
        {route.screen === 'groceryList' && <GroceryListScreen onBack={backToDashboard} />}
        {route.screen === 'notifications' && <NotificationsScreen onBack={backToDashboard} />}
        {route.screen === 'savings' && <SavingsScreen onBack={backToDashboard} />}
      </View>

      {showNavBar && (
        <NavBar
          active={activeTab}
          onNavigate={(tab) =>
            setRoute(
              tab === 'dashboard'
                ? { screen: 'dashboard' }
                : tab === 'community'
                ? { screen: 'community' }
                : tab === 'markets'
                ? { screen: 'markets' }
                : { screen: 'smartnote' }
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  app: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
});