import React, { useState } from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';

export type AuthMode = 'login' | 'register' | 'forgot';

interface Props {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  onContinue: () => void;
}

const HERO_IMAGE = 'https://images.unsplash.com/photo-1537495988501-f9cd94a78f3e?w=900&h=600&fit=crop&auto=format';

export default function AuthScreen({ mode, onModeChange, onContinue }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [notice, setNotice] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [sent, setSent] = useState(false);

  const isRegister = mode === 'register';
  const isForgot = mode === 'forgot';
  const title = isForgot ? 'Reset password' : isRegister ? 'Create account' : 'Welcome back';

  const submit = () => {
    setNotice('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setNotice('Enter a valid email address.');
      return;
    }
    if (isForgot) {
      setSent(true);
      return;
    }
    if (isRegister && (!name.trim() || !area.trim())) {
      setNotice('Add your name and barangay or area to continue.');
      return;
    }
    if (password.length < 8) {
      setNotice('Password must be at least 8 characters.');
      return;
    }
    if (isRegister && password !== confirmation) {
      setNotice("Passwords don't match.");
      return;
    }
    setNotice(`${isRegister ? 'Account registration' : 'Account sign-in'} is not connected yet. Continue as guest to use the app.`);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <ImageBackground source={{ uri: HERO_IMAGE }} imageStyle={styles.heroImage} style={styles.hero}>
          <View style={styles.heroScrim} />
          <SafeAreaView edges={['top']} style={styles.brand}>
            <View style={styles.brandMark}><Text style={styles.brandEmoji}>🥘</Text></View>
            <Text style={styles.brandName}>MagkaNote</Text>
          </SafeAreaView>
        </ImageBackground>

        <View style={styles.form}>
          {isForgot && !sent ? (
            <Pressable onPress={() => { setNotice(''); onModeChange('login'); }} style={styles.backLink}>
              <Text style={styles.backText}>‹  Back to sign in</Text>
            </Pressable>
          ) : null}

          {sent ? (
            <View style={styles.successWrap}>
              <View style={styles.successIcon}><Text style={styles.successCheck}>✓</Text></View>
              <Text style={styles.title}>Password reset unavailable</Text>
              <Text style={styles.subtitle}>Account recovery is not connected yet. Continue as a guest or return to sign in.</Text>
              <ActionButton label="Back to sign in" onPress={() => { setSent(false); onModeChange('login'); }} />
            </View>
          ) : (
            <>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>
                {isForgot ? 'Password recovery will be available once account services are connected.' : isRegister ? 'Save recipes and compare nearby market prices.' : 'Sign in to your MagkaNote account.'}
              </Text>

              {isRegister && <FormField label="Full name" value={name} onChangeText={setName} placeholder="Maria Santos" />}
              <FormField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
              {isRegister && <FormField label="Barangay / Area" value={area} onChangeText={setArea} placeholder="e.g. Tondo, Manila" />}
              {!isForgot && (
                <>
                  <FormField
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
                    secureTextEntry={!showPassword}
                    trailing={(
                      <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
                        <Text style={styles.showText}>{showPassword ? 'Hide' : 'Show'}</Text>
                      </Pressable>
                    )}
                  />
                  {isRegister && <FormField label="Confirm password" value={confirmation} onChangeText={setConfirmation} placeholder="Repeat your password" secureTextEntry />}
                </>
              )}

              {!!notice && <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text>}

              {!isRegister && !isForgot && (
                <Pressable onPress={() => { setNotice(''); onModeChange('forgot'); }} style={styles.forgotLink}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </Pressable>
              )}

              <ActionButton
                label={isForgot ? 'Request reset link' : isRegister ? 'Create account' : 'Sign in'}
                onPress={submit}
              />

              {!isForgot && (
                <Text style={styles.switchPrompt}>
                  {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                  <Text onPress={() => onModeChange(isRegister ? 'login' : 'register')} style={styles.linkText}>
                    {isRegister ? 'Sign in' : 'Register'}
                  </Text>
                </Text>
              )}

              <View style={styles.dividerRow}><View style={styles.divider} /><Text style={styles.orText}>or</Text><View style={styles.divider} /></View>
              <Pressable onPress={onContinue} style={styles.guestButton}>
                <Text style={styles.guestButtonText}>Continue as guest</Text>
              </Pressable>
              <Text style={styles.guestNote}>
                {isForgot ? 'Password recovery is not connected yet.' : isRegister ? 'Account registration is not connected yet.' : 'Account sign-in is not connected yet.'}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({
  label,
  trailing,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & { label: string; trailing?: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          {...inputProps}
          placeholderTextColor={colors.muted}
          style={[styles.input, trailing ? styles.inputWithTrailing : undefined]}
          returnKeyType="next"
        />
        {trailing && <View style={styles.trailing}>{trailing}</View>}
      </View>
    </View>
  );
}

function ActionButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.actionButton, (pressed || disabled) && styles.actionPressed]}>
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  hero: { height: 190, justifyContent: 'flex-end', backgroundColor: colors.cardAlt },
  heroImage: { opacity: 0.48 },
  heroScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(12,26,16,0.46)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingBottom: 18 },
  brandMark: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  brandEmoji: { fontSize: 20 },
  brandName: { color: colors.cream, fontFamily: fonts.display, fontSize: 22 },
  form: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 36 },
  backLink: { alignSelf: 'flex-start', marginBottom: 18 },
  backText: { color: colors.muted, fontSize: 13 },
  title: { color: colors.cream, fontFamily: fonts.display, fontSize: 28, lineHeight: 34 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, marginBottom: 22 },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { color: colors.muted, fontFamily: fonts.bodySemibold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 7 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  input: { height: 48, borderWidth: 1, borderColor: colors.borderMed, borderRadius: 12, backgroundColor: colors.card, color: colors.cream, paddingHorizontal: 15, fontSize: 14 },
  inputWithTrailing: { paddingRight: 58 },
  trailing: { position: 'absolute', right: 14 },
  showText: { color: colors.accent, fontSize: 12, fontFamily: fonts.bodyMedium },
  notice: { color: colors.red, fontSize: 12, marginBottom: 12 },
  forgotLink: { alignSelf: 'flex-end', marginTop: -2, marginBottom: 18 },
  linkText: { color: colors.accent, fontFamily: fonts.bodySemibold },
  actionButton: { minHeight: 50, backgroundColor: colors.accent, borderRadius: radius, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  actionPressed: { opacity: 0.75 },
  actionText: { color: colors.onAccent, fontFamily: fonts.bodySemibold, fontSize: 14, textTransform: 'capitalize' },
  switchPrompt: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: 20 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22, marginBottom: 14 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { color: colors.muted, fontSize: 11 },
  guestButton: { minHeight: 48, borderRadius: 12, backgroundColor: colors.faint, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  guestButtonText: { color: colors.cream, fontFamily: fonts.bodyMedium, fontSize: 13 },
  guestNote: { color: colors.muted, fontSize: 10, textAlign: 'center', marginTop: 9 },
  successWrap: { alignItems: 'center', paddingTop: 24 },
  successIcon: { width: 66, height: 66, borderRadius: 33, backgroundColor: colors.greenMuted, borderWidth: 1, borderColor: colors.greenBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  successCheck: { color: colors.green, fontSize: 28 },
});