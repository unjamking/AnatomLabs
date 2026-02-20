import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TextInput, TouchableOpacity,
  Alert, Platform, ScrollView, Image, Dimensions, ActivityIndicator,
  StatusBar, FlatList, KeyboardAvoidingView, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, withTiming, withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Coach, CoachPost } from '../../types';
import api from '../../services/api';
import { FadeIn, useHaptics, SlideIn } from '../../components/animations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPRING_CONFIG, ANIMATION_DURATION } from '../../components/animations/config';

const { width: SW, height: SH } = Dimensions.get('window');
const CARD_W = (SW - 48) / 2;
const FILTERS = ['All', 'Strength', 'Nutrition', 'Recovery', 'Online', 'In-Person'];
const IC = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
const SLOTS = ['Morning (6–9 AM)', 'Late Morning (9–12 PM)', 'Afternoon (12–3 PM)', 'Late Afternoon (3–6 PM)', 'Evening (6–9 PM)'];
const STORY_TYPES = ['tip', 'workout', 'nutrition', 'motivation', 'transformation'];

const ACCENT = COLORS.primary;
const BG = COLORS.background;
const CARD = COLORS.cardBackground;
const BORDER = COLORS.border;
const TEXT = COLORS.text;
const TEXT2 = COLORS.textSecondary;
const TEXT3 = COLORS.textTertiary;

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
  
  // Interaction states
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);
  const [hasApp, setHasApp] = useState(false);
  
  // Modal states
  const [selectedPost, setSelectedPost] = useState<{ post: CoachPost; coach: Coach } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [coach, setCoach] = useState<Coach | null>(null); // For Booking/Message modals
  
  // Story state
  const [storyVisible, setStoryVisible] = useState(false);
  const [storyCoach, setStoryCoach] = useState<Coach | null>(null);
  const [storyIdx, setStoryIdx] = useState(0);
  const storyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Other modals
  const [bookVisible, setBookVisible] = useState(false);
  const [applyVisible, setApplyVisible] = useState(false);
  const [slot, setSlot] = useState('');
  const [goal, setGoal] = useState('');
  const [bookDate, setBookDate] = useState<Date>(new Date());
  const [bookSubmitting, setBookSubmitting] = useState(false);
  const [applyBio, setApplyBio] = useState('');
  const [applySpec, setApplySpec] = useState('');
  const [applyExp, setApplyExp] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyPdf, setApplyPdf] = useState('');
  const [applyPdfUri, setApplyPdfUri] = useState('');
  
  // Camera state
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
  
  const [optimisticPosts, setOptimisticPosts] = useState<Array<CoachPost & { coach: Coach }>>([]);

  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 68 + 44;

  const scrollY = useSharedValue(0);
  const tabX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler(e => { scrollY.value = e.contentOffset.y; });

  const loadCoaches = useCallback(async () => {
    try { 
      setLoading(true); 
      const data = await api.getCoaches();
      setCoaches(data);
      
      const liked = new Set<string>();
      data.forEach(c => {
        c.posts?.forEach(p => {
          if (p.isLiked) liked.add(p.id);
        });
      });
      setLikedPosts(liked);
    } catch (err) {
      console.error('Error loading coaches:', err);
    } finally { 
      setLoading(false); 
    }
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
    tabX.value = withTiming(t === 'feed' ? 0 : SW / 2, { duration: ANIMATION_DURATION.normal });
  };

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tabX.value }] }));

  const handleFollow = async (c: Coach) => {
    if (followLoading) return;
    trigger('impactLight');
    setFollowLoading(c.id);
    try {
      if (c.isFollowing) {
        await api.unfollowCoach(c.id);
        setCoaches(prev => prev.map(p => p.id === c.id ? { ...p, isFollowing: false, followerCount: (p.followerCount || 1) - 1 } : p));
      } else {
        await api.followCoach(c.id);
        setCoaches(prev => prev.map(p => p.id === c.id ? { ...p, isFollowing: true, followerCount: (p.followerCount || 0) + 1 } : p));
      }
    } catch {
      Alert.alert('Error', 'Failed to update follow status');
    } finally {
      setFollowLoading(null);
    }
  };

  const handleLike = async (postId: string) => {
    trigger('impactLight');
    const isLiked = likedPosts.has(postId);
    
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (isLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });

    setCoaches(prev => prev.map(c => ({
      ...c,
      posts: c.posts?.map(p => p.id === postId ? { ...p, likes: isLiked ? p.likes - 1 : p.likes + 1, isLiked: !isLiked } : p)
    })));

    if (selectedPost?.post.id === postId) {
      setSelectedPost(prev => prev ? {
        ...prev,
        post: { ...prev.post, likes: isLiked ? prev.post.likes - 1 : prev.post.likes + 1, isLiked: !isLiked }
      } : null);
    }

    try {
      await api.likePost(postId);
    } catch {
      loadCoaches();
    }
  };

  const handleComment = async () => {
    if (!selectedPost || !commentText.trim() || isCommenting) return;
    setIsCommenting(true);
    trigger('impactLight');
    try {
      const newComment = await api.commentOnPost(selectedPost.post.id, commentText);
      setSelectedPost(prev => prev ? {
        ...prev,
        post: {
          ...prev.post,
          comments: prev.post.comments + 1,
          recentComments: [newComment, ...(prev.post.recentComments || [])]
        }
      } : null);
      setCommentText('');
      setCoaches(prev => prev.map(c => ({
        ...c,
        posts: c.posts?.map(p => p.id === selectedPost.post.id ? { ...p, comments: p.comments + 1 } : p)
      })));
    } catch {
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async (post: CoachPost) => {
    trigger('impactLight');
    try {
      const content = `Check out this post from ${selectedPost?.coach.name || 'a coach'} on AnatomLabs!\n\n${post.caption}`;
      await Share.share({ message: content });
      await api.sharePost(post.id);
    } catch {}
  };

  const bookSession = async () => {
    if (!coach || !slot) return;
    setBookSubmitting(true);
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


  const pickPdf = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!res.canceled) { setApplyPdf(res.assets[0].name); setApplyPdfUri(res.assets[0].uri); }
    } catch {}
  };

  const submitApply = async () => {
    if (!applySpec || !applyExp || !applyBio) return Alert.alert('Required', 'Please fill all mandatory fields');
    if (!applyPdfUri) return Alert.alert('Required', 'Please upload your certification PDF');
    setApplySubmitting(true);
    try {
      const fd = new FormData();
      fd.append('specialty', applySpec);
      fd.append('experience', applyExp);
      fd.append('bio', applyBio);
      if (applyPdfUri) fd.append('certification', { uri: applyPdfUri, name: applyPdf, type: 'application/pdf' } as any);
      await api.submitCoachApplication(fd);
      Alert.alert('Applied', 'Your application is under review');
      setApplyVisible(false);
      setHasApp(true);
    } catch {
      Alert.alert('Error', 'Failed to submit application');
    } finally {
      setApplySubmitting(false);
    }
  };

  const takePhoto = async () => {
    if (!cameraPermission?.granted) { const r = await requestCameraPermission(); if (!r.granted) return; }
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: false });
      setCapturedImage(photo.uri);
    }
  };

  const pickFromRoll = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!res.canceled) setCapturedImage(res.assets[0].uri);
  };

  const myCoach = coaches.find(c => c.userId === user?.id);

  const submitPost = async () => {
    if (!postCaption.trim() || postSubmitting) return;
    setPostSubmitting(true);
    try {
      let uploadedImageUrl: string | undefined;
      if (capturedImage) {
        const { imageUrl } = await api.uploadPostImage(capturedImage);
        uploadedImageUrl = imageUrl;
      }
      const result = await api.createCoachPost({ caption: postCaption, imageUrl: uploadedImageUrl });
      if (myCoach) {
        const newPost: CoachPost & { coach: Coach } = {
          id: result.post?.id || `temp-${Date.now()}`,
          caption: postCaption,
          imageUrl: uploadedImageUrl || '',
          likes: 0,
          comments: 0,
          shares: 0,
          isLiked: false,
          timestamp: new Date().toISOString(),
          type: 'photo',
          recentComments: [],
          coach: myCoach,
        };
        setOptimisticPosts(prev => [newPost, ...prev]);
      }
      setCameraVisible(false); setCapturedImage(null); setCreateMode(null); setPostCaption('');
    } catch {
      Alert.alert('Error', 'Failed to share post');
    } finally {
      setPostSubmitting(false);
    }
  };

  const submitStory = async () => {
    if (!storyTitle.trim() || !storyDesc.trim() || storySubmitting) return;
    setStorySubmitting(true);
    try {
      await api.createCoachStory({ type: storyType, title: storyTitle, description: storyDesc });
      Alert.alert('Success', 'Story shared!');
      setCameraVisible(false); setCreateMode(null); setStoryTitle(''); setStoryDesc('');
      loadCoaches();
    } catch {
      Alert.alert('Error', 'Failed to share story');
    } finally {
      setStorySubmitting(false);
    }
  };

  const otherCoaches = coaches.filter(c => c.userId !== user?.id);
  const serverPosts = coaches.flatMap(c => (c.posts || []).map(p => ({ ...p, coach: c })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const seenIds = new Set(optimisticPosts.map(p => p.id));
  const posts = [...optimisticPosts, ...serverPosts.filter(p => !seenIds.has(p.id))];

  const renderPostItem = ({ item, index }: { item: CoachPost & { coach: Coach }; index: number }) => {
    const isLiked = likedPosts.has(item.id);
    return (
      <View style={s.post}>
        <View style={s.postHeader}>
          <TouchableOpacity 
            style={s.postAvatarFallback} 
            onPress={() => navigation.navigate('CoachProfile', { coachId: item.coach.id })}
          >
            {item.coach.avatar ? (
              <Image source={{ uri: item.coach.avatar }} style={s.postAvatar} />
            ) : (
              <View style={[s.postAvatarFallback, { backgroundColor: IC[item.coach.name.length % IC.length] }]}>
                <Text style={s.postAvatarText}>{initials(item.coach.name)}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.postName}>{item.coach.name}</Text>
            <Text style={s.postMeta}>{item.coach.specialty[0]} • {ago(item.timestamp)}</Text>
          </View>
          <TouchableOpacity 
            style={[s.followPill, item.coach.isFollowing && s.followingPill]} 
            onPress={() => handleFollow(item.coach)}
            disabled={followLoading === item.coach.id}
          >
            {followLoading === item.coach.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[s.followPillText, item.coach.isFollowing && s.followingPillText]}>
                {item.coach.isFollowing ? 'Following' : 'Follow'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity activeOpacity={0.95} onPress={() => setSelectedPost({ post: item, coach: item.coach })}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={s.postImg} resizeMode="cover" />
          ) : (
            <LinearGradient colors={[CARD, '#111']} style={s.postTextCard}>
              <Text style={s.postTextContent}>{item.caption}</Text>
            </LinearGradient>
          )}
        </TouchableOpacity>

        <View style={s.postFooter}>
          <TouchableOpacity style={s.postAction} onPress={() => handleLike(item.id)}>
            <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? ACCENT : TEXT} />
            <Text style={[s.postActionCount, isLiked && { color: ACCENT }]}>{fmt(item.likes)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.postAction} onPress={() => setSelectedPost({ post: item, coach: item.coach })}>
            <Ionicons name="chatbubble-outline" size={22} color={TEXT} />
            <Text style={s.postActionCount}>{fmt(item.comments)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.postAction} onPress={() => handleShare(item)}>
            <Ionicons name="paper-plane-outline" size={22} color={TEXT} />
          </TouchableOpacity>
        </View>

        {item.imageUrl && (
          <View style={s.postCaptionWrap}>
            <Text style={s.postCaptionText} numberOfLines={2}>
              <Text style={s.postCaptionName}>{item.coach.name} </Text>
              {item.caption}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      <View style={[s.floatingHeader, { paddingTop: insets.top }]}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={s.navRow}>
          <SlideIn direction="left" delay={0}>
            <TouchableOpacity
              onPress={() => navigation.navigate(user?.isCoach ? 'CoachDashboard' : 'HealthProfile')}
              activeOpacity={0.75}
            >
              <View style={[s.avatarRing, { borderColor: user?.isCoach ? ACCENT : '#3498db' }]}>
                <View style={s.avatarRingInner}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={s.avatarRingImg} />
                  ) : (
                    <LinearGradient colors={[user?.isCoach ? ACCENT : '#3498db', '#111']} style={s.avatarRingGrad}>
                      <Text style={s.avatarRingText}>{initials(user?.name || '')}</Text>
                    </LinearGradient>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </SlideIn>
          <SlideIn direction="bottom" delay={50}>
            <Text style={s.navTitle}>Coaches</Text>
          </SlideIn>
          <SlideIn direction="right" delay={0}>
            <TouchableOpacity onPress={() => navigation.navigate('Notifications')} style={s.navBell}>
              <Ionicons name="notifications-outline" size={22} color={TEXT} />
            </TouchableOpacity>
          </SlideIn>
        </View>
        <FadeIn delay={100}>
          <View style={s.tabBar}>
            <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('feed')}>
              <Text style={[s.tabText, tab === 'feed' && s.tabActive]}>Feed</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.tabBtn} onPress={() => switchTab('browse')}>
              <Text style={[s.tabText, tab === 'browse' && s.tabActive]}>Browse</Text>
            </TouchableOpacity>
            <Animated.View style={[s.tabLine, indicatorStyle]} />
          </View>
        </FadeIn>
      </View>

      {loading ? (
        <View style={[s.center, { paddingTop: headerHeight }]}><ActivityIndicator size="large" color={ACCENT} /></View>
      ) : tab === 'feed' ? (
        <FadeIn delay={150} style={{ flex: 1 }}>
        <Animated.FlatList
          data={posts}
          keyExtractor={p => p.id}
          renderItem={({ item, index }) => renderPostItem({ item, index })}
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[s.feedContent, { paddingTop: headerHeight }]}
          ListHeaderComponent={() => (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.storiesRow}>
              {user?.isCoach && (
                <TouchableOpacity style={s.storyBubble} onPress={() => { setCameraVisible(true); setCreateMode(null); }}>
                  <View style={[s.storyRing, { borderColor: BORDER, borderStyle: 'dashed', borderWidth: 1.5 }]}>
                    <View style={[s.storyInner, { backgroundColor: CARD }]}>
                      <Ionicons name="add" size={28} color={ACCENT} />
                    </View>
                  </View>
                  <Text style={s.storyName}>Your Story</Text>
                </TouchableOpacity>
              )}
              {coaches.filter(c => c.stories?.length).map(c => (
                <TouchableOpacity key={c.id} style={s.storyBubble} onPress={() => { setStoryCoach(c); setStoryIdx(0); setStoryVisible(true); }}>
                  <LinearGradient colors={[ACCENT, '#f39c12']} style={s.storyRing}>
                    <View style={s.storyInner}>
                      {c.avatar ? (
                        <Image source={{ uri: c.avatar }} style={{ width: '100%', height: '100%' }} />
                      ) : (
                        <View style={[s.storyFallback, { backgroundColor: IC[c.name.length % IC.length] }]}>
                          <Text style={s.storyInitials}>{initials(c.name)}</Text>
                        </View>
                      )}
                    </View>
                  </LinearGradient>
                  <Text style={s.storyName} numberOfLines={1}>{c.name.split(' ')[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          ListEmptyComponent={() => (
            <View style={s.emptyWrap}>
              <View style={s.emptyCircle}>
                <Ionicons name="images-outline" size={32} color={TEXT3} />
              </View>
              <Text style={s.emptyTitle}>No posts yet</Text>
              <Text style={s.emptySub}>Follow coaches to see their updates here.</Text>
            </View>
          )}
        />
        </FadeIn>
      ) : (
        <FadeIn delay={150} style={{ flex: 1 }}>
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={[s.browseContent, { paddingTop: headerHeight }]}>
          <View style={s.searchRow}>
            <View style={s.searchBox}>
              <Ionicons name="search" size={20} color={TEXT3} />
              <TextInput style={s.searchInput} placeholder="Search coaches..." placeholderTextColor={TEXT3} value={query} onChangeText={setQuery} />
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersRow}>
            {FILTERS.map(f => (
              <TouchableOpacity key={f} style={[s.chip, filter === f && s.chipOn]} onPress={() => setFilter(f)}>
                <Text style={[s.chipText, filter === f && s.chipTextOn]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!user?.isCoach && (
            <TouchableOpacity
              style={s.applyBanner}
              onPress={() => hasApp ? navigation.navigate('CoachApplicationStatus') : setApplyVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[ACCENT, '#b03030']} style={s.applyBannerGrad}>
                <View style={s.applyBannerIcon}>
                  <Ionicons name={hasApp ? 'hourglass-outline' : 'school-outline'} size={28} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.applyBannerTitle}>{hasApp ? 'Application Pending' : 'Become a Coach'}</Text>
                  <Text style={s.applyBannerSub}>{hasApp ? 'Your application is under review' : 'Share your expertise and grow your client base'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </TouchableOpacity>
          )}

          <View style={s.grid}>
            {otherCoaches.filter(c => filter === 'All' || c.specialty.includes(filter)).map(c => (
              <TouchableOpacity
                key={c.id}
                style={s.card}
                onPress={() => navigation.navigate('CoachProfile', { coachId: c.id })}
              >
                <View style={s.cardImg}>
                  {c.avatar ? (
                    <Image source={{ uri: c.avatar }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <View style={[s.cardFallback, { backgroundColor: IC[c.name.length % IC.length] }]}>
                      <Text style={s.cardInitials}>{initials(c.name)}</Text>
                    </View>
                  )}
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={s.cardGrad} />
                  <View style={s.cardBottom}>
                    <Text style={s.cardName} numberOfLines={1}>{c.name}</Text>
                    <Text style={s.cardSpec} numberOfLines={1}>{c.specialty[0]}</Text>
                    <View style={s.cardMeta}>
                      <Text style={s.cardPrice}>{c.price}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                        <Ionicons name="star" size={10} color="#f1c40f" />
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>{c.rating}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.ScrollView>
        </FadeIn>
      )}

      {/* Post Details Modal */}
      <Modal visible={!!selectedPost} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setSelectedPost(null)}>
        {selectedPost && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: BG }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={s.postDetailNav}>
                <TouchableOpacity onPress={() => setSelectedPost(null)}>
                  <Ionicons name="chevron-back" size={28} color={TEXT} />
                </TouchableOpacity>
                <Text style={s.postDetailTitle}>Post</Text>
                <TouchableOpacity onPress={() => handleShare(selectedPost.post)}>
                  <Ionicons name="share-outline" size={24} color={TEXT} />
                </TouchableOpacity>
              </View>

              <FlatList
                data={selectedPost.post.recentComments || []}
                keyExtractor={item => item.id}
                ListHeaderComponent={() => (
                  <View>
                    <View style={s.postHeader}>
                      <TouchableOpacity 
                        style={s.postAvatarFallback} 
                        onPress={() => { setSelectedPost(null); navigation.navigate('CoachProfile', { coachId: selectedPost.coach.id }); }}
                      >
                        {selectedPost.coach.avatar ? (
                          <Image source={{ uri: selectedPost.coach.avatar }} style={s.postAvatar} />
                        ) : (
                          <View style={[s.postAvatarFallback, { backgroundColor: IC[selectedPost.coach.name.length % IC.length] }]}>
                            <Text style={s.postAvatarText}>{initials(selectedPost.coach.name)}</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <Text style={s.postName}>{selectedPost.coach.name}</Text>
                        <Text style={s.postMeta}>{selectedPost.coach.specialty[0]}</Text>
                      </View>
                      <TouchableOpacity onPress={() => handleFollow(selectedPost.coach)}>
                        <Text style={[s.followText, selectedPost.coach.isFollowing && { color: TEXT3 }]}>
                          {selectedPost.coach.isFollowing ? 'Following' : 'Follow'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {selectedPost.post.imageUrl ? (
                      <Image source={{ uri: selectedPost.post.imageUrl }} style={s.postImg} resizeMode="contain" />
                    ) : (
                      <LinearGradient colors={[CARD, '#111']} style={s.postTextCard}>
                        <Text style={s.postTextContent}>{selectedPost.post.caption}</Text>
                      </LinearGradient>
                    )}

                    <View style={s.postFooter}>
                      <TouchableOpacity style={s.postAction} onPress={() => handleLike(selectedPost.post.id)}>
                        <Ionicons name={likedPosts.has(selectedPost.post.id) ? "heart" : "heart-outline"} size={26} color={likedPosts.has(selectedPost.post.id) ? ACCENT : TEXT} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.postAction}>
                        <Ionicons name="chatbubble-outline" size={24} color={TEXT} />
                      </TouchableOpacity>
                      <TouchableOpacity style={s.postAction} onPress={() => handleShare(selectedPost.post)}>
                        <Ionicons name="paper-plane-outline" size={24} color={TEXT} />
                      </TouchableOpacity>
                    </View>

                    <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                      <Text style={{ color: TEXT, fontWeight: '700', marginBottom: 4 }}>{fmt(selectedPost.post.likes)} likes</Text>
                      <Text style={s.postCaptionText}>
                        <Text style={s.postCaptionName}>{selectedPost.coach.name} </Text>
                        {selectedPost.post.caption}
                      </Text>
                      <Text style={[s.postMeta, { marginTop: 8 }]}>{new Date(selectedPost.post.timestamp).toLocaleDateString()}</Text>
                    </View>
                    
                    <View style={s.commentDivider} />
                  </View>
                )}
                renderItem={({ item }) => (
                  <FadeIn style={s.commentItem}>
                    <View style={[s.commentAvatar, { backgroundColor: IC[item.userName.length % IC.length] }]}>
                      <Text style={s.commentAvatarText}>{initials(item.userName)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.commentUser}>{item.userName}</Text>
                      <Text style={s.commentContent}>{item.content}</Text>
                      <Text style={s.commentTime}>{ago(item.timestamp)}</Text>
                    </View>
                  </FadeIn>
                )}
                ListEmptyComponent={() => (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <Text style={{ color: TEXT3 }}>No comments yet. Be the first!</Text>
                  </View>
                )}
              />

              <BlurView intensity={90} tint="dark" style={s.commentInputRow}>
                <TextInput
                  style={s.commentInput}
                  placeholder="Add a comment..."
                  placeholderTextColor={TEXT3}
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                />
                <TouchableOpacity disabled={!commentText.trim() || isCommenting} onPress={handleComment}>
                  {isCommenting ? <ActivityIndicator size="small" color={ACCENT} /> : <Text style={[s.postTextBtn, commentText.trim() && { color: ACCENT }]}>Post</Text>}
                </TouchableOpacity>
              </BlurView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        )}
      </Modal>

      {/* Existing Story Viewer */}
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
                {storyCoach.avatar ? (
                  <Image source={{ uri: storyCoach.avatar }} style={s.storyViewerAvatar} />
                ) : (
                  <View style={[s.storyViewerAvatar, { backgroundColor: IC[storyCoach.name.length % IC.length] }]}>
                    <Text style={s.storyViewerAvatarText}>{initials(storyCoach.name)}</Text>
                  </View>
                )}
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


      <Modal visible={applyVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setApplyVisible(false)}>
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <Text style={s.sheetTitle}>Apply to Coach</Text>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <Text style={s.sheetLabel}>Specialty <Text style={{ color: ACCENT }}>*</Text></Text>
            <TextInput style={s.sheetInput} placeholder="e.g. Strength, Nutrition..." placeholderTextColor={TEXT3} value={applySpec} onChangeText={setApplySpec} />
            <Text style={s.sheetLabel}>Years of Experience <Text style={{ color: ACCENT }}>*</Text></Text>
            <TextInput style={s.sheetInput} placeholder="e.g. 5" placeholderTextColor={TEXT3} value={applyExp} onChangeText={setApplyExp} keyboardType="numeric" />
            <Text style={s.sheetLabel}>Bio <Text style={{ color: ACCENT }}>*</Text></Text>
            <TextInput style={[s.sheetInput, { height: 100 }]} placeholder="Tell clients about yourself..." placeholderTextColor={TEXT3} value={applyBio} onChangeText={setApplyBio} multiline />
            <Text style={[s.sheetLabel, { marginTop: 4 }]}>Certification <Text style={{ color: ACCENT }}>*</Text></Text>
            <TouchableOpacity style={[s.pdfBtn, !applyPdf && { borderColor: 'rgba(231,76,60,0.3)', borderWidth: 1 }]} onPress={pickPdf}>
              <Ionicons name="document-attach-outline" size={20} color={applyPdf ? ACCENT : TEXT3} />
              <Text style={[s.pdfText, applyPdf && { color: ACCENT }]}>{applyPdf || 'Upload Certification PDF (required)'}</Text>
              {!applyPdf && <Ionicons name="chevron-forward" size={16} color={TEXT3} />}
            </TouchableOpacity>
            <TouchableOpacity style={[s.sheetBtn, (applySubmitting || !applyPdfUri) && { opacity: 0.45 }]} onPress={submitApply} disabled={applySubmitting || !applyPdfUri}>
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
                <TouchableOpacity style={s.camModeChip} onPress={() => { trigger('light'); setCreateMode('post'); if (!capturedImage) pickFromRoll(); }}>
                  <Ionicons name="grid-outline" size={16} color="#fff" />
                  <Text style={s.camModeText}>Post</Text>
                </TouchableOpacity>
                <View style={s.camModeDivider} />
                <TouchableOpacity style={s.camModeChip} onPress={() => { trigger('light'); setCreateMode('story'); }}>
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  floatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: 'rgba(10,10,10,0.5)', overflow: 'hidden' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, minHeight: 44 },
  navTitle: { fontSize: 17, fontWeight: '700', color: TEXT, letterSpacing: -0.2 },
  navBell: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },

  avatarRing: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  avatarRingInner: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: BG, overflow: 'hidden' },
  avatarRingImg: { width: '100%', height: '100%' },
  avatarRingGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarRingText: { fontSize: 13, fontWeight: '800', color: '#fff' },

  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabText: { fontSize: 14, fontWeight: '600', color: TEXT3, letterSpacing: 0.15 },
  tabActive: { color: TEXT },
  tabLine: { position: 'absolute', bottom: 0, width: SW / 2, height: 2, backgroundColor: ACCENT, borderRadius: 1 },

  applyBanner: { marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  applyBannerGrad: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  applyBannerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  applyBannerTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  applyBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },

  feedContent: { paddingBottom: 120 },
  storiesRow: { paddingHorizontal: 16, paddingVertical: 16, gap: 18 },
  storyBubble: { alignItems: 'center', width: 70 },
  storyRing: { width: 66, height: 66, borderRadius: 33, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  storyInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, borderColor: BG, overflow: 'hidden' },
  storyFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  storyInitials: { color: '#fff', fontWeight: '800', fontSize: 20 },
  storyName: { fontSize: 11, color: TEXT2, marginTop: 6, textAlign: 'center', fontWeight: '500' },

  post: { marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
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
  postImg: { width: SW, height: SW },
  postTextCard: { margin: 14, borderRadius: 18, padding: 22, minHeight: 180, justifyContent: 'center' },
  postTextContent: { fontSize: 18, color: TEXT, lineHeight: 27, fontWeight: '500' },
  postFooter: { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 20 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postActionCount: { fontSize: 13, color: TEXT2, fontWeight: '600' },
  postCaptionWrap: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 4 },
  postCaptionText: { fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 20 },
  postCaptionName: { fontWeight: '700', color: TEXT },

  postDetailNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  postDetailTitle: { fontSize: 16, fontWeight: '700', color: TEXT },
  followText: { color: ACCENT, fontWeight: '700', fontSize: 14 },
  commentDivider: { height: 1, backgroundColor: BORDER, marginVertical: 8 },
  commentItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  commentUser: { color: TEXT, fontWeight: '700', fontSize: 13, marginBottom: 2 },
  commentContent: { color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 18 },
  commentTime: { color: TEXT3, fontSize: 11, marginTop: 4 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: BORDER, gap: 12 },
  commentInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, color: TEXT, fontSize: 14, maxHeight: 100 },
  postTextBtn: { color: TEXT3, fontWeight: '700', fontSize: 14 },

  browseContent: { paddingBottom: 40 },
  searchRow: { paddingHorizontal: 16, paddingTop: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: CARD, borderRadius: 16, paddingHorizontal: 14, gap: 8, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15, color: TEXT },
  filtersRow: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontSize: 13, fontWeight: '600', color: TEXT2 },
  chipTextOn: { color: '#fff' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, paddingTop: 12 },
  card: { width: CARD_W, borderRadius: 22, overflow: 'hidden' },
  cardImg: { width: '100%', height: CARD_W + 60, backgroundColor: '#111' },
  cardGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  cardFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardInitials: { fontSize: 40, fontWeight: '900', color: '#fff' },
  cardBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
  cardName: { fontSize: 14, fontWeight: '800', color: TEXT, marginBottom: 2 },
  cardSpec: { fontSize: 11, color: 'rgba(231,76,60,0.85)', fontWeight: '600', marginBottom: 6 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice: { fontSize: 11, fontWeight: '700', color: '#2ecc71' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40, gap: 12 },
  emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: CARD, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 19, fontWeight: '700', color: TEXT },
  emptySub: { fontSize: 14, color: TEXT3, textAlign: 'center', lineHeight: 20 },

  sheet: { flex: 1, backgroundColor: BG, paddingTop: 16 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: TEXT, paddingHorizontal: 20, marginBottom: 4, letterSpacing: -0.3 },
  sheetLabel: { fontSize: 12, fontWeight: '700', color: TEXT3, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6, marginTop: 16 },
  sheetInput: { backgroundColor: CARD, borderRadius: 14, padding: 16, color: TEXT, borderWidth: 1, borderColor: BORDER, fontSize: 15 },
  sheetBtn: { marginTop: 24, borderRadius: 16, overflow: 'hidden' },
  sheetBtnGrad: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  sheetBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  slotBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 14, backgroundColor: CARD, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
  slotBtnOn: { borderColor: ACCENT, backgroundColor: 'rgba(231,76,60,0.06)' },
  slotDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: TEXT3 },
  slotDotOn: { backgroundColor: ACCENT },
  slotText: { flex: 1, fontSize: 14, color: TEXT2, fontWeight: '500' },
  slotTextOn: { color: TEXT, fontWeight: '700' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: CARD, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: BORDER },
  pdfText: { flex: 1, fontSize: 14, color: TEXT2, fontWeight: '500' },

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

  camRoot: { flex: 1, backgroundColor: '#000' },
  camTopGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  camBottomGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  camTopRow: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 4 },
  camCircleBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  camControls: { position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 32 },
  camRollBtn: { width: 56, height: 56, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  shutterMiddle: { width: 66, height: 66, borderRadius: 33, borderWidth: 2, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  shutterCore: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  camModeRow: { position: 'absolute', bottom: 140, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  camModeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.45)' },
  camModeDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.2)' },
  camModeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  capturedActions: { position: 'absolute', bottom: 48, left: 0, right: 0 },
  capturedRetake: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 },
  capturedRetakeText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600' },
  capturedChoose: { flexDirection: 'row', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  capturedBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  capturedBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  capturedBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  createSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  createHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  createHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  createCancel: { color: 'rgba(255,255,255,0.6)', fontSize: 15, fontWeight: '600' },
  createTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  createShare: { color: ACCENT, fontSize: 15, fontWeight: '700' },
  createPreview: { width: '100%', height: 200 },
  createCaption: { paddingHorizontal: 20, paddingVertical: 12, color: '#fff', fontSize: 15, minHeight: 80 },
  storyChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)' },
  storyChipOn: { backgroundColor: ACCENT },
  storyChipText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  storyChipTextOn: { color: '#fff' },
  storyInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15 },
});
