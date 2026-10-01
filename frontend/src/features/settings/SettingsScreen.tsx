import React, { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeError } from '../../api';
import { LocationPicker } from '../../components/LocationPicker';
import { getDeviceUser } from '../../deviceUser';
import { isCloudinaryConfigured, uploadRecipePhoto } from '../../cloudinary';
import { colors, fonts, radius } from '../../theme';
import { getUserSettings, saveUserSettings } from './settingsApi';
import { DEFAULT_USER_PREFERENCES, type UserPreferences, type UserSettingsResponse } from './types';

interface Props {
  onBack: () => void;
  onLogout: () => void;
}

const DIETARY_OPTIONS = ['Vegetarian', 'Halal', 'Pescatarian', 'Low-sodium', 'No shellfish'];
const MARKET_SUGGESTIONS = ['Any nearby market', 'SM Supermarket', 'Robinsons Fresh', 'Puregold', 'Divisoria Market'];
const RADII = [1, 3, 5, 10] as const;

export default function SettingsScreen({ onBack, onLogout }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserSettingsResponse['profile'] | null>(null);
  const [draft, setDraft] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getDeviceUser();
        const settings = await getUserSettings(user._id);
        if (cancelled) return;
        setUserId(user._id);
        setProfile(settings.profile);
        setDraft({
          location: settings.preferences.location,
          radius: settings.preferences.radius,
          market: settings.preferences.market,
          householdSize: settings.preferences.household_size,
          weeklyBudget: settings.preferences.weekly_budget == null ? '' : String(settings.preferences.weekly_budget),
          dietary: settings.preferences.dietary,
          priceDrops: settings.preferences.price_drops,
          nearbyReports: settings.preferences.nearby_reports,
          weeklySummary: settings.preferences.weekly_summary,
          publicProfile: settings.preferences.public_profile,
        });
      } catch (err) {
        if (!cancelled) setError(describeError(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const toggleDietary = (option: string) => {
    update('dietary', draft.dietary.includes(option)
      ? draft.dietary.filter((entry) => entry !== option)
      : [...draft.dietary, option]);
  };

  const pickProfilePhoto = async () => {
    setError(null);
    if (!isCloudinaryConfigured()) {
      setError('Profile photo upload needs Cloudinary settings in frontend/.env.');
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required to choose a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.75,
      });
      if (result.canceled || !result.assets[0]) return;

      setUploadingPhoto(true);
      const imageUrl = await uploadRecipePhoto(result.assets[0].uri);
      setProfile((current) => current ? { ...current, profile_image_url: imageUrl } : current);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    if (!draft.location) {
      setError('Choose your city or municipality first.');
      return;
    }
    if (!draft.market.trim()) {
      setError('Enter a preferred market or store.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await saveUserSettings(userId, {
        preferences: { ...draft, market: draft.market.trim() },
        profileImageUrl: profile?.profile_image_url ?? null,
      });
      setProfile(result.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out?', 'You can continue later as a guest on this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: onLogout },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>;
  }

  const displayName = profile?.username ?? 'Guest account';
  const initials = displayName.split(/[_\s]+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <Pressable onPress={onBack} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to recipes">
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Account</Text>
          <Text style={styles.heading}>Settings</Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.profileRow}>
          <Pressable onPress={pickProfilePhoto} disabled={uploadingPhoto} style={styles.avatarButton} accessibilityRole="button" accessibilityLabel="Change profile photo">
            {profile?.profile_image_url
              ? <Image source={{ uri: profile.profile_image_url }} style={styles.avatarImage} />
              : <Text style={styles.avatarInitials}>{initials}</Text>}
            {uploadingPhoto && <View style={styles.avatarLoading}><ActivityIndicator color={colors.cream} /></View>}
          </Pressable>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{profile?.email ?? 'Device account'}</Text>
          </View>
          <Pressable onPress={pickProfilePhoto} hitSlop={8} style={styles.changePhotoButton}>
            <Text style={styles.changePhotoText}>Photo</Text>
          </Pressable>
        </View>

        {!!error && <Text accessibilityRole="alert" style={styles.errorBanner}>{error}</Text>}

        <SectionTitle label="Shopping location" />
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>City or municipality</Text>
          <Pressable onPress={() => setPickerOpen(true)} style={styles.locationButton}>
            <Text style={[styles.locationValue, !draft.location && styles.placeholder]} numberOfLines={1}>
              {draft.location?.name ?? 'Choose shopping city'}
            </Text>
            <Text style={styles.changeText}>{draft.location ? 'Change' : 'Choose'}</Text>
          </Pressable>
          <Text style={styles.helper}>Used to find nearby prices and community reports.</Text>
        </View>

        <SectionTitle label="Price coverage" />
        <View style={styles.section}>
          <Text style={styles.fieldLabel}>Search radius</Text>
          <View style={styles.choiceRow}>
            {RADII.map((radius) => (
              <Pressable key={radius} onPress={() => update('radius', radius)} style={[styles.radiusChoice, draft.radius === radius && styles.radiusChoiceActive]}>
                <Text style={[styles.radiusLabel, draft.radius === radius && styles.radiusLabelActive]}>{radius} km</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.fieldLabel, styles.marketLabel]}>Preferred market or store</Text>
          <TextInput
            value={draft.market}
            onChangeText={(value) => update('market', value)}
            placeholder="Any nearby market"
            placeholderTextColor={colors.muted}
            style={styles.input}
            maxLength={120}
          />
          <View style={styles.suggestionRow}>
            {MARKET_SUGGESTIONS.slice(1).map((market) => (
              <Pressable key={market} onPress={() => update('market', market)} style={[styles.suggestion, draft.market === market && styles.suggestionActive]}>
                <Text style={[styles.suggestionText, draft.market === market && styles.suggestionTextActive]}>{market}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <SectionTitle label="Shopping preferences" />
        <View style={styles.section}>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.preferenceLabel}>Household size</Text>
              <Text style={styles.helper}>Used for recipe portions</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable onPress={() => update('householdSize', Math.max(1, draft.householdSize - 1))} style={styles.stepButton} accessibilityLabel="Decrease household size">
                <Text style={styles.stepGlyph}>−</Text>
              </Pressable>
              <Text style={styles.stepValue}>{draft.householdSize}</Text>
              <Pressable onPress={() => update('householdSize', Math.min(20, draft.householdSize + 1))} style={[styles.stepButton, styles.stepButtonAccent]} accessibilityLabel="Increase household size">
                <Text style={[styles.stepGlyph, styles.stepGlyphAccent]}>+</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>Weekly budget</Text>
          <View style={styles.budgetInputWrap}>
            <Text style={styles.currency}>₱</Text>
            <TextInput
              value={draft.weeklyBudget}
              onChangeText={(value) => update('weeklyBudget', value.replace(/[^0-9]/g, ''))}
              placeholder="Optional"
              placeholderTextColor={colors.muted}
              style={styles.budgetInput}
              keyboardType="number-pad"
              maxLength={9}
            />
          </View>
        </View>

        <SectionTitle label="Dietary preferences" />
        <View style={styles.dietaryWrap}>
          {DIETARY_OPTIONS.map((option) => {
            const active = draft.dietary.includes(option);
            return (
              <Pressable key={option} onPress={() => toggleDietary(option)} style={[styles.dietaryChip, active && styles.dietaryChipActive]}>
                <Text style={[styles.dietaryText, active && styles.dietaryTextActive]}>{active ? '✓ ' : '+ '}{option}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionTitle label="Notifications" />
        <View style={styles.section}>
          <ToggleRow label="Price drop alerts" detail="For ingredients in saved recipes" value={draft.priceDrops} onChange={(value) => update('priceDrops', value)} />
          <View style={styles.divider} />
          <ToggleRow label="Nearby price reports" detail={`Within ${draft.radius} km`} value={draft.nearbyReports} onChange={(value) => update('nearbyReports', value)} />
          <View style={styles.divider} />
          <ToggleRow label="Weekly savings summary" value={draft.weeklySummary} onChange={(value) => update('weeklySummary', value)} />
        </View>

        <SectionTitle label="Community & privacy" />
        <View style={styles.section}>
          <ToggleRow label="Public profile" detail="Let the community see your recipes and contributor badge" value={draft.publicProfile} onChange={(value) => update('publicProfile', value)} />
        </View>

        <Pressable onPress={handleSave} disabled={saving || !draft.location} style={[styles.saveButton, (!draft.location || saving) && styles.saveButtonDisabled, saved && styles.saveButtonSaved]}>
          {saving ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={[styles.saveButtonText, saved && styles.saveButtonTextSaved]}>{saved ? '✓ Preferences saved' : 'Save changes'}</Text>}
        </Pressable>

        <View style={styles.sessionDivider} />
        <SectionTitle label="Session" />
        <Pressable onPress={confirmLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>

      <LocationPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(location) => update('location', location)} />
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function ToggleRow({ label, detail, value, onChange }: { label: string; detail?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.preferenceCopy}>
        <Text style={styles.preferenceLabel}>{label}</Text>
        {!!detail && <Text style={styles.helper}>{detail}</Text>}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ false: colors.faint, true: colors.green }} thumbColor={value ? colors.cream : colors.muted} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { color: colors.cream, fontSize: 24, lineHeight: 27, marginTop: -2 },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.accent, fontSize: 10, fontFamily: fonts.bodySemibold, letterSpacing: 1, textTransform: 'uppercase' },
  heading: { color: colors.cream, fontFamily: fonts.display, fontSize: 22, marginTop: 2 },
  content: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 32 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 20, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  avatarButton: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentMuted, borderWidth: 1, borderColor: colors.accentBorder },
  avatarImage: { width: '100%', height: '100%' },
  avatarInitials: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 17 },
  avatarLoading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(12,26,16,0.65)' },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 14 },
  profileEmail: { color: colors.muted, fontSize: 11, marginTop: 2 },
  changePhotoButton: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: colors.borderMed },
  changePhotoText: { color: colors.accent, fontFamily: fonts.bodyMedium, fontSize: 11 },
  sectionTitle: { color: colors.muted, fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  section: { padding: 14, borderRadius: radius, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, gap: 10 },
  fieldLabel: { color: colors.cream, fontSize: 12, marginBottom: 7 },
  locationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMed },
  locationValue: { flex: 1, color: colors.cream, fontSize: 12 },
  placeholder: { color: colors.muted },
  changeText: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 11 },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  choiceRow: { flexDirection: 'row', gap: 7 },
  radiusChoice: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  radiusChoiceActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  radiusLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  radiusLabelActive: { color: colors.onAccent, fontFamily: fonts.bodySemibold },
  marketLabel: { marginTop: 6 },
  input: { minHeight: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.borderMed, backgroundColor: colors.surface, color: colors.cream, fontSize: 12 },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  suggestion: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  suggestionActive: { backgroundColor: colors.greenMuted, borderColor: colors.greenBorder },
  suggestionText: { color: colors.muted, fontSize: 10 },
  suggestionTextActive: { color: colors.green, fontFamily: fonts.bodySemibold },
  preferenceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  preferenceCopy: { flex: 1 },
  preferenceLabel: { color: colors.cream, fontSize: 12 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.faint, borderWidth: 1, borderColor: colors.border },
  stepButtonAccent: { backgroundColor: colors.accentMuted, borderColor: colors.accentBorder },
  stepGlyph: { color: colors.muted, fontSize: 16, lineHeight: 19 },
  stepGlyphAccent: { color: colors.accent },
  stepValue: { color: colors.cream, fontFamily: fonts.bodySemibold, fontSize: 13, minWidth: 18, textAlign: 'center' },
  divider: { height: 1, backgroundColor: colors.border },
  budgetInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 42, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderMed },
  currency: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 13 },
  budgetInput: { flex: 1, padding: 0, color: colors.cream, fontSize: 13 },
  dietaryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  dietaryChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  dietaryChipActive: { backgroundColor: colors.greenMuted, borderColor: colors.greenBorder },
  dietaryText: { color: colors.muted, fontSize: 11 },
  dietaryTextActive: { color: colors.green, fontFamily: fonts.bodySemibold },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 42 },
  saveButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 20, borderRadius: 12, backgroundColor: colors.accent },
  saveButtonDisabled: { backgroundColor: colors.faint },
  saveButtonSaved: { backgroundColor: colors.greenMuted, borderWidth: 1, borderColor: colors.greenBorder },
  saveButtonText: { color: colors.onAccent, fontFamily: fonts.bodySemibold, fontSize: 13 },
  saveButtonTextSaved: { color: colors.green },
  sessionDivider: { height: 1, backgroundColor: colors.border, marginTop: 24 },
  logoutButton: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.redMuted, borderWidth: 1, borderColor: colors.redBorder, borderRadius: 12 },
  logoutText: { color: colors.red, fontFamily: fonts.bodySemibold, fontSize: 13 },
  errorBanner: { color: colors.red, fontSize: 11, lineHeight: 16, marginBottom: 8 },
});