import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { WorkoutPlan, GenerateWorkoutRequest } from '../../types';
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
} from '../../components/animations';

export default function WorkoutsScreen() {
  const navigation = useNavigation<any>();
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Generator form state
  const [goal, setGoal] = useState<any>('muscle_gain');
  const [experienceLevel, setExperienceLevel] = useState<any>('intermediate');
  const [frequency, setFrequency] = useState(4);

  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      setIsLoading(true);
      const plans = await api.getWorkoutPlans();
      setWorkoutPlans(plans);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    trigger('light');
    await loadWorkouts();
    setIsRefreshing(false);
    trigger('success');
  };

  const generateWorkout = async () => {
    try {
      setIsGenerating(true);
      trigger('medium');
      const request: GenerateWorkoutRequest = {
        goal,
        experienceLevel,
        frequency,
        availableEquipment: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
      };
      const plan = await api.generateWorkout(request);
      setWorkoutPlans([plan, ...workoutPlans]);
      setSelectedPlan(plan);
      setShowGenerator(false);
      trigger('success');
      Alert.alert('Success', 'Workout plan generated!');
    } catch (error: any) {
      trigger('error');
      Alert.alert('Error', error.message || 'Failed to generate workout');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Workouts"
        scrollY={scrollY}
        rightElement={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => {
                trigger('light');
                navigation.navigate('WorkoutTracking');
              }}
            >
              <Ionicons name="timer" size={18} color={COLORS.primary} />
              <Text style={styles.trackButtonText}>Track</Text>
            </TouchableOpacity>
            <AnimatedButton
              variant="primary"
              size="small"
              onPress={() => {
                trigger('light');
                setShowGenerator(true);
              }}
              haptic={false}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.generateButtonText}>New</Text>
            </AnimatedButton>
          </View>
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
          <Text style={styles.title}>Your Workouts</Text>
        </SlideIn>

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} width="100%" height={120} borderRadius={16} style={{ marginBottom: 12 }} />
            ))}
          </View>
        ) : workoutPlans.length === 0 ? (
          <FadeIn delay={200}>
            <GlassCard style={styles.emptyContainer}>
              <Ionicons name="barbell-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No workout plans yet</Text>
              <Text style={styles.emptySubtext}>
                Generate a science-based workout plan
              </Text>
              <AnimatedButton
                title="Create Your First Plan"
                variant="primary"
                size="medium"
                onPress={() => setShowGenerator(true)}
                style={styles.emptyButton}
              />
            </GlassCard>
          </FadeIn>
        ) : (
          <View style={styles.plansContainer}>
            {workoutPlans.map((plan, index) => (
              <AnimatedListItem key={plan.id} index={index} enterFrom="bottom">
                <AnimatedCard
                  onPress={() => {
                    trigger('light');
                    setSelectedPlan(plan);
                  }}
                  variant="elevated"
                  style={styles.planCard}
                >
                  <View style={styles.planHeader}>
                    <View style={styles.planIconContainer}>
                      <Ionicons name="fitness" size={24} color={COLORS.primary} />
                    </View>
                    <View style={styles.planInfo}>
                      <Text style={styles.planName}>{plan.name || 'Workout Plan'}</Text>
                      <Text style={styles.planDetails}>
                        {plan.frequency || 0} days/week
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.planFooter}>
                    <View style={styles.planTag}>
                      <Text style={styles.planTagText}>
                        {(plan.goal || 'general').replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </AnimatedCard>
              </AnimatedListItem>
            ))}
          </View>
        )}
      </Animated.ScrollView>

      {/* Generator Modal */}
      <Modal
        visible={showGenerator}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowGenerator(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generate Workout Plan</Text>
            <AnimatedButton
              variant="ghost"
              size="small"
              onPress={() => setShowGenerator(false)}
              title="Cancel"
              textStyle={{ color: COLORS.primary }}
            />
          </View>

          <Animated.ScrollView style={styles.formContainer}>
            <SlideIn direction="bottom" delay={100}>
              <GlassCard style={styles.formSection}>
                <Text style={styles.formLabel}>Goal</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={goal}
                    onValueChange={(v) => {
                      trigger('selection');
                      setGoal(v);
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Muscle Gain" value="muscle_gain" />
                    <Picker.Item label="Fat Loss" value="fat_loss" />
                    <Picker.Item label="Strength" value="strength" />
                    <Picker.Item label="Endurance" value="endurance" />
                  </Picker>
                </View>
              </GlassCard>
            </SlideIn>

            <SlideIn direction="bottom" delay={200}>
              <GlassCard style={styles.formSection}>
                <Text style={styles.formLabel}>Experience Level</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={experienceLevel}
                    onValueChange={(v) => {
                      trigger('selection');
                      setExperienceLevel(v);
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Beginner" value="beginner" />
                    <Picker.Item label="Intermediate" value="intermediate" />
                    <Picker.Item label="Advanced" value="advanced" />
                  </Picker>
                </View>
              </GlassCard>
            </SlideIn>

            <SlideIn direction="bottom" delay={300}>
              <GlassCard style={styles.formSection}>
                <Text style={styles.formLabel}>Frequency (days/week)</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={frequency}
                    onValueChange={(v) => {
                      trigger('selection');
                      setFrequency(v);
                    }}
                    style={styles.picker}
                  >
                    {[2, 3, 4, 5, 6].map(n => (
                      <Picker.Item key={n} label={`${n} days`} value={n} />
                    ))}
                  </Picker>
                </View>
              </GlassCard>
            </SlideIn>

            <FadeIn delay={400}>
              <GlassCard style={styles.infoBox} borderGlow glowColor={COLORS.primary}>
                <View style={styles.infoHeader}>
                  <Ionicons name="flask" size={20} color={COLORS.primary} />
                  <Text style={styles.infoTitle}>Science-Based Approach</Text>
                </View>
                <Text style={styles.infoText}>
                  Your workout will be generated using BuiltWithScience 2025 principles:
                  {'\n\n'}• Optimal volume (10-20 sets/muscle/week)
                  {'\n'}• Progressive overload framework
                  {'\n'}• Exercise selection for max activation
                  {'\n'}• Proper recovery timing
                  {'\n\n'}No AI - pure algorithmic logic for transparency
                </Text>
              </GlassCard>
            </FadeIn>

            <SlideIn direction="bottom" delay={500}>
              <AnimatedButton
                title={isGenerating ? undefined : "Generate Plan"}
                variant="primary"
                size="large"
                onPress={generateWorkout}
                disabled={isGenerating}
                style={styles.submitButton}
                hapticType="heavy"
              >
                {isGenerating && <ActivityIndicator color="#fff" />}
              </AnimatedButton>
            </SlideIn>
          </Animated.ScrollView>
        </View>
      </Modal>

      {/* Plan Detail Modal */}
      <Modal
        visible={!!selectedPlan}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPlan(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {selectedPlan?.name}
            </Text>
            <AnimatedButton
              variant="ghost"
              size="small"
              onPress={() => setSelectedPlan(null)}
              title="Close"
              textStyle={{ color: COLORS.primary }}
            />
          </View>

          <Animated.ScrollView style={styles.detailContainer}>
            {selectedPlan?.workouts?.map((workout: any, index: number) => (
              <AnimatedListItem key={index} index={index} enterFrom="right">
                <GlassCard style={styles.workoutDay}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>Day {workout.dayOfWeek || workout.day || index + 1}</Text>
                    </View>
                    <Text style={styles.workoutDayTitle}>
                      {workout.dayName || workout.name || 'Workout'}
                    </Text>
                  </View>
                  <Text style={styles.workoutFocus}>
                    Focus: {workout.focus || workout.split || 'Full Body'}
                  </Text>

                  {workout.exercises?.map((exercise: any, exIndex: number) => (
                    <View key={exIndex} style={styles.exerciseItem}>
                      <View style={styles.exerciseHeader}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>{exIndex + 1}</Text>
                        </View>
                        <Text style={styles.exerciseName}>{exercise.exerciseName || exercise.name}</Text>
                      </View>
                      <View style={styles.exerciseStats}>
                        <View style={styles.exerciseStat}>
                          <Ionicons name="layers-outline" size={14} color={COLORS.primary} />
                          <Text style={styles.exerciseStatText}>{exercise.sets} sets</Text>
                        </View>
                        <View style={styles.exerciseStat}>
                          <Ionicons name="repeat-outline" size={14} color={COLORS.info} />
                          <Text style={styles.exerciseStatText}>{exercise.reps} reps</Text>
                        </View>
                        {exercise.rest && (
                          <View style={styles.exerciseStat}>
                            <Ionicons name="time-outline" size={14} color={COLORS.warning} />
                            <Text style={styles.exerciseStatText}>{exercise.rest}s rest</Text>
                          </View>
                        )}
                      </View>
                      {exercise.targetMuscles && (
                        <Text style={styles.exerciseTargets}>
                          Targets: {Array.isArray(exercise.targetMuscles) ? exercise.targetMuscles.join(', ') : exercise.targetMuscles}
                        </Text>
                      )}
                    </View>
                  ))}
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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  trackButtonText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  skeletonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 200,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    padding: 0,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  planDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  planFooter: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  planTag: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  planTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
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
  formContainer: {
    flex: 1,
    padding: 20,
  },
  formSection: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  pickerContainer: {
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text,
    backgroundColor: 'transparent',
  },
  infoBox: {
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  submitButton: {
    marginBottom: 40,
  },
  detailContainer: {
    flex: 1,
    padding: 20,
  },
  workoutDay: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  dayBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  workoutDayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  workoutFocus: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  exerciseItem: {
    backgroundColor: COLORS.background,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
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
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  exerciseStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 6,
  },
  exerciseStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseStatText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  exerciseTargets: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textTransform: 'capitalize',
    marginTop: 4,
  },
});
