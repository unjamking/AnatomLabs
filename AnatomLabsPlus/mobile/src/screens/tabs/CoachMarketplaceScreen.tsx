import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import { Coach, CoachStory, CoachPost } from '../../types';
import api from '../../services/api';
import {
  AnimatedCard,
  AnimatedButton,
  AnimatedListItem,
  BlurHeader,
  GlassCard,
  FadeIn,
  SlideIn,
  useHaptics,
  COLORS,
} from '../../components/animations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const GRID_COLUMNS = 3;
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 32 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS;

const FILTER_OPTIONS = ['All', 'Strength', 'Nutrition', 'Recovery', 'Online', 'In-Person'];
const INITIALS_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];
const FAVORITES_KEY = 'coach_favorites';
const TIME_SLOTS = ['Morning (6-9 AM)', 'Late Morning (9-12 PM)', 'Afternoon (12-3 PM)', 'Late Afternoon (3-6 PM)', 'Evening (6-9 PM)'];

const STORY_TYPE_ICONS: Record<string, { icon: string; color: string }> = {
  workout: { icon: 'barbell', color: '#e74c3c' },
  tip: { icon: 'bulb', color: '#f39c12' },
  transformation: { icon: 'trending-up', color: '#2ecc71' },
  motivation: { icon: 'flame', color: '#e67e22' },
  nutrition: { icon: 'nutrition', color: '#3498db' },
};

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export default function CoachMarketplaceScreen() {
  const navigation = useNavigation<any>();
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [messageModalVisible, setMessageModalVisible] = useState(false);
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [applyModalVisible, setApplyModalVisible] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageSending, setMessageSending] = useState(false);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');
  const [bookingGoal, setBookingGoal] = useState('');
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [applyBio, setApplyBio] = useState('');
  const [applySpecialty, setApplySpecialty] = useState('');
  const [applyExperience, setApplyExperience] = useState('');
  const [applySubmitting, setApplySubmitting] = useState(false);
  const [applyPdfName, setApplyPdfName] = useState('');
  const [applyPdfUri, setApplyPdfUri] = useState('');
  const [storyViewerVisible, setStoryViewerVisible] = useState(false);
  const [activeStoryCoach, setActiveStoryCoach] = useState<Coach | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [profileGridMode, setProfileGridMode] = useState(true);
  const storyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  const loadCoaches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getCoaches();
      setCoaches(data);
    } catch (error) {
      console.error('Failed to load coaches:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoaches();
  }, [loadCoaches]);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(data => {
      if (data) setFavorites(JSON.parse(data));
    });
  }, []);

  useEffect(() => {
    if (storyViewerVisible && activeStoryCoach?.stories) {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
      storyTimerRef.current = setTimeout(() => {
        if (activeStoryIndex < (activeStoryCoach.stories?.length || 0) - 1) {
          setActiveStoryIndex(prev => prev + 1);
        } else {
          setStoryViewerVisible(false);
        }
      }, 5000);
    }
    return () => {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    };
  }, [storyViewerVisible, activeStoryIndex, activeStoryCoach]);

  const toggleFavorite = async (coachId: string) => {
    trigger('medium');
    const updated = favorites.includes(coachId)
      ? favorites.filter(id => id !== coachId)
      : [...favorites, coachId];
    setFavorites(updated);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = !searchQuery ||
      coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.specialty.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = activeFilter === 'All' ||
      coach.specialty.some(s => s.toLowerCase() === activeFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  const coachesWithStories = coaches.filter(c => c.stories && c.stories.length > 0);

  const allPosts = coaches
    .flatMap(coach => (coach.posts || []).map(post => ({ ...post, coach })))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const suggestedCoaches = coaches.filter(c => !favorites.includes(c.id)).slice(0, 4);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedCoach?.userId) return;
    setMessageSending(true);
    trigger('medium');
    try {
      const { conversation } = await api.getOrCreateConversation(selectedCoach.userId);
      await api.sendMessage(conversation.id, messageText.trim());
      setMessageSending(false);
      setMessageModalVisible(false);
      setMessageText('');
      Alert.alert('Message Sent', `Your message has been sent to ${selectedCoach.name}.`, [
        { text: 'View Conversation', onPress: () => {
          setSelectedCoach(null);
          navigation.navigate('Conversation', { conversationId: conversation.id, recipientName: selectedCoach.name });
        }},
        { text: 'OK' },
      ]);
    } catch (error: any) {
      setMessageSending(false);
      Alert.alert('Error', error?.message || 'Failed to send message');
    }
  };

  const handleEmailCoach = (coach: Coach) => {
    if (!coach.email) return;
    const subject = encodeURIComponent(`Inquiry about coaching - ${coach.specialty.join(', ')}`);
    const body = encodeURIComponent(`Hi ${coach.name},\n\nI'm interested in your coaching services. I'd love to learn more about your programs.\n\nBest regards`);
    Linking.openURL(`mailto:${coach.email}?subject=${subject}&body=${body}`);
  };

  const handleCallCoach = (coach: Coach) => {
    if (!coach.phone) return;
    const phone = coach.phone.replace(/[^+\d]/g, '');
    Linking.openURL(`tel:${phone}`);
  };

  const handleBookSession = async () => {
    if (!selectedTimeSlot || !selectedCoach) return;
    setBookingSubmitting(true);
    trigger('medium');
    try {
      await api.createBooking({
        coachId: selectedCoach.id,
        date: new Date().toISOString(),
        timeSlot: selectedTimeSlot,
        goal: bookingGoal || undefined,
      });
      setBookingSubmitting(false);
      setBookingModalVisible(false);
      setSelectedTimeSlot('');
      setBookingGoal('');
      Alert.alert('Booking Requested', `Your session request has been sent to ${selectedCoach.name} for ${selectedTimeSlot}.`, [{ text: 'OK' }]);
    } catch (error: any) {
      setBookingSubmitting(false);
      Alert.alert('Error', error?.message || 'Failed to create booking');
    }
  };

  const handlePickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (!result.canceled && result.assets?.[0]) {
        setApplyPdfName(result.assets[0].name);
        setApplyPdfUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleApply = async () => {
    if (!applyBio.trim() || !applySpecialty.trim() || !applyExperience.trim()) {
      Alert.alert('Missing Info', 'Please fill in all required fields.');
      return;
    }
    setApplySubmitting(true);
    trigger('medium');
    try {
      const formData = new FormData();
      formData.append('specialty', applySpecialty);
      formData.append('experience', applyExperience);
      formData.append('bio', applyBio);
      if (applyPdfUri) {
        formData.append('certification', {
          uri: applyPdfUri,
          name: applyPdfName || 'certification.pdf',
          type: 'application/pdf',
        } as any);
      }
      await api.submitCoachApplication(formData);
      setApplySubmitting(false);
      setApplyModalVisible(false);
      setApplyBio('');
      setApplySpecialty('');
      setApplyExperience('');
      setApplyPdfName('');
      setApplyPdfUri('');
      Alert.alert('Application Submitted', 'Our team will review your application and get back to you soon.', [{ text: 'OK' }]);
    } catch (error: any) {
      setApplySubmitting(false);
      Alert.alert('Error', error?.message || 'Failed to submit application');
    }
  };

  const toggleLike = (postId: string) => {
    trigger('light');
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleSave = (postId: string) => {
    trigger('light');
    setSavedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const openStory = (coach: Coach) => {
    trigger('light');
    setActiveStoryCoach(coach);
    setActiveStoryIndex(0);
    setStoryViewerVisible(true);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    for (let i = 0; i < full; i++) stars.push(<Ionicons key={`f${i}`} name="star" size={12} color="#f39c12" />);
    if (half) stars.push(<Ionicons key="h" name="star-half" size={12} color="#f39c12" />);
    return <View style={styles.starsRow}>{stars}</View>;
  };

  const renderStoriesRow = () => (
    <FadeIn delay={50}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesContainer}>
        {coachesWithStories.map(coach => (
          <TouchableOpacity key={coach.id} style={styles.storyItem} onPress={() => openStory(coach)}>
            <LinearGradient
              colors={['#f09433', '#e6683c', '#dc2743', '#cc2366', '#bc1888']}
              style={styles.storyRing}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.storyAvatarWrapper}>
                {coach.avatar ? (
                  <Image source={{ uri: coach.avatar }} style={styles.storyAvatar} />
                ) : (
                  <View style={[styles.storyAvatarFallback, { backgroundColor: INITIALS_COLORS[parseInt(coach.id) % INITIALS_COLORS.length] }]}>
                    <Text style={styles.storyAvatarText}>{getInitials(coach.name)}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
            <Text style={styles.storyName} numberOfLines={1}>{coach.name.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </FadeIn>
  );

  const renderFeedPost = (post: CoachPost & { coach: Coach }, index: number) => (
    <AnimatedListItem key={post.id} index={index} enterFrom="bottom">
      <View style={styles.postCard}>
        <TouchableOpacity style={styles.postHeader} onPress={() => { trigger('light'); setSelectedCoach(post.coach); }}>
          {post.coach.avatar ? (
            <Image source={{ uri: post.coach.avatar }} style={styles.postAvatar} />
          ) : (
            <View style={[styles.postAvatarFallback, { backgroundColor: INITIALS_COLORS[parseInt(post.coach.id) % INITIALS_COLORS.length] }]}>
              <Text style={styles.postAvatarText}>{getInitials(post.coach.name)}</Text>
            </View>
          )}
          <View style={styles.postHeaderInfo}>
            <View style={styles.postNameRow}>
              <Text style={styles.postCoachName}>{post.coach.name}</Text>
              {post.coach.verified && <Ionicons name="checkmark-circle" size={14} color="#3498db" />}
            </View>
            <Text style={styles.postTime}>{timeAgo(post.timestamp)}</Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </TouchableOpacity>

        <Image source={{ uri: post.imageUrl }} style={styles.postImage} />

        <View style={styles.postActions}>
          <View style={styles.postActionsLeft}>
            <TouchableOpacity onPress={() => toggleLike(post.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons
                name={likedPosts.has(post.id) ? 'heart' : 'heart-outline'}
                size={26}
                color={likedPosts.has(post.id) ? '#e74c3c' : COLORS.text}
              />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="chatbubble-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <TouchableOpacity hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
              <Ionicons name="paper-plane-outline" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => toggleSave(post.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Ionicons
              name={savedPosts.has(post.id) ? 'bookmark' : 'bookmark-outline'}
              size={24}
              color={COLORS.text}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.postFooter}>
          <Text style={styles.likesText}>
            {formatCount(post.likes + (likedPosts.has(post.id) ? 1 : 0))} likes
          </Text>
          <Text style={styles.captionText}>
            <Text style={styles.captionName}>{post.coach.name} </Text>
            {post.caption}
          </Text>
          {post.comments > 0 && (
            <Text style={styles.viewComments}>View all {post.comments} comments</Text>
          )}
        </View>
      </View>
    </AnimatedListItem>
  );

  const renderSuggestedCoaches = () => (
    <FadeIn delay={150}>
      <View style={styles.suggestedSection}>
        <Text style={styles.suggestedTitle}>Suggested for You</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestedScroll}>
          {suggestedCoaches.map(coach => (
            <TouchableOpacity key={coach.id} style={styles.suggestedCard} onPress={() => { trigger('light'); setSelectedCoach(coach); }}>
              {coach.avatar ? (
                <Image source={{ uri: coach.avatar }} style={styles.suggestedAvatar} />
              ) : (
                <View style={[styles.suggestedAvatarFallback, { backgroundColor: INITIALS_COLORS[parseInt(coach.id) % INITIALS_COLORS.length] }]}>
                  <Text style={styles.suggestedAvatarText}>{getInitials(coach.name)}</Text>
                </View>
              )}
              <Text style={styles.suggestedName} numberOfLines={1}>{coach.name}</Text>
              <Text style={styles.suggestedSpecialty} numberOfLines={1}>{coach.specialty[0]}</Text>
              <TouchableOpacity
                style={styles.followButton}
                onPress={() => toggleFavorite(coach.id)}
              >
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </FadeIn>
  );

  return (
    <View style={styles.container}>
      <BlurHeader title="Coaches" scrollY={scrollY} />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
      >
        <FadeIn delay={50}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search coaches..."
              placeholderTextColor={COLORS.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </FadeIn>

        <FadeIn delay={80}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContainer}
          >
            {FILTER_OPTIONS.map(filter => (
              <TouchableOpacity
                key={filter}
                style={[styles.filterPill, activeFilter === filter && styles.filterPillActive]}
                onPress={() => { trigger('selection'); setActiveFilter(filter); }}
              >
                <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </FadeIn>

        {loading && coaches.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={{ color: COLORS.textSecondary, marginTop: 12, fontSize: 14 }}>Loading coaches...</Text>
          </View>
        )}

        {activeFilter === 'All' && !searchQuery && renderStoriesRow()}

        {activeFilter === 'All' && !searchQuery && renderSuggestedCoaches()}

        {activeFilter === 'All' && !searchQuery ? (
          <>
            <FadeIn delay={200}>
              <Text style={styles.sectionTitle}>Feed</Text>
            </FadeIn>
            {allPosts.slice(0, 10).map((post, index) => renderFeedPost(post, index))}
          </>
        ) : (
          <>
            <FadeIn delay={200}>
              <Text style={styles.sectionTitle}>
                {searchQuery || activeFilter !== 'All' ? 'Results' : 'All Coaches'}
              </Text>
            </FadeIn>
            {filteredCoaches.length === 0 ? (
              <FadeIn delay={250}>
                <GlassCard style={styles.emptyCard}>
                  <Ionicons name="search-outline" size={40} color={COLORS.textSecondary} />
                  <Text style={styles.emptyText}>No coaches found</Text>
                  <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
                </GlassCard>
              </FadeIn>
            ) : (
              filteredCoaches.map((coach, index) => (
                <AnimatedListItem key={coach.id} index={index} enterFrom="bottom">
                  <AnimatedCard
                    onPress={() => { trigger('light'); setSelectedCoach(coach); }}
                    style={styles.coachCard}
                    variant="elevated"
                  >
                    <View style={styles.coachCardContent}>
                      {coach.avatar ? (
                        <Image source={{ uri: coach.avatar }} style={styles.avatarImage} />
                      ) : (
                        <View style={[styles.avatar, { backgroundColor: INITIALS_COLORS[parseInt(coach.id) % INITIALS_COLORS.length] }]}>
                          <Text style={styles.avatarText}>{getInitials(coach.name)}</Text>
                        </View>
                      )}
                      <View style={styles.coachInfo}>
                        <View style={styles.nameRow}>
                          <Text style={styles.coachName}>{coach.name}</Text>
                          {coach.verified && <Ionicons name="checkmark-circle" size={14} color="#3498db" />}
                          <TouchableOpacity onPress={() => toggleFavorite(coach.id)} style={styles.favoriteButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Ionicons name={favorites.includes(coach.id) ? 'heart' : 'heart-outline'} size={18} color={favorites.includes(coach.id) ? '#e74c3c' : COLORS.textSecondary} />
                          </TouchableOpacity>
                        </View>
                        <View style={styles.specialtyRow}>
                          {coach.specialty.map((s, i) => (
                            <View key={i} style={styles.specialtyBadge}>
                              <Text style={styles.specialtyText}>{s}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.ratingRow}>
                          {renderStars(coach.rating)}
                          <Text style={styles.ratingText}>{coach.rating}</Text>
                          <Text style={styles.reviewCount}>({coach.reviewCount})</Text>
                          <Text style={styles.priceText}>{coach.price}</Text>
                        </View>
                        <Text style={styles.coachBio} numberOfLines={2}>{coach.bio}</Text>
                      </View>
                    </View>
                  </AnimatedCard>
                </AnimatedListItem>
              ))
            )}
          </>
        )}

        <SlideIn direction="bottom" delay={300}>
          <GlassCard style={styles.becomeCoachCard} borderGlow glowColor={COLORS.primary}>
            <Ionicons name="school-outline" size={32} color={COLORS.primary} />
            <Text style={styles.becomeCoachTitle}>Become a Coach</Text>
            <Text style={styles.becomeCoachText}>
              Share your expertise and help others achieve their fitness goals. Apply to join our coach marketplace.
            </Text>
            <AnimatedButton title="Apply Now" variant="primary" size="medium" onPress={() => { trigger('light'); setApplyModalVisible(true); }} style={styles.applyButton} />
          </GlassCard>
        </SlideIn>

        <View style={styles.bottomPadding} />
      </Animated.ScrollView>

      {/* Story Viewer Modal */}
      <Modal visible={storyViewerVisible} animationType="fade" presentationStyle="fullScreen" onRequestClose={() => setStoryViewerVisible(false)}>
        {activeStoryCoach?.stories && activeStoryCoach.stories[activeStoryIndex] && (
          <View style={styles.storyViewerContainer}>
            <View style={styles.storyProgressBar}>
              {activeStoryCoach.stories.map((_, i) => (
                <View key={i} style={styles.storyProgressSegment}>
                  <View style={[styles.storyProgressFill, { width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? '100%' : '0%', opacity: i <= activeStoryIndex ? 1 : 0.3 }]} />
                </View>
              ))}
            </View>

            <View style={styles.storyViewerHeader}>
              <TouchableOpacity style={styles.storyViewerProfile} onPress={() => { setStoryViewerVisible(false); setSelectedCoach(activeStoryCoach); }}>
                {activeStoryCoach.avatar ? (
                  <Image source={{ uri: activeStoryCoach.avatar }} style={styles.storyViewerAvatar} />
                ) : (
                  <View style={[styles.storyViewerAvatarFallback, { backgroundColor: INITIALS_COLORS[parseInt(activeStoryCoach.id) % INITIALS_COLORS.length] }]}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{getInitials(activeStoryCoach.name)}</Text>
                  </View>
                )}
                <Text style={styles.storyViewerName}>{activeStoryCoach.name}</Text>
                <Text style={styles.storyViewerTime}>{timeAgo(activeStoryCoach.stories[activeStoryIndex].timestamp)}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStoryViewerVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.storyTapArea}
              activeOpacity={1}
              onPress={() => {
                if (activeStoryIndex < (activeStoryCoach.stories?.length || 0) - 1) {
                  setActiveStoryIndex(prev => prev + 1);
                } else {
                  setStoryViewerVisible(false);
                }
              }}
            >
              <View style={styles.storyContent}>
                <View style={[styles.storyTypeIcon, { backgroundColor: STORY_TYPE_ICONS[activeStoryCoach.stories[activeStoryIndex].type]?.color || COLORS.primary }]}>
                  <Ionicons name={(STORY_TYPE_ICONS[activeStoryCoach.stories[activeStoryIndex].type]?.icon || 'star') as any} size={32} color="#fff" />
                </View>
                <Text style={styles.storyTitle}>{activeStoryCoach.stories[activeStoryIndex].title}</Text>
                <Text style={styles.storyDescription}>{activeStoryCoach.stories[activeStoryIndex].description}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.storyPrevArea}
              activeOpacity={1}
              onPress={() => {
                if (activeStoryIndex > 0) setActiveStoryIndex(prev => prev - 1);
              }}
            />
          </View>
        )}
      </Modal>

      {/* Coach Profile Modal — Instagram Style */}
      <Modal visible={!!selectedCoach} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedCoach(null)}>
        {selectedCoach && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedCoach.name}</Text>
              <AnimatedButton variant="ghost" size="small" onPress={() => { setSelectedCoach(null); setProfileGridMode(true); }} title="Close" textStyle={{ color: COLORS.primary }} />
            </View>

            <Animated.ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
              <FadeIn delay={100}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileTop}>
                    {selectedCoach.avatar ? (
                      <Image source={{ uri: selectedCoach.avatar }} style={styles.profileAvatarImage} />
                    ) : (
                      <View style={[styles.profileAvatar, { backgroundColor: INITIALS_COLORS[parseInt(selectedCoach.id) % INITIALS_COLORS.length] }]}>
                        <Text style={styles.profileAvatarText}>{getInitials(selectedCoach.name)}</Text>
                      </View>
                    )}
                    <View style={styles.profileStats}>
                      <View style={styles.profileStatItem}>
                        <Text style={styles.profileStatValue}>{selectedCoach.posts?.length || 0}</Text>
                        <Text style={styles.profileStatLabel}>Posts</Text>
                      </View>
                      <View style={styles.profileStatItem}>
                        <Text style={styles.profileStatValue}>{formatCount(selectedCoach.followers || 0)}</Text>
                        <Text style={styles.profileStatLabel}>Followers</Text>
                      </View>
                      <View style={styles.profileStatItem}>
                        <Text style={styles.profileStatValue}>{formatCount(selectedCoach.following || 0)}</Text>
                        <Text style={styles.profileStatLabel}>Following</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.profileBioName}>{selectedCoach.name}</Text>
                  {selectedCoach.verified && (
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#3498db" />
                      <Text style={styles.verifiedText}>Verified Coach</Text>
                    </View>
                  )}
                  <Text style={styles.profileBio}>{selectedCoach.bio}</Text>

                  <View style={styles.profileSpecialties}>
                    {selectedCoach.specialty.map((s, i) => (
                      <View key={i} style={styles.specialtyBadge}>
                        <Text style={styles.specialtyText}>{s}</Text>
                      </View>
                    ))}
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={12} color="#f39c12" />
                      <Text style={styles.ratingBadgeText}>{selectedCoach.rating}</Text>
                    </View>
                  </View>
                </View>
              </FadeIn>

              <SlideIn direction="bottom" delay={150}>
                <View style={styles.profileActions}>
                  <TouchableOpacity
                    style={[styles.profileActionButton, favorites.includes(selectedCoach.id) && styles.profileActionButtonFollowing]}
                    onPress={() => toggleFavorite(selectedCoach.id)}
                  >
                    <Text style={[styles.profileActionText, favorites.includes(selectedCoach.id) && styles.profileActionTextFollowing]}>
                      {favorites.includes(selectedCoach.id) ? 'Following' : 'Follow'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.profileActionButtonSecondary} onPress={() => { trigger('light'); setMessageText(''); setMessageModalVisible(true); }}>
                    <Text style={styles.profileActionTextSecondary}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.profileActionButtonSecondary} onPress={() => { trigger('light'); setSelectedTimeSlot(''); setBookingGoal(''); setBookingModalVisible(true); }}>
                    <Text style={styles.profileActionTextSecondary}>Book</Text>
                  </TouchableOpacity>
                </View>
              </SlideIn>

              <SlideIn direction="bottom" delay={200}>
                <GlassCard style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Ionicons name="briefcase-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{selectedCoach.experience} years experience</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{selectedCoach.clientCount} clients coached</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>{selectedCoach.price}</Text>
                  </View>
                  {selectedCoach.certifications.map((cert, i) => (
                    <View key={i} style={styles.infoRow}>
                      <Ionicons name="ribbon-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.infoText}>{cert}</Text>
                    </View>
                  ))}
                </GlassCard>
              </SlideIn>

              {selectedCoach.availability && selectedCoach.availability.length > 0 && (
                <SlideIn direction="bottom" delay={230}>
                  <GlassCard style={styles.infoSection}>
                    <Text style={styles.infoSectionTitle}>Availability</Text>
                    {selectedCoach.availability.map((slot, i) => (
                      <View key={i} style={styles.infoRow}>
                        <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                        <Text style={styles.infoText}>{slot}</Text>
                      </View>
                    ))}
                  </GlassCard>
                </SlideIn>
              )}

              <SlideIn direction="bottom" delay={260}>
                <View style={styles.contactRow}>
                  {selectedCoach.email && (
                    <TouchableOpacity style={styles.contactButton} onPress={() => handleEmailCoach(selectedCoach)}>
                      <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.contactButtonText}>Email</Text>
                    </TouchableOpacity>
                  )}
                  {selectedCoach.phone && (
                    <TouchableOpacity style={styles.contactButton} onPress={() => handleCallCoach(selectedCoach)}>
                      <Ionicons name="call-outline" size={20} color="#2ecc71" />
                      <Text style={[styles.contactButtonText, { color: '#2ecc71' }]}>Call</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </SlideIn>

              {selectedCoach.posts && selectedCoach.posts.length > 0 && (
                <FadeIn delay={300}>
                  <View style={styles.gridToggle}>
                    <TouchableOpacity onPress={() => setProfileGridMode(true)} style={[styles.gridToggleButton, profileGridMode && styles.gridToggleActive]}>
                      <Ionicons name="grid-outline" size={20} color={profileGridMode ? COLORS.primary : COLORS.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setProfileGridMode(false)} style={[styles.gridToggleButton, !profileGridMode && styles.gridToggleActive]}>
                      <Ionicons name="list-outline" size={20} color={!profileGridMode ? COLORS.primary : COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {profileGridMode ? (
                    <View style={styles.photoGrid}>
                      {selectedCoach.posts.map(post => (
                        <TouchableOpacity key={post.id} style={styles.gridItem}>
                          <Image source={{ uri: post.imageUrl }} style={styles.gridImage} />
                          <View style={styles.gridOverlay}>
                            <View style={styles.gridStat}>
                              <Ionicons name="heart" size={12} color="#fff" />
                              <Text style={styles.gridStatText}>{formatCount(post.likes)}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    selectedCoach.posts.map((post, index) => (
                      <AnimatedListItem key={post.id} index={index} enterFrom="bottom">
                        <GlassCard style={styles.listPostCard}>
                          <Image source={{ uri: post.imageUrl }} style={styles.listPostImage} />
                          <Text style={styles.listPostCaption} numberOfLines={2}>{post.caption}</Text>
                          <View style={styles.listPostStats}>
                            <Ionicons name="heart" size={14} color="#e74c3c" />
                            <Text style={styles.listPostStatText}>{formatCount(post.likes)}</Text>
                            <Ionicons name="chatbubble" size={14} color={COLORS.textSecondary} style={{ marginLeft: 12 }} />
                            <Text style={styles.listPostStatText}>{post.comments}</Text>
                          </View>
                        </GlassCard>
                      </AnimatedListItem>
                    ))
                  )}
                </FadeIn>
              )}

              <View style={styles.bottomPadding} />
            </Animated.ScrollView>
          </View>
        )}
      </Modal>

      {/* Message Modal */}
      <Modal visible={messageModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setMessageModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Message {selectedCoach?.name}</Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => setMessageModalVisible(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
          </View>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            <GlassCard style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Your Message</Text>
              <TextInput
                style={styles.messageInput}
                placeholder="Hi, I'm interested in your coaching services..."
                placeholderTextColor={COLORS.textTertiary}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
            </GlassCard>
            {selectedCoach?.email && (
              <TouchableOpacity style={styles.altContactRow} onPress={() => { setMessageModalVisible(false); handleEmailCoach(selectedCoach); }}>
                <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                <Text style={styles.altContactText}>Or send an email directly to {selectedCoach.email}</Text>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
            <AnimatedButton title={messageSending ? 'Sending...' : 'Send Message'} variant="primary" size="large" onPress={handleSendMessage} disabled={!messageText.trim() || messageSending} style={styles.fullWidthButton} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Booking Modal */}
      <Modal visible={bookingModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBookingModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Book with {selectedCoach?.name}</Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => setBookingModalVisible(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
          </View>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            <GlassCard style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Select Preferred Time</Text>
              {TIME_SLOTS.map(slot => (
                <TouchableOpacity key={slot} style={[styles.timeSlot, selectedTimeSlot === slot && styles.timeSlotActive]} onPress={() => { trigger('selection'); setSelectedTimeSlot(slot); }}>
                  <Ionicons name={selectedTimeSlot === slot ? 'radio-button-on' : 'radio-button-off'} size={20} color={selectedTimeSlot === slot ? COLORS.primary : COLORS.textSecondary} />
                  <Text style={[styles.timeSlotText, selectedTimeSlot === slot && styles.timeSlotTextActive]}>{slot}</Text>
                </TouchableOpacity>
              ))}
            </GlassCard>

            {selectedCoach?.availability && selectedCoach.availability.length > 0 && (
              <GlassCard style={styles.infoSection}>
                <Text style={styles.infoSectionTitle}>Coach Availability</Text>
                {selectedCoach.availability.map((a, i) => (
                  <View key={i} style={styles.infoRow}>
                    <Ionicons name="time-outline" size={14} color="#2ecc71" />
                    <Text style={styles.infoText}>{a}</Text>
                  </View>
                ))}
              </GlassCard>
            )}

            <GlassCard style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Session Goal (Optional)</Text>
              <TextInput style={styles.goalInput} placeholder="What do you want to focus on?" placeholderTextColor={COLORS.textTertiary} value={bookingGoal} onChangeText={setBookingGoal} multiline numberOfLines={3} textAlignVertical="top" />
            </GlassCard>

            <View style={styles.bookingSummary}>
              <Text style={styles.bookingSummaryLabel}>Session Price</Text>
              <Text style={styles.bookingSummaryPrice}>{selectedCoach?.price}</Text>
            </View>

            <AnimatedButton title={bookingSubmitting ? 'Submitting...' : 'Request Booking'} variant="primary" size="large" onPress={handleBookSession} disabled={!selectedTimeSlot || bookingSubmitting} style={styles.fullWidthButton} />
          </ScrollView>
        </View>
      </Modal>

      {/* Apply Modal */}
      <Modal visible={applyModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setApplyModalVisible(false)}>
        <KeyboardAvoidingView style={styles.modalContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Become a Coach</Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => setApplyModalVisible(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
          </View>
          <ScrollView style={styles.modalScrollView} contentContainerStyle={styles.modalScrollContent}>
            <GlassCard style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Coaching Details</Text>
              <TextInput style={styles.formInput} placeholder="Specialty (e.g. Strength, Nutrition) *" placeholderTextColor={COLORS.textTertiary} value={applySpecialty} onChangeText={setApplySpecialty} />
              <TextInput style={styles.formInput} placeholder="Years of Experience *" placeholderTextColor={COLORS.textTertiary} value={applyExperience} onChangeText={setApplyExperience} keyboardType="numeric" />
              <TextInput style={[styles.formInput, { minHeight: 80 }]} placeholder="Tell us about your coaching experience *" placeholderTextColor={COLORS.textTertiary} value={applyBio} onChangeText={setApplyBio} multiline textAlignVertical="top" />
            </GlassCard>

            <GlassCard style={styles.infoSection}>
              <Text style={styles.infoSectionTitle}>Certification (PDF)</Text>
              <TouchableOpacity style={styles.pdfPickerButton} onPress={handlePickPdf}>
                <Ionicons name="document-attach-outline" size={20} color={COLORS.primary} />
                <Text style={styles.pdfPickerText}>{applyPdfName || 'Upload Certification PDF'}</Text>
              </TouchableOpacity>
            </GlassCard>

            <GlassCard style={styles.applyInfoCard}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
              <Text style={styles.applyInfoText}>After submitting, our team will review your qualifications and reach out within 5 business days.</Text>
            </GlassCard>

            <AnimatedButton title={applySubmitting ? 'Submitting...' : 'Submit Application'} variant="primary" size="large" onPress={handleApply} disabled={applySubmitting} style={styles.fullWidthButton} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 140,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  filtersContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 4,
  },

  storiesContainer: {
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 4,
  },
  storyItem: {
    alignItems: 'center',
    width: 72,
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatarWrapper: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: COLORS.background,
    overflow: 'hidden',
  },
  storyAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
  },
  storyAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
  storyName: {
    fontSize: 11,
    color: COLORS.text,
    marginTop: 4,
    textAlign: 'center',
    width: 72,
  },

  storyViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyProgressBar: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 12,
    paddingTop: 54,
  },
  storyProgressSegment: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  storyProgressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  storyViewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  storyViewerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  storyViewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  storyViewerAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyViewerName: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  storyViewerTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  storyTapArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  storyPrevArea: {
    position: 'absolute',
    left: 0,
    top: 120,
    bottom: 0,
    width: SCREEN_WIDTH * 0.3,
  },
  storyContent: {
    alignItems: 'center',
    gap: 16,
  },
  storyTypeIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  storyDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },

  postCard: {
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  postAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  postHeaderInfo: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postCoachName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  postTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  postImage: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_WIDTH - 32,
    borderRadius: 4,
    backgroundColor: COLORS.cardBackground,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  postActionsLeft: {
    flexDirection: 'row',
    gap: 16,
  },
  postFooter: {
    gap: 4,
  },
  likesText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  captionText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  captionName: {
    fontWeight: '600',
  },
  viewComments: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  suggestedSection: {
    marginBottom: 20,
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  suggestedScroll: {
    gap: 12,
  },
  suggestedCard: {
    width: 150,
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  suggestedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  suggestedAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestedAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 22,
  },
  suggestedName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  suggestedSpecialty: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  followButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 6,
    borderRadius: 8,
  },
  followButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  coachCard: {
    marginBottom: 10,
    padding: 0,
  },
  coachCardContent: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  coachInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  coachName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
  },
  specialtyBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  specialtyText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
  },
  reviewCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2ecc71',
    marginLeft: 'auto',
  },
  coachBio: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  favoriteButton: {
    marginLeft: 'auto',
    padding: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  becomeCoachCard: {
    alignItems: 'center',
    padding: 24,
    marginTop: 8,
  },
  becomeCoachTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
    marginBottom: 6,
  },
  becomeCoachText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  applyButton: {
    minWidth: 140,
  },
  bottomPadding: {
    height: 80,
  },

  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 16,
  },

  profileHeader: {
    marginBottom: 16,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  profileStats: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  profileStatItem: {
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  profileStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileBioName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3498db',
  },
  profileBio: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  profileSpecialties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(243,156,18,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ratingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f39c12',
  },

  profileActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  profileActionButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  profileActionButtonFollowing: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileActionTextFollowing: {
    color: COLORS.text,
  },
  profileActionButtonSecondary: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  profileActionTextSecondary: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },

  infoSection: {
    marginBottom: 12,
    padding: 14,
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.text,
  },

  contactRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 16,
  },
  contactButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  contactButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },

  gridToggle: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 2,
  },
  gridToggleButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  gridToggleActive: {
    borderBottomColor: COLORS.primary,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    height: GRID_ITEM_SIZE,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 2,
    backgroundColor: COLORS.cardBackground,
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  gridStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gridStatText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },

  listPostCard: {
    marginBottom: 10,
    padding: 12,
  },
  listPostImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: COLORS.cardBackground,
  },
  listPostCaption: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
    marginBottom: 6,
  },
  listPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listPostStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  messageInput: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  altContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 12,
    marginBottom: 16,
  },
  altContactText: {
    fontSize: 13,
    color: COLORS.primary,
    flex: 1,
  },
  fullWidthButton: {
    marginBottom: 20,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  timeSlotActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 8,
    marginHorizontal: -4,
    paddingHorizontal: 8,
  },
  timeSlotText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timeSlotTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  goalInput: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bookingSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  bookingSummaryLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  bookingSummaryPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2ecc71',
  },
  formInput: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  pdfPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },
  pdfPickerText: {
    fontSize: 14,
    color: COLORS.primary,
    flex: 1,
  },
  applyInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    marginBottom: 16,
  },
  applyInfoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
