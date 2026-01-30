import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutTracking } from '../../context/WorkoutTrackingContext';
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
import { WorkoutSet, CompletedWorkout, Exercise } from '../../types';
import api from '../../services/api';

// Format time as mm:ss or hh:mm:ss
const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function WorkoutTrackingScreen() {
  const navigation = useNavigation();
  const {
    activeWorkout,
    isWorkoutActive,
    workoutTimer,
    workoutHistory,
    stats,
    templates,
    isLoading,
    startWorkout,
    cancelWorkout,
    completeWorkout,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    deleteSet,
    loadHistory,
    loadStats,
    getLastWorkoutForExercise,
    calculateOneRepMax,
  } = useWorkoutTracking();

  const [showStartModal, setShowStartModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    loadHistory();
    loadStats();
  }, []);

  const loadExercises = async (query: string = '') => {
    try {
      const data = await api.getExercises();
      const filtered = query
        ? data.filter(e =>
            e.name.toLowerCase().includes(query.toLowerCase()) ||
            e.primaryMuscles.some(m => m.toLowerCase().includes(query.toLowerCase()))
          )
        : data;
      setExercises(filtered);
    } catch (err) {
      console.error('Failed to load exercises:', err);
    }
  };

  useEffect(() => {
    if (showExerciseModal) {
      loadExercises(searchQuery);
    }
  }, [showExerciseModal, searchQuery]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    trigger('light');
    await loadHistory();
    await loadStats();
    setIsRefreshing(false);
    trigger('success');
  };

  const handleStartWorkout = () => {
    if (!workoutName.trim()) {
      trigger('warning');
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    trigger('success');
    startWorkout(workoutName.trim());
    setShowStartModal(false);
    setWorkoutName('');
  };

  const handleCompleteWorkout = async () => {
    Alert.alert(
      'Complete Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            trigger('success');
            try {
              await completeWorkout();
              await loadStats();
            } catch (err) {
              console.error('Failed to complete workout:', err);
            }
          },
        },
      ]
    );
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancel Workout',
      'Are you sure you want to discard this workout?',
      [
        { text: 'Keep Training', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            trigger('warning');
            cancelWorkout();
          },
        },
      ]
    );
  };

  const handleAddExercise = (exercise: Exercise) => {
    trigger('light');
    addExercise(exercise);
    setShowExerciseModal(false);
    setSearchQuery('');
  };

  const handleAddSet = (exerciseId: string) => {
    trigger('light');
    const lastWorkout = getLastWorkoutForExercise(
      activeWorkout?.exercises.find(e => e.id === exerciseId)?.exerciseId || ''
    );
    const lastSet = lastWorkout?.sets[lastWorkout.sets.length - 1];
    addSet(exerciseId, {
      weight: lastSet?.weight || 0,
      reps: lastSet?.reps || 0,
    });
  };

  // Active Workout View
  if (isWorkoutActive && activeWorkout) {
    return (
      <View style={styles.container}>
        {/* Workout Header */}
        <View style={styles.activeHeader}>
          <View style={styles.activeHeaderTop}>
            <TouchableOpacity onPress={handleCancelWorkout}>
              <Ionicons name="close" size={28} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.timerText}>{formatTime(workoutTimer)}</Text>
            </View>
            <TouchableOpacity onPress={handleCompleteWorkout}>
              <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
            </TouchableOpacity>
          </View>
          <Text style={styles.workoutName}>{activeWorkout.name}</Text>
        </View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.activeContent}
        >
          {activeWorkout.exercises.length === 0 ? (
            <FadeIn delay={200}>
              <GlassCard style={styles.emptyExerciseCard}>
                <Ionicons name="barbell-outline" size={48} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No exercises added</Text>
                <Text style={styles.emptySubtext}>Tap the button below to add your first exercise</Text>
              </GlassCard>
            </FadeIn>
          ) : (
            activeWorkout.exercises.map((exercise, index) => (
              <AnimatedListItem key={exercise.id} index={index} enterFrom="bottom">
                <GlassCard style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <View style={styles.exerciseInfo}>
                      <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                      <Text style={styles.muscleGroup}>{exercise.muscleGroup}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        trigger('light');
                        removeExercise(exercise.id);
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Sets Header */}
                  <View style={styles.setsHeader}>
                    <Text style={[styles.setHeaderText, { flex: 0.5 }]}>SET</Text>
                    <Text style={[styles.setHeaderText, { flex: 1 }]}>PREVIOUS</Text>
                    <Text style={[styles.setHeaderText, { flex: 1.2 }]}>KG</Text>
                    <Text style={[styles.setHeaderText, { flex: 1.2 }]}>REPS</Text>
                    <View style={{ width: 30 }} />
                  </View>

                  {/* Sets */}
                  {exercise.sets.map((set, setIndex) => {
                    const lastWorkout = getLastWorkoutForExercise(exercise.exerciseId);
                    const previousSet = lastWorkout?.sets[setIndex];

                    return (
                      <View
                        key={set.id}
                        style={[
                          styles.setRow,
                          set.isWarmup && styles.warmupSet,
                          set.completedAt && styles.completedSet,
                        ]}
                      >
                        <Text style={[styles.setNumber, { flex: 0.5 }]}>
                          {set.isWarmup ? 'W' : set.setNumber}
                        </Text>
                        <Text style={[styles.previousText, { flex: 1 }]}>
                          {previousSet ? `${previousSet.weight}×${previousSet.reps}` : '-'}
                        </Text>
                        <TextInput
                          style={[styles.setInput, { flex: 1.2 }]}
                          value={set.weight.toString()}
                          onChangeText={(val) => updateSet(exercise.id, set.id, { weight: parseFloat(val) || 0 })}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={COLORS.textTertiary}
                        />
                        <TextInput
                          style={[styles.setInput, { flex: 1.2 }]}
                          value={set.reps.toString()}
                          onChangeText={(val) => updateSet(exercise.id, set.id, { reps: parseInt(val) || 0 })}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={COLORS.textTertiary}
                        />
                        <TouchableOpacity
                          style={styles.deleteSetButton}
                          onPress={() => {
                            trigger('light');
                            deleteSet(exercise.id, set.id);
                          }}
                        >
                          <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  {/* Add Set Button */}
                  <TouchableOpacity
                    style={styles.addSetButton}
                    onPress={() => handleAddSet(exercise.id)}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </TouchableOpacity>
                </GlassCard>
              </AnimatedListItem>
            ))
          )}

          {/* Add Exercise Button */}
          <AnimatedButton
            title="Add Exercise"
            variant="secondary"
            size="large"
            onPress={() => {
              trigger('light');
              setShowExerciseModal(true);
            }}
            style={styles.addExerciseButton}
          >
            <Ionicons name="add-circle-outline" size={24} color={COLORS.primary} />
          </AnimatedButton>
        </Animated.ScrollView>

        {/* Exercise Selection Modal */}
        <Modal
          visible={showExerciseModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowExerciseModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <AnimatedButton
                variant="ghost"
                size="small"
                onPress={() => setShowExerciseModal(false)}
                title="Cancel"
                textStyle={{ color: COLORS.primary }}
              />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={COLORS.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <Animated.ScrollView style={styles.exerciseList}>
              {exercises.map((exercise, index) => (
                <AnimatedListItem key={exercise.id} index={index} enterFrom="right">
                  <AnimatedCard
                    onPress={() => handleAddExercise(exercise)}
                    style={styles.exerciseSelectCard}
                  >
                    <View style={styles.exerciseSelectContent}>
                      <Text style={styles.exerciseSelectName}>{exercise.name}</Text>
                      <Text style={styles.exerciseSelectMuscle}>
                        {exercise.primaryMuscles.join(', ')}
                      </Text>
                    </View>
                    <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                  </AnimatedCard>
                </AnimatedListItem>
              ))}
            </Animated.ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  // Default View (No Active Workout)
  return (
    <View style={styles.container}>
      <BlurHeader
        title="Track Workout"
        scrollY={scrollY}
        leftElement={
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        }
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
          <Text style={styles.title}>Track Workout</Text>
        </SlideIn>

        {/* Quick Stats */}
        <FadeIn delay={100}>
          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.workoutsThisWeek || 0}</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.totalWorkouts || 0}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={styles.statValue}>{stats?.currentStreak || 0}</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </GlassCard>
          </View>
        </FadeIn>

        {/* Start Workout Button */}
        <SlideIn direction="bottom" delay={200}>
          <AnimatedButton
            variant="primary"
            size="large"
            onPress={() => {
              trigger('light');
              setShowStartModal(true);
            }}
            style={styles.startButton}
          >
            <Ionicons name="play-circle" size={28} color="#fff" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </AnimatedButton>
        </SlideIn>

        {/* Templates Section */}
        {templates.length > 0 && (
          <FadeIn delay={300}>
            <Text style={styles.sectionTitle}>Templates</Text>
            {templates.map((template, index) => (
              <AnimatedListItem key={template.id} index={index} enterFrom="right">
                <AnimatedCard
                  onPress={() => {
                    trigger('light');
                    setWorkoutName(template.name);
                    startWorkout(template.name, template.id);
                  }}
                  style={styles.templateCard}
                >
                  <View style={styles.templateInfo}>
                    <Text style={styles.templateName}>{template.name}</Text>
                    <Text style={styles.templateDetails}>
                      {template.exercises.length} exercises · {template.estimatedDuration} min
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </AnimatedCard>
              </AnimatedListItem>
            ))}
          </FadeIn>
        )}

        {/* Recent Workouts */}
        <FadeIn delay={400}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Workouts</Text>
            {workoutHistory.length > 3 && (
              <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            )}
          </View>
          {workoutHistory.length === 0 ? (
            <GlassCard style={styles.emptyHistoryCard}>
              <Ionicons name="calendar-outline" size={40} color={COLORS.textSecondary} />
              <Text style={styles.emptyHistoryText}>No workouts yet</Text>
              <Text style={styles.emptyHistorySubtext}>Start tracking to see your history</Text>
            </GlassCard>
          ) : (
            workoutHistory.slice(0, 3).map((workout, index) => (
              <AnimatedListItem key={workout.id} index={index} enterFrom="bottom">
                <GlassCard style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyName}>{workout.name}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(workout.completedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.historyStatText}>{workout.duration} min</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Ionicons name="layers-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.historyStatText}>{workout.totalSets} sets</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Ionicons name="barbell-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.historyStatText}>
                        {Math.round(workout.totalVolume).toLocaleString()} kg
                      </Text>
                    </View>
                  </View>
                  {workout.personalRecords && workout.personalRecords.length > 0 && (
                    <View style={styles.prBadge}>
                      <Ionicons name="trophy" size={14} color={COLORS.warning} />
                      <Text style={styles.prText}>
                        {workout.personalRecords.length} PR{workout.personalRecords.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </GlassCard>
              </AnimatedListItem>
            ))
          )}
        </FadeIn>
      </Animated.ScrollView>

      {/* Start Workout Modal */}
      <Modal
        visible={showStartModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStartModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Workout</Text>
            <AnimatedButton
              variant="ghost"
              size="small"
              onPress={() => setShowStartModal(false)}
              title="Cancel"
              textStyle={{ color: COLORS.primary }}
            />
          </View>

          <View style={styles.modalContent}>
            <SlideIn direction="bottom" delay={100}>
              <Text style={styles.inputLabel}>Workout Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="e.g., Push Day, Leg Day..."
                placeholderTextColor={COLORS.textTertiary}
                value={workoutName}
                onChangeText={setWorkoutName}
                autoFocus
              />
            </SlideIn>

            <SlideIn direction="bottom" delay={200}>
              <Text style={styles.quickStartLabel}>Quick Start</Text>
              <View style={styles.quickStartGrid}>
                {['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body'].map(
                  (name, index) => (
                    <TouchableOpacity
                      key={name}
                      style={styles.quickStartChip}
                      onPress={() => setWorkoutName(name)}
                    >
                      <Text
                        style={[
                          styles.quickStartChipText,
                          workoutName === name && styles.quickStartChipTextActive,
                        ]}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            </SlideIn>

            <SlideIn direction="bottom" delay={300}>
              <AnimatedButton
                title="Start Workout"
                variant="primary"
                size="large"
                onPress={handleStartWorkout}
                style={styles.modalStartButton}
                hapticType="heavy"
              >
                <Ionicons name="play" size={24} color="#fff" />
              </AnimatedButton>
            </SlideIn>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Workout History</Text>
            <AnimatedButton
              variant="ghost"
              size="small"
              onPress={() => setShowHistoryModal(false)}
              title="Close"
              textStyle={{ color: COLORS.primary }}
            />
          </View>

          <Animated.ScrollView style={styles.historyList}>
            {workoutHistory.map((workout, index) => (
              <AnimatedListItem key={workout.id} index={index} enterFrom="right">
                <GlassCard style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyName}>{workout.name}</Text>
                    <Text style={styles.historyDate}>
                      {new Date(workout.completedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.historyStatText}>{workout.duration} min</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Ionicons name="layers-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.historyStatText}>{workout.totalSets} sets</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Ionicons name="barbell-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.historyStatText}>
                        {Math.round(workout.totalVolume).toLocaleString()} kg
                      </Text>
                    </View>
                  </View>
                  <View style={styles.workoutMuscles}>
                    {workout.musclesWorked.map((muscle, i) => (
                      <View key={i} style={styles.muscleTag}>
                        <Text style={styles.muscleTagText}>{muscle}</Text>
                      </View>
                    ))}
                  </View>
                </GlassCard>
              </AnimatedListItem>
            ))}
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
  backButton: {
    padding: 8,
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
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // Start Button
  startButton: {
    marginBottom: 24,
    flexDirection: 'row',
    gap: 12,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  // Sections
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Templates
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  templateDetails: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  // History
  emptyHistoryCard: {
    alignItems: 'center',
    padding: 32,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  emptyHistorySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  historyCard: {
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyDate: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  workoutMuscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  muscleTag: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  muscleTagText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
    backgroundColor: `${COLORS.warning}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  prText: {
    fontSize: 12,
    color: COLORS.warning,
    fontWeight: '600',
  },
  // Active Workout
  activeHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  activeHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  workoutName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  activeContent: {
    padding: 20,
    paddingBottom: 100,
  },
  // Exercise Card
  exerciseCard: {
    marginBottom: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  muscleGroup: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  // Sets
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  setHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  warmupSet: {
    backgroundColor: `${COLORS.warning}10`,
  },
  completedSet: {
    backgroundColor: `${COLORS.success}10`,
  },
  setNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  previousText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  setInput: {
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 4,
  },
  deleteSetButton: {
    width: 30,
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addExerciseButton: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  emptyExerciseCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
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
    paddingTop: 60,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalContent: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 24,
  },
  quickStartLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  quickStartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  quickStartChip: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickStartChipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  quickStartChipTextActive: {
    color: COLORS.primary,
  },
  modalStartButton: {
    flexDirection: 'row',
    gap: 10,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    margin: 20,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  exerciseSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseSelectContent: {
    flex: 1,
  },
  exerciseSelectName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  exerciseSelectMuscle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  historyList: {
    flex: 1,
    padding: 20,
  },
});
