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
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  withSpring,
} from 'react-native-reanimated';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutTracking } from '../../context/WorkoutTrackingContext';
import api from '../../services/api';
import { WorkoutPlan, GenerateWorkoutRequest, Exercise } from '../../types';
import ExerciseDetailModal from '../../components/ExerciseDetailModal';
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

// Format time as mm:ss or hh:mm:ss
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Glutes', 'Core', 'Cardio', 'Full Body'];

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

type TabType = 'plans' | 'track' | 'history';

export default function WorkoutsScreen() {
  const navigation = useNavigation<any>();
  const {
    activeWorkout,
    isWorkoutActive,
    workoutTimer,
    workoutHistory,
    stats,
    templates,
    recentWorkoutNames,
    isLoading: isTrackingLoading,
    startWorkout,
    startWorkoutFromPlan,
    cancelWorkout,
    completeWorkout,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    deleteSet,
    loadHistory,
    loadStats,
    loadRecentWorkoutNames,
    getLastWorkoutForExercise,
    repeatWorkout,
  } = useWorkoutTracking();

  const [activeTab, setActiveTab] = useState<TabType>('plans');
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [workoutName, setWorkoutName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | undefined>(undefined);
  const [selectedExerciseData, setSelectedExerciseData] = useState<{ sets?: number; reps?: string; rest?: number; notes?: string; targetMuscles?: string[] } | undefined>(undefined);

  const [customExercises, setCustomExercises] = useState<any[]>([]);
  const [showCustomExerciseModal, setShowCustomExerciseModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscleGroup, setCustomMuscleGroup] = useState('');
  const [customEquipment, setCustomEquipment] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [builderStep, setBuilderStep] = useState(0);
  const [planName, setPlanName] = useState('');
  const [planGoal, setPlanGoal] = useState('muscle_gain');
  const [planDays, setPlanDays] = useState(3);
  const [planWorkouts, setPlanWorkouts] = useState<any[]>([]);
  const [editingDayIndex, setEditingDayIndex] = useState(-1);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  const loadCustomExercises = async () => {
    try {
      const data = await api.getCustomExercises();
      setCustomExercises(data);
    } catch (err) {
      console.error('Failed to load custom exercises:', err);
    }
  };

  const handleCreateCustomExercise = async () => {
    if (!customName.trim() || !customMuscleGroup) {
      trigger('warning');
      Alert.alert('Error', 'Please enter a name and select a muscle group');
      return;
    }
    try {
      await api.createCustomExercise({
        name: customName.trim(),
        muscleGroup: customMuscleGroup,
        equipment: customEquipment.trim() || undefined,
        instructions: undefined,
        notes: customNotes.trim() || undefined,
      });
      trigger('success');
      setCustomName('');
      setCustomMuscleGroup('');
      setCustomEquipment('');
      setCustomNotes('');
      setShowCustomExerciseModal(false);
      await loadCustomExercises();
    } catch (err) {
      trigger('error');
      Alert.alert('Error', 'Failed to create custom exercise');
    }
  };

  const handleDeleteCustomExercise = async (id: string) => {
    Alert.alert('Delete Exercise', 'Are you sure you want to delete this custom exercise?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCustomExercise(id);
            trigger('success');
            await loadCustomExercises();
          } catch (err) {
            trigger('error');
            Alert.alert('Error', 'Failed to delete exercise');
          }
        },
      },
    ]);
  };

  const handleAddCustomExercise = (exercise: any) => {
    trigger('light');
    addExercise({
      id: exercise.id,
      name: exercise.name,
      primaryMuscles: [exercise.muscleGroup],
      category: 'custom',
    } as any);
    setShowExerciseModal(false);
    setSearchQuery('');
  };

  const filteredCustomExercises = searchQuery
    ? customExercises.filter(e =>
        e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : customExercises;

  const SPLIT_OPTIONS = ['Push', 'Pull', 'Legs', 'Upper', 'Lower', 'Full Body', 'Arms', 'Chest/Back', 'Custom'];

  const openPlanBuilder = (existingPlan?: any) => {
    if (existingPlan) {
      setEditingPlanId(existingPlan.id);
      setPlanName(existingPlan.name || '');
      setPlanGoal(existingPlan.goal || 'muscle_gain');
      const days = existingPlan.workouts?.length || existingPlan.daysPerWeek || 3;
      setPlanDays(days);
      setPlanWorkouts(
        (existingPlan.workouts || []).map((w: any) => ({
          dayName: w.dayName || w.name || '',
          split: w.split || 'custom',
          focus: Array.isArray(w.focus) ? w.focus : [],
          exercises: (w.exercises || []).map((ex: any) => ({
            exerciseName: ex.exerciseName || ex.name || '',
            exerciseId: ex.exerciseId || null,
            sets: ex.sets || 3,
            reps: ex.reps || '8-12',
            rest: ex.rest || 90,
            notes: ex.notes || '',
            targetMuscles: ex.targetMuscles || [],
          })),
        }))
      );
    } else {
      setEditingPlanId(null);
      setPlanName('');
      setPlanGoal('muscle_gain');
      setPlanDays(3);
      setPlanWorkouts([]);
    }
    setBuilderStep(0);
    setShowPlanBuilder(true);
  };

  const initDays = () => {
    const existing = [...planWorkouts];
    const days = [];
    for (let i = 0; i < planDays; i++) {
      days.push(existing[i] || { dayName: `Day ${i + 1}`, split: 'custom', focus: [], exercises: [] });
    }
    setPlanWorkouts(days);
    setBuilderStep(1);
  };

  const updateDay = (index: number, field: string, value: any) => {
    const updated = [...planWorkouts];
    updated[index] = { ...updated[index], [field]: value };
    setPlanWorkouts(updated);
  };

  const addExerciseToDay = (dayIndex: number, exercise: any) => {
    const updated = [...planWorkouts];
    updated[dayIndex].exercises.push({
      exerciseName: exercise.name,
      exerciseId: exercise.id || null,
      sets: 3,
      reps: '8-12',
      rest: 90,
      notes: '',
      targetMuscles: exercise.primaryMuscles || [],
    });
    setPlanWorkouts(updated);
    setShowExercisePicker(false);
    setPickerSearch('');
    setTimeout(() => setShowPlanBuilder(true), 350);
  };

  const updateExercise = (dayIndex: number, exIndex: number, field: string, value: any) => {
    const updated = [...planWorkouts];
    updated[dayIndex].exercises[exIndex] = { ...updated[dayIndex].exercises[exIndex], [field]: value };
    setPlanWorkouts(updated);
  };

  const removeExerciseFromDay = (dayIndex: number, exIndex: number) => {
    const updated = [...planWorkouts];
    updated[dayIndex].exercises.splice(exIndex, 1);
    setPlanWorkouts(updated);
  };

  const savePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }
    const emptyDays = planWorkouts.filter(d => d.exercises.length === 0);
    if (emptyDays.length === planWorkouts.length) {
      Alert.alert('Error', 'Add at least one exercise to your plan');
      return;
    }
    setIsSavingPlan(true);
    try {
      const data = {
        name: planName.trim(),
        goal: planGoal,
        daysPerWeek: planDays,
        workouts: planWorkouts.map(w => ({
          dayName: w.dayName,
          split: w.split,
          focus: w.focus,
          exercises: w.exercises,
        })),
      };
      if (editingPlanId) {
        await api.updateWorkoutPlan(editingPlanId, data);
      } else {
        await api.createCustomPlan(data);
      }
      trigger('success');
      setShowPlanBuilder(false);
      await loadWorkouts();
    } catch (err) {
      trigger('error');
      Alert.alert('Error', 'Failed to save workout plan');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const handleDeletePlan = (planId: string, planNameStr: string) => {
    Alert.alert('Delete Plan', `Delete "${planNameStr}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteWorkoutPlan(planId);
            trigger('warning');
            setWorkoutPlans(prev => prev.filter(p => p.id !== planId));
            if (selectedPlan?.id === planId) setSelectedPlan(null);
          } catch {
            Alert.alert('Error', 'Failed to delete plan');
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (showExercisePicker) {
      loadPickerExercises(pickerSearch);
    }
  }, [showExercisePicker, pickerSearch]);

  const loadPickerExercises = async (query: string) => {
    try {
      const data = await api.getExercises();
      const filtered = query
        ? data.filter(e =>
            e.name.toLowerCase().includes(query.toLowerCase()) ||
            e.primaryMuscles.some(m => m.toLowerCase().includes(query.toLowerCase()))
          )
        : data;
      setPickerExercises(filtered);
    } catch {}
  };

  const [goal, setGoal] = useState<any>('muscle_gain');
  const [experienceLevel, setExperienceLevel] = useState<any>('intermediate');
  const [frequency, setFrequency] = useState(4);

  const scrollY = useSharedValue(0);
  const tabIndicatorPosition = useSharedValue(0);
  const { trigger } = useHaptics();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    loadWorkouts();
    loadHistory();
    loadStats();
    loadRecentWorkoutNames();
    loadCustomExercises();
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
    await loadWorkouts();
    await loadHistory();
    await loadStats();
    setIsRefreshing(false);
    trigger('success');
  };

  const handleTabChange = (tab: TabType) => {
    trigger('selection');
    setActiveTab(tab);
    const positions = { plans: 0, track: 1, history: 2 };
    tabIndicatorPosition.value = withSpring(positions[tab] * 100, SPRING_CONFIG.snappy);
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
    setActiveTab('track');
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

  // Active Workout Full-Screen View
  if (isWorkoutActive && activeWorkout) {
    return (
      <View style={styles.container}>
        <View style={styles.activeHeader}>
          <View style={styles.activeHeaderTop}>
            <TouchableOpacity onPress={handleCancelWorkout}>
              <Ionicons name="close" size={26} color={COLORS.text} />
            </TouchableOpacity>
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={18} color={COLORS.primary} />
              <Text style={styles.timerText}>{formatTime(workoutTimer)}</Text>
            </View>
            <TouchableOpacity onPress={handleCompleteWorkout}>
              <Ionicons name="checkmark-circle" size={26} color={COLORS.success} />
            </TouchableOpacity>
          </View>
          <Text style={styles.workoutName}>{activeWorkout.name}</Text>
        </View>

        <Animated.ScrollView style={styles.scrollView} contentContainerStyle={styles.activeContent}>
          {activeWorkout.exercises.length === 0 ? (
            <FadeIn delay={200}>
              <GlassCard style={styles.emptyExerciseCard}>
                <Ionicons name="barbell-outline" size={44} color={COLORS.textSecondary} />
                <Text style={styles.emptyText}>No exercises added</Text>
                <Text style={styles.emptySubtext}>Tap below to add your first exercise</Text>
              </GlassCard>
            </FadeIn>
          ) : (
            activeWorkout.exercises.map((exercise, index) => (
              <AnimatedListItem key={exercise.id} index={index} enterFrom="bottom">
                <GlassCard style={styles.exerciseCard}>
                  <View style={styles.exerciseHeader}>
                    <TouchableOpacity style={styles.exerciseInfo} onPress={() => { setSelectedExerciseId(exercise.exerciseId); setSelectedExerciseName(exercise.exerciseName); setSelectedExerciseData({ targetMuscles: exercise.muscleGroup ? [exercise.muscleGroup] : [] }); }}>
                      <View style={styles.exerciseNameRow}>
                        <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                        <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
                      </View>
                      <Text style={styles.muscleGroup}>{exercise.muscleGroup}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { trigger('light'); removeExercise(exercise.id); }}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.setsHeader}>
                    <Text style={[styles.setHeaderText, { flex: 0.5 }]}>SET</Text>
                    <Text style={[styles.setHeaderText, { flex: 1 }]}>PREV</Text>
                    <Text style={[styles.setHeaderText, { flex: 1.2 }]}>KG</Text>
                    <Text style={[styles.setHeaderText, { flex: 1.2 }]}>REPS</Text>
                    <View style={{ width: 26 }} />
                  </View>

                  {exercise.sets.map((set, setIndex) => {
                    const lastWorkout = getLastWorkoutForExercise(exercise.exerciseId);
                    const previousSet = lastWorkout?.sets[setIndex];

                    return (
                      <View
                        key={set.id}
                        style={[styles.setRow, set.isWarmup && styles.warmupSet, set.completedAt && styles.completedSet]}
                      >
                        <Text style={[styles.setNumber, { flex: 0.5 }]}>{set.isWarmup ? 'W' : set.setNumber}</Text>
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
                        <TouchableOpacity style={styles.deleteSetButton} onPress={() => { trigger('light'); deleteSet(exercise.id, set.id); }}>
                          <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <TouchableOpacity style={styles.addSetButton} onPress={() => handleAddSet(exercise.id)}>
                    <Ionicons name="add" size={18} color={COLORS.primary} />
                    <Text style={styles.addSetText}>Add Set</Text>
                  </TouchableOpacity>
                </GlassCard>
              </AnimatedListItem>
            ))
          )}

          <AnimatedButton
            title="Add Exercise"
            variant="secondary"
            size="large"
            onPress={() => { trigger('light'); setShowExerciseModal(true); }}
            style={styles.addExerciseButton}
          >
            <Ionicons name="add-circle-outline" size={22} color={COLORS.primary} />
          </AnimatedButton>
        </Animated.ScrollView>

        {/* Exercise Selection Modal */}
        <Modal visible={showExerciseModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowExerciseModal(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise</Text>
              <AnimatedButton variant="ghost" size="small" onPress={() => setShowExerciseModal(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                placeholderTextColor={COLORS.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <Animated.ScrollView style={styles.exerciseList}>
              <TouchableOpacity
                style={styles.createCustomButton}
                onPress={() => setShowCustomExerciseModal(true)}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={styles.createCustomButtonText}>Create Custom Exercise</Text>
              </TouchableOpacity>

              {filteredCustomExercises.length > 0 && (
                <View style={styles.customExercisesSection}>
                  <Text style={styles.customSectionTitle}>My Exercises</Text>
                  {filteredCustomExercises.map((exercise, index) => (
                    <AnimatedListItem key={exercise.id} index={index} enterFrom="right">
                      <AnimatedCard onPress={() => handleAddCustomExercise(exercise)} style={styles.exerciseSelectCard}>
                        <View style={styles.exerciseSelectContent}>
                          <Text style={styles.exerciseSelectName}>{exercise.name}</Text>
                          <Text style={styles.exerciseSelectMuscle}>{exercise.muscleGroup}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteCustomButton}
                          onPress={(e) => { e.stopPropagation?.(); handleDeleteCustomExercise(exercise.id); }}
                        >
                          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                        </TouchableOpacity>
                        <Ionicons name="add-circle" size={22} color={COLORS.primary} style={{ marginLeft: 8 }} />
                      </AnimatedCard>
                    </AnimatedListItem>
                  ))}
                </View>
              )}

              <Text style={styles.customSectionTitle}>All Exercises</Text>
              {exercises.map((exercise, index) => (
                <AnimatedListItem key={exercise.id} index={index} enterFrom="right">
                  <AnimatedCard onPress={() => handleAddExercise(exercise)} style={styles.exerciseSelectCard}>
                    <TouchableOpacity style={styles.exerciseInfoButton} onPress={() => { setShowExerciseModal(false); setTimeout(() => { setSelectedExerciseId(exercise.id); setSelectedExerciseName(exercise.name); setSelectedExerciseData({ targetMuscles: exercise.primaryMuscles || [] }); }, 300); }}>
                      <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.exerciseSelectContent}>
                      <Text style={styles.exerciseSelectName}>{exercise.name}</Text>
                      <Text style={styles.exerciseSelectMuscle}>{exercise.primaryMuscles?.join(', ') || 'Unknown'}</Text>
                    </View>
                    <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                  </AnimatedCard>
                </AnimatedListItem>
              ))}
            </Animated.ScrollView>
          </View>
        </Modal>
      </View>
    );
  }

  // Default View with Tabs
  const renderPlansTab = () => (
    <>
      {isLoading ? (
        <View style={styles.skeletonContainer}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={100} borderRadius={12} style={{ marginBottom: 10 }} />
          ))}
        </View>
      ) : workoutPlans.length === 0 ? (
        <FadeIn delay={200}>
          <GlassCard style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={44} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>No workout plans yet</Text>
            <Text style={styles.emptySubtext}>Generate or create a custom workout plan</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <AnimatedButton
                title="Generate Plan"
                variant="primary"
                size="medium"
                onPress={() => setShowGenerator(true)}
              />
              <AnimatedButton
                title="Custom Plan"
                variant="secondary"
                size="medium"
                onPress={() => openPlanBuilder()}
              />
            </View>
          </GlassCard>
        </FadeIn>
      ) : (
        <View style={styles.plansContainer}>
          <TouchableOpacity style={styles.createCustomBtn} onPress={() => openPlanBuilder()}>
            <Ionicons name="create-outline" size={20} color={COLORS.primary} />
            <Text style={styles.createCustomBtnText}>Create Custom Plan</Text>
          </TouchableOpacity>
          {workoutPlans.map((plan, index) => (
            <AnimatedListItem key={plan.id} index={index} enterFrom="bottom">
              <AnimatedCard onPress={() => { trigger('light'); setSelectedPlan(plan); }} variant="elevated" style={styles.planCard}>
                <View style={styles.planHeader}>
                  <View style={styles.planIconContainer}>
                    <Ionicons name={plan.isCustom ? 'create' : 'fitness'} size={22} color={COLORS.primary} />
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name || 'Workout Plan'}</Text>
                    <Text style={styles.planDetails}>{plan.daysPerWeek || plan.frequency || 0} days/week</Text>
                  </View>
                  <TouchableOpacity
                    style={{ padding: 6 }}
                    onPress={() => handleDeletePlan(plan.id, plan.name || 'Workout Plan')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.textTertiary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.planFooter}>
                  <View style={styles.planTag}>
                    <Text style={styles.planTagText}>{(plan.goal || 'general').replace('_', ' ')}</Text>
                  </View>
                  {plan.isCustom && (
                    <View style={[styles.planTag, { backgroundColor: `${COLORS.info}20` }]}>
                      <Text style={[styles.planTagText, { color: COLORS.info }]}>Custom</Text>
                    </View>
                  )}
                </View>
              </AnimatedCard>
            </AnimatedListItem>
          ))}
        </View>
      )}
    </>
  );

  const renderTrackTab = () => (
    <>
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
          onPress={() => { trigger('light'); setShowStartModal(true); }}
          style={styles.startButton}
        >
          <Ionicons name="play-circle" size={26} color="#fff" />
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
                <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
              </AnimatedCard>
            </AnimatedListItem>
          ))}
        </FadeIn>
      )}

      {/* Recent Workouts Preview */}
      <FadeIn delay={400}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {workoutHistory.length > 2 && (
            <TouchableOpacity onPress={() => setActiveTab('history')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          )}
        </View>
        {workoutHistory.length === 0 ? (
          <GlassCard style={styles.emptyHistoryCard}>
            <Ionicons name="calendar-outline" size={36} color={COLORS.textSecondary} />
            <Text style={styles.emptyHistoryText}>No workouts yet</Text>
            <Text style={styles.emptyHistorySubtext}>Start tracking to see your history</Text>
          </GlassCard>
        ) : (
          workoutHistory.slice(0, 2).map((workout, index) => (
            <AnimatedListItem key={workout.id} index={index} enterFrom="bottom">
              <GlassCard style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyName}>{workout.name}</Text>
                  <Text style={styles.historyDate}>{new Date(workout.completedAt).toLocaleDateString()}</Text>
                </View>
                <View style={styles.historyStats}>
                  <View style={styles.historyStat}>
                    <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.historyStatText}>{workout.duration} min</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Ionicons name="layers-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.historyStatText}>{workout.totalSets} sets</Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Ionicons name="barbell-outline" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.historyStatText}>{Math.round(workout.totalVolume).toLocaleString()} kg</Text>
                  </View>
                </View>
                {workout.personalRecords && workout.personalRecords.length > 0 && (
                  <View style={styles.prBadge}>
                    <Ionicons name="trophy" size={12} color={COLORS.warning} />
                    <Text style={styles.prText}>{workout.personalRecords.length} PR{workout.personalRecords.length > 1 ? 's' : ''}</Text>
                  </View>
                )}
              </GlassCard>
            </AnimatedListItem>
          ))
        )}
      </FadeIn>
    </>
  );

  const renderHistoryTab = () => (
    <>
      {workoutHistory.length === 0 ? (
        <GlassCard style={styles.emptyHistoryCard}>
          <Ionicons name="calendar-outline" size={44} color={COLORS.textSecondary} />
          <Text style={styles.emptyHistoryText}>No workout history</Text>
          <Text style={styles.emptyHistorySubtext}>Complete a workout to see it here</Text>
        </GlassCard>
      ) : (
        workoutHistory.map((workout, index) => (
          <AnimatedListItem key={workout.id} index={index} enterFrom="right">
            <AnimatedCard
              onPress={() => {
                Alert.alert(
                  'Repeat Workout',
                  `Start "${workout.name}" again?`,
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Start',
                      onPress: () => {
                        trigger('success');
                        repeatWorkout(workout);
                        setActiveTab('track');
                      },
                    },
                  ]
                );
              }}
              style={styles.historyCard}
            >
              <View style={styles.historyHeader}>
                <Text style={styles.historyName}>{workout.name}</Text>
                <View style={styles.historyDateRow}>
                  <Text style={styles.historyDate}>{new Date(workout.completedAt).toLocaleDateString()}</Text>
                  <Ionicons name="refresh-outline" size={14} color={COLORS.primary} style={{ marginLeft: 6 }} />
                </View>
              </View>
              <View style={styles.historyStats}>
                <View style={styles.historyStat}>
                  <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.historyStatText}>{workout.duration} min</Text>
                </View>
                <View style={styles.historyStat}>
                  <Ionicons name="layers-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.historyStatText}>{workout.totalSets} sets</Text>
                </View>
                <View style={styles.historyStat}>
                  <Ionicons name="barbell-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.historyStatText}>{Math.round(workout.totalVolume).toLocaleString()} kg</Text>
                </View>
              </View>
              <View style={styles.workoutMuscles}>
                {workout.musclesWorked.map((muscle, i) => (
                  <View key={i} style={styles.muscleTag}>
                    <Text style={styles.muscleTagText}>{muscle}</Text>
                  </View>
                ))}
              </View>
              {workout.personalRecords && workout.personalRecords.length > 0 && (
                <View style={styles.prBadge}>
                  <Ionicons name="trophy" size={12} color={COLORS.warning} />
                  <Text style={styles.prText}>{workout.personalRecords.length} PR{workout.personalRecords.length > 1 ? 's' : ''}</Text>
                </View>
              )}
            </AnimatedCard>
          </AnimatedListItem>
        ))
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Workouts"
        scrollY={scrollY}
        rightElement={
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <AnimatedButton
              variant="secondary"
              size="small"
              onPress={() => { trigger('light'); openPlanBuilder(); }}
              haptic={false}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            </AnimatedButton>
            <AnimatedButton
              variant="primary"
              size="small"
              onPress={() => { trigger('light'); setShowGenerator(true); }}
              haptic={false}
            >
              <Ionicons name="flash" size={16} color="#fff" />
              <Text style={styles.generateButtonText}>AI</Text>
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
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Tab Selector */}
        <FadeIn delay={50}>
          <View style={styles.tabContainer}>
            {[
              { id: 'plans', label: 'Plans', icon: 'list-outline' },
              { id: 'track', label: 'Track', icon: 'timer-outline' },
              { id: 'history', label: 'History', icon: 'calendar-outline' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => handleTabChange(tab.id as TabType)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={activeTab === tab.id ? '#fff' : COLORS.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </FadeIn>

        {/* Tab Content */}
        {activeTab === 'plans' && renderPlansTab()}
        {activeTab === 'track' && renderTrackTab()}
        {activeTab === 'history' && renderHistoryTab()}

        <View style={styles.bottomPadding} />
      </Animated.ScrollView>

      {/* Generator Modal */}
      <Modal visible={showGenerator} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGenerator(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Generate Workout Plan</Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => setShowGenerator(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
          </View>

          <Animated.ScrollView style={styles.formContainer}>
            <SlideIn direction="bottom" delay={100}>
              <GlassCard style={styles.formSection}>
                <Text style={styles.formLabel}>Goal</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={goal} onValueChange={(v) => { trigger('selection'); setGoal(v); }} style={styles.picker}>
                    <Picker.Item label="Muscle Gain" value="muscle_gain" />
                    <Picker.Item label="Fat Loss" value="fat_loss" />
                    <Picker.Item label="Body Recomposition" value="body_recomposition" />
                    <Picker.Item label="General Fitness" value="general_fitness" />
                    <Picker.Item label="Endurance" value="endurance" />
                  </Picker>
                </View>
              </GlassCard>
            </SlideIn>

            <SlideIn direction="bottom" delay={200}>
              <GlassCard style={styles.formSection}>
                <Text style={styles.formLabel}>Experience Level</Text>
                <View style={styles.pickerContainer}>
                  <Picker selectedValue={experienceLevel} onValueChange={(v) => { trigger('selection'); setExperienceLevel(v); }} style={styles.picker}>
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
                  <Picker selectedValue={frequency} onValueChange={(v) => { trigger('selection'); setFrequency(v); }} style={styles.picker}>
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
                  <Ionicons name="flask" size={18} color={COLORS.primary} />
                  <Text style={styles.infoTitle}>Science-Based Approach</Text>
                </View>
                <Text style={styles.infoText}>
                  Generated using BuiltWithScience 2025 principles:
                  {'\n'}• Optimal volume (10-20 sets/muscle/week)
                  {'\n'}• Progressive overload framework
                  {'\n'}• Exercise selection for max activation
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
      <Modal visible={!!selectedPlan} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedPlan(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedPlan?.name}</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AnimatedButton variant="ghost" size="small" onPress={() => { setSelectedPlan(null); setTimeout(() => openPlanBuilder(selectedPlan), 300); }} title="Edit" textStyle={{ color: COLORS.info }} />
              <AnimatedButton variant="ghost" size="small" onPress={() => setSelectedPlan(null)} title="Close" textStyle={{ color: COLORS.primary }} />
            </View>
          </View>

          <Animated.ScrollView style={styles.detailContainer}>
            {selectedPlan?.workouts?.map((workout: any, index: number) => (
              <AnimatedListItem key={index} index={index} enterFrom="right">
                <GlassCard style={styles.workoutDay}>
                  <View style={styles.dayHeader}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>Day {workout.dayOfWeek || workout.day || index + 1}</Text>
                    </View>
                    <Text style={styles.workoutDayTitle}>{workout.dayName || workout.name || 'Workout'}</Text>
                  </View>
                  <Text style={styles.workoutFocus}>Focus: {workout.focus || workout.split || 'Full Body'}</Text>

                  {workout.exercises?.map((exercise: any, exIndex: number) => (
                    <TouchableOpacity key={exIndex} style={styles.exerciseItem} onPress={() => { setSelectedPlan(null); setTimeout(() => { setSelectedExerciseId(exercise.exerciseId || null); setSelectedExerciseName(exercise.exerciseName || exercise.name); setSelectedExerciseData({ sets: exercise.sets, reps: exercise.reps, rest: exercise.rest, notes: exercise.notes, targetMuscles: exercise.targetMuscles || [] }); }, 300); }}>
                      <View style={styles.exerciseItemHeader}>
                        <View style={styles.exerciseNumber}>
                          <Text style={styles.exerciseNumberText}>{exIndex + 1}</Text>
                        </View>
                        <Text style={styles.exerciseItemName}>{exercise.exerciseName || exercise.name}</Text>
                        <Ionicons name="information-circle-outline" size={14} color={COLORS.primary} />
                      </View>
                      <View style={styles.exerciseItemStats}>
                        <View style={styles.exerciseItemStat}>
                          <Ionicons name="layers-outline" size={12} color={COLORS.primary} />
                          <Text style={styles.exerciseItemStatText}>{exercise.sets} sets</Text>
                        </View>
                        <View style={styles.exerciseItemStat}>
                          <Ionicons name="repeat-outline" size={12} color={COLORS.info} />
                          <Text style={styles.exerciseItemStatText}>{exercise.reps} reps</Text>
                        </View>
                        {exercise.rest && (
                          <View style={styles.exerciseItemStat}>
                            <Ionicons name="time-outline" size={12} color={COLORS.warning} />
                            <Text style={styles.exerciseItemStatText}>{exercise.rest}s</Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}

                  {/* Start This Workout Button */}
                  <TouchableOpacity
                    style={styles.startWorkoutDayButton}
                    onPress={() => {
                      trigger('success');
                      startWorkoutFromPlan(workout, selectedPlan?.name || 'Workout');
                      setSelectedPlan(null);
                      setActiveTab('track');
                    }}
                  >
                    <Ionicons name="play-circle" size={18} color="#fff" />
                    <Text style={styles.startWorkoutDayButtonText}>Start This Workout</Text>
                  </TouchableOpacity>
                </GlassCard>
              </AnimatedListItem>
            ))}
          </Animated.ScrollView>
        </View>
      </Modal>

      {/* Start Workout Modal */}
      <Modal visible={showStartModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowStartModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Workout</Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => setShowStartModal(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
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
                {(recentWorkoutNames.length > 0
                  ? recentWorkoutNames
                  : ['Push Day', 'Pull Day', 'Leg Day', 'Upper Body', 'Lower Body', 'Full Body']
                ).slice(0, 6).map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={styles.quickStartChip}
                    onPress={() => setWorkoutName(name)}
                  >
                    <Text style={[styles.quickStartChipText, workoutName === name && styles.quickStartChipTextActive]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
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
                <Ionicons name="play" size={22} color="#fff" />
              </AnimatedButton>
            </SlideIn>
          </View>
        </View>
      </Modal>

      <Modal visible={showCustomExerciseModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCustomExerciseModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Custom Exercise</Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => setShowCustomExerciseModal(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.formLabel}>Exercise Name</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g., Cable Crunch, Hip Thrust..."
              placeholderTextColor={COLORS.textTertiary}
              value={customName}
              onChangeText={setCustomName}
              autoFocus
            />

            <Text style={styles.formLabel}>Muscle Group</Text>
            <View style={styles.muscleGroupGrid}>
              {MUSCLE_GROUPS.map((group) => (
                <TouchableOpacity
                  key={group}
                  style={[styles.muscleGroupChip, customMuscleGroup === group && styles.muscleGroupChipActive]}
                  onPress={() => setCustomMuscleGroup(group)}
                >
                  <Text style={[styles.muscleGroupChipText, customMuscleGroup === group && styles.muscleGroupChipTextActive]}>
                    {group}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>Equipment (optional)</Text>
            <TextInput
              style={styles.nameInput}
              placeholder="e.g., Barbell, Dumbbell, Cable..."
              placeholderTextColor={COLORS.textTertiary}
              value={customEquipment}
              onChangeText={setCustomEquipment}
            />

            <Text style={styles.formLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.nameInput, styles.notesInput]}
              placeholder="Any notes about form, tips, etc..."
              placeholderTextColor={COLORS.textTertiary}
              value={customNotes}
              onChangeText={setCustomNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <AnimatedButton
              title="Save Exercise"
              variant="primary"
              size="large"
              onPress={handleCreateCustomExercise}
              style={styles.submitButton}
              hapticType="heavy"
            />
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showPlanBuilder} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setShowPlanBuilder(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPlanId ? 'Edit Plan' : 'Custom Plan'} {builderStep === 0 ? '' : `(${builderStep}/2)`}
            </Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => setShowPlanBuilder(false)} title="Cancel" textStyle={{ color: COLORS.primary }} />
          </View>

          {builderStep === 0 && (
            <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>Plan Name</Text>
              <TextInput
                style={styles.nameInput}
                placeholder="e.g., My PPL Split, 5-Day Bro Split..."
                placeholderTextColor={COLORS.textTertiary}
                value={planName}
                onChangeText={setPlanName}
                autoFocus
              />

              <Text style={styles.formLabel}>Goal</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={planGoal} onValueChange={(v) => { trigger('selection'); setPlanGoal(v); }} style={styles.picker}>
                  <Picker.Item label="Muscle Gain" value="muscle_gain" />
                  <Picker.Item label="Fat Loss" value="fat_loss" />
                  <Picker.Item label="Body Recomposition" value="body_recomposition" />
                  <Picker.Item label="General Fitness" value="general_fitness" />
                  <Picker.Item label="Endurance" value="endurance" />
                </Picker>
              </View>

              <Text style={[styles.formLabel, { marginTop: 16 }]}>Days Per Week</Text>
              <View style={styles.quickStartGrid}>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.quickStartChip, planDays === n && { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}20` }]}
                    onPress={() => setPlanDays(n)}
                  >
                    <Text style={[styles.quickStartChipText, planDays === n && { color: COLORS.primary, fontWeight: '700' }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <AnimatedButton
                title="Next: Setup Days"
                variant="primary"
                size="large"
                onPress={initDays}
                style={styles.submitButton}
                hapticType="medium"
                disabled={!planName.trim()}
              />
            </ScrollView>
          )}

          {builderStep === 1 && (
            <ScrollView style={styles.formContainer} keyboardShouldPersistTaps="handled">
              {planWorkouts.map((day, dayIndex) => (
                <GlassCard key={dayIndex} style={styles.builderDayCard}>
                  <View style={styles.builderDayHeader}>
                    <View style={styles.dayBadge}>
                      <Text style={styles.dayBadgeText}>Day {dayIndex + 1}</Text>
                    </View>
                    <TextInput
                      style={styles.builderDayNameInput}
                      placeholder="Day name..."
                      placeholderTextColor={COLORS.textTertiary}
                      value={day.dayName}
                      onChangeText={(v) => updateDay(dayIndex, 'dayName', v)}
                    />
                  </View>

                  {day.exercises.map((ex: any, exIndex: number) => (
                    <View key={exIndex} style={styles.builderExerciseRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.builderExName}>{ex.exerciseName}</Text>
                        <View style={styles.builderExConfig}>
                          <View style={styles.builderExField}>
                            <Text style={styles.builderExFieldLabel}>Sets</Text>
                            <TextInput
                              style={styles.builderExInput}
                              keyboardType="numeric"
                              value={String(ex.sets)}
                              onChangeText={(v) => updateExercise(dayIndex, exIndex, 'sets', parseInt(v) || 0)}
                            />
                          </View>
                          <View style={styles.builderExField}>
                            <Text style={styles.builderExFieldLabel}>Reps</Text>
                            <TextInput
                              style={styles.builderExInput}
                              value={String(ex.reps)}
                              onChangeText={(v) => updateExercise(dayIndex, exIndex, 'reps', v)}
                            />
                          </View>
                          <View style={styles.builderExField}>
                            <Text style={styles.builderExFieldLabel}>Rest(s)</Text>
                            <TextInput
                              style={styles.builderExInput}
                              keyboardType="numeric"
                              value={String(ex.rest)}
                              onChangeText={(v) => updateExercise(dayIndex, exIndex, 'rest', parseInt(v) || 0)}
                            />
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity onPress={() => removeExerciseFromDay(dayIndex, exIndex)} style={{ padding: 4 }}>
                        <Ionicons name="close-circle" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.builderAddExBtn}
                    onPress={() => {
                      trigger('light');
                      setEditingDayIndex(dayIndex);
                      setShowPlanBuilder(false);
                      setTimeout(() => setShowExercisePicker(true), 350);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.builderAddExText}>Add Exercise</Text>
                  </TouchableOpacity>
                </GlassCard>
              ))}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <AnimatedButton
                  title="Back"
                  variant="secondary"
                  size="large"
                  onPress={() => setBuilderStep(0)}
                  style={{ flex: 1 }}
                />
                <AnimatedButton
                  title={isSavingPlan ? 'Saving...' : (editingPlanId ? 'Update Plan' : 'Save Plan')}
                  variant="primary"
                  size="large"
                  onPress={savePlan}
                  disabled={isSavingPlan}
                  style={{ flex: 2 }}
                  hapticType="heavy"
                />
              </View>
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </Modal>

      <Modal visible={showExercisePicker} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => { setShowExercisePicker(false); setTimeout(() => setShowPlanBuilder(true), 350); }}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <AnimatedButton variant="ghost" size="small" onPress={() => { setShowExercisePicker(false); setTimeout(() => setShowPlanBuilder(true), 350); }} title="Back" textStyle={{ color: COLORS.primary }} />
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={COLORS.textTertiary}
              value={pickerSearch}
              onChangeText={setPickerSearch}
            />
          </View>
          <Animated.ScrollView style={styles.exerciseList}>
            <TouchableOpacity
              style={styles.createCustomButton}
              onPress={() => {
                setShowExercisePicker(false);
                setTimeout(() => setShowCustomExerciseModal(true), 350);
              }}
            >
              <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              <Text style={styles.createCustomButtonText}>Create Custom Exercise</Text>
            </TouchableOpacity>

            {customExercises.filter(e =>
              !pickerSearch || e.name.toLowerCase().includes(pickerSearch.toLowerCase())
            ).map((exercise, index) => (
              <AnimatedListItem key={`custom-${exercise.id}`} index={index} enterFrom="right">
                <AnimatedCard
                  onPress={() => addExerciseToDay(editingDayIndex, { id: exercise.id, name: exercise.name, primaryMuscles: [exercise.muscleGroup] })}
                  style={styles.exerciseSelectCard}
                >
                  <View style={styles.exerciseSelectContent}>
                    <Text style={styles.exerciseSelectName}>{exercise.name}</Text>
                    <Text style={styles.exerciseSelectMuscle}>{exercise.muscleGroup} (custom)</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                </AnimatedCard>
              </AnimatedListItem>
            ))}
            {pickerExercises.map((exercise, index) => (
              <AnimatedListItem key={exercise.id} index={index + customExercises.length} enterFrom="right">
                <AnimatedCard
                  onPress={() => addExerciseToDay(editingDayIndex, exercise)}
                  style={styles.exerciseSelectCard}
                >
                  <View style={styles.exerciseSelectContent}>
                    <Text style={styles.exerciseSelectName}>{exercise.name}</Text>
                    <Text style={styles.exerciseSelectMuscle}>{exercise.primaryMuscles?.join(', ')}</Text>
                  </View>
                  <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                </AnimatedCard>
              </AnimatedListItem>
            ))}
          </Animated.ScrollView>
        </View>
      </Modal>

      <ExerciseDetailModal
        exerciseId={selectedExerciseId}
        exerciseName={selectedExerciseName}
        exerciseData={selectedExerciseData}
        visible={!!(selectedExerciseId || selectedExerciseName)}
        onClose={() => { setSelectedExerciseId(null); setSelectedExerciseName(undefined); setSelectedExerciseData(undefined); }}
      />
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
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 10,
    gap: 5,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 3,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  // Start Button
  startButton: {
    marginBottom: 20,
    flexDirection: 'row',
    gap: 10,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Sections
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  // Plans
  skeletonContainer: {
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    minWidth: 180,
  },
  plansContainer: {
    gap: 10,
  },
  planCard: {
    padding: 0,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  planIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  planDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  planFooter: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  planTag: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  planTagText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
    textTransform: 'capitalize',
  },
  // Templates
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  templateDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // History
  emptyHistoryCard: {
    alignItems: 'center',
    padding: 28,
  },
  emptyHistoryText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 10,
  },
  emptyHistorySubtext: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  historyCard: {
    marginBottom: 8,
    padding: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  historyDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 14,
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  historyStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  workoutMuscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 10,
  },
  muscleTag: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  muscleTagText: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 10,
    backgroundColor: `${COLORS.warning}20`,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  prText: {
    fontSize: 11,
    color: COLORS.warning,
    fontWeight: '600',
  },
  // Active Workout
  activeHeader: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  activeHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  workoutName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  activeContent: {
    padding: 16,
    paddingBottom: 80,
  },
  // Exercise Card
  exerciseCard: {
    marginBottom: 12,
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  muscleGroup: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  // Sets
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 6,
  },
  setHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 3,
  },
  warmupSet: {
    backgroundColor: `${COLORS.warning}10`,
  },
  completedSet: {
    backgroundColor: `${COLORS.success}10`,
  },
  setNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  previousText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
  setInput: {
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginHorizontal: 3,
  },
  deleteSetButton: {
    width: 26,
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 4,
  },
  addSetText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  addExerciseButton: {
    marginTop: 6,
    flexDirection: 'row',
    gap: 6,
  },
  emptyExerciseCard: {
    alignItems: 'center',
    padding: 32,
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
  modalContent: {
    padding: 16,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 12,
    padding: 12,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  pickerContainer: {
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 10,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.text,
    backgroundColor: 'transparent',
  },
  infoBox: {
    marginBottom: 20,
    padding: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  submitButton: {
    marginBottom: 32,
  },
  detailContainer: {
    flex: 1,
    padding: 16,
  },
  workoutDay: {
    marginBottom: 12,
    padding: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  dayBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  dayBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  workoutDayTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  workoutFocus: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  exerciseItem: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  exerciseItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  exerciseNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.cardBackgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  exerciseNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  exerciseItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  exerciseItemStats: {
    flexDirection: 'row',
    gap: 12,
  },
  exerciseItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  exerciseItemStatText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  startWorkoutDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  startWorkoutDayButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Start Modal
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  nameInput: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
  },
  quickStartLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  quickStartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 28,
  },
  quickStartChip: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quickStartChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  quickStartChipTextActive: {
    color: COLORS.primary,
  },
  modalStartButton: {
    flexDirection: 'row',
    gap: 8,
  },
  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    margin: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  },
  exerciseList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  exerciseInfoButton: {
    padding: 4,
    marginRight: 8,
  },
  exerciseSelectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
  },
  exerciseSelectContent: {
    flex: 1,
  },
  exerciseSelectName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  exerciseSelectMuscle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  createCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  createCustomButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  customExercisesSection: {
    marginBottom: 16,
  },
  customSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteCustomButton: {
    padding: 6,
  },
  muscleGroupGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  muscleGroupChip: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  muscleGroupChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  muscleGroupChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  muscleGroupChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  notesInput: {
    height: 100,
    paddingTop: 12,
  },
  bottomPadding: {
    height: 80,
  },
  createCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${COLORS.primary}15`,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
  },
  createCustomBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  builderDayCard: {
    padding: 12,
    marginBottom: 14,
  },
  builderDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  builderDayNameInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  builderExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  builderExName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  builderExConfig: {
    flexDirection: 'row',
    gap: 8,
  },
  builderExField: {
    alignItems: 'center',
  },
  builderExFieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textTertiary,
    marginBottom: 2,
  },
  builderExInput: {
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    minWidth: 55,
  },
  builderAddExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 6,
  },
  builderAddExText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
