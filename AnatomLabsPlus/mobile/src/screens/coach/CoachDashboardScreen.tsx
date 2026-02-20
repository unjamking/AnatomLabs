import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
  Alert, ActivityIndicator, Image, Dimensions, Platform, StatusBar,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  withTiming, withSpring, withDelay, withSequence, withRepeat,
  interpolate, Extrapolation, FadeIn, FadeInDown, FadeInUp,
  SlideInLeft, SlideInRight, ZoomIn, ZoomInEasing,
  useAnimatedProps, runOnJS, Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Booking } from '../../types';
import { useHaptics } from '../../components/animations';

const { width: SW } = Dimensions.get('window');
type Segment = 'overview' | 'bookings' | 'settings';

const TABS: { id: Segment; icon: string; activeIcon: string; label: string }[] = [
  { id: 'overview', icon: 'grid-outline', activeIcon: 'grid', label: 'Overview' },
  { id: 'bookings', icon: 'calendar-outline', activeIcon: 'calendar', label: 'Bookings' },
  { id: 'settings', icon: 'settings-outline', activeIcon: 'settings', label: 'Settings' },
];

const ACCENT = '#e74c3c';
const BG = '#0a0a0a';
const CARD = '#1a1a1a';
const BORDER = '#333';
const TEXT = '#ffffff';
const TEXT2 = 'rgba(255,255,255,0.5)';
const TEXT3 = 'rgba(255,255,255,0.35)';

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function initials(name: string) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function PressableCard({ children, style, onPress, onLongPress, delay = 0 }: any) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400).springify()}>
      <Animated.View style={anim}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={() => { scale.value = withSpring(0.96, { damping: 15, stiffness: 300 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
          onPress={onPress}
          onLongPress={onLongPress}
          style={style}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

function StatCard({ v, l, icon, col, onPress, delay }: any) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View entering={ZoomIn.delay(delay).duration(350).springify()}>
      <Animated.View style={[s.statCard, anim]}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={() => { scale.value = withSpring(0.93, { damping: 12, stiffness: 280 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 280 }); }}
          onPress={onPress}
          disabled={!onPress}
        >
          <LinearGradient colors={[`${col}22`, `${col}06`]} style={s.statCardGrad}>
            <Animated.View
              entering={ZoomIn.delay(delay + 100).duration(300)}
              style={[s.statIcon, { backgroundColor: `${col}20` }]}
            >
              <Ionicons name={icon} size={18} color={col} />
            </Animated.View>
            <Text style={s.statV}>{v}</Text>
            <Text style={s.statL}>{l}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function CoachDashboardScreen() {
  const navigation = useNavigation<any>();
  const { trigger } = useHaptics();
  const { user, updateUser } = useAuth();
  const scrollY = useSharedValue(0);
  const tabX = useSharedValue(0);
  const segmentOpacity = useSharedValue(1);
  const segmentY = useSharedValue(0);

  const [segment, setSegment] = useState<Segment>('overview');
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [editBio, setEditBio] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editAvailability, setEditAvailability] = useState('');
  const [editSpecialty, setEditSpecialty] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saving, setSaving] = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [storyVisible, setStoryVisible] = useState(false);
  const [storyIdx, setStoryIdx] = useState(0);
  const storyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storyProgress = useSharedValue(0);

  const avatarPulse = useSharedValue(1);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [p, b] = await Promise.all([api.getCoachDashboardProfile(), api.getCoachBookings()]);
      setProfile(p); setBookings(b);
      setEditBio(p.bio || ''); setEditPrice(p.price?.toString() || '0');
      setEditAvailability((p.availability || []).join(', '));
      setEditSpecialty((p.specialty || []).join(', '));
      setEditAvatar(p.avatar || '');
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    avatarPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const stories = profile?.stories || [];
    if (storyVisible && stories.length > 0) {
      storyProgress.value = 0;
      storyProgress.value = withTiming(1, { duration: 5000, easing: Easing.linear });
      if (storyTimer.current) clearTimeout(storyTimer.current);
      storyTimer.current = setTimeout(() => {
        if (storyIdx < stories.length - 1) setStoryIdx(i => i + 1);
        else setStoryVisible(false);
      }, 5000);
    }
    return () => { if (storyTimer.current) clearTimeout(storyTimer.current); };
  }, [storyVisible, storyIdx, profile]);

  const handleScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  const switchTab = (t: Segment) => {
    trigger('selection');
    segmentOpacity.value = withSequence(
      withTiming(0, { duration: 120 }),
      withTiming(1, { duration: 220 })
    );
    segmentY.value = withSequence(
      withTiming(12, { duration: 120 }),
      withTiming(0, { duration: 220 })
    );
    setTimeout(() => setSegment(t), 120);
    tabX.value = withSpring(TABS.findIndex(x => x.id === t) * (SW / 3), {
      damping: 18, stiffness: 220,
    });
  };

  const tabIndicator = useAnimatedStyle(() => ({ transform: [{ translateX: tabX.value }] }));

  const heroScale = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(scrollY.value, [-60, 0], [1.06, 1], Extrapolation.CLAMP) }],
  }));

  const navOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [60, 120], [0, 1], Extrapolation.CLAMP),
  }));

  const avatarAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: avatarPulse.value }],
  }));

  const segmentStyle = useAnimatedStyle(() => ({
    opacity: segmentOpacity.value,
    transform: [{ translateY: segmentY.value }],
  }));

  const storyBarStyle = useAnimatedStyle(() => ({
    width: `${storyProgress.value * 100}%` as any,
  }));

  const openAvatarCamera = async () => {
    trigger('medium');
    if (!cameraPermission?.granted) {
      const r = await requestCameraPermission();
      if (!r.granted) { Alert.alert('Camera access needed', 'Allow camera in Settings.'); return; }
    }
    setAvatarSheetVisible(false);
    setCameraVisible(true);
  };

  const uploadAndSetAvatar = async (localUri: string) => {
    try {
      const { avatarUrl } = await api.uploadAvatar(localUri);
      setEditAvatar(avatarUrl);
      await api.updateCoachProfile({ avatar: avatarUrl });
      updateUser({ avatar: avatarUrl });
      setProfile((prev: any) => prev ? { ...prev, avatar: avatarUrl } : prev);
    } catch {
      Alert.alert('Error', 'Failed to upload photo');
    }
  };

  const pickAvatarFromRoll = async () => {
    trigger('light');
    setAvatarSheetVisible(false);
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85 });
    if (!r.canceled && r.assets?.length > 0) {
      setEditAvatar(r.assets[0].uri);
      await uploadAndSetAvatar(r.assets[0].uri);
    }
  };

  const takeAvatarPhoto = async () => {
    if (!cameraRef.current) return;
    trigger('medium');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      setEditAvatar(photo.uri);
      setCameraVisible(false);
      await uploadAndSetAvatar(photo.uri);
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    trigger('medium');
    try {
      await api.updateCoachProfile({
        bio: editBio,
        price: parseFloat(editPrice) || 0,
        availability: editAvailability.split(',').map(s => s.trim()).filter(Boolean),
        specialty: editSpecialty.split(',').map(s => s.trim()).filter(Boolean),
      });
      Alert.alert('Saved', 'Profile updated successfully');
      loadData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert('Delete Post', 'Remove this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        trigger('notification');
        try { await api.deleteCoachPost(postId); loadData(); } catch (e: any) { Alert.alert('Error', e?.message); }
      }},
    ]);
  };

  const handleBookingAction = async (id: string, status: string) => {
    trigger('medium');
    try { await api.updateBookingStatus(id, status); loadData(); }
    catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
  };

  const pending = bookings.filter(b => b.status === 'PENDING');
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
  const past = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  if (loading && !profile) {
    return (
      <View style={s.loader}>
        <StatusBar barStyle="light-content" />
        <Animated.View entering={ZoomIn.duration(400).springify()}>
          <ActivityIndicator size="large" color={ACCENT} />
        </Animated.View>
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
          <Text style={s.floatNavTitle}>Coach Hub</Text>
          <View style={{ width: 44 }} />
        </BlurView>
      </Animated.View>

      <Animated.ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
      >
        <Animated.View style={[s.hero, heroScale]}>
          <LinearGradient colors={['#1a1a1a', '#111', BG]} style={StyleSheet.absoluteFill} />
          {profile?.avatar ? (
            <Image source={{ uri: profile.avatar }} style={s.heroBgImg} blurRadius={30} />
          ) : null}
          <LinearGradient colors={['rgba(0,0,0,0.3)', BG]} style={StyleSheet.absoluteFill} />

          <SafeAreaView style={s.heroNav}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
              <BlurView intensity={35} tint="dark" style={s.backBtnBlur}>
                <Ionicons name="chevron-back" size={22} color={TEXT} />
              </BlurView>
            </TouchableOpacity>
          </SafeAreaView>

          <Animated.View style={avatarAnimStyle}>
            <Animated.View entering={ZoomIn.delay(100).duration(500).springify()}>
              <TouchableOpacity style={s.heroAvatarWrap} onPress={() => setAvatarSheetVisible(true)} activeOpacity={0.85}>
                <LinearGradient colors={['#f09433', '#e6683c', '#dc2743', '#bc1888']} style={s.heroAvatarRing}>
                  <View style={s.heroAvatarInner}>
                    {editAvatar ? (
                      <Image source={{ uri: editAvatar }} style={s.heroAvatarImg} />
                    ) : profile?.name ? (
                      <LinearGradient colors={[ACCENT, '#9b0000']} style={s.heroAvatarGrad}>
                        <Text style={s.heroAvatarText}>{initials(profile.name)}</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[s.heroAvatarGrad, { backgroundColor: '#1a1a1a' }]}>
                        <Ionicons name="person" size={36} color={TEXT3} />
                      </View>
                    )}
                  </View>
                </LinearGradient>
                <Animated.View
                  entering={ZoomIn.delay(400).duration(300).springify()}
                  style={s.heroEditBadge}
                >
                  <Ionicons name="camera" size={12} color="#fff" />
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          <Animated.Text entering={FadeInUp.delay(200).duration(400)} style={s.heroName}>
            {profile?.name || 'Coach'}
          </Animated.Text>
          <Animated.Text entering={FadeInUp.delay(280).duration(400)} style={s.heroSpec}>
            {(profile?.specialty || []).slice(0, 2).join(' · ') || 'Fitness Coach'}
          </Animated.Text>

          <Animated.View entering={FadeInUp.delay(360).duration(400)} style={s.heroStats}>
            {[
              { v: fmt(profile?.followerCount || 0), l: 'Followers' },
              { v: String(profile?.clientCount || 0), l: 'Clients' },
              { v: String(profile?.rating || '5.0'), l: 'Rating' },
            ].map((st, i) => (
              <React.Fragment key={st.l}>
                {i > 0 && <View style={s.heroStatDiv} />}
                <View style={s.heroStat}>
                  <Text style={s.heroStatV}>{st.v}</Text>
                  <Text style={s.heroStatL}>{st.l}</Text>
                </View>
              </React.Fragment>
            ))}
          </Animated.View>
        </Animated.View>

        <Animated.View entering={FadeIn.delay(400).duration(300)} style={s.tabBar}>
          {TABS.map((t, i) => (
            <TouchableOpacity key={t.id} style={s.tabBtn} onPress={() => switchTab(t.id)} activeOpacity={0.7}>
              <Animated.View entering={FadeInDown.delay(420 + i * 60).duration(300)}>
                <Ionicons name={(segment === t.id ? t.activeIcon : t.icon) as any} size={20} color={segment === t.id ? ACCENT : TEXT3} />
                <Text style={[s.tabLabel, segment === t.id && s.tabLabelOn]}>{t.label}</Text>
              </Animated.View>
            </TouchableOpacity>
          ))}
          <Animated.View style={[s.tabIndicator, tabIndicator]} />
        </Animated.View>

        <Animated.View style={[s.body, segmentStyle]}>
          {segment === 'overview' && (
            <View>
              <View style={s.statsRow}>
                {[
                  { v: fmt(profile?.followerCount || 0), l: 'Followers', icon: 'people', col: '#3498db', onPress: () => navigation.navigate('FollowerList', { type: 'followers' }) },
                  { v: String(profile?.posts?.length || 0), l: 'Posts', icon: 'images', col: '#9b59b6', onPress: undefined },
                  { v: String(pending.length), l: 'Pending', icon: 'time', col: '#f39c12', onPress: undefined },
                  { v: String(confirmed.length), l: 'Upcoming', icon: 'calendar-sharp', col: '#2ecc71', onPress: undefined },
                ].map((st, i) => (
                  <StatCard key={st.l} {...st} delay={500 + i * 70} />
                ))}
              </View>

              {confirmed.length > 0 && (
                <>
                  <Animated.Text entering={FadeInDown.delay(650).duration(350)} style={s.sectionLabel}>
                    Upcoming Sessions
                  </Animated.Text>
                  {confirmed.slice(0, 3).map((b, i) => (
                    <PressableCard
                      key={b.id}
                      delay={700 + i * 80}
                      style={s.sessionCard}
                      onPress={() => navigation.navigate('Conversations')}
                    >
                      <LinearGradient colors={['rgba(52,152,219,0.1)', 'rgba(52,152,219,0.03)']} style={s.sessionGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                        <View style={s.sessionAvatar}>
                          <Text style={s.sessionAvatarText}>{initials(b.client?.name || 'C')}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sessionName}>{b.client?.name || 'Client'}</Text>
                          <Text style={s.sessionTime}>{b.timeSlot}</Text>
                          <Text style={s.sessionDate}>{new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                        </View>
                        <View style={s.sessionChatBtn}>
                          <Ionicons name="chatbubble-ellipses" size={18} color="#3498db" />
                        </View>
                      </LinearGradient>
                    </PressableCard>
                  ))}
                </>
              )}

              {confirmed.length === 0 && (
                <Animated.View entering={FadeInDown.delay(700).duration(350)} style={s.emptyCard}>
                  <Ionicons name="calendar-outline" size={30} color={TEXT3} />
                  <Text style={s.emptyCardText}>No upcoming sessions</Text>
                </Animated.View>
              )}

              {(profile?.stories || []).length > 0 && (
                <Animated.View entering={FadeInDown.delay(750).duration(350)}>
                  <Text style={[s.sectionLabel, { marginTop: 28 }]}>Your Stories</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
                    {profile.stories.map((st: any, i: number) => (
                      <Animated.View key={st.id} entering={SlideInRight.delay(800 + i * 70).duration(350).springify()}>
                        <TouchableOpacity
                          style={s.storyThumb}
                          onPress={() => { setStoryIdx(i); setStoryVisible(true); }}
                          activeOpacity={0.85}
                        >
                          <LinearGradient colors={['#e74c3c', '#9b59b6']} style={StyleSheet.absoluteFill} />
                          <View style={s.storyThumbInner}>
                            <Ionicons name="barbell" size={22} color="#fff" />
                            <Text style={s.storyThumbText} numberOfLines={2}>{st.title}</Text>
                          </View>
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </ScrollView>
                </Animated.View>
              )}

              {(profile?.posts || []).length > 0 && (
                <Animated.View entering={FadeInDown.delay(820).duration(350)}>
                  <Text style={[s.sectionLabel, { marginTop: 28 }]}>Your Posts</Text>
                  <View style={s.postsGrid}>
                    {profile.posts.map((p: any, i: number) => (
                      <Animated.View
                        key={p.id}
                        entering={ZoomIn.delay(860 + i * 50).duration(300).springify()}
                      >
                        <TouchableOpacity
                          style={s.postThumb}
                          onPress={() => setSelectedPost(p)}
                          onLongPress={() => handleDeletePost(p.id)}
                          activeOpacity={0.85}
                        >
                          {p.imageUrl ? (
                            <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          ) : (
                            <LinearGradient colors={['#1a1a1a', '#111']} style={StyleSheet.absoluteFill}>
                              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 8 }}>
                                <Text style={{ color: '#fff', fontSize: 11, textAlign: 'center' }} numberOfLines={4}>{p.caption}</Text>
                              </View>
                            </LinearGradient>
                          )}
                          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.45)']} style={StyleSheet.absoluteFill} />
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                  <Text style={s.hint}>Tap to view · Long-press to delete</Text>
                </Animated.View>
              )}
            </View>
          )}

          {segment === 'bookings' && (
            <View>
              {pending.length > 0 ? (
                <>
                  <Animated.Text entering={FadeInDown.delay(80).duration(300)} style={s.sectionLabel}>
                    New Requests
                  </Animated.Text>
                  {pending.map((b, i) => (
                    <Animated.View key={b.id} entering={SlideInLeft.delay(120 + i * 80).duration(350).springify()}>
                      <View style={s.requestCard}>
                        <View style={s.requestTop}>
                          <View style={s.requestAvatar}>
                            <Text style={s.requestAvatarText}>{initials(b.client?.name || 'C')}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.requestName}>{b.client?.name || 'Client'}</Text>
                            <Text style={s.requestTime}>{b.timeSlot} · {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                          </View>
                          <View style={s.newPill}>
                            <View style={s.newDot} />
                            <Text style={s.newPillText}>New</Text>
                          </View>
                        </View>
                        {b.goal ? (
                          <View style={s.goalRow}>
                            <Ionicons name="flag-outline" size={13} color={TEXT3} />
                            <Text style={s.goalText} numberOfLines={2}>{b.goal}</Text>
                          </View>
                        ) : null}
                        <View style={s.requestBtns}>
                          <TouchableOpacity style={s.declineBtn} onPress={() => handleBookingAction(b.id, 'CANCELLED')}>
                            <Text style={s.declineBtnText}>Decline</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.acceptBtn} onPress={() => handleBookingAction(b.id, 'CONFIRMED')}>
                            <LinearGradient colors={[ACCENT, '#b03030']} style={s.acceptGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                              <Ionicons name="checkmark" size={16} color="#fff" />
                              <Text style={s.acceptText}>Accept</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Animated.View>
                  ))}
                </>
              ) : (
                <Animated.View entering={FadeInDown.delay(80).duration(350)} style={s.emptyCard}>
                  <Ionicons name="checkmark-circle-outline" size={30} color={TEXT3} />
                  <Text style={s.emptyCardText}>No pending requests</Text>
                </Animated.View>
              )}

              {confirmed.length > 0 && (
                <Animated.View entering={FadeInDown.delay(160).duration(350)}>
                  <Text style={[s.sectionLabel, { marginTop: 28 }]}>Confirmed</Text>
                  {confirmed.map((b, i) => (
                    <Animated.View key={b.id} entering={SlideInLeft.delay(180 + i * 70).duration(320).springify()}>
                      <View style={s.requestCard}>
                        <View style={s.requestTop}>
                          <View style={[s.requestAvatar, { backgroundColor: 'rgba(46,204,113,0.15)' }]}>
                            <Text style={s.requestAvatarText}>{initials(b.client?.name || 'C')}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.requestName}>{b.client?.name || 'Client'}</Text>
                            <Text style={s.requestTime}>{b.timeSlot} · {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
                          </View>
                          <View style={[s.newPill, { backgroundColor: 'rgba(46,204,113,0.1)' }]}>
                            <Ionicons name="checkmark-circle" size={11} color="#2ecc71" />
                            <Text style={[s.newPillText, { color: '#2ecc71' }]}>Confirmed</Text>
                          </View>
                        </View>
                        {b.goal ? (
                          <View style={s.goalRow}>
                            <Ionicons name="flag-outline" size={13} color={TEXT3} />
                            <Text style={s.goalText} numberOfLines={2}>{b.goal}</Text>
                          </View>
                        ) : null}
                        <TouchableOpacity
                          style={s.completeBtn}
                          onPress={() => handleBookingAction(b.id, 'COMPLETED')}
                        >
                          <Ionicons name="checkmark-done" size={15} color="#2ecc71" />
                          <Text style={s.completeBtnText}>Mark as Complete</Text>
                        </TouchableOpacity>
                      </View>
                    </Animated.View>
                  ))}
                </Animated.View>
              )}

              {past.length > 0 && (
                <Animated.View entering={FadeInDown.delay(200).duration(350)}>
                  <Text style={[s.sectionLabel, { marginTop: 28 }]}>History</Text>
                  <View style={s.historyList}>
                    {past.map((b, i) => {
                      const isConfirmed = b.status === 'CONFIRMED';
                      const isCancelled = b.status === 'CANCELLED';
                      return (
                        <Animated.View
                          key={b.id}
                          entering={SlideInRight.delay(240 + i * 50).duration(300).springify()}
                          style={[s.historyRow, i < past.length - 1 && s.historyBorder]}
                        >
                          <View style={[s.historyDot, { backgroundColor: isConfirmed ? '#2ecc71' : isCancelled ? ACCENT : TEXT3 }]} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.historyName}>{b.client?.name || 'Client'}</Text>
                            <Text style={s.historyDate}>{new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                          </View>
                          <View style={[s.statusPill, { backgroundColor: isConfirmed ? 'rgba(46,204,113,0.1)' : isCancelled ? 'rgba(231,76,60,0.1)' : CARD }]}>
                            <Text style={[s.statusPillText, { color: isConfirmed ? '#2ecc71' : isCancelled ? ACCENT : TEXT2 }]}>
                              {b.status.charAt(0) + b.status.slice(1).toLowerCase()}
                            </Text>
                          </View>
                        </Animated.View>
                      );
                    })}
                  </View>
                </Animated.View>
              )}
            </View>
          )}

          {segment === 'settings' && (
            <Animated.View entering={FadeInDown.delay(60).duration(350)} style={s.settingsCard}>
              <Animated.View entering={FadeInDown.delay(120).duration(300)} style={s.settingsSection}>
                <Text style={s.settingsLabel}>Bio</Text>
                <TextInput style={[s.input, s.inputTall]} value={editBio} onChangeText={setEditBio} multiline placeholder="Tell clients about your background..." placeholderTextColor={TEXT3} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).duration(300)} style={s.settingsSection}>
                <Text style={s.settingsLabel}>Specialties</Text>
                <TextInput style={s.input} value={editSpecialty} onChangeText={setEditSpecialty} placeholder="Strength, Fat Loss, Nutrition..." placeholderTextColor={TEXT3} />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(240).duration(300)} style={s.twoCol}>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingsLabel}>Price ($/session)</Text>
                  <TextInput style={s.input} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" placeholder="0" placeholderTextColor={TEXT3} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.settingsLabel}>Availability</Text>
                  <TextInput style={s.input} value={editAvailability} onChangeText={setEditAvailability} placeholder="Mon–Fri 9AM–5PM" placeholderTextColor={TEXT3} />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).duration(300)}>
                <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
                  <LinearGradient colors={[ACCENT, '#b03030']} style={s.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {saving ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark-circle" size={18} color="#fff" />}
                    <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </Animated.View>
          )}
        </Animated.View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      <Modal visible={avatarSheetVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setAvatarSheetVisible(false)}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={s.sheetTitle}>
            Change Profile Photo
          </Animated.Text>
          <View style={{ padding: 20, gap: 12 }}>
            {[
              { onPress: openAvatarCamera, colors: ['rgba(231,76,60,0.15)', 'rgba(231,76,60,0.05)'], icon: 'camera-outline', color: ACCENT, title: 'Take a Photo', sub: 'Use your camera' },
              { onPress: pickAvatarFromRoll, colors: ['rgba(52,152,219,0.15)', 'rgba(52,152,219,0.05)'], icon: 'images-outline', color: '#3498db', title: 'Choose from Library', sub: 'Browse your photos' },
            ].map((opt, i) => (
              <Animated.View key={opt.title} entering={SlideInLeft.delay(100 + i * 80).duration(350).springify()}>
                <TouchableOpacity style={s.avatarOption} onPress={opt.onPress} activeOpacity={0.8}>
                  <LinearGradient colors={opt.colors as any} style={s.avatarOptionIcon}>
                    <Ionicons name={opt.icon as any} size={24} color={opt.color} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={s.avatarOptionTitle}>{opt.title}</Text>
                    <Text style={s.avatarOptionSub}>{opt.sub}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={TEXT3} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>
      </Modal>

      <Modal visible={cameraVisible} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setCameraVisible(false)}>
        <View style={s.camRoot}>
          <StatusBar barStyle="light-content" />
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />
          <SafeAreaView style={s.camTop}>
            <TouchableOpacity style={s.camBtn} onPress={() => setCameraVisible(false)}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={s.camBtn} onPress={() => setCameraFacing(f => f === 'back' ? 'front' : 'back')}>
              <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
            </TouchableOpacity>
          </SafeAreaView>
          <View style={s.camShutter}>
            <View style={{ width: 52 }} />
            <TouchableOpacity style={s.shutterBtn} onPress={takeAvatarPhoto}>
              <View style={s.shutterInner} />
            </TouchableOpacity>
            <View style={{ width: 52 }} />
          </View>
        </View>
      </Modal>

      {selectedPost && (
        <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setSelectedPost(null)}>
          <View style={s.postViewer}>
            <StatusBar barStyle="light-content" />
            {selectedPost.imageUrl ? (
              <Animated.Image
                entering={ZoomIn.duration(350).springify()}
                source={{ uri: selectedPost.imageUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="contain"
              />
            ) : (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={[StyleSheet.absoluteFill, { backgroundColor: BG, justifyContent: 'center', padding: 32 }]}
              >
                <Text style={{ color: TEXT, fontSize: 20, lineHeight: 30, fontWeight: '500' }}>{selectedPost.caption}</Text>
              </Animated.View>
            )}
            <LinearGradient colors={['rgba(0,0,0,0.65)', 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120 }} />
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 }} />
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <SafeAreaView style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', padding: 16 }}>
                <TouchableOpacity style={s.camBtn} onPress={() => setSelectedPost(null)}>
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={s.camBtn} onPress={() => { setSelectedPost(null); handleDeletePost(selectedPost.id); }}>
                  <Ionicons name="trash-outline" size={22} color="#ff4444" />
                </TouchableOpacity>
              </SafeAreaView>
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(150).duration(350)}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, paddingBottom: 48 }}
            >
              <Text style={{ color: '#fff', fontSize: 15, lineHeight: 22 }} numberOfLines={4}>{selectedPost.caption}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>
                {new Date(selectedPost.createdAt || selectedPost.timestamp).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </Animated.View>
          </View>
        </Modal>
      )}

      {storyVisible && (profile?.stories || []).length > 0 && (
        <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setStoryVisible(false)}>
          <View style={s.storyViewer}>
            <StatusBar barStyle="light-content" />
            <View style={s.storyProgress}>
              {profile.stories.map((_: any, i: number) => (
                <View key={i} style={s.storySegBg}>
                  {i < storyIdx ? (
                    <View style={[s.storySegFill, { width: '100%' }]} />
                  ) : i === storyIdx ? (
                    <Animated.View style={[s.storySegFill, storyBarStyle]} />
                  ) : null}
                </View>
              ))}
            </View>
            <Animated.View entering={FadeInDown.delay(60).duration(300)}>
              <SafeAreaView style={s.storyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={[s.storyAvatar, { backgroundColor: ACCENT }]}>
                    {editAvatar ? (
                      <Image source={{ uri: editAvatar }} style={{ width: '100%', height: '100%', borderRadius: 18 }} />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{initials(profile?.name || 'C')}</Text>
                    )}
                  </View>
                  <View>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{profile?.name || 'You'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                      {profile.stories[storyIdx]?.type}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setStoryVisible(false)}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </SafeAreaView>
            </Animated.View>
            <TouchableOpacity style={s.storyBody} activeOpacity={1} onPress={() => {
              if (storyIdx < profile.stories.length - 1) setStoryIdx(i => i + 1);
              else setStoryVisible(false);
            }}>
              <Animated.View
                key={storyIdx}
                entering={ZoomIn.duration(400).springify()}
                style={s.storyIconCircle}
              >
                <Ionicons name="barbell" size={38} color="#fff" />
              </Animated.View>
              <Animated.Text
                key={`title-${storyIdx}`}
                entering={FadeInUp.delay(80).duration(350)}
                style={s.storyBodyTitle}
              >
                {profile.stories[storyIdx]?.title}
              </Animated.Text>
              <Animated.Text
                key={`desc-${storyIdx}`}
                entering={FadeInUp.delay(140).duration(350)}
                style={s.storyBodyDesc}
              >
                {profile.stories[storyIdx]?.description}
              </Animated.Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  loader: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 40 },

  floatNav: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 },
  floatNavBlur: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, paddingHorizontal: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER, overflow: 'hidden' },
  floatNavTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backBtnBlur: { width: 38, height: 38, borderRadius: 19, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },

  hero: { minHeight: 340, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 28, overflow: 'hidden' },
  heroBgImg: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
  heroNav: { position: 'absolute', top: 0, left: 0, right: 0 },
  heroAvatarWrap: { width: 108, height: 108, marginBottom: 16, position: 'relative' },
  heroAvatarRing: { width: '100%', height: '100%', borderRadius: 54, justifyContent: 'center', alignItems: 'center' },
  heroAvatarInner: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: BG, overflow: 'hidden' },
  heroAvatarImg: { width: '100%', height: '100%' },
  heroAvatarGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroAvatarText: { fontSize: 36, fontWeight: '900', color: '#fff' },
  heroEditBadge: { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: ACCENT, justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: BG },
  heroName: { fontSize: 24, fontWeight: '900', color: TEXT, letterSpacing: -0.4, marginBottom: 5 },
  heroSpec: { fontSize: 14, color: TEXT2, marginBottom: 22 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStatDiv: { width: 1, height: 28, backgroundColor: BORDER, marginHorizontal: 24 },
  heroStat: { alignItems: 'center' },
  heroStatV: { fontSize: 20, fontWeight: '800', color: TEXT },
  heroStatL: { fontSize: 11, color: TEXT3, marginTop: 2, fontWeight: '600' },

  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER, position: 'relative', backgroundColor: BG },
  tabBtn: { flex: 1, paddingVertical: 13, alignItems: 'center', gap: 4 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: TEXT3 },
  tabLabelOn: { color: ACCENT },
  tabIndicator: { position: 'absolute', bottom: 0, width: SW / 3, height: 2, backgroundColor: ACCENT, borderRadius: 1 },

  body: { paddingHorizontal: 16, paddingTop: 22 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  statCard: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  statCardGrad: { padding: 14, alignItems: 'center', gap: 7 },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statV: { fontSize: 18, fontWeight: '800', color: TEXT },
  statL: { fontSize: 10, fontWeight: '600', color: TEXT3, textAlign: 'center' },

  sectionLabel: { fontSize: 16, fontWeight: '800', color: TEXT, marginBottom: 14, letterSpacing: -0.2 },

  sessionCard: { marginBottom: 10, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(52,152,219,0.2)' },
  sessionGrad: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  sessionAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(52,152,219,0.18)', justifyContent: 'center', alignItems: 'center' },
  sessionAvatarText: { fontSize: 15, fontWeight: '800', color: '#3498db' },
  sessionName: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  sessionTime: { fontSize: 12, color: TEXT2 },
  sessionDate: { fontSize: 11, color: TEXT3, marginTop: 1 },
  sessionChatBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(52,152,219,0.14)', justifyContent: 'center', alignItems: 'center' },

  emptyCard: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyCardText: { fontSize: 14, color: TEXT3, fontWeight: '500' },

  postsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  postThumb: { width: (SW - 35) / 3, height: (SW - 35) / 3, borderRadius: 6, overflow: 'hidden' },
  hint: { fontSize: 11, color: TEXT3, textAlign: 'center', marginTop: 10 },

  requestCard: { backgroundColor: CARD, borderRadius: 22, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  requestTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  requestAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(243,156,18,0.15)', justifyContent: 'center', alignItems: 'center' },
  requestAvatarText: { fontSize: 16, fontWeight: '800', color: '#f39c12' },
  requestName: { fontSize: 16, fontWeight: '700', color: TEXT },
  requestTime: { fontSize: 12, color: TEXT2, marginTop: 2 },
  newPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(243,156,18,0.13)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  newDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f39c12' },
  newPillText: { fontSize: 11, fontWeight: '700', color: '#f39c12' },
  goalRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 10, marginBottom: 14 },
  goalText: { fontSize: 13, color: TEXT2, flex: 1, lineHeight: 18 },
  requestBtns: { flexDirection: 'row', gap: 10 },
  declineBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: BORDER, alignItems: 'center' },
  declineBtnText: { fontSize: 14, fontWeight: '600', color: TEXT2 },
  acceptBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
  acceptGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  acceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  completeBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, backgroundColor: 'rgba(46,204,113,0.08)', borderWidth: 1, borderColor: 'rgba(46,204,113,0.2)' },
  completeBtnText: { fontSize: 14, fontWeight: '600', color: '#2ecc71' },

  historyList: { backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  historyBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  historyDot: { width: 8, height: 8, borderRadius: 4 },
  historyName: { fontSize: 14, fontWeight: '700', color: TEXT },
  historyDate: { fontSize: 12, color: TEXT3, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  settingsCard: { backgroundColor: CARD, borderRadius: 26, padding: 20, borderWidth: 1, borderColor: BORDER },
  settingsSection: { marginBottom: 4 },
  settingsLabel: { fontSize: 11, fontWeight: '700', color: TEXT3, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginVertical: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 13, color: TEXT, borderWidth: 1, borderColor: BORDER, fontSize: 15, marginBottom: 4 },
  inputTall: { minHeight: 110, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 12, marginTop: 4 },
  saveBtn: { marginTop: 22, borderRadius: 18, overflow: 'hidden' },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  sheet: { flex: 1, backgroundColor: '#111', paddingTop: 16 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT, paddingHorizontal: 20, marginBottom: 20 },
  avatarOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: CARD, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: BORDER },
  avatarOptionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarOptionTitle: { fontSize: 15, fontWeight: '700', color: TEXT, marginBottom: 2 },
  avatarOptionSub: { fontSize: 12, color: TEXT3 },

  camRoot: { flex: 1, backgroundColor: '#000' },
  camTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  camBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  camShutter: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 60, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 40 },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff' },

  storyThumb: { width: 120, height: 90, borderRadius: 14, overflow: 'hidden', justifyContent: 'flex-end' },
  storyThumbInner: { padding: 8, gap: 4 },
  storyThumbText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  postViewer: { flex: 1, backgroundColor: '#000' },

  storyViewer: { flex: 1, backgroundColor: '#000' },
  storyProgress: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 54 : 16 },
  storySegBg: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  storySegFill: { height: '100%', backgroundColor: '#fff' },
  storyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  storyAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  storyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  storyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  storyBodyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  storyBodyDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 16, textAlign: 'center', lineHeight: 24 },
});
