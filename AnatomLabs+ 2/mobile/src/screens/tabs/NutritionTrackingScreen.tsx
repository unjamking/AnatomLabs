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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNutrition } from '../../context/NutritionContext';
import { useWorkoutTracking } from '../../context/WorkoutTrackingContext';
import {
  AnimatedCard,
  AnimatedButton,
  AnimatedListItem,
  AnimatedProgressRing,
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
import { Food, FoodLog, NutrientTarget } from '../../types';
import api from '../../services/api';

// Micronutrient daily values (RDA)
const MICRONUTRIENT_RDA: { [key: string]: { name: string; unit: string; target: number; color: string } } = {
  fiber: { name: 'Fiber', unit: 'g', target: 28, color: '#8B4513' },
  sugar: { name: 'Sugar', unit: 'g', target: 50, color: '#FF69B4' },
  sodium: { name: 'Sodium', unit: 'mg', target: 2300, color: '#4169E1' },
  vitaminC: { name: 'Vitamin C', unit: 'mg', target: 90, color: '#FFA500' },
  vitaminD: { name: 'Vitamin D', unit: 'mcg', target: 20, color: '#FFD700' },
  calcium: { name: 'Calcium', unit: 'mg', target: 1000, color: '#E0E0E0' },
  iron: { name: 'Iron', unit: 'mg', target: 18, color: '#B22222' },
  potassium: { name: 'Potassium', unit: 'mg', target: 4700, color: '#9370DB' },
  magnesium: { name: 'Magnesium', unit: 'mg', target: 420, color: '#20B2AA' },
  zinc: { name: 'Zinc', unit: 'mg', target: 11, color: '#708090' },
};

type TabType = 'diary' | 'nutrients' | 'trends' | 'biometrics';

export default function NutritionTrackingScreen() {
  const {
    todaySummary,
    targets,
    streak,
    weightTrend,
    recentFoods,
    isLoading,
    refreshAll,
    refreshToday,
    logFood,
    updateLog,
    deleteLog,
    logWeight,
  } = useNutrition();

  const { workoutHistory } = useWorkoutTracking();

  const [activeTab, setActiveTab] = useState<TabType>('diary');
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [showFoodDetailModal, setShowFoodDetailModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('breakfast');
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [servings, setServings] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [waterIntake, setWaterIntake] = useState(0);

  const scrollY = useSharedValue(0);
  const navigation = useNavigation();
  const { trigger } = useHaptics();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    refreshAll();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    trigger('light');
    await refreshAll();
    setIsRefreshing(false);
    trigger('success');
  };

  // Search foods
  const searchFoods = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const results = await api.searchFood(query);
      setSearchResults(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchFoods(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchFoods]);

  // Handle adding food
  const handleAddFood = async () => {
    if (!selectedFood) return;
    trigger('success');
    try {
      await logFood(selectedFood.id, servings, selectedMealType);
      setShowFoodDetailModal(false);
      setShowAddFoodModal(false);
      setSelectedFood(null);
      setServings(1);
      setSearchQuery('');
    } catch (err) {
      trigger('error');
      Alert.alert('Error', 'Failed to log food');
    }
  };

  // Calculate consumed nutrients
  const consumed = todaySummary?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const targetValues = targets || { targetCalories: 2000, macros: { protein: 150, carbs: 250, fat: 67 } };

  // Calculate remaining
  const remaining = {
    calories: Math.max(0, targetValues.targetCalories - consumed.calories),
    protein: Math.max(0, targetValues.macros.protein - consumed.protein),
    carbs: Math.max(0, targetValues.macros.carbs - consumed.carbs),
    fat: Math.max(0, targetValues.macros.fat - consumed.fat),
  };

  // Net calories (with exercise) - estimate from today's workouts
  const today = new Date().toISOString().split('T')[0];
  const todaysWorkouts = workoutHistory.filter(w =>
    w.completedAt && w.completedAt.startsWith(today)
  );
  // Estimate: ~5 calories per minute of strength training + 0.05 per kg lifted
  const caloriesBurned = todaysWorkouts.reduce((total, workout) => {
    const durationCals = workout.duration * 5;
    const volumeCals = workout.totalVolume * 0.05;
    return total + durationCals + volumeCals;
  }, 0);
  const netCalories = consumed.calories - Math.round(caloriesBurned);

  // Tab indicator animation
  const tabIndicatorPosition = useSharedValue(0);
  const handleTabChange = (tab: TabType) => {
    trigger('selection');
    setActiveTab(tab);
    const positions = { diary: 0, nutrients: 1, trends: 2, biometrics: 3 };
    tabIndicatorPosition.value = withSpring(positions[tab] * 85, SPRING_CONFIG.snappy);
  };

  // Add water
  const addWater = (amount: number) => {
    trigger('light');
    setWaterIntake(prev => prev + amount);
  };

  const renderDiaryTab = () => (
    <>
      {/* Calorie Summary Card */}
      <SlideIn direction="bottom" delay={100}>
        <GlassCard style={styles.calorieCard}>
          <View style={styles.calorieHeader}>
            <View>
              <Text style={styles.calorieTitle}>Today's Calories</Text>
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            {streak && streak.currentStreak > 0 && (
              <View style={styles.streakBadge}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <Text style={styles.streakText}>{streak.currentStreak}</Text>
              </View>
            )}
          </View>

          <View style={styles.calorieRing}>
            <AnimatedProgressRing
              progress={(consumed.calories / targetValues.targetCalories) * 100}
              size={160}
              strokeWidth={14}
              color={consumed.calories > targetValues.targetCalories ? COLORS.warning : COLORS.primary}
              label="Remaining"
              value={remaining.calories.toString()}
              delay={0}
              duration={800}
            />
          </View>

          <View style={styles.calorieBreakdown}>
            <View style={styles.calorieItem}>
              <Text style={styles.calorieLabel}>Goal</Text>
              <Text style={styles.calorieValue}>{targetValues.targetCalories}</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieItem}>
              <Text style={styles.calorieLabel}>Food</Text>
              <Text style={[styles.calorieValue, { color: COLORS.primary }]}>
                +{Math.round(consumed.calories)}
              </Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieItem}>
              <Text style={styles.calorieLabel}>Exercise</Text>
              <Text style={[styles.calorieValue, { color: COLORS.success }]}>
                -{caloriesBurned}
              </Text>
            </View>
          </View>
        </GlassCard>
      </SlideIn>

      {/* Macro Progress */}
      <SlideIn direction="bottom" delay={200}>
        <GlassCard style={styles.macroCard}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <View style={styles.macroGrid}>
            {[
              { name: 'Protein', current: consumed.protein, target: targetValues.macros.protein, color: COLORS.primary, unit: 'g' },
              { name: 'Carbs', current: consumed.carbs, target: targetValues.macros.carbs, color: COLORS.info, unit: 'g' },
              { name: 'Fat', current: consumed.fat, target: targetValues.macros.fat, color: COLORS.warning, unit: 'g' },
            ].map((macro, index) => (
              <View key={macro.name} style={styles.macroItem}>
                <AnimatedProgressRing
                  progress={(macro.current / macro.target) * 100}
                  size={70}
                  strokeWidth={6}
                  color={macro.color}
                  label={macro.name}
                  value={`${Math.round(macro.current)}${macro.unit}`}
                  delay={300 + index * 100}
                />
                <Text style={styles.macroRemaining}>
                  {Math.round(Math.max(0, macro.target - macro.current))}{macro.unit} left
                </Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </SlideIn>

      {/* Water Tracking */}
      <SlideIn direction="bottom" delay={300}>
        <GlassCard style={styles.waterCard}>
          <View style={styles.waterHeader}>
            <View style={styles.waterInfo}>
              <Ionicons name="water" size={24} color={COLORS.info} />
              <Text style={styles.waterTitle}>Water</Text>
            </View>
            <Text style={styles.waterAmount}>{waterIntake} / 2500 ml</Text>
          </View>
          <View style={styles.waterProgress}>
            <View style={[styles.waterProgressFill, { width: `${Math.min(100, (waterIntake / 2500) * 100)}%` }]} />
          </View>
          <View style={styles.waterButtons}>
            {[250, 500, 750].map(amount => (
              <TouchableOpacity
                key={amount}
                style={styles.waterButton}
                onPress={() => addWater(amount)}
              >
                <Text style={styles.waterButtonText}>+{amount}ml</Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>
      </SlideIn>

      {/* Meals */}
      <FadeIn delay={400}>
        <Text style={styles.sectionTitle}>Meals</Text>
      </FadeIn>

      {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType, mealIndex) => {
        const meals = todaySummary?.meals?.[mealType as keyof typeof todaySummary.meals] || [];
        const mealCalories = meals.reduce((sum, log) => sum + (log.totalCalories || log.food.calories * log.servings), 0);

        return (
          <AnimatedListItem key={mealType} index={mealIndex} enterFrom="right">
            <GlassCard style={styles.mealCard}>
              <TouchableOpacity
                style={styles.mealHeader}
                onPress={() => {
                  trigger('light');
                  setSelectedMealType(mealType as any);
                  setShowAddFoodModal(true);
                }}
              >
                <View style={styles.mealInfo}>
                  <Ionicons
                    name={
                      mealType === 'breakfast' ? 'sunny-outline' :
                      mealType === 'lunch' ? 'partly-sunny-outline' :
                      mealType === 'dinner' ? 'moon-outline' :
                      'cafe-outline'
                    }
                    size={24}
                    color={COLORS.primary}
                  />
                  <Text style={styles.mealName}>{mealType.charAt(0).toUpperCase() + mealType.slice(1)}</Text>
                </View>
                <View style={styles.mealRight}>
                  <Text style={styles.mealCalories}>{Math.round(mealCalories)} kcal</Text>
                  <Ionicons name="add-circle" size={24} color={COLORS.primary} />
                </View>
              </TouchableOpacity>

              {meals.length > 0 && (
                <View style={styles.mealItems}>
                  {meals.map((log, logIndex) => (
                    <View key={log.id} style={styles.foodItem}>
                      <View style={styles.foodInfo}>
                        <Text style={styles.foodName} numberOfLines={1}>{log.food.name}</Text>
                        <Text style={styles.foodServings}>{log.servings} × {log.food.servingSize}</Text>
                      </View>
                      <View style={styles.foodNutrients}>
                        <Text style={styles.foodCalories}>
                          {Math.round(log.food.calories * log.servings)} kcal
                        </Text>
                        <View style={styles.macroMini}>
                          <Text style={[styles.macroMiniText, { color: COLORS.primary }]}>
                            P {Math.round(log.food.protein * log.servings)}
                          </Text>
                          <Text style={[styles.macroMiniText, { color: COLORS.info }]}>
                            C {Math.round(log.food.carbs * log.servings)}
                          </Text>
                          <Text style={[styles.macroMiniText, { color: COLORS.warning }]}>
                            F {Math.round(log.food.fat * log.servings)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => {
                          Alert.alert('Delete', 'Remove this food?', [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => {
                                trigger('warning');
                                deleteLog(log.id);
                              },
                            },
                          ]);
                        }}
                      >
                        <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>
          </AnimatedListItem>
        );
      })}
    </>
  );

  const renderNutrientsTab = () => (
    <>
      <SlideIn direction="bottom" delay={100}>
        <GlassCard style={styles.nutrientOverview}>
          <Text style={styles.sectionTitle}>Nutrient Targets</Text>
          <Text style={styles.nutrientSubtitle}>Daily progress towards your goals</Text>
        </GlassCard>
      </SlideIn>

      {/* Macros Section */}
      <FadeIn delay={150}>
        <Text style={styles.nutrientCategory}>Macronutrients</Text>
      </FadeIn>

      {[
        { name: 'Calories', current: consumed.calories, target: targetValues.targetCalories, unit: 'kcal', color: COLORS.primary },
        { name: 'Protein', current: consumed.protein, target: targetValues.macros.protein, unit: 'g', color: COLORS.primary },
        { name: 'Carbohydrates', current: consumed.carbs, target: targetValues.macros.carbs, unit: 'g', color: COLORS.info },
        { name: 'Fat', current: consumed.fat, target: targetValues.macros.fat, unit: 'g', color: COLORS.warning },
      ].map((nutrient, index) => {
        const percentage = Math.min(100, (nutrient.current / nutrient.target) * 100);
        return (
          <AnimatedListItem key={nutrient.name} index={index} enterFrom="right">
            <View style={styles.nutrientRow}>
              <View style={styles.nutrientInfo}>
                <Text style={styles.nutrientName}>{nutrient.name}</Text>
                <Text style={styles.nutrientValues}>
                  {Math.round(nutrient.current)} / {nutrient.target} {nutrient.unit}
                </Text>
              </View>
              <View style={styles.nutrientBarContainer}>
                <View style={styles.nutrientBar}>
                  <Animated.View
                    style={[
                      styles.nutrientBarFill,
                      { width: `${percentage}%`, backgroundColor: nutrient.color },
                    ]}
                  />
                </View>
                <Text style={[styles.nutrientPercentage, { color: nutrient.color }]}>
                  {Math.round(percentage)}%
                </Text>
              </View>
            </View>
          </AnimatedListItem>
        );
      })}

      {/* Micronutrients Section */}
      <FadeIn delay={300}>
        <Text style={styles.nutrientCategory}>Vitamins & Minerals</Text>
      </FadeIn>

      {Object.entries(MICRONUTRIENT_RDA).map(([key, nutrient], index) => {
        // Calculate from actual food logs where data is available
        let current = 0;
        if (todaySummary?.meals) {
          const allLogs = [
            ...(todaySummary.meals.breakfast || []),
            ...(todaySummary.meals.lunch || []),
            ...(todaySummary.meals.dinner || []),
            ...(todaySummary.meals.snack || []),
          ];
          allLogs.forEach(log => {
            const food = log.food;
            const multiplier = log.servings || 1;
            // Use available food data for fiber, sugar, sodium
            if (key === 'fiber' && food.fiber) current += food.fiber * multiplier;
            if (key === 'sugar' && food.sugar) current += food.sugar * multiplier;
            if (key === 'sodium' && food.sodium) current += food.sodium * multiplier;
            // For other micronutrients, show as unavailable (0) rather than fake data
          });
        }
        const percentage = nutrient.target > 0 ? Math.min(100, (current / nutrient.target) * 100) : 0;
        const hasData = ['fiber', 'sugar', 'sodium'].includes(key);

        return (
          <AnimatedListItem key={key} index={index + 4} enterFrom="right">
            <View style={[styles.nutrientRow, !hasData && styles.nutrientRowUnavailable]}>
              <View style={styles.nutrientInfo}>
                <Text style={[styles.nutrientName, !hasData && styles.nutrientNameUnavailable]}>
                  {nutrient.name}
                  {!hasData && ' *'}
                </Text>
                <Text style={styles.nutrientValues}>
                  {hasData ? `${Math.round(current)} / ${nutrient.target} ${nutrient.unit}` : 'Data unavailable'}
                </Text>
              </View>
              <View style={styles.nutrientBarContainer}>
                <View style={styles.nutrientBar}>
                  <Animated.View
                    style={[
                      styles.nutrientBarFill,
                      {
                        width: hasData ? `${percentage}%` : '0%',
                        backgroundColor: percentage >= 100 ? COLORS.success : nutrient.color,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.nutrientPercentage, { color: hasData ? (percentage >= 100 ? COLORS.success : nutrient.color) : COLORS.textTertiary }]}>
                  {hasData ? `${Math.round(percentage)}%` : '--'}
                </Text>
              </View>
            </View>
          </AnimatedListItem>
        );
      })}
    </>
  );

  const renderTrendsTab = () => (
    <>
      <SlideIn direction="bottom" delay={100}>
        <GlassCard style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Calorie Trend</Text>
          <Text style={styles.trendSubtitle}>Last 7 days</Text>
          <View style={styles.trendChart}>
            {[1800, 2100, 1950, 2200, 1900, 2050, consumed.calories].map((cal, i) => {
              const maxCal = 2500;
              const height = (cal / maxCal) * 100;
              return (
                <View key={i} style={styles.trendBarContainer}>
                  <View style={[styles.trendBar, { height: `${height}%` }]}>
                    {i === 6 && <View style={styles.currentDayIndicator} />}
                  </View>
                  <Text style={styles.trendLabel}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.trendStats}>
            <View style={styles.trendStat}>
              <Text style={styles.trendStatLabel}>Average</Text>
              <Text style={styles.trendStatValue}>2,000</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendStatLabel}>Goal</Text>
              <Text style={styles.trendStatValue}>{targetValues.targetCalories}</Text>
            </View>
            <View style={styles.trendStat}>
              <Text style={styles.trendStatLabel}>Adherence</Text>
              <Text style={[styles.trendStatValue, { color: COLORS.success }]}>85%</Text>
            </View>
          </View>
        </GlassCard>
      </SlideIn>

      <SlideIn direction="bottom" delay={200}>
        <GlassCard style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Weight Progress</Text>
          {weightTrend ? (
            <>
              <View style={styles.weightStats}>
                <View style={styles.weightStat}>
                  <Text style={styles.weightStatLabel}>Current</Text>
                  <Text style={styles.weightStatValue}>{weightTrend.current || '--'} kg</Text>
                </View>
                <View style={styles.weightStat}>
                  <Text style={styles.weightStatLabel}>7-Day Avg</Text>
                  <Text style={styles.weightStatValue}>{weightTrend.average7Day?.toFixed(1) || '--'} kg</Text>
                </View>
                <View style={styles.weightStat}>
                  <Text style={styles.weightStatLabel}>Change</Text>
                  <Text style={[styles.weightStatValue, { color: weightTrend.trend === 'down' ? COLORS.success : COLORS.warning }]}>
                    {weightTrend.change ? `${weightTrend.change > 0 ? '+' : ''}${weightTrend.change.toFixed(1)}` : '--'} kg
                  </Text>
                </View>
              </View>
              <View style={styles.trendIndicator}>
                <Ionicons
                  name={weightTrend.trend === 'down' ? 'trending-down' : weightTrend.trend === 'up' ? 'trending-up' : 'remove'}
                  size={24}
                  color={weightTrend.trend === 'down' ? COLORS.success : weightTrend.trend === 'up' ? COLORS.warning : COLORS.textSecondary}
                />
                <Text style={styles.trendText}>
                  {weightTrend.trend === 'down' ? 'Losing weight' : weightTrend.trend === 'up' ? 'Gaining weight' : 'Stable'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>Log your weight to see trends</Text>
          )}
        </GlassCard>
      </SlideIn>

      <SlideIn direction="bottom" delay={300}>
        <GlassCard style={styles.trendCard}>
          <Text style={styles.sectionTitle}>Macro Distribution</Text>
          <View style={styles.macroDistribution}>
            {[
              { name: 'Protein', value: consumed.protein * 4, color: COLORS.primary },
              { name: 'Carbs', value: consumed.carbs * 4, color: COLORS.info },
              { name: 'Fat', value: consumed.fat * 9, color: COLORS.warning },
            ].map((macro, index) => {
              const total = consumed.protein * 4 + consumed.carbs * 4 + consumed.fat * 9;
              const percentage = total > 0 ? (macro.value / total) * 100 : 0;
              return (
                <View key={macro.name} style={styles.macroDistItem}>
                  <View style={[styles.macroDistColor, { backgroundColor: macro.color }]} />
                  <Text style={styles.macroDistName}>{macro.name}</Text>
                  <Text style={styles.macroDistPercent}>{Math.round(percentage)}%</Text>
                </View>
              );
            })}
          </View>
        </GlassCard>
      </SlideIn>
    </>
  );

  const renderBiometricsTab = () => (
    <>
      <SlideIn direction="bottom" delay={100}>
        <GlassCard style={styles.biometricCard}>
          <View style={styles.biometricHeader}>
            <Ionicons name="scale-outline" size={24} color={COLORS.primary} />
            <Text style={styles.biometricTitle}>Log Weight</Text>
          </View>
          <View style={styles.weightInputContainer}>
            <TextInput
              style={styles.weightInput}
              placeholder="Enter weight"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="numeric"
              onSubmitEditing={(e) => {
                const weight = parseFloat(e.nativeEvent.text);
                if (weight > 0) {
                  trigger('success');
                  logWeight(weight);
                }
              }}
            />
            <Text style={styles.weightUnit}>kg</Text>
          </View>
        </GlassCard>
      </SlideIn>

      <FadeIn delay={200}>
        <Text style={styles.sectionTitle}>Quick Add</Text>
      </FadeIn>

      {[
        { icon: 'heart-outline', title: 'Blood Pressure', value: '120/80 mmHg' },
        { icon: 'water-outline', title: 'Blood Glucose', value: '95 mg/dL' },
        { icon: 'pulse-outline', title: 'Heart Rate', value: '72 bpm' },
        { icon: 'body-outline', title: 'Body Fat', value: '18%' },
      ].map((metric, index) => (
        <AnimatedListItem key={metric.title} index={index} enterFrom="right">
          <AnimatedCard style={styles.biometricRow}>
            <View style={styles.biometricInfo}>
              <Ionicons name={metric.icon as any} size={24} color={COLORS.info} />
              <Text style={styles.biometricName}>{metric.title}</Text>
            </View>
            <View style={styles.biometricValueContainer}>
              <Text style={styles.biometricValue}>{metric.value}</Text>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </View>
          </AnimatedCard>
        </AnimatedListItem>
      ))}
    </>
  );

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Advanced Tracking"
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
        {/* Tab Selector */}
        <FadeIn delay={50}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tabScroll}
            contentContainerStyle={styles.tabContainer}
          >
            {[
              { id: 'diary', label: 'Diary', icon: 'book-outline' },
              { id: 'nutrients', label: 'Nutrients', icon: 'nutrition-outline' },
              { id: 'trends', label: 'Trends', icon: 'trending-up-outline' },
              { id: 'biometrics', label: 'Biometrics', icon: 'pulse-outline' },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tab, activeTab === tab.id && styles.tabActive]}
                onPress={() => handleTabChange(tab.id as TabType)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={activeTab === tab.id ? '#fff' : COLORS.textSecondary}
                />
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </FadeIn>

        {/* Tab Content */}
        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={220} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={100} borderRadius={16} />
          </View>
        ) : (
          <>
            {activeTab === 'diary' && renderDiaryTab()}
            {activeTab === 'nutrients' && renderNutrientsTab()}
            {activeTab === 'trends' && renderTrendsTab()}
            {activeTab === 'biometrics' && renderBiometricsTab()}
          </>
        )}
      </Animated.ScrollView>

      {/* Add Food Modal */}
      <Modal
        visible={showAddFoodModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddFoodModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Add to {selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}
            </Text>
            <AnimatedButton
              variant="ghost"
              size="small"
              onPress={() => setShowAddFoodModal(false)}
              title="Cancel"
              textStyle={{ color: COLORS.primary }}
            />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              placeholderTextColor={COLORS.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {isSearching && <Ionicons name="hourglass-outline" size={20} color={COLORS.textSecondary} />}
          </View>

          {/* Recent Foods */}
          {!searchQuery && recentFoods?.recent && recentFoods.recent.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentTitle}>Recent</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {recentFoods.recent.slice(0, 8).map((food) => (
                  <TouchableOpacity
                    key={food.id}
                    style={styles.recentChip}
                    onPress={() => {
                      setSelectedFood(food);
                      setServings(food.defaultServings || 1);
                      setShowFoodDetailModal(true);
                    }}
                  >
                    <Text style={styles.recentChipText} numberOfLines={1}>{food.name}</Text>
                    <Text style={styles.recentChipCalories}>{food.calories} cal</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <Animated.ScrollView style={styles.foodList}>
            {searchResults.map((food, index) => (
              <AnimatedListItem key={food.id} index={index} enterFrom="right">
                <AnimatedCard
                  onPress={() => {
                    setSelectedFood(food);
                    setServings(1);
                    setShowFoodDetailModal(true);
                  }}
                  style={styles.foodSearchCard}
                >
                  <View style={styles.foodSearchInfo}>
                    <Text style={styles.foodSearchName}>{food.name}</Text>
                    <Text style={styles.foodSearchServing}>{food.servingSize}</Text>
                  </View>
                  <View style={styles.foodSearchNutrients}>
                    <Text style={styles.foodSearchCalories}>{food.calories} cal</Text>
                    <View style={styles.foodSearchMacros}>
                      <Text style={[styles.foodSearchMacro, { color: COLORS.primary }]}>P {food.protein}g</Text>
                      <Text style={[styles.foodSearchMacro, { color: COLORS.info }]}>C {food.carbs}g</Text>
                      <Text style={[styles.foodSearchMacro, { color: COLORS.warning }]}>F {food.fat}g</Text>
                    </View>
                  </View>
                </AnimatedCard>
              </AnimatedListItem>
            ))}
          </Animated.ScrollView>
        </View>
      </Modal>

      {/* Food Detail Modal */}
      <Modal
        visible={showFoodDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFoodDetailModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Food</Text>
            <AnimatedButton
              variant="ghost"
              size="small"
              onPress={() => setShowFoodDetailModal(false)}
              title="Cancel"
              textStyle={{ color: COLORS.primary }}
            />
          </View>

          {selectedFood && (
            <View style={styles.foodDetailContent}>
              <GlassCard style={styles.foodDetailCard}>
                <Text style={styles.foodDetailName}>{selectedFood.name}</Text>
                <Text style={styles.foodDetailServing}>{selectedFood.servingSize}</Text>

                <View style={styles.servingsControl}>
                  <Text style={styles.servingsLabel}>Servings</Text>
                  <View style={styles.servingsButtons}>
                    <TouchableOpacity
                      style={styles.servingButton}
                      onPress={() => setServings(Math.max(0.5, servings - 0.5))}
                    >
                      <Ionicons name="remove" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.servingsValue}>{servings}</Text>
                    <TouchableOpacity
                      style={styles.servingButton}
                      onPress={() => setServings(servings + 0.5)}
                    >
                      <Ionicons name="add" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.foodDetailNutrients}>
                  <View style={styles.foodDetailNutrient}>
                    <Text style={styles.foodDetailNutrientValue}>
                      {Math.round(selectedFood.calories * servings)}
                    </Text>
                    <Text style={styles.foodDetailNutrientLabel}>Calories</Text>
                  </View>
                  <View style={[styles.foodDetailNutrient, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                    <Text style={[styles.foodDetailNutrientValue, { color: COLORS.primary }]}>
                      {Math.round(selectedFood.protein * servings)}g
                    </Text>
                    <Text style={styles.foodDetailNutrientLabel}>Protein</Text>
                  </View>
                  <View style={[styles.foodDetailNutrient, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                    <Text style={[styles.foodDetailNutrientValue, { color: COLORS.info }]}>
                      {Math.round(selectedFood.carbs * servings)}g
                    </Text>
                    <Text style={styles.foodDetailNutrientLabel}>Carbs</Text>
                  </View>
                  <View style={[styles.foodDetailNutrient, { borderLeftWidth: 1, borderLeftColor: COLORS.border }]}>
                    <Text style={[styles.foodDetailNutrientValue, { color: COLORS.warning }]}>
                      {Math.round(selectedFood.fat * servings)}g
                    </Text>
                    <Text style={styles.foodDetailNutrientLabel}>Fat</Text>
                  </View>
                </View>
              </GlassCard>

              <AnimatedButton
                title="Add Food"
                variant="primary"
                size="large"
                onPress={handleAddFood}
                style={styles.addFoodButton}
                hapticType="heavy"
              />
            </View>
          )}
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
  // Tabs
  tabScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  tabContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    gap: 6,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: '#fff',
  },
  // Calorie Card
  calorieCard: {
    marginBottom: 16,
    alignItems: 'center',
  },
  calorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    marginBottom: 16,
  },
  calorieTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  dateText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${COLORS.warning}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  streakEmoji: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warning,
  },
  calorieRing: {
    marginVertical: 16,
  },
  calorieBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  calorieItem: {
    flex: 1,
    alignItems: 'center',
  },
  calorieDivider: {
    width: 1,
    height: 30,
    backgroundColor: COLORS.border,
  },
  calorieLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  calorieValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Macro Card
  macroCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroRemaining: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  // Water Card
  waterCard: {
    marginBottom: 16,
  },
  waterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  waterAmount: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  waterProgress: {
    height: 8,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  waterProgressFill: {
    height: '100%',
    backgroundColor: COLORS.info,
    borderRadius: 4,
  },
  waterButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  waterButton: {
    flex: 1,
    backgroundColor: COLORS.cardBackgroundLight,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  waterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.info,
  },
  // Meals
  mealCard: {
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  mealRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealCalories: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mealItems: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  foodServings: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  foodNutrients: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  macroMini: {
    flexDirection: 'row',
    gap: 8,
  },
  macroMiniText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    marginLeft: 12,
    padding: 4,
  },
  // Nutrients Tab
  nutrientOverview: {
    marginBottom: 16,
  },
  nutrientSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: -8,
  },
  nutrientCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 12,
  },
  nutrientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  nutrientRowUnavailable: {
    opacity: 0.6,
  },
  nutrientInfo: {
    flex: 1,
  },
  nutrientName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  nutrientNameUnavailable: {
    color: COLORS.textSecondary,
  },
  nutrientValues: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  nutrientBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutrientBar: {
    width: 100,
    height: 6,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  nutrientBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  nutrientPercentage: {
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  // Trends Tab
  trendCard: {
    marginBottom: 16,
  },
  trendSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: -8,
    marginBottom: 16,
  },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 120,
    gap: 8,
    marginBottom: 16,
  },
  trendBarContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  trendBar: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  currentDayIndicator: {
    position: 'absolute',
    top: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  trendLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  trendStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  trendStat: {
    alignItems: 'center',
  },
  trendStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  trendStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  weightStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  weightStat: {
    alignItems: 'center',
  },
  weightStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  weightStatValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trendText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  noDataText: {
    fontSize: 14,
    color: COLORS.textTertiary,
    textAlign: 'center',
    padding: 20,
  },
  macroDistribution: {
    gap: 12,
  },
  macroDistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  macroDistColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  macroDistName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  macroDistPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  // Biometrics Tab
  biometricCard: {
    marginBottom: 16,
  },
  biometricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  biometricTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  weightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInput: {
    flex: 1,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.text,
  },
  weightUnit: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 12,
  },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  biometricInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  biometricName: {
    fontSize: 16,
    color: COLORS.text,
  },
  biometricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biometricValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  // Skeleton
  skeletonContainer: {
    marginTop: 10,
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
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  recentChip: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    maxWidth: 140,
  },
  recentChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  recentChipCalories: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  foodList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  foodSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  foodSearchInfo: {
    flex: 1,
  },
  foodSearchName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  foodSearchServing: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  foodSearchNutrients: {
    alignItems: 'flex-end',
  },
  foodSearchCalories: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  foodSearchMacros: {
    flexDirection: 'row',
    gap: 8,
  },
  foodSearchMacro: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Food Detail Modal
  foodDetailContent: {
    padding: 20,
  },
  foodDetailCard: {
    marginBottom: 24,
  },
  foodDetailName: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  foodDetailServing: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  servingsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  servingsButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  servingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cardBackgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    minWidth: 50,
    textAlign: 'center',
  },
  foodDetailNutrients: {
    flexDirection: 'row',
  },
  foodDetailNutrient: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  foodDetailNutrientValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  foodDetailNutrientLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  addFoodButton: {
    marginTop: 'auto',
  },
});
