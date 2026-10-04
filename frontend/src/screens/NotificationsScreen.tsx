import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { describeError, getAppNotifications, markAllNotificationsRead, markNotificationRead } from '../api';
import { getDeviceUser } from '../deviceUser';
import { relativeDate } from '../format';
import { colors, fonts, radius } from '../theme';
import type { AppNotification } from '../types';

interface Props { onBack: () => void; }

export default function NotificationsScreen({ onBack }: Props) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [userId, setUserId] = useState('');
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    getDeviceUser()
      .then(async (user) => {
        const result = await getAppNotifications(user._id);
        if (cancelled) return;
        setUserId(user._id);
        setItems(result.notifications);
        setUnread(result.unread_count);
      })
      .catch((err) => { if (!cancelled) setError(describeError(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const markAll = async () => {
    if (!userId) return;
    try { await markAllNotificationsRead(userId); setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at ?? new Date().toISOString() }))); setUnread(0); }
    catch (err) { setError(describeError(err)); }
  };
  const markRead = async (item: AppNotification) => {
    if (item.read_at || !userId) return;
    try { await markNotificationRead(item._id, userId); setItems((current) => current.map((row) => row._id === item._id ? { ...row, read_at: new Date().toISOString() } : row)); setUnread((value) => Math.max(0, value - 1)); }
    catch (err) { setError(describeError(err)); }
  };

  return <View style={styles.root}>
    <SafeAreaView edges={['top']} style={styles.header}>
      <Pressable onPress={onBack}><Text style={styles.back}>‹  My Recipes</Text></Pressable>
      <View style={styles.titleRow}><View><Text style={styles.eyebrow}>Your activity</Text><Text style={styles.title}>Notifications</Text></View>{unread > 0 && <Pressable onPress={markAll}><Text style={styles.action}>Mark all read</Text></Pressable>}</View>
    </SafeAreaView>
    {loading ? <View style={styles.center}><ActivityIndicator color={colors.accent} /></View> : <ScrollView contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>{error}</Text>}
      {!items.length && !error && <View style={styles.empty}><Text style={styles.emptyTitle}>You’re all caught up</Text><Text style={styles.emptyBody}>Recipe feedback and price report updates will show here.</Text></View>}
      {items.map((item) => <Pressable key={item._id} onPress={() => markRead(item)} style={[styles.card, !item.read_at && styles.unread]}>
        <View style={[styles.dot, item.read_at && styles.dotRead]} />
        <View style={styles.text}><View style={styles.row}><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.time}>{relativeDate(item.createdAt)}</Text></View><Text style={styles.message}>{item.message}</Text></View>
      </Pressable>)}
    </ScrollView>}
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  back: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, paddingVertical: 6 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 7 },
  eyebrow: { color: colors.accent, fontFamily: fonts.bodySemibold, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.8 },
  title: { color: colors.cream, fontFamily: fonts.display, fontSize: 24, marginTop: 2 },
  action: { color: colors.accent, fontFamily: fonts.bodySemibold, fontSize: 11, paddingBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, gap: 9 },
  error: { color: colors.red, fontFamily: fonts.body, fontSize: 12 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { color: colors.cream, fontFamily: fonts.display, fontSize: 20 },
  emptyBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 7, lineHeight: 18 },
  card: { flexDirection: 'row', gap: 11, padding: 13, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius },
  unread: { backgroundColor: colors.card, borderColor: colors.borderMed },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 5 },
  dotRead: { backgroundColor: colors.faint },
  text: { flex: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, color: colors.cream, fontFamily: fonts.bodySemibold, fontSize: 12 },
  time: { color: colors.muted, fontFamily: fonts.body, fontSize: 9 },
  message: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, marginTop: 4 },
});
