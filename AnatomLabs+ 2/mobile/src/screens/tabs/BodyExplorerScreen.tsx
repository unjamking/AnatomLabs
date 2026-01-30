import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import {
  AnimatedCard,
  AnimatedButton,
  AnimatedListItem,
  BlurHeader,
  GlassCard,
  FadeIn,
  SlideIn,
  ScaleIn,
  Skeleton,
  useHaptics,
  COLORS,
  SPRING_CONFIG,
} from '../../components/animations';

// Placeholder for 3D view - disabled due to Fabric compatibility issues
function BodyViewer3DPlaceholder({ onSwitchToList }: { onSwitchToList: () => void }) {
  const { trigger } = useHaptics();

  return (
    <FadeIn>
      <GlassCard style={styles.placeholderCard}>
        <Ionicons name="cube-outline" size={64} color={COLORS.textSecondary} />
        <Text style={styles.placeholderTitle}>3D View Unavailable</Text>
        <Text style={styles.placeholderText}>
          3D rendering is temporarily disabled due to compatibility issues with React Native's new architecture.
        </Text>
        <AnimatedButton
          title="Use List View"
          variant="primary"
          size="medium"
          onPress={() => {
            trigger('light');
            onSwitchToList();
          }}
          style={styles.placeholderButton}
        />
      </GlassCard>
    </FadeIn>
  );
}

export default function BodyExplorerScreen() {
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('list');
  const [muscles, setMuscles] = useState<any[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    loadMuscles();
  }, []);

  const loadMuscles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getMuscles();
      const musclesWithPositions = (data || []).map((muscle: any, index: number) => ({
        ...muscle,
        position_x: Math.sin(index) * 3,
        position_y: 3 + Math.cos(index * 0.5) * 2,
        position_z: Math.cos(index) * 2,
        layer: 1,
      }));
      setMuscles(musclesWithPositions);
    } catch (err: any) {
      console.error('Failed to load muscles:', err);
      setError(err?.message || 'Failed to load anatomy data. Make sure the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    trigger('light');
    await loadMuscles();
    setIsRefreshing(false);
    trigger('success');
  };

  const handleMusclePress = async (muscleId: string) => {
    try {
      trigger('light');
      const muscle = await api.getMuscle(muscleId);
      const exercises = await api.getExercises(muscleId);
      setSelectedMuscle({ ...muscle, exercises });
      setShowDetail(true);
    } catch (error) {
      trigger('error');
      console.error('Failed to load muscle details:', error);
    }
  };

  // Animated toggle
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
            <Ionicons name="alert-circle" size={48} color={COLORS.primary} />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <AnimatedButton
              title="Retry"
              variant="primary"
              size="medium"
              onPress={loadMuscles}
              style={styles.retryButton}
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
          <BodyViewer3DPlaceholder onSwitchToList={() => handleViewModeChange('list')} />
        ) : isLoading ? (
          <View style={styles.skeletonContainer}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} width="100%" height={90} borderRadius={16} style={{ marginBottom: 12 }} />
            ))}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {muscles.map((muscle, index) => (
              <AnimatedListItem key={muscle.id} index={index} enterFrom="bottom">
                <AnimatedCard
                  onPress={() => handleMusclePress(muscle.id)}
                  variant="elevated"
                  style={styles.muscleCard}
                >
                  <View style={styles.muscleContent}>
                    <View style={styles.muscleIconContainer}>
                      <Ionicons name="body-outline" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.muscleInfo}>
                      <Text style={styles.muscleName}>{muscle.name}</Text>
                      <Text style={styles.muscleFunction} numberOfLines={2}>
                        {muscle.function || 'Tap to learn more'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                  </View>
                </AnimatedCard>
              </AnimatedListItem>
            ))}
          </View>
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
              {selectedMuscle?.name || 'Muscle Details'}
            </Text>
            <AnimatedButton
              variant="ghost"
              size="small"
              onPress={() => setShowDetail(false)}
              title="Close"
              textStyle={{ color: COLORS.primary }}
            />
          </View>

          <Animated.ScrollView style={styles.modalContent}>
            {selectedMuscle && (
              <>
                <SlideIn direction="bottom" delay={100}>
                  <GlassCard style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="flask-outline" size={20} color={COLORS.primary} />
                      <Text style={styles.sectionTitle}>Scientific Name</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      {selectedMuscle.scientificName || 'N/A'}
                    </Text>
                  </GlassCard>
                </SlideIn>

                <SlideIn direction="bottom" delay={200}>
                  <GlassCard style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="information-circle-outline" size={20} color={COLORS.info} />
                      <Text style={styles.sectionTitle}>Function</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      {selectedMuscle.function || 'N/A'}
                    </Text>
                  </GlassCard>
                </SlideIn>

                <SlideIn direction="bottom" delay={300}>
                  <GlassCard style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={20} color={COLORS.warning} />
                      <Text style={styles.sectionTitle}>Recovery Time</Text>
                    </View>
                    <Text style={styles.sectionText}>
                      {selectedMuscle.recoveryTime || 48} hours
                    </Text>
                  </GlassCard>
                </SlideIn>

                {selectedMuscle.exercises && selectedMuscle.exercises.length > 0 && (
                  <FadeIn delay={400}>
                    <View style={styles.exercisesSection}>
                      <Text style={styles.exercisesSectionTitle}>
                        Best Exercises ({selectedMuscle.exercises.length})
                      </Text>
                      {selectedMuscle.exercises.slice(0, 5).map((exercise: any, exIndex: number) => (
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
                                    {exercise.activationRating}/100 activation
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
    paddingTop: 120,
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
  skeletonContainer: {
    marginTop: 10,
  },
  listContainer: {
    gap: 12,
  },
  muscleCard: {
    padding: 0,
  },
  muscleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  muscleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  muscleInfo: {
    flex: 1,
  },
  muscleName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  muscleFunction: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  placeholderCard: {
    alignItems: 'center',
    padding: 40,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginTop: 16,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  placeholderButton: {
    minWidth: 160,
  },
  errorCard: {
    alignItems: 'center',
    padding: 40,
    margin: 20,
    marginTop: 100,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
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
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    lineHeight: 22,
  },
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
    width: 24,
    height: 24,
    borderRadius: 12,
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
