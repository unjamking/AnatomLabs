import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import {
  AnimatedCard,
  AnimatedButton,
  AnimatedListItem,
  BlurHeader,
  GlassCard,
  FadeIn,
  SlideIn,
  Skeleton,
  useHaptics,
  COLORS,
  SPRING_CONFIG,
} from '../../components/animations';

const { width } = Dimensions.get('window');

// Tab categories
type TabType = 'muscles' | 'bones' | 'organs' | 'veins' | 'nerves';

interface TabConfig {
  id: TabType;
  label: string;
  icon: string;
  filterType: string;
  color: string;
}

const TABS: TabConfig[] = [
  { id: 'muscles', label: 'Muscles', icon: 'fitness-outline', filterType: 'muscle', color: '#e74c3c' },
  { id: 'bones', label: 'Bones', icon: 'skull-outline', filterType: 'bone', color: '#f5f5f5' },
  { id: 'organs', label: 'Organs', icon: 'heart-outline', filterType: 'organ', color: '#9b59b6' },
  { id: 'veins', label: 'Vessels', icon: 'water-outline', filterType: 'vein', color: '#3498db' },
  { id: 'nerves', label: 'Nerves', icon: 'flash-outline', filterType: 'nerve', color: '#f1c40f' },
];

// Placeholder for 3D view
function BodyViewer3DPlaceholder({ onSwitchToList, onLaunch3D }: { onSwitchToList: () => void; onLaunch3D: () => void }) {
  const { trigger } = useHaptics();

  return (
    <FadeIn>
      <GlassCard style={styles.placeholderCard}>
        <View style={styles.placeholderIconContainer}>
          <Ionicons name="body-outline" size={56} color={COLORS.primary} />
        </View>
        <Text style={styles.placeholderTitle}>3D Human Anatomy</Text>
        <Text style={styles.placeholderText}>
          Explore an interactive 3D model of the human body with detailed anatomical structures.
        </Text>
        <AnimatedButton
          title="Launch 3D Viewer"
          variant="primary"
          size="large"
          onPress={() => {
            trigger('medium');
            onLaunch3D();
          }}
          style={styles.launch3DButton}
          icon={<Ionicons name="cube" size={20} color="#fff" style={{ marginRight: 8 }} />}
        />
        <AnimatedButton
          title="Browse List Instead"
          variant="ghost"
          size="medium"
          onPress={() => {
            trigger('light');
            onSwitchToList();
          }}
          style={styles.placeholderButton}
          textStyle={{ color: COLORS.textSecondary }}
        />
      </GlassCard>
    </FadeIn>
  );
}

// Tab Bar Component - Scrollable for 5 tabs
function TabBar({
  activeTab,
  onTabChange
}: {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}) {
  const { trigger } = useHaptics();

  return (
    <Animated.ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabBarScroll}
      contentContainerStyle={styles.tabBarContent}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              isActive && styles.tabActive,
              isActive && { borderColor: tab.color }
            ]}
            onPress={() => {
              trigger('selection');
              onTabChange(tab.id);
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={isActive ? tab.color : COLORS.textSecondary}
            />
            <Text style={[
              styles.tabLabel,
              isActive && styles.tabLabelActive,
              isActive && { color: tab.color }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </Animated.ScrollView>
  );
}

// Body Part Card Component
function BodyPartCard({
  item,
  index,
  onPress,
  tabColor,
}: {
  item: any;
  index: number;
  onPress: () => void;
  tabColor: string;
}) {
  const getIconForType = (type: string) => {
    switch (type) {
      case 'muscle': return 'fitness-outline';
      case 'bone': return 'skull-outline';
      case 'organ': return 'heart-outline';
      case 'vein': return 'water-outline';
      case 'nerve': return 'flash-outline';
      default: return 'body-outline';
    }
  };

  return (
    <AnimatedListItem index={index} enterFrom="bottom">
      <AnimatedCard
        onPress={onPress}
        variant="elevated"
        style={styles.bodyPartCard}
      >
        <View style={styles.bodyPartContent}>
          <View style={[styles.bodyPartIconContainer, { backgroundColor: `${tabColor}20` }]}>
            <Ionicons name={getIconForType(item.type)} size={24} color={tabColor} />
          </View>
          <View style={styles.bodyPartInfo}>
            <Text style={styles.bodyPartName}>{item.name}</Text>
            <Text style={styles.bodyPartFunction} numberOfLines={2}>
              {item.function || item.description || 'Tap to learn more'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </View>
      </AnimatedCard>
    </AnimatedListItem>
  );
}

export default function BodyExplorerScreen() {
  const navigation = useNavigation<any>();
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('list');
  const [activeTab, setActiveTab] = useState<TabType>('muscles');
  const [allBodyParts, setAllBodyParts] = useState<any[]>([]);
  const [selectedBodyPart, setSelectedBodyPart] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  const handleLaunch3D = () => {
    navigation.navigate('AnatomyExplorer');
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    loadBodyParts();
  }, []);

  const loadBodyParts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getMuscles();
      setAllBodyParts(data || []);
    } catch (err: any) {
      console.error('Failed to load body parts:', err);
      setError(err?.message || 'Failed to load anatomy data. Make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    trigger('light');
    await loadBodyParts();
    setIsRefreshing(false);
    trigger('success');
  };

  const handleBodyPartPress = async (bodyPartId: string) => {
    try {
      trigger('light');
      const bodyPart = await api.getMuscle(bodyPartId);
      const exercises = await api.getExercises(bodyPartId);
      setSelectedBodyPart({ ...bodyPart, exercises });
      setShowDetail(true);
    } catch (error) {
      trigger('error');
      console.error('Failed to load body part details:', error);
    }
  };

  // Filter body parts by current tab
  const filteredBodyParts = allBodyParts.filter(item => {
    const currentTab = TABS.find(t => t.id === activeTab);
    return item.type === currentTab?.filterType;
  });

  const currentTabConfig = TABS.find(t => t.id === activeTab);

  // Toggle animation
  const toggleScale3D = useSharedValue(viewMode === '3d' ? 1 : 0.95);
  const toggleScaleList = useSharedValue(viewMode === 'list' ? 1 : 0.95);

  const toggle3DStyle = useAnimatedStyle(() => ({
    transform: [{ scale: toggleScale3D.value }],
  }));

  const toggleListStyle = useAnimatedStyle(() => ({
    transform: [{ scale: toggleScaleList.value }],
  }));

  const handleViewModeChange = (mode: '3d' | 'list') => {
    trigger('selection');
    setViewMode(mode);
    if (mode === '3d') {
      toggleScale3D.value = withSpring(1, SPRING_CONFIG.snappy);
      toggleScaleList.value = withSpring(0.95, SPRING_CONFIG.snappy);
    } else {
      toggleScale3D.value = withSpring(0.95, SPRING_CONFIG.snappy);
      toggleScaleList.value = withSpring(1, SPRING_CONFIG.snappy);
    }
  };

   if (error) {
    return (
      <View style={styles.container}>
        <FadeIn>
          <GlassCard style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.error} />
            <Text style={styles.errorTitle}>Could Not Load Anatomy Data</Text>
            <Text style={styles.errorText}>{error}</Text>
            <AnimatedButton
              title="Try Again"
              variant="primary"
              size="medium"
              onPress={loadBodyParts}
              style={styles.retryButton}
              icon={<Ionicons name="reload-outline" size={16} color="#fff" />}
            />
            <AnimatedButton
              title="Switch to List View"
              variant="ghost"
              size="medium"
              onPress={() => {
                setError(null);
                setViewMode('list');
              }}
              style={styles.switchButton}
              textStyle={{ color: COLORS.textSecondary }}
            />
          </GlassCard>
        </FadeIn>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Body Explorer"
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <SlideIn direction="left" delay={0}>
          <Text style={styles.title}>Anatomy</Text>
        </SlideIn>

        {/* View Toggle */}
        <FadeIn delay={100}>
          <View style={styles.viewToggle}>
            <Animated.View style={[styles.toggleButtonWrapper, toggle3DStyle]}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === '3d' && styles.toggleButtonActive]}
                onPress={() => handleViewModeChange('3d')}
              >
                <Ionicons
                  name="cube-outline"
                  size={18}
                  color={viewMode === '3d' ? '#fff' : COLORS.textSecondary}
                />
                <Text style={[styles.toggleText, viewMode === '3d' && styles.toggleTextActive]}>
                  3D View
                </Text>
              </TouchableOpacity>
            </Animated.View>
            <Animated.View style={[styles.toggleButtonWrapper, toggleListStyle]}>
              <TouchableOpacity
                style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
                onPress={() => handleViewModeChange('list')}
              >
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={viewMode === 'list' ? '#fff' : COLORS.textSecondary}
                />
                <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>
                  List View
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </FadeIn>

        {viewMode === '3d' ? (
          <BodyViewer3DPlaceholder
            onSwitchToList={() => handleViewModeChange('list')}
            onLaunch3D={handleLaunch3D}
          />
        ) : (
          <>
            {/* Category Tabs */}
            <FadeIn delay={150}>
              <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
            </FadeIn>

            {/* Category Header */}
            <FadeIn delay={200}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIconBadge, { backgroundColor: `${currentTabConfig?.color}20` }]}>
                  <Ionicons
                    name={currentTabConfig?.icon as any}
                    size={18}
                    color={currentTabConfig?.color}
                  />
                </View>
                <Text style={styles.categoryTitle}>
                  {currentTabConfig?.label} ({filteredBodyParts.length})
                </Text>
              </View>
            </FadeIn>

            {/* Body Parts List */}
            {isLoading ? (
              <View style={styles.skeletonContainer}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
                ))}
              </View>
            ) : filteredBodyParts.length === 0 ? (
              <FadeIn>
                <View style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
                  <Text style={styles.emptyStateTitle}>No {currentTabConfig?.label} Found</Text>
                  <Text style={styles.emptyStateText}>
                    Data for this category hasn't been added yet.
                  </Text>
                </View>
              </FadeIn>
            ) : (
              <View style={styles.listContainer}>
                {filteredBodyParts.map((item, index) => (
                  <BodyPartCard
                    key={item.id}
                    item={item}
                    index={index}
                    tabColor={currentTabConfig?.color || COLORS.primary}
                    onPress={() => handleBodyPartPress(item.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </Animated.ScrollView>

      {/* Detail Modal */}
      <Modal
        visible={showDetail}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetail(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedBodyPart?.name || 'Details'}
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDetail(false)}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Animated.ScrollView style={styles.modalContent}>
            {selectedBodyPart && (
              <>
                {/* Type Badge */}
                <SlideIn direction="bottom" delay={50}>
                  <View style={styles.typeBadgeContainer}>
                    <View style={[styles.typeBadge, { backgroundColor: `${currentTabConfig?.color}20` }]}>
                      <Ionicons
                        name={currentTabConfig?.icon as any}
                        size={14}
                        color={currentTabConfig?.color}
                      />
                      <Text style={[styles.typeBadgeText, { color: currentTabConfig?.color }]}>
                        {selectedBodyPart.type?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </SlideIn>

                {/* Description */}
                {selectedBodyPart.description && (
                  <SlideIn direction="bottom" delay={100}>
                    <GlassCard style={styles.infoSection}>
                      <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={20} color={COLORS.info} />
                        <Text style={styles.sectionTitle}>Description</Text>
                      </View>
                      <Text style={styles.sectionText}>
                        {selectedBodyPart.description}
                      </Text>
                    </GlassCard>
                  </SlideIn>
                )}

                {/* Function */}
                {selectedBodyPart.function && (
                  <SlideIn direction="bottom" delay={150}>
                    <GlassCard style={styles.infoSection}>
                      <View style={styles.infoRow}>
                        <Ionicons name="flash-outline" size={20} color={COLORS.warning} />
                        <Text style={styles.sectionTitle}>Function</Text>
                      </View>
                      <Text style={styles.sectionText}>
                        {selectedBodyPart.function}
                      </Text>
                    </GlassCard>
                  </SlideIn>
                )}

                {/* Importance */}
                {selectedBodyPart.importance && (
                  <SlideIn direction="bottom" delay={200}>
                    <GlassCard style={styles.infoSection}>
                      <View style={styles.infoRow}>
                        <Ionicons name="star-outline" size={20} color={COLORS.primary} />
                        <Text style={styles.sectionTitle}>Why It Matters</Text>
                      </View>
                      <Text style={styles.sectionText}>
                        {selectedBodyPart.importance}
                      </Text>
                    </GlassCard>
                  </SlideIn>
                )}

                {/* Recovery Time (for muscles) */}
                {selectedBodyPart.recoveryTime && (
                  <SlideIn direction="bottom" delay={250}>
                    <GlassCard style={styles.infoSection}>
                      <View style={styles.infoRow}>
                        <Ionicons name="time-outline" size={20} color={COLORS.success} />
                        <Text style={styles.sectionTitle}>Recovery Time</Text>
                      </View>
                      <View style={styles.recoveryBadge}>
                        <Text style={styles.recoveryTime}>{selectedBodyPart.recoveryTime}</Text>
                        <Text style={styles.recoveryUnit}>hours</Text>
                      </View>
                    </GlassCard>
                  </SlideIn>
                )}

                {/* Exercises (for muscles) */}
                {selectedBodyPart.exercises && selectedBodyPart.exercises.length > 0 && (
                  <FadeIn delay={300}>
                    <View style={styles.exercisesSection}>
                      <Text style={styles.exercisesSectionTitle}>
                        Best Exercises ({selectedBodyPart.exercises.length})
                      </Text>
                      {selectedBodyPart.exercises.slice(0, 5).map((exercise: any, exIndex: number) => (
                        <AnimatedListItem key={exercise.id} index={exIndex} enterFrom="right">
                          <GlassCard style={styles.exerciseCard}>
                            <View style={styles.exerciseHeader}>
                              <View style={styles.exerciseNumber}>
                                <Text style={styles.exerciseNumberText}>{exIndex + 1}</Text>
                              </View>
                              <Text style={styles.exerciseName}>{exercise.name}</Text>
                            </View>
                            <View style={styles.exerciseStats}>
                              <View style={styles.exerciseStat}>
                                <Ionicons name="speedometer-outline" size={14} color={COLORS.textSecondary} />
                                <Text style={styles.exerciseStatText}>{exercise.difficulty}</Text>
                              </View>
                              {exercise.activationRating && (
                                <View style={styles.exerciseStat}>
                                  <Ionicons name="flash-outline" size={14} color={COLORS.primary} />
                                  <Text style={styles.exerciseStatText}>
                                    {exercise.activationRating}% activation
                                  </Text>
                                </View>
                              )}
                            </View>
                          </GlassCard>
                        </AnimatedListItem>
                      ))}
                    </View>
                  </FadeIn>
                )}

                <View style={{ height: 40 }} />
              </>
            )}
          </Animated.ScrollView>
        </View>
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
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  toggleButtonWrapper: {
    flex: 1,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primary,
  },
  toggleText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  // Tab Bar
  tabBarScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  tabBarContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: COLORS.cardBackgroundLight,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: COLORS.text,
  },
  // Category Header
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  categoryIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Skeleton & Loading
  skeletonContainer: {
    marginTop: 10,
  },
  // Body Part Cards
  listContainer: {
    gap: 12,
  },
  bodyPartCard: {
    padding: 0,
  },
  bodyPartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  bodyPartIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bodyPartInfo: {
    flex: 1,
  },
  bodyPartName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  bodyPartFunction: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Placeholder
  placeholderCard: {
    alignItems: 'center',
    padding: 40,
  },
  placeholderIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  placeholderButton: {
    minWidth: 160,
  },
  launch3DButton: {
    marginBottom: 12,
    minWidth: 200,
  },
  // Error Card
  errorCard: {
    alignItems: 'center',
    padding: 40,
    margin: 20,
    marginTop: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    minWidth: 120,
    marginBottom: 10,
  },
  switchButton: {
    minWidth: 120,
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  // Type Badge
  typeBadgeContainer: {
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // Info Sections
  infoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  // Recovery
  recoveryBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  recoveryTime: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.success,
  },
  recoveryUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  // Exercises
  exercisesSection: {
    marginTop: 8,
  },
  exercisesSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  exerciseCard: {
    marginBottom: 10,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.cardBackgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  exerciseNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 16,
  },
  exerciseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
});
