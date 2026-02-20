import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Dimensions, ActivityIndicator, StatusBar, Alert,
  Modal, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  interpolate, Extrapolation, SlideInRight, FadeInDown, FadeInUp,
  ZoomIn, withSpring,
} from 'react-native-reanimated';
import api from '../../services/api';
import { Coach } from '../../types';
import { useHaptics, FadeIn, SlideIn, GlassCard, ScaleIn, AnimatedListItem } from '../../components/animations';
import { COLORS } from '../../components/animations/config';

const { width: SW } = Dimensions.get('window');
const BG = COLORS.background;
const CARD = COLORS.cardBackground;
const BORDER = COLORS.border;
const TEXT = COLORS.text;
const TEXT2 = COLORS.textSecondary;
const TEXT3 = COLORS.textTertiary;
const ACCENT = COLORS.primary;

const IC = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
const SLOTS = ['Morning (6–9 AM)', 'Late Morning (9–12 PM)', 'Afternoon (12–3 PM)', 'Late Afternoon (3–6 PM)', 'Evening (6–9 PM)'];

function initials(name: string) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function PressBtn({ style, onPress, disabled, children, delay }: any) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)}>
      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={style}
          onPress={onPress}
          disabled={disabled}
          activeOpacity={1}
          onPressIn={() => { scale.value = withSpring(0.95, { damping: 15, stiffness: 300 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

function StatItem({ v, l, delay, isLast }: any) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <React.Fragment>
      <Animated.View entering={ZoomIn.delay(delay).duration(350).springify()} style={s.stat}>
        <Animated.View style={[anim, { width: '100%', alignItems: 'center' }]}>
          <TouchableOpacity
            activeOpacity={1}
            onPressIn={() => { scale.value = withSpring(0.92, { damping: 12, stiffness: 280 }); }}
            onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 280 }); }}
            style={{ alignItems: 'center', width: '100%' }}
          >
            <Text style={s.statV}>{v}</Text>
            <Text style={s.statL}>{l}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
      {!isLast && <View style={s.statDiv} />}
    </React.Fragment>
  );
}

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export default function CoachProfileScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { trigger } = useHaptics();
  const { coachId } = route.params;
  const scrollY = useSharedValue(0);

  const [coach, setCoach] = useState<Coach | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [bookVisible, setBookVisible] = useState(false);
  const [slot, setSlot] = useState('');
  const [goal, setGoal] = useState('');
  const [bookDate, setBookDate] = useState<Date>(new Date());
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCoachProfile(coachId);
      setCoach(data);
    } catch {
      Alert.alert('Error', 'Failed to load coach profile');
    } finally {
      setLoading(false);
    }
  }, [coachId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  const heroScale = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [-60, 0], [1.06, 1], Extrapolation.CLAMP) }],
  }));

  const navOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 120], [0, 1], Extrapolation.CLAMP),
  }));

  const toggleFollow = async () => {
    if (!coach || followLoading) return;
    setFollowLoading(true);
    trigger('light');
    try {
      if (coach.isFollowing) {
        await api.unfollowCoach(coach.id);
        setCoach(prev => prev ? { ...prev, isFollowing: false, followerCount: (prev.followerCount || 1) - 1 } : null);
      } else {
        await api.followCoach(coach.id);
        setCoach(prev => prev ? { ...prev, isFollowing: true, followerCount: (prev.followerCount || 0) + 1 } : null);
      }
    } catch {
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!coach?.userId || msgLoading) return;
    setMsgLoading(true);
    trigger('medium');
    try {
      const { conversation } = await api.getOrCreateConversation(coach.userId);
      navigation.navigate('Conversation', {
        conversationId: conversation.id,
        recipientName: coach.name,
        recipientAvatar: coach.avatar,
      });
    } catch {
      Alert.alert('Error', 'Failed to open chat');
    } finally {
      setMsgLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!coach || !slot) return;
    setBookSubmitting(true);
    trigger('medium');
    try {
      await api.createBooking({ coachId: coach.id, date: bookDate.toISOString(), timeSlot: slot, goal });
      Alert.alert('Success', 'Booking request sent!');
      setBookVisible(false);
      setSlot('');
      setGoal('');
      setBookDate(new Date());
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send booking request');
    } finally {
      setBookSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" />
        <Animated.View entering={ZoomIn.duration(500).springify()}>
          <ActivityIndicator size="large" color={ACCENT} />
        </Animated.View>
      </View>
    );
  }

  if (!coach) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" />
        <Text style={{ color: TEXT }}>Coach not found</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[s.floatNav, navOpacity]}>
        <BlurView intensity={60} tint="dark" style={s.floatNavBlur}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={TEXT} />
          </TouchableOpacity>
          <Text style={s.floatNavTitle}>{coach.name}</Text>
          <View style={{ width: 44 }} />
        </BlurView>
      </Animated.View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <Animated.View style={[s.hero, heroScale]}>
          <LinearGradient colors={['#1a1a1a', '#111', BG]} style={StyleSheet.absoluteFill} />
          {coach.avatar && (
            <Image source={{ uri: coach.avatar }} style={s.heroBg} blurRadius={40} />
          )}
          <LinearGradient colors={['rgba(8,8,16,0.55)', BG]} style={StyleSheet.absoluteFill} />

          <SafeAreaView style={s.navRow}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <BlurView intensity={40} tint="dark" style={s.backBlur}>
                <Ionicons name="chevron-back" size={22} color={TEXT} />
              </BlurView>
            </TouchableOpacity>
          </SafeAreaView>

          <ScaleIn delay={100}>
            <View style={s.avatarWrap}>
              {coach.avatar ? (
                <Image source={{ uri: coach.avatar }} style={s.avatarImg} />
              ) : (
                <LinearGradient colors={[IC[0], `${IC[0]}88`]} style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials(coach.name)}</Text>
                </LinearGradient>
              )}
              {coach.verified && (
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark" size={11} color="#fff" />
                </View>
              )}
            </View>
          </ScaleIn>
        </Animated.View>

        <View style={s.body}>
          <Animated.Text entering={FadeInDown.delay(200).duration(400)} style={s.name}>{coach.name}</Animated.Text>
          <Animated.Text entering={FadeInDown.delay(280).duration(400)} style={s.bio}>{coach.bio}</Animated.Text>

          <GlassCard delay={320} style={s.statRow} contentStyle={s.statRowContent}>
            {[
              { v: fmt(coach.followerCount || 0), l: 'Followers' },
              { v: String(coach.posts?.length || 0), l: 'Posts' },
              { v: String(coach.clientCount || 0), l: 'Clients' },
              { v: String(coach.rating), l: 'Rating' },
            ].map((st, i, arr) => (
              <StatItem key={st.l} {...st} delay={360 + i * 70} isLast={i === arr.length - 1} />
            ))}
          </GlassCard>

          <View style={s.tags}>
            {coach.specialty.map((sp, i) => (
              <Animated.View key={i} entering={ZoomIn.delay(450 + i * 50).duration(300).springify()}>
                <View style={s.tag}><Text style={s.tagText}>{sp}</Text></View>
              </Animated.View>
            ))}
          </View>

          <View style={s.actions}>
            <PressBtn
              style={[s.followBtn, coach.isFollowing && s.followingBtn, { flex: 2 }]}
              onPress={toggleFollow}
              disabled={followLoading}
              delay={550}
            >
              {followLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  {coach.isFollowing && <Ionicons name="checkmark" size={15} color={TEXT2} />}
                  <Text style={[s.followBtnText, coach.isFollowing && { color: TEXT2 }]}>
                    {coach.isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </>
              )}
            </PressBtn>
            <PressBtn style={[s.secBtn, { flex: 1 }]} onPress={handleMessage} disabled={msgLoading} delay={620}>
              {msgLoading ? <ActivityIndicator size="small" color={TEXT} /> : <Ionicons name="chatbubble-outline" size={18} color={TEXT} />}
            </PressBtn>
            <PressBtn style={[s.secBtn, { flex: 1 }]} onPress={() => setBookVisible(true)} disabled={false} delay={690}>
              <Ionicons name="calendar-outline" size={18} color={TEXT} />
            </PressBtn>
          </View>

          <View style={s.metaRow}>
            {[
              { icon: 'briefcase', color: '#3498db', val: `${coach.experience} yrs`, bg: 'rgba(52,152,219,0.1)' },
              { icon: 'people', color: '#2ecc71', val: `${coach.clientCount} clients`, bg: 'rgba(46,204,113,0.1)' },
              { icon: 'cash', color: '#f39c12', val: coach.price, bg: 'rgba(243,156,18,0.1)' },
            ].map((m, i) => (
              <Animated.View key={m.icon} entering={FadeInDown.delay(720 + i * 80).duration(400)} style={[s.metaCard, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon as any} size={16} color={m.color} />
                <Text style={[s.metaVal, { color: m.color }]}>{m.val}</Text>
              </Animated.View>
            ))}
          </View>

          {(coach.posts || []).filter(p => p.imageUrl).length > 0 && (
            <View>
              <Animated.Text entering={FadeInDown.delay(850).duration(350)} style={s.gridLabel}>Posts</Animated.Text>
              <View style={s.grid}>
                {(coach.posts || []).filter(p => p.imageUrl).map((p, i) => (
                  <Animated.View key={p.id} entering={ZoomIn.delay(900 + i * 50).duration(300).springify()}>
                    <TouchableOpacity style={s.gridItem} activeOpacity={0.9}>
                      <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFill} />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </View>
          )}
          <View style={{ height: 100 }} />
        </View>
      </Animated.ScrollView>

      <Modal visible={bookVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBookVisible(false)}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <SlideIn direction="up" delay={60}>
            <Text style={s.sheetTitle}>Book with {coach.name}</Text>
          </SlideIn>
          <Animated.ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={s.sectionLabel}>Select Date</Text>
            <View style={s.dateRow}>
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const isSelected = d.toDateString() === bookDate.toDateString();
                const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                const dayNum = d.getDate();
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.dateBtn, isSelected && s.dateBtnOn]}
                    onPress={() => setBookDate(d)}
                  >
                    <Text style={[s.dateBtnDay, isSelected && s.dateBtnDayOn]}>{dayName}</Text>
                    <Text style={[s.dateBtnNum, isSelected && s.dateBtnNumOn]}>{dayNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={[s.sectionLabel, { marginTop: 20 }]}>Select Time</Text>
            {SLOTS.map((sl, i) => (
              <Animated.View key={sl} entering={SlideInRight.delay(80 + i * 50).duration(300).springify()}>
                <TouchableOpacity style={[s.slotBtn, slot === sl && s.slotBtnOn]} onPress={() => setSlot(sl)}>
                  <View style={[s.slotDot, slot === sl && s.slotDotOn]} />
                  <Text style={[s.slotText, slot === sl && s.slotTextOn]}>{sl}</Text>
                  {slot === sl && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
                </TouchableOpacity>
              </Animated.View>
            ))}
            <FadeIn delay={360}>
              <TextInput
                style={[s.sheetInput, { height: 100, marginTop: 16, textAlignVertical: 'top' }]}
                placeholder="Describe your training goal..."
                placeholderTextColor={TEXT3}
                value={goal}
                onChangeText={setGoal}
                multiline
              />
              <TouchableOpacity
                style={[s.sheetBtn, (!slot || bookSubmitting) && { opacity: 0.45 }]}
                onPress={handleBooking}
                disabled={!slot || bookSubmitting}
              >
                <LinearGradient colors={[ACCENT, '#b03030']} style={s.sheetBtnGrad}>
                  {bookSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sheetBtnText}>Request Session</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </FadeIn>
          </Animated.ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  floatNav: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  floatNavBlur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER, overflow: 'hidden' },
  floatNavTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  hero: { height: 310, justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  navRow: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: { margin: 16, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backBlur: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  avatarWrap: { width: 108, height: 108, borderRadius: 54, overflow: 'hidden', borderWidth: 3.5, borderColor: BG, marginBottom: -54, zIndex: 5 },
  avatarImg: { width: '100%', height: '100%' },
  avatarFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarInitials: { fontSize: 40, fontWeight: '900', color: '#fff' },
  verifiedBadge: { position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: BG },
  body: { paddingTop: 62, paddingHorizontal: 20 },
  name: { fontSize: 24, fontWeight: '900', color: TEXT, letterSpacing: -0.4, marginBottom: 6 },
  bio: { fontSize: 14, color: TEXT2, lineHeight: 21, marginBottom: 20 },
  statRow: { marginBottom: 18, borderRadius: 20 },
  statRowContent: { flexDirection: 'row', alignItems: 'center', padding: 0 },
  statDiv: { width: 1, height: 28, backgroundColor: BORDER },
  stat: { flex: 1, alignItems: 'center' },
  statV: { fontSize: 19, fontWeight: '800', color: TEXT },
  statL: { fontSize: 11, color: TEXT3, marginTop: 2, fontWeight: '600' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  tag: { backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(231,76,60,0.2)' },
  tagText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  followBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 14 },
  followingBtn: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  followBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  metaCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, padding: 12 },
  metaVal: { fontSize: 13, fontWeight: '700' },
  gridLabel: { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gridItem: { width: (SW - 46) / 3, height: (SW - 46) / 3, borderRadius: 8, overflow: 'hidden' },
  sheet: { flex: 1, backgroundColor: '#111', paddingTop: 16 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT, paddingHorizontal: 20, marginBottom: 20 },
  slotBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, backgroundColor: CARD, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  slotBtnOn: { borderColor: ACCENT, backgroundColor: 'rgba(231,76,60,0.05)' },
  slotDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: TEXT3 },
  slotDotOn: { backgroundColor: ACCENT },
  slotText: { flex: 1, fontSize: 14, color: TEXT2, fontWeight: '500' },
  slotTextOn: { color: TEXT, fontWeight: '700' },
  sheetInput: { backgroundColor: CARD, borderRadius: 14, padding: 16, color: TEXT, borderWidth: 1, borderColor: BORDER, fontSize: 15 },
  sheetBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  sheetBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: TEXT3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 },
  dateRow: { flexDirection: 'row', gap: 6 },
  dateBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: 'transparent' },
  dateBtnOn: { borderColor: ACCENT, backgroundColor: 'rgba(231,76,60,0.08)' },
  dateBtnDay: { fontSize: 11, color: TEXT3, fontWeight: '600', marginBottom: 4 },
  dateBtnDayOn: { color: ACCENT },
  dateBtnNum: { fontSize: 16, fontWeight: '800', color: TEXT2 },
  dateBtnNumOn: { color: TEXT },
});
