import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  Alert, Platform, ScrollView, Image, Dimensions, ActivityIndicator,
  StatusBar, SafeAreaView,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle,
  withTiming, interpolate, Extrapolation,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Coach } from '../../types';
import api from '../../services/api';
import { FadeIn, useHaptics } from '../../components/animations';
import { useAuth } from '../../context/AuthContext';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;
const FILTERS = ['All', 'Strength', 'Nutrition', 'Recovery', 'Online', 'In-Person'];
const IC = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
const SLOTS = ['Morning (6–9 AM)', 'Late Morning (9–12 PM)', 'Afternoon (12–3 PM)', 'Late Afternoon (3–6 PM)', 'Evening (6–9 PM)'];
const STORY_TYPES = ['tip', 'workout', 'nutrition', 'motivation', 'transformation'];

const ACCENT = '#e74c3c';
const BG = '#0a0a0a';
const CARD = '#1a1a1a';
const BORDER = '#333';
const TEXT = '#ffffff';
const TEXT2 = 'rgba(255,255,255,0.5)';
const TEXT3 = 'rgba(255,255,255,0.35)';

function initials(name: string) {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}
function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function ago(ts: string) {
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dy = Math.floor(h / 24);
  return dy < 7 ? `${dy}d` : `${Math.floor(dy / 7)}w`;
}

export default function CoachMarketplaceScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { trigger } = useHaptics();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'feed' | 'browse'>('feed');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [coach, setCoach] = useState<Coach | null>(null);
  const [liked, setLiked] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [hasApp, setHasApp] = useState(false);
  const [storyVisible, setStoryVisible] = useState(false);
  const [storyCoach, setStoryCoach] = useState<Coach | null>(null);
  const [storyIdx, setStoryIdx] = useState(0);
  const storyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [msgVisible, setMsgVisible] = useState(false);
  const [bookVisible, setBookVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgSending, setMsgSending] = useState(false);
  const [slot, setSlot] = useState('');
  const [goal, setGoal] = useState('');
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [applyBio, setApplyBio] = useState('');
  const [applySpec, setApplySpec] = useState('');
  const [applyExp, setApplyExp] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyPdf, setApplyPdf] = useState('');
  const [applyPdfUri, setApplyPdfUri] = useState('');
  const [cameraVisible, setCameraVisible] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<'post' | 'story' | null>(null);
  const [postCaption, setPostCaption] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDesc, setStoryDesc] = useState('');
  const [storyType, setStoryType] = useState('tip');
  const [storySubmitting, setStorySubmitting] = useState(false);
  const [optimisticPosts, setOptimisticPosts] = useState<Array<{ id: string; caption: string; imageUrl?: string; likes: number; timestamp: string; coach: Coach }>>([]);

  const scrollY = useSharedValue(0);
  const tabX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  const loadCoaches = useCallback(async () => {
    try { setLoading(true); setCoaches(await api.getCoaches()); } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadCoaches();
    if (!user?.isCoach) api.getMyApplication().then(() => setHasApp(true)).catch(() => {});
  }, [loadCoaches]);

  useEffect(() => {
    if (storyVisible && storyCoach?.stories) {
      if (storyTimer.current) clearTimeout(storyTimer.current);
      storyTimer.current = setTimeout(() => {
        if (storyIdx < (storyCoach.stories?.length || 0) - 1) setStoryIdx(p => p + 1);
        else setStoryVisible(false);
      }, 5000);
    }
    return () => { if (storyTimer.current) clearTimeout(storyTimer.current); };
  }, [storyVisible, storyIdx, storyCoach]);

  const switchTab = (t: 'feed' | 'browse') => {
    trigger('light'); setTab(t);
    tabX.value = withTiming(t === 'feed' ? 0 : SW / 2, { duration: 200 });
  };

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tabX.value }] }));
  const navBg = useAnimatedStyle(() => ({
    borderBottomColor: scrollY.value > 20 ? BORDER : 'transparent',
    backgroundColor: interpolate(scrollY.value, [0, 40], [0, 1], Extrapolation.CLAMP) > 0.5 ? 'rgba(8,8,16,0.97)' : BG,
  }));

  const toggleFollow = async (id: string) => {
    if (followLoading) return;
    setFollowLoading(id); trigger('medium');
    const c = coaches.find(x => x.id === id);
    try {
      if (c?.isFollowing) {
        await api.unfollowCoach(id);
        setCoaches(p => p.map(x => x.id === id ? { ...x, isFollowing: false, followerCount: Math.max(0, (x.followerCount || 0) - 1) } : x));
        if (coach?.id === id) setCoach(p => p ? { ...p, isFollowing: false, followerCount: Math.max(0, (p.followerCount || 0) - 1) } : null);
      } else {
        await api.followCoach(id);
        setCoaches(p => p.map(x => x.id === id ? { ...x, isFollowing: true, followerCount: (x.followerCount || 0) + 1 } : x));
        if (coach?.id === id) setCoach(p => p ? { ...p, isFollowing: true, followerCount: (p.followerCount || 0) + 1 } : null);
      }
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setFollowLoading(null); }
  };

  const toggleLike = (id: string) => {
    trigger('light');
    setLiked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const sendMessage = async () => {
    if (!msg.trim() || !coach?.userId) return;
    setMsgSending(true);
    try {
      const { conversation } = await api.getOrCreateConversation(coach.userId);
      await api.sendMessage(conversation.id, msg.trim());
      setMsgVisible(false); setMsg('');
      Alert.alert('Sent!', `Message sent to ${coach.name}.`, [
        { text: 'View Chat', onPress: () => { setCoach(null); navigation.navigate('Conversation', { conversationId: conversation.id, recipientName: coach.name }); } },
        { text: 'OK' },
      ]);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setMsgSending(false); }
  };

  const bookSession = async () => {
    if (!slot || !coach) return;
    setBookSubmitting(true);
    try {
      const t = new Date(); t.setDate(t.getDate() + 1);
      await api.createBooking({ coachId: coach.userId, date: t.toISOString().split('T')[0], timeSlot: slot, goal });
      setBookVisible(false);
      Alert.alert('Requested!', `Session with ${coach.name} requested.`);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setBookSubmitting(false); }
  };

  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
    if (!r.canceled && r.assets?.length > 0) { setApplyPdf(r.assets[0].name); setApplyPdfUri(r.assets[0].uri); }
  };

  const submitApply = async () => {
    if (!applyBio || !applySpec || !applyExp) { Alert.alert('Missing Fields', 'Please fill all required fields'); return; }
    setApplySubmitting(true);
    try {
      const fd = new FormData();
      fd.append('bio', applyBio); fd.append('specialty', applySpec); fd.append('experience', applyExp);
      if (applyPdfUri) fd.append('certification', { uri: applyPdfUri, name: applyPdf || 'cert.pdf', type: 'application/pdf' } as any);
      await api.submitCoachApplication(fd);
      setApplyVisible(false);
      Alert.alert('Submitted!', "We'll review your application shortly.", [
        { text: 'View Status', onPress: () => navigation.navigate('CoachApplicationStatus') },
        { text: 'OK' },
      ]);
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setApplySubmitting(false); }
  };

  const openCamera = async () => {
    trigger('medium');
    if (!cameraPermission?.granted) {
      const r = await requestCameraPermission();
      if (!r.granted) { Alert.alert('Camera access needed', 'Allow camera access in Settings.'); return; }
    }
    setCapturedImage(null); setCreateMode(null); setCameraVisible(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    trigger('medium');
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85, base64: false });
      setCapturedImage(photo.uri);
    } catch {}
  };

  const pickFromRoll = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.85 });
    if (!r.canceled && r.assets?.length > 0) setCapturedImage(r.assets[0].uri);
  };

  const myCoach = coaches.find(c => c.userId === user?.id);

  const submitPost = async () => {
    if (!postCaption.trim()) { Alert.alert('Add a caption'); return; }
    setPostSubmitting(true);
    const tempPost = {
      id: `temp-${Date.now()}`,
      caption: postCaption.trim(),
      imageUrl: capturedImage || undefined,
      likes: 0,
      timestamp: new Date().toISOString(),
      coach: myCoach!,
    };
    setOptimisticPosts(prev => [tempPost, ...prev]);
    setCameraVisible(false); setCreateMode(null); setPostCaption(''); setCapturedImage(null);
    setTab('feed');
    try {
      await api.createCoachPost({ caption: tempPost.caption, imageUrl: tempPost.imageUrl });
      await loadCoaches();
      setOptimisticPosts(prev => prev.filter(p => p.id !== tempPost.id));
    } catch (e: any) {
      setOptimisticPosts(prev => prev.filter(p => p.id !== tempPost.id));
      Alert.alert('Error', e?.message || 'Failed');
    }
    finally { setPostSubmitting(false); }
  };

  const submitStory = async () => {
    if (!storyTitle.trim() || !storyDesc.trim()) { Alert.alert('Fill all fields'); return; }
    setStorySubmitting(true);
    try {
      await api.createCoachStory({ type: storyType, title: storyTitle.trim(), description: storyDesc.trim() });
      setCameraVisible(false); setCreateMode(null); setStoryTitle(''); setStoryDesc(''); setStoryType('tip'); setCapturedImage(null);
      loadCoaches();
    } catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
    finally { setStorySubmitting(false); }
  };
  const others = coaches.filter(c => c.userId !== user?.id);
  const serverPosts = others.flatMap(c => (c.posts || []).map(p => ({ ...p, coach: c }))).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const posts = [...optimisticPosts, ...serverPosts.filter(p => !optimisticPosts.find(op => op.id === p.id))];
  const storyCoachs = others.filter(c => c.stories && c.stories.length > 0);
  const filtered = others.filter(c => {
    const q = query.toLowerCase();
    return (!q || c.name.toLowerCase().includes(q) || c.specialty.some(s => s.toLowerCase().includes(q)))
      && (filter === 'All' || c.specialty.some(s => s.toLowerCase() === filter.toLowerCase()));
  });
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <Animated.View style={[s.nav, navBg]}>
        <View style={s.navLeft}>
          {user?.isCoach && (
            <TouchableOpacity onPress={() => navigation.navigate('CoachDashboard')} activeOpacity={0.85} style={s.avatarRingBtn}>
              <LinearGradient colors={['#f09433', '#e6683c', '#dc2743', '#bc1888']} style={s.avatarRing}>
                <View style={s.avatarRingInner}>
                  {myCoach?.avatar ? (
                    <Image source={{ uri: myCoach.avatar }} style={s.avatarRingImg} />
                  ) : (
                    <LinearGradient colors={[ACCENT, '#c0392b']} style={s.avatarRingGrad}>
                      <Text style={s.avatarRingText}>{initials(user?.name || 'C')}</Text>
                    </LinearGradient>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
        <Text style={s.navTitle}>Coaches</Text>
        <View style={s.navRight} />
      </Animated.View>

      <View style={s.tabBar}>
        <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('feed')}>
          <Text style={[s.tabText, tab === 'feed' && s.tabActive]}>Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('browse')}>
          <Text style={[s.tabText, tab === 'browse' && s.tabActive]}>Browse</Text>
        </TouchableOpacity>
        <Animated.View style={[s.tabLine, indicatorStyle]} />
      </View>

      {tab === 'feed' ? (
        <Animated.FlatList
          data={posts}
          keyExtractor={p => p.id}
          onScroll={onScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.feedContent}
          ListHeaderComponent={
            storyCoachs.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storiesRow}>
                {storyCoachs.map((c, i) => (
                  <TouchableOpacity key={c.id} style={s.storyBubble} onPress={() => { setStoryCoach(c); setStoryIdx(0); setStoryVisible(true); }} activeOpacity={0.85}>
                    <LinearGradient colors={['#f09433', '#e6683c', '#dc2743', '#bc1888']} style={s.storyRing}>
                      <View style={s.storyInner}>
                        {c.avatar ? <Image source={{ uri: c.avatar }} style={{ width: '100%', height: '100%' }} /> : (
                          <View style={[s.storyFallback, { backgroundColor: IC[i % IC.length] }]}>
                            <Text style={s.storyInitials}>{initials(c.name)}</Text>
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                    <Text style={s.storyName} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : null
          }
          ListEmptyComponent={
            loading ? <View style={s.center}><ActivityIndicator size="large" color={ACCENT} /></View> : (
              <View style={s.emptyWrap}>
                <View style={s.emptyCircle}><Ionicons name="images-outline" size={40} color={TEXT3} /></View>
                <Text style={s.emptyTitle}>No posts yet</Text>
                <Text style={s.emptySub}>Coaches will share workouts and tips here.</Text>
              </View>
            )
          }
          renderItem={({ item, index }) => {
            const isLiked = liked.has(item.id);
            return (
              <View style={s.post}>
                <TouchableOpacity style={s.postHeader} activeOpacity={0.8} onPress={() => { trigger('light'); setCoach(item.coach); }}>
                  {item.coach.avatar ? (
                    <Image source={{ uri: item.coach.avatar }} style={s.postAvatar} />
                  ) : (
                    <View style={[s.postAvatarFallback, { backgroundColor: IC[index % IC.length] }]}>
                      <Text style={s.postAvatarText}>{initials(item.coach.name)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={s.postName}>{item.coach.name}</Text>
                      {item.coach.verified && <Ionicons name="checkmark-circle" size={14} color="#3498db" />}
                    </View>
                    <Text style={s.postMeta}>{item.coach.specialty?.[0]} · {ago(item.timestamp)}</Text>
                  </View>
                  <TouchableOpacity style={[s.followPill, item.coach.isFollowing && s.followingPill]} onPress={() => toggleFollow(item.coach.id)} disabled={followLoading === item.coach.id}>
                    {followLoading === item.coach.id
                      ? <ActivityIndicator size="small" color={item.coach.isFollowing ? TEXT2 : '#fff'} />
                      : <Text style={[s.followPillText, item.coach.isFollowing && s.followingPillText]}>{item.coach.isFollowing ? 'Following' : 'Follow'}</Text>
                    }
                  </TouchableOpacity>
                </TouchableOpacity>

                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={s.postImg} resizeMode="cover" />
                ) : (
                  <LinearGradient colors={['#1a1a1a', '#111']} style={s.postTextCard}>
                    <Text style={s.postTextContent} numberOfLines={8}>{item.caption}</Text>
                  </LinearGradient>
                )}

                <View style={s.postFooter}>
                  <TouchableOpacity style={s.postAction} onPress={() => toggleLike(item.id)}>
                    <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={24} color={isLiked ? ACCENT : TEXT} />
                    <Text style={[s.postActionCount, isLiked && { color: ACCENT }]}>{fmt(item.likes + (isLiked ? 1 : 0))}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.postAction} onPress={() => { setCoach(item.coach); setMsgVisible(true); }}>
                    <Ionicons name="chatbubble-outline" size={22} color={TEXT} />
                  </TouchableOpacity>
                </View>
                {item.imageUrl && (
                  <View style={s.postCaptionWrap}>
                    <Text style={s.postCaptionText} numberOfLines={2}>
                      <Text style={s.postCaptionName}>{item.coach.name} </Text>{item.caption}
                    </Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      ) : (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={s.browseContent}>
          <View style={s.searchRow}>
            <View style={s.searchBox}>
              <Ionicons name="search-outline" size={17} color={TEXT3} />
              <TextInput style={s.searchInput} placeholder="Search coaches..." placeholderTextColor={TEXT3} value={query} onChangeText={setQuery} />
              {query.length > 0 && <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle" size={17} color={TEXT3} /></TouchableOpacity>}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipOn]} onPress={() => { trigger('light'); setFilter(f); }}>
                <Text style={[s.chipText, filter === f && s.chipTextOn]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loading ? <View style={s.center}><ActivityIndicator size="large" color={ACCENT} /></View> : (
            <>
              {featured && !query && filter === 'All' && (
                <>
                  <Text style={s.browseLabel}>Featured</Text>
                  <TouchableOpacity style={s.featCard} onPress={() => { trigger('light'); setCoach(featured); }} activeOpacity={0.92}>
                    <View style={s.featImgWrap}>
                      {featured.avatar
                        ? <Image source={{ uri: featured.avatar }} style={s.featImg} resizeMode="cover" />
                        : <LinearGradient colors={[`${IC[0]}55`, `${IC[0]}11`]} style={s.featImg}><Text style={[s.featInitials, { color: IC[0] }]}>{initials(featured.name)}</Text></LinearGradient>
                      }
                      <LinearGradient colors={['transparent', 'rgba(8,8,16,0.92)']} style={s.featGrad} />
                      <View style={s.featStarBadge}>
                        <Ionicons name="star" size={10} color="#f1c40f" />
                        <Text style={s.featStarText}>Top Coach</Text>
                      </View>
                      {featured.verified && <View style={s.featVerified}><Ionicons name="checkmark-circle" size={18} color="#3498db" /></View>}
                      <View style={s.featOverlay}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.featName}>{featured.name}</Text>
                          <Text style={s.featSpec}>{featured.specialty.slice(0, 2).join(' · ')}</Text>
                          <View style={s.featRow}>
                            <View style={{ flexDirection: 'row', gap: 2 }}>
                              {[1,2,3,4,5].map(n => <Ionicons key={n} name="star" size={11} color={n <= Math.floor(featured.rating) ? '#f39c12' : '#333'} />)}
                            </View>
                            <View style={s.featPricePill}><Text style={s.featPrice}>{featured.price}</Text></View>
                          </View>
                        </View>
                        <TouchableOpacity style={[s.featFollowBtn, featured.isFollowing && s.featFollowingBtn]} onPress={() => toggleFollow(featured.id)} disabled={followLoading === featured.id}>
                          {followLoading === featured.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={[s.featFollowText, featured.isFollowing && { color: TEXT2 }]}>{featured.isFollowing ? 'Following' : 'Follow'}</Text>
                          }
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                  <Text style={[s.browseLabel, { marginTop: 28 }]}>All Coaches</Text>
                </>
              )}

              {(query || filter !== 'All') && (
                <Text style={s.browseLabel}>{filtered.length} coach{filtered.length !== 1 ? 'es' : ''}</Text>
              )}

              <View style={s.grid}>
                {(featured && !query && filter === 'All' ? rest : filtered).map((c, i) => {
                  const col = IC[i % IC.length];
                  return (
                    <TouchableOpacity key={c.id} style={s.card} onPress={() => { trigger('light'); setCoach(c); }} activeOpacity={0.88}>
                      <View style={s.cardImg}>
                        {c.avatar
                          ? <Image source={{ uri: c.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          : <LinearGradient colors={[`${col}50`, `${col}10`]} style={StyleSheet.absoluteFill}><View style={s.cardFallback}><Text style={[s.cardInitials, { color: col }]}>{initials(c.name)}</Text></View></LinearGradient>
                        }
                        <LinearGradient colors={['transparent', 'rgba(8,8,16,0.9)']} style={s.cardGrad} />
                        <TouchableOpacity style={s.cardHeart} onPress={() => toggleFollow(c.id)} disabled={followLoading === c.id}>
                          {followLoading === c.id
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Ionicons name={c.isFollowing ? 'heart' : 'heart-outline'} size={17} color={c.isFollowing ? ACCENT : '#fff'} />
                          }
                        </TouchableOpacity>
                        {c.verified && <View style={s.cardVerified}><Ionicons name="checkmark-circle" size={14} color="#3498db" /></View>}
                        <View style={s.cardBottom}>
                          <Text style={s.cardName} numberOfLines={1}>{c.name}</Text>
                          <Text style={s.cardSpec} numberOfLines={1}>{c.specialty.slice(0, 2).join(' · ')}</Text>
                          <View style={s.cardMeta}>
                            <View style={{ flexDirection: 'row', gap: 1 }}>
                              {[1,2,3,4,5].map(n => <Ionicons key={n} name="star" size={9} color={n <= Math.floor(c.rating) ? '#f39c12' : '#2a2a2a'} />)}
                            </View>
                            <Text style={s.cardPrice}>{c.price}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filtered.length === 0 && (
                <View style={s.emptyWrap}>
                  <View style={s.emptyCircle}><Ionicons name="search-outline" size={36} color={TEXT3} /></View>
                  <Text style={s.emptyTitle}>No coaches found</Text>
                  <Text style={s.emptySub}>Try a different filter or search term.</Text>
                </View>
              )}
            </>
          )}

          {!loading && !user?.isCoach && (
            <FadeIn delay={200}>
              <TouchableOpacity style={s.banner} onPress={() => hasApp ? navigation.navigate('CoachApplicationStatus') : setApplyVisible(true)} activeOpacity={0.9}>
                <LinearGradient colors={[ACCENT, '#b03030']} style={s.bannerGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={s.bannerIcon}><Ionicons name="barbell-outline" size={28} color="rgba(255,255,255,0.7)" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.bannerTitle}>Become a Coach</Text>
                    <Text style={s.bannerSub}>{hasApp ? 'Check your application status' : 'Apply and grow your client base'}</Text>
                  </View>
                  <View style={s.bannerArrow}><Ionicons name="arrow-forward" size={16} color="#fff" /></View>
                </LinearGradient>
              </TouchableOpacity>
            </FadeIn>
          )}
          <View style={{ height: 120 }} />
        </Animated.ScrollView>
      )}

      {user?.isCoach && (
        <TouchableOpacity style={s.fab} onPress={openCamera} activeOpacity={0.85}>
          <LinearGradient colors={['#ff5f5f', ACCENT]} style={s.fabGrad}>
            <Ionicons name="add" size={32} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {coach && (
        <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setCoach(null)}>
          <View style={s.profileRoot}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} bounces>
              <View style={s.profileHero}>
                <LinearGradient colors={['#1a1a1a', '#111', BG]} style={StyleSheet.absoluteFill} />
                {coach.avatar && <Image source={{ uri: coach.avatar }} style={s.profileHeroBg} blurRadius={40} />}
                <LinearGradient colors={['rgba(8,8,16,0.55)', BG]} style={StyleSheet.absoluteFill} />
                <SafeAreaView style={s.profileNavRow}>
                  <TouchableOpacity style={s.profileBackBtn} onPress={() => setCoach(null)}>
                    <BlurView intensity={40} tint="dark" style={s.profileBackBlur}>
                      <Ionicons name="chevron-back" size={22} color={TEXT} />
                    </BlurView>
                  </TouchableOpacity>
                </SafeAreaView>
                <View style={s.profileAvatarWrap}>
                  {coach.avatar ? (
                    <Image source={{ uri: coach.avatar }} style={s.profileAvatarImg} />
                  ) : (
                    <LinearGradient colors={[IC[0], `${IC[0]}88`]} style={s.profileAvatarFallback}>
                      <Text style={s.profileAvatarInitials}>{initials(coach.name)}</Text>
                    </LinearGradient>
                  )}
                  {coach.verified && (
                    <View style={s.profileVerified}><Ionicons name="checkmark" size={11} color="#fff" /></View>
                  )}
                </View>
              </View>

              <View style={s.profileBody}>
                <Text style={s.profileName}>{coach.name}</Text>
                <Text style={s.profileBio}>{coach.bio}</Text>

                <View style={s.profileStatRow}>
                  {[
                    { v: fmt(coach.followerCount || 0), l: 'Followers' },
                    { v: String(coach.posts?.length || 0), l: 'Posts' },
                    { v: String(coach.clientCount || 0), l: 'Clients' },
                    { v: String(coach.rating), l: 'Rating' },
                  ].map((st, i) => (
                    <React.Fragment key={st.l}>
                      {i > 0 && <View style={s.profileStatDiv} />}
                      <View style={s.profileStat}>
                        <Text style={s.profileStatV}>{st.v}</Text>
                        <Text style={s.profileStatL}>{st.l}</Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>

                <View style={s.profileTags}>
                  {coach.specialty.map((sp, i) => (
                    <View key={i} style={s.tag}><Text style={s.tagText}>{sp}</Text></View>
                  ))}
                </View>

                <View style={s.profileActions}>
                  <TouchableOpacity style={[s.followPrimary, coach.isFollowing && s.followingPrimary]} onPress={() => toggleFollow(coach.id)} disabled={followLoading === coach.id}>
                    {followLoading === coach.id ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        {coach.isFollowing && <Ionicons name="checkmark" size={15} color={TEXT2} />}
                        <Text style={[s.followPrimaryText, coach.isFollowing && { color: TEXT2 }]}>{coach.isFollowing ? 'Following' : 'Follow'}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.profileSecBtn} onPress={() => setMsgVisible(true)}>
                    <Ionicons name="chatbubble-outline" size={18} color={TEXT} />
                  </TouchableOpacity>
                  <TouchableOpacity style={s.profileSecBtn} onPress={() => setBookVisible(true)}>
                    <Ionicons name="calendar-outline" size={18} color={TEXT} />
                  </TouchableOpacity>
                </View>

                <View style={s.metaRow}>
                  {[
                    { icon: 'briefcase', color: '#3498db', val: `${coach.experience} yrs`, bg: 'rgba(52,152,219,0.1)' },
                    { icon: 'people', color: '#2ecc71', val: `${coach.clientCount} clients`, bg: 'rgba(46,204,113,0.1)' },
                    { icon: 'cash', color: '#f39c12', val: String(coach.price), bg: 'rgba(243,156,18,0.1)' },
                  ].map(m => (
                    <View key={m.val} style={[s.metaCard, { backgroundColor: m.bg }]}>
                      <Ionicons name={m.icon as any} size={16} color={m.color} />
                      <Text style={[s.metaVal, { color: m.color }]}>{m.val}</Text>
                    </View>
                  ))}
                </View>

                {(coach.posts || []).filter(p => p.imageUrl).length > 0 && (
                  <>
                    <Text style={s.profileGridLabel}>Posts</Text>
                    <View style={s.profileGrid}>
                      {(coach.posts || []).filter(p => p.imageUrl).map(p => (
                        <View key={p.id} style={s.profileGridItem}>
                          <Image source={{ uri: p.imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.35)']} style={StyleSheet.absoluteFill} />
                        </View>
                      ))}
                    </View>
                  </>
                )}
                <View style={{ height: 48 }} />
              </View>
            </ScrollView>
          </View>
        </Modal>
      )}

      <Modal visible={bookVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBookVisible(false)}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Book with {coach?.name}</Text>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            {SLOTS.map(sl => (
              <TouchableOpacity key={sl} style={[s.slotBtn, slot === sl && s.slotBtnOn]} onPress={() => setSlot(sl)}>
                <View style={[s.slotDot, slot === sl && s.slotDotOn]} />
                <Text style={[s.slotText, slot === sl && s.slotTextOn]}>{sl}</Text>
                {slot === sl && <Ionicons name="checkmark-circle" size={18} color={ACCENT} />}
              </TouchableOpacity>
            ))}
            <TextInput style={[s.sheetInput, { height: 100, marginTop: 16 }]} placeholder="Describe your goal..." placeholderTextColor={TEXT3} value={goal} onChangeText={setGoal} multiline />
            <TouchableOpacity style={[s.sheetBtn, (!slot || bookSubmitting) && { opacity: 0.45 }]} onPress={bookSession} disabled={!slot || bookSubmitting}>
              <LinearGradient colors={[ACCENT, '#b03030']} style={s.sheetBtnGrad}>
                {bookSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sheetBtnText}>Request Session</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={msgVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMsgVisible(false)}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Message {coach?.name}</Text>
          <View style={{ padding: 20 }}>
            <TextInput style={[s.sheetInput, { height: 140 }]} placeholder="Write a message..." placeholderTextColor={TEXT3} value={msg} onChangeText={setMsg} multiline />
            <TouchableOpacity style={[s.sheetBtn, (!msg.trim() || msgSending) && { opacity: 0.45 }]} onPress={sendMessage} disabled={!msg.trim() || msgSending}>
              <LinearGradient colors={[ACCENT, '#b03030']} style={s.sheetBtnGrad}>
                {msgSending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sheetBtnText}>Send Message</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={applyVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setApplyVisible(false)}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Apply to Coach</Text>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={s.sheetLabel}>Specialty *</Text>
            <TextInput style={s.sheetInput} placeholder="e.g. Strength, Nutrition..." placeholderTextColor={TEXT3} value={applySpec} onChangeText={setApplySpec} />
            <Text style={s.sheetLabel}>Years of Experience *</Text>
            <TextInput style={s.sheetInput} placeholder="e.g. 5" placeholderTextColor={TEXT3} value={applyExp} onChangeText={setApplyExp} keyboardType="numeric" />
            <Text style={s.sheetLabel}>Bio *</Text>
            <TextInput style={[s.sheetInput, { height: 100 }]} placeholder="Tell clients about yourself..." placeholderTextColor={TEXT3} value={applyBio} onChangeText={setApplyBio} multiline />
            <TouchableOpacity style={s.pdfBtn} onPress={pickPdf}>
              <Ionicons name="document-attach-outline" size={20} color={applyPdf ? ACCENT : TEXT3} />
              <Text style={[s.pdfText, applyPdf && { color: ACCENT }]}>{applyPdf || 'Upload Certification (PDF)'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sheetBtn, applySubmitting && { opacity: 0.45 }]} onPress={submitApply} disabled={applySubmitting}>
              <LinearGradient colors={[ACCENT, '#b03030']} style={s.sheetBtnGrad}>
                {applySubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sheetBtnText}>Submit Application</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={cameraVisible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setCameraVisible(false)}>
        <View style={s.camRoot}>
          <StatusBar barStyle="light-content" />

          {capturedImage ? (
            <Image source={{ uri: capturedImage }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={cameraFacing} />
          )}

          <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent']} style={s.camTopGrad} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={s.camBottomGrad} />

          <SafeAreaView style={s.camTopRow}>
            <TouchableOpacity style={s.camCircleBtn} onPress={() => { setCameraVisible(false); setCapturedImage(null); setCreateMode(null); }}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            {!capturedImage && (
              <TouchableOpacity style={s.camCircleBtn} onPress={() => setCameraFacing(f => f === 'back' ? 'front' : 'back')}>
                <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
              </TouchableOpacity>
            )}
          </SafeAreaView>

          {!capturedImage && !createMode && (
            <>
              <View style={s.camControls}>
                <TouchableOpacity style={s.camRollBtn} onPress={pickFromRoll}>
                  <Ionicons name="images-outline" size={24} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={s.shutterOuter} onPress={takePhoto}>
                  <View style={s.shutterMiddle}>
                    <View style={s.shutterCore} />
                  </View>
                </TouchableOpacity>
                <View style={{ width: 56 }} />
              </View>

              <View style={s.camModeRow}>
                <TouchableOpacity style={s.camModeChip} onPress={() => pickFromRoll().then(() => setCreateMode('post'))}>
                  <Ionicons name="grid-outline" size={16} color="#fff" />
                  <Text style={s.camModeText}>Post</Text>
                </TouchableOpacity>
                <View style={s.camModeDivider} />
                <TouchableOpacity style={s.camModeChip} onPress={() => pickFromRoll().then(() => setCreateMode('story'))}>
                  <Ionicons name="albums-outline" size={16} color="#fff" />
                  <Text style={s.camModeText}>Story</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {capturedImage && !createMode && (
            <View style={s.capturedActions}>
              <TouchableOpacity style={s.capturedRetake} onPress={() => setCapturedImage(null)}>
                <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.8)" />
                <Text style={s.capturedRetakeText}>Retake</Text>
              </TouchableOpacity>
              <View style={s.capturedChoose}>
                <TouchableOpacity style={s.capturedBtn} onPress={() => setCreateMode('post')}>
                  <LinearGradient colors={[ACCENT, '#c0392b']} style={s.capturedBtnGrad}>
                    <Ionicons name="grid-outline" size={18} color="#fff" />
                    <Text style={s.capturedBtnText}>Post</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={s.capturedBtn} onPress={() => setCreateMode('story')}>
                  <LinearGradient colors={['#9b59b6', '#6c3483']} style={s.capturedBtnGrad}>
                    <Ionicons name="albums-outline" size={18} color="#fff" />
                    <Text style={s.capturedBtnText}>Story</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {createMode === 'post' && (
            <BlurView intensity={85} tint="dark" style={s.createSheet}>
              <View style={s.createHandle} />
              <View style={s.createHeader}>
                <TouchableOpacity onPress={() => setCreateMode(null)}><Text style={s.createCancel}>Cancel</Text></TouchableOpacity>
                <Text style={s.createTitle}>New Post</Text>
                <TouchableOpacity onPress={submitPost} disabled={postSubmitting || !postCaption.trim()}>
                  <Text style={[s.createShare, (!postCaption.trim() || postSubmitting) && { opacity: 0.35 }]}>{postSubmitting ? 'Sharing...' : 'Share'}</Text>
                </TouchableOpacity>
              </View>
              {capturedImage && (
                <Image source={{ uri: capturedImage }} style={s.createPreview} resizeMode="cover" />
              )}
              <TextInput style={s.createCaption} placeholder="Write a caption..." placeholderTextColor="rgba(255,255,255,0.35)" value={postCaption} onChangeText={setPostCaption} multiline autoFocus />
            </BlurView>
          )}

          {createMode === 'story' && (
            <BlurView intensity={85} tint="dark" style={s.createSheet}>
              <View style={s.createHandle} />
              <View style={s.createHeader}>
                <TouchableOpacity onPress={() => setCreateMode(null)}><Text style={s.createCancel}>Cancel</Text></TouchableOpacity>
                <Text style={s.createTitle}>New Story</Text>
                <TouchableOpacity onPress={submitStory} disabled={storySubmitting || !storyTitle.trim() || !storyDesc.trim()}>
                  <Text style={[s.createShare, (!storyTitle.trim() || !storyDesc.trim() || storySubmitting) && { opacity: 0.35 }]}>{storySubmitting ? 'Sharing...' : 'Share'}</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {STORY_TYPES.map(t => (
                    <TouchableOpacity key={t} style={[s.storyChip, storyType === t && s.storyChipOn]} onPress={() => setStoryType(t)}>
                      <Text style={[s.storyChipText, storyType === t && s.storyChipTextOn]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput style={s.storyInput} placeholder="Title..." placeholderTextColor="rgba(255,255,255,0.35)" value={storyTitle} onChangeText={setStoryTitle} autoFocus />
                <TextInput style={[s.storyInput, { height: 100, textAlignVertical: 'top' }]} placeholder="Describe your story..." placeholderTextColor="rgba(255,255,255,0.35)" value={storyDesc} onChangeText={setStoryDesc} multiline />
              </ScrollView>
            </BlurView>
          )}
        </View>
      </Modal>

      <Modal visible={storyVisible} animationType="fade" onRequestClose={() => setStoryVisible(false)}>
        {storyCoach && storyCoach.stories && (
          <View style={s.storyViewer}>
            <View style={s.storyProgress}>
              {storyCoach.stories.map((_, i) => (
                <View key={i} style={s.storySegBg}>
                  <View style={[s.storySegFill, { width: i < storyIdx ? '100%' : i === storyIdx ? '50%' : '0%' }]} />
                </View>
              ))}
            </View>
            <View style={s.storyViewerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[s.storyViewerAvatar, { backgroundColor: IC[0] }]}>
                  <Text style={s.storyViewerAvatarText}>{initials(storyCoach.name)}</Text>
                </View>
                <View>
                  <Text style={s.storyViewerName}>{storyCoach.name}</Text>
                  <Text style={s.storyViewerTime}>{ago(storyCoach.stories[storyIdx]?.timestamp || '')}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setStoryVisible(false)}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.storyBody} activeOpacity={1} onPress={() => {
              if (storyIdx < (storyCoach.stories?.length || 0) - 1) setStoryIdx(p => p + 1);
              else setStoryVisible(false);
            }}>
              <View style={s.storyIconCircle}><Ionicons name="barbell" size={38} color="#fff" /></View>
              <Text style={s.storyBodyTitle}>{storyCoach.stories[storyIdx]?.title}</Text>
              <Text style={s.storyBodyDesc}>{storyCoach.stories[storyIdx]?.description}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  nav: { paddingTop: Platform.OS === 'ios' ? 54 : 16, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  navLeft: { width: 52, alignItems: 'flex-start' },
  navRight: { width: 52 },
  navTitle: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.4 },
  avatarRingBtn: { width: 42, height: 42 },
  avatarRing: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  avatarRingInner: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: BG, overflow: 'hidden' },
  avatarRingImg: { width: '100%', height: '100%' },
  avatarRingGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarRingText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER, position: 'relative' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', color: TEXT3, letterSpacing: 0.15 },
  tabActive: { color: TEXT },
  tabLine: { position: 'absolute', bottom: 0, width: SW / 2, height: 2, backgroundColor: ACCENT, borderRadius: 1 },

  feedContent: { paddingBottom: 120 },
  storiesRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 18 },
  storyBubble: { alignItems: 'center', width: 70 },
  storyRing: { width: 66, height: 66, borderRadius: 33, justifyContent: 'center', alignItems: 'center' },
  storyInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: BG, overflow: 'hidden' },
  storyFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  storyInitials: { color: '#fff', fontWeight: '800', fontSize: 20 },
  storyName: { fontSize: 11, color: TEXT2, marginTop: 6, textAlign: 'center', fontWeight: '500' },

  post: { marginBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  postHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: 20 },
  postAvatarFallback: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  postAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  postName: { fontSize: 14, fontWeight: '700', color: TEXT },
  postMeta: { fontSize: 12, color: TEXT3, marginTop: 2 },
  followPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: ACCENT },
  followingPill: { backgroundColor: 'transparent', borderWidth: 1, borderColor: BORDER },
  followPillText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  followingPillText: { color: TEXT2 },
  postImg: { width: SW, height: SW * 0.85 },
  postTextCard: { margin: 14, borderRadius: 18, padding: 22, minHeight: 130, justifyContent: 'center' },
  postTextContent: { fontSize: 18, color: TEXT, lineHeight: 27, fontWeight: '500' },
  postFooter: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4, gap: 20 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postActionCount: { fontSize: 13, color: TEXT2, fontWeight: '600' },
  postCaptionWrap: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  postCaptionText: { fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 20 },
  postCaptionName: { fontWeight: '700', color: TEXT },

  browseContent: { paddingBottom: 40 },
  searchRow: { paddingHorizontal: 16, paddingTop: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: TEXT },
  filtersRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 13, fontWeight: '600', color: TEXT2 },
  chipTextOn: { color: '#fff' },
  browseLabel: { fontSize: 15, fontWeight: '800', color: TEXT, paddingHorizontal: 16, marginBottom: 12, letterSpacing: -0.2 },

  featCard: { marginHorizontal: 16, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  featImgWrap: { height: 240 },
  featImg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  featInitials: { fontSize: 72, fontWeight: '900' },
  featGrad: { ...StyleSheet.absoluteFillObject },
  featStarBadge: { position: 'absolute', top: 14, left: 14, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(241,196,15,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(241,196,15,0.3)' },
  featStarText: { fontSize: 11, fontWeight: '700', color: '#f1c40f' },
  featVerified: { position: 'absolute', top: 14, right: 14 },
  featOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  featName: { fontSize: 20, fontWeight: '900', color: TEXT, marginBottom: 2 },
  featSpec: { fontSize: 13, color: 'rgba(231,76,60,0.9)', fontWeight: '600', marginBottom: 8 },
  featRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featPricePill: { backgroundColor: 'rgba(46,204,113,0.15)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  featPrice: { fontSize: 12, fontWeight: '700', color: '#2ecc71' },
  featFollowBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: ACCENT },
  featFollowingBtn: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  featFollowText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12 },
  card: { width: CARD_W, borderRadius: 22, overflow: 'hidden' },
  cardImg: { width: '100%', height: CARD_W + 60, backgroundColor: '#111' },
  cardGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  cardFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardInitials: { fontSize: 40, fontWeight: '900' },
  cardHeart: { position: 'absolute', top: 12, right: 12, width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  cardVerified: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, padding: 2 },
  cardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  cardName: { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 2 },
  cardSpec: { fontSize: 11, color: 'rgba(231,76,60,0.85)', fontWeight: '600', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 11, fontWeight: '700', color: '#2ecc71' },

  banner: { marginHorizontal: 16, marginTop: 28, borderRadius: 22, overflow: 'hidden' },
  bannerGrad: { borderRadius: 22 },
  bannerIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  bannerTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  bannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  bannerArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center', alignItems: 'center' },

  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 76, alignSelf: 'center', width: 62, height: 62, borderRadius: 31, overflow: 'hidden', shadowColor: ACCENT, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 14 },
  fabGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  profileRoot: { flex: 1, backgroundColor: BG },
  profileHero: { height: 310, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 0, overflow: 'hidden' },
  profileHeroBg: { ...StyleSheet.absoluteFillObject, opacity: 0.35 },
  profileNavRow: { position: 'absolute', top: 0, left: 0, right: 0 },
  profileBackBtn: { margin: 12 },
  profileBackBlur: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  profileAvatarWrap: { width: 108, height: 108, borderRadius: 54, overflow: 'hidden', borderWidth: 3.5, borderColor: BG, marginBottom: -54 },
  profileAvatarImg: { width: '100%', height: '100%' },
  profileAvatarFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileAvatarInitials: { fontSize: 40, fontWeight: '900', color: '#fff' },
  profileVerified: { position: 'absolute', bottom: 4, right: 4, width: 26, height: 26, borderRadius: 13, backgroundColor: '#3498db', justifyContent: 'center', alignItems: 'center', borderWidth: 2.5, borderColor: BG },
  profileBody: { paddingTop: 62, paddingHorizontal: 20 },
  profileName: { fontSize: 24, fontWeight: '900', color: TEXT, letterSpacing: -0.4, marginBottom: 6 },
  profileBio: { fontSize: 14, color: TEXT2, lineHeight: 21, marginBottom: 20 },
  profileStatRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 20, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: BORDER },
  profileStatDiv: { width: 1, height: 28, backgroundColor: BORDER },
  profileStat: { flex: 1, alignItems: 'center' },
  profileStatV: { fontSize: 19, fontWeight: '800', color: TEXT },
  profileStatL: { fontSize: 11, color: TEXT3, marginTop: 2, fontWeight: '600' },
  profileTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 },
  tag: { backgroundColor: 'rgba(231,76,60,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: 'rgba(231,76,60,0.2)' },
  tagText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  profileActions: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  followPrimary: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: ACCENT, borderRadius: 16, paddingVertical: 14 },
  followingPrimary: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  followPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  profileSecBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderRadius: 16, paddingVertical: 14, borderWidth: 1, borderColor: BORDER },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  metaCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 14, padding: 12 },
  metaVal: { fontSize: 13, fontWeight: '700' },
  profileGridLabel: { fontSize: 15, fontWeight: '800', color: TEXT, marginBottom: 10 },
  profileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  profileGridItem: { width: (SW - 46) / 3, height: (SW - 46) / 3, borderRadius: 8, overflow: 'hidden' },

  sheet: { flex: 1, backgroundColor: '#111', paddingTop: 16 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 18 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: TEXT, paddingHorizontal: 20, marginBottom: 20 },
  sheetLabel: { fontSize: 12, fontWeight: '700', color: TEXT3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  sheetInput: { backgroundColor: CARD, borderRadius: 14, padding: 14, color: TEXT, borderWidth: 1, borderColor: BORDER, marginBottom: 16, fontSize: 15 },
  sheetBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  sheetBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  sheetBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', marginBottom: 20 },
  pdfText: { fontSize: 14, color: TEXT3, fontWeight: '500' },
  slotBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: CARD, marginBottom: 8, borderWidth: 1, borderColor: BORDER },
  slotBtnOn: { borderColor: ACCENT, backgroundColor: 'rgba(231,76,60,0.07)' },
  slotDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: BORDER },
  slotDotOn: { backgroundColor: ACCENT },
  slotText: { flex: 1, fontSize: 14, color: TEXT2 },
  slotTextOn: { color: TEXT, fontWeight: '600' },

  camRoot: { flex: 1, backgroundColor: '#000' },
  camTopGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 160, zIndex: 1 },
  camBottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 300, zIndex: 1 },
  camTopRow: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8, zIndex: 10 },
  camCircleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
  camControls: { position: 'absolute', bottom: Platform.OS === 'ios' ? 200 : 170, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'center', paddingHorizontal: 40, zIndex: 10 },
  camRollBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  shutterOuter: { width: 86, height: 86, borderRadius: 43, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)', justifyContent: 'center', alignItems: 'center' },
  shutterMiddle: { width: 74, height: 74, borderRadius: 37, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
  shutterCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
  camModeRow: { position: 'absolute', bottom: Platform.OS === 'ios' ? 130 : 110, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 30, paddingVertical: 6, paddingHorizontal: 6, gap: 2, zIndex: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  camModeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
  camModeText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  camModeDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  capturedActions: { position: 'absolute', bottom: Platform.OS === 'ios' ? 110 : 80, left: 0, right: 0, paddingHorizontal: 24, gap: 14, zIndex: 10 },
  capturedRetake: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  capturedRetakeText: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
  capturedChoose: { flexDirection: 'row', gap: 12 },
  capturedBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  capturedBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15 },
  capturedBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  createSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 32, borderTopRightRadius: 32, minHeight: 300, overflow: 'hidden', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 20 },
  createHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  createCancel: { fontSize: 16, color: TEXT2, fontWeight: '500' },
  createTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  createShare: { fontSize: 16, fontWeight: '700', color: ACCENT },
  createPreview: { width: 80, height: 80, borderRadius: 14, margin: 16, marginBottom: 0 },
  createCaption: { padding: 20, fontSize: 16, color: '#fff', minHeight: 100, textAlignVertical: 'top' },
  storyChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  storyChipOn: { backgroundColor: 'rgba(155,89,182,0.22)', borderColor: '#9b59b6' },
  storyChipText: { fontSize: 13, fontWeight: '600', color: TEXT2 },
  storyChipTextOn: { color: '#9b59b6' },
  storyInput: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', fontSize: 15 },

  storyViewer: { flex: 1, backgroundColor: '#000' },
  storyProgress: { flexDirection: 'row', gap: 4, paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 54 : 16 },
  storySegBg: { flex: 1, height: 2.5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, overflow: 'hidden' },
  storySegFill: { height: '100%', backgroundColor: '#fff' },
  storyViewerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  storyViewerAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  storyViewerAvatarText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  storyViewerName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  storyViewerTime: { color: 'rgba(255,255,255,0.45)', fontSize: 11 },
  storyBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  storyIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  storyBodyTitle: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  storyBodyDesc: { color: 'rgba(255,255,255,0.65)', fontSize: 16, textAlign: 'center', lineHeight: 24 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: CARD, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: TEXT3, textAlign: 'center', lineHeight: 20 },
});
