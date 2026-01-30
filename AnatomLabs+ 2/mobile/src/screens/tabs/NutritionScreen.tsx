import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNutrition } from '../../context/NutritionContext';
import api from '../../services/api';
import { NutritionPlan, FoodLog, WeightLog, FoodSuggestion } from '../../types';
import {
  DailyProgress,
  MealsList,
  QuickAddBar,
  AddFoodModal,
  WeightChart,
  StreakDisplay,
} from '../../components/nutrition';

type TabType = 'today' | 'goals' | 'progress';

export default function NutritionScreen() {
  const navigation = useNavigation<any>();
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
    deleteLog,
    logWeight,
  } = useNutrition();

  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddFoodModal, setShowAddFoodModal] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState('snack');
  const [showFormulas, setShowFormulas] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [weightHistory, setWeightHistory] = useState<WeightLog[]>([]);
  const [localTargets, setLocalTargets] = useState<NutritionPlan | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    await refreshAll();
    loadWeightHistory();
    loadTargets();
  };

  const loadWeightHistory = async () => {
    try {
      const history = await api.getWeightHistory(30);
      setWeightHistory(history);
    } catch (error) {
      console.error('Failed to load weight history:', error);
    }
  };

  const loadTargets = async () => {
    try {
      const plan = await api.calculateNutrition();
      setLocalTargets(plan);
    } catch (error) {
      console.error('Failed to load targets:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshAll();
    await loadWeightHistory();
    await loadTargets();
    setIsRefreshing(false);
  }, [refreshAll]);

  const handleAddFood = (mealType: string) => {
    setSelectedMealType(mealType);
    setShowAddFoodModal(true);
  };

  const handleFoodAdded = async (foodId: string, servings: number, mealType: string) => {
    try {
      const result = await logFood(foodId, servings, mealType);
      if (result?.badge) {
        Alert.alert('Achievement Unlocked!', result.badge);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to log food');
    }
  };

  const handleQuickAdd = async (food: any, servings: number) => {
    try {
      await logFood(food.id, servings, 'snack');
    } catch (error) {
      Alert.alert('Error', 'Failed to log food');
    }
  };

  const handleEditLog = (log: FoodLog) => {
    Alert.alert(
      'Edit Log',
      `${log.food.name}\nCurrent: ${log.servings} serving(s)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change Servings',
          onPress: () => promptServingsChange(log),
        },
      ]
    );
  };

  const promptServingsChange = (log: FoodLog) => {
    Alert.prompt(
      'Change Servings',
      `Enter new serving amount for ${log.food.name}:`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async (newServings: string | undefined) => {
            const servingsNum = parseFloat(newServings || '1');
            if (servingsNum > 0) {
              try {
                await api.updateFoodLog(log.id, { servings: servingsNum });
                await refreshToday();
              } catch (error) {
                Alert.alert('Error', 'Failed to update log');
              }
            }
          },
        },
      ],
      'plain-text',
      String(log.servings)
    );
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteLog(logId);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete log');
    }
  };

  const handleLogWeight = async () => {
    const weight = parseFloat(weightInput);
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight');
      return;
    }

    try {
      await logWeight(weight);
      setWeightInput('');
      await loadWeightHistory();
      Alert.alert('Success', 'Weight logged successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to log weight');
    }
  };

  const currentTargets = localTargets || targets;

  const consumed = todaySummary?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const targetValues = currentTargets
    ? {
        calories: currentTargets.targetCalories,
        protein: currentTargets.macros.protein,
        carbs: currentTargets.macros.carbs,
        fat: currentTargets.macros.fat,
      }
    : { calories: 2000, protein: 150, carbs: 250, fat: 65 };

  if (isLoading && !todaySummary && !currentTargets) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.loadingText}>Loading nutrition data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Advanced Tracking Button */}
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Nutrition</Text>
        <TouchableOpacity
          style={styles.advancedButton}
          onPress={() => navigation.navigate('NutritionTracking')}
        >
          <Ionicons name="analytics" size={18} color="#e74c3c" />
          <Text style={styles.advancedButtonText}>Advanced</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'today' && styles.activeTab]}
          onPress={() => setActiveTab('today')}
        >
          <Text style={[styles.tabText, activeTab === 'today' && styles.activeTabText]}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'goals' && styles.activeTab]}
          onPress={() => setActiveTab('goals')}
        >
          <Text style={[styles.tabText, activeTab === 'goals' && styles.activeTabText]}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'progress' && styles.activeTab]}
          onPress={() => setActiveTab('progress')}
        >
          <Text style={[styles.tabText, activeTab === 'progress' && styles.activeTabText]}>Progress</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'today' && (
          <>
            <DailyProgress consumed={consumed} targets={targetValues} />

            {recentFoods && recentFoods.recent.length > 0 && (
              <QuickAddBar
                recentFoods={recentFoods.recent}
                onQuickAdd={handleQuickAdd}
              />
            )}

            <MealsList
              meals={todaySummary?.meals || { breakfast: [], lunch: [], dinner: [], snack: [] }}
              onEditLog={handleEditLog}
              onDeleteLog={handleDeleteLog}
              onAddFood={handleAddFood}
            />

            <View style={styles.bottomPadding} />
          </>
        )}

        {activeTab === 'goals' && currentTargets && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Nutrition Goals</Text>
            </View>

            <View style={styles.caloriesSection}>
              <View style={styles.calorieCard}>
                <Text style={styles.calorieValue}>{Math.round(currentTargets.bmr)}</Text>
                <Text style={styles.calorieLabel}>BMR</Text>
                <Text style={styles.calorieSubtext}>Basal Metabolic Rate</Text>
                <Text style={styles.calorieDesc}>Calories burned at rest</Text>
              </View>

              <View style={styles.calorieCard}>
                <Text style={styles.calorieValue}>{Math.round(currentTargets.tdee)}</Text>
                <Text style={styles.calorieLabel}>TDEE</Text>
                <Text style={styles.calorieSubtext}>Total Daily Energy</Text>
                <Text style={styles.calorieDesc}>Maintenance calories</Text>
              </View>

              <View style={[styles.calorieCard, styles.targetCard]}>
                <Text style={[styles.calorieValue, styles.targetValue]}>
                  {Math.round(currentTargets.targetCalories || 0)}
                </Text>
                <Text style={styles.calorieLabel}>TARGET</Text>
                <Text style={styles.calorieSubtext}>Daily Goal</Text>
              </View>
            </View>

            <View style={styles.macrosSection}>
              <Text style={styles.sectionTitle}>Daily Macros</Text>

              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>Protein</Text>
                  <Text style={styles.macroAmount}>{Math.round(currentTargets.macros.protein)}g</Text>
                </View>
                <View style={styles.macroBar}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((currentTargets.macros.protein * 4 / currentTargets.targetCalories) * 100, 100)}%`,
                        backgroundColor: '#e74c3c',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.macroCalories}>
                  {Math.round(currentTargets.macros.protein * 4)} kcal
                </Text>
              </View>

              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>Carbs</Text>
                  <Text style={styles.macroAmount}>{Math.round(currentTargets.macros.carbs)}g</Text>
                </View>
                <View style={styles.macroBar}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((currentTargets.macros.carbs * 4 / currentTargets.targetCalories) * 100, 100)}%`,
                        backgroundColor: '#3498db',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.macroCalories}>
                  {Math.round(currentTargets.macros.carbs * 4)} kcal
                </Text>
              </View>

              <View style={styles.macroCard}>
                <View style={styles.macroHeader}>
                  <Text style={styles.macroName}>Fat</Text>
                  <Text style={styles.macroAmount}>{Math.round(currentTargets.macros.fat)}g</Text>
                </View>
                <View style={styles.macroBar}>
                  <View
                    style={[
                      styles.macroBarFill,
                      {
                        width: `${Math.min((currentTargets.macros.fat * 9 / currentTargets.targetCalories) * 100, 100)}%`,
                        backgroundColor: '#f39c12',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.macroCalories}>
                  {Math.round(currentTargets.macros.fat * 9)} kcal
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.formulasToggle}
              onPress={() => setShowFormulas(!showFormulas)}
            >
              <Text style={styles.formulasToggleText}>
                {showFormulas ? 'Hide' : 'Show'} Scientific Formulas
              </Text>
            </TouchableOpacity>

            {showFormulas && currentTargets.explanation && (
              <View style={styles.formulasSection}>
                <Text style={styles.sectionTitle}>Calculations</Text>

                <View style={styles.formulaCard}>
                  <Text style={styles.formulaTitle}>BMR Formula</Text>
                  <Text style={styles.formulaText}>{currentTargets.explanation.bmrFormula}</Text>
                </View>

                <View style={styles.formulaCard}>
                  <Text style={styles.formulaTitle}>TDEE Calculation</Text>
                  <Text style={styles.formulaText}>{currentTargets.explanation.tdeeCalculation}</Text>
                </View>

                <View style={styles.formulaCard}>
                  <Text style={styles.formulaTitle}>Calorie Adjustment</Text>
                  <Text style={styles.formulaText}>{currentTargets.explanation.calorieAdjustment}</Text>
                </View>

                <View style={styles.formulaCard}>
                  <Text style={styles.formulaTitle}>Macro Rationale</Text>
                  <Text style={styles.formulaText}>{currentTargets.explanation.macroRationale}</Text>
                </View>
              </View>
            )}

            <View style={styles.bottomPadding} />
          </>
        )}

        {activeTab === 'progress' && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Progress</Text>
            </View>

            <StreakDisplay streak={streak} />

            <WeightChart weightLogs={weightHistory} trend={weightTrend} />

            <View style={styles.weightInputSection}>
              <Text style={styles.weightInputLabel}>Log Today's Weight</Text>
              <View style={styles.weightInputRow}>
                <TextInput
                  style={styles.weightInput}
                  placeholder="Enter weight"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                  value={weightInput}
                  onChangeText={setWeightInput}
                />
                <Text style={styles.weightUnit}>kg</Text>
                <TouchableOpacity style={styles.logWeightButton} onPress={handleLogWeight}>
                  <Text style={styles.logWeightButtonText}>Log</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.weekSummary}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {streak?.currentStreak || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Days Logged</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>
                    {todaySummary?.logCount || 0}
                  </Text>
                  <Text style={styles.summaryLabel}>Meals Today</Text>
                </View>
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </>
        )}
      </ScrollView>

      <AddFoodModal
        visible={showAddFoodModal}
        mealType={selectedMealType}
        onClose={() => setShowAddFoodModal(false)}
        onAddFood={handleFoodAdded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#888',
    marginTop: 16,
    fontSize: 16,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 8,
    backgroundColor: '#0a0a0a',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  advancedButtonText: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: '#1a1a1a',
  },
  tabText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#e74c3c',
  },
  content: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  caloriesSection: {
    padding: 20,
    gap: 12,
  },
  calorieCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  targetCard: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  calorieValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  targetValue: {
    color: '#e74c3c',
  },
  calorieLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    marginBottom: 2,
  },
  calorieSubtext: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  calorieDesc: {
    fontSize: 12,
    color: '#aaa',
  },
  macrosSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  macroCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  macroName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  macroAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  macroBar: {
    height: 6,
    backgroundColor: '#2a2a2a',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  macroBarFill: {
    height: '100%',
  },
  macroCalories: {
    fontSize: 12,
    color: '#888',
  },
  formulasToggle: {
    margin: 20,
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  formulasToggleText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  formulasSection: {
    padding: 20,
    paddingTop: 0,
  },
  formulaCard: {
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  formulaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 6,
  },
  formulaText: {
    fontSize: 12,
    color: '#ccc',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 18,
  },
  weightInputSection: {
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  weightInputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
  },
  weightInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  weightInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: '#333',
  },
  weightUnit: {
    color: '#888',
    fontSize: 16,
  },
  logWeightButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  logWeightButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  weekSummary: {
    margin: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    color: '#666',
    fontSize: 12,
  },
  bottomPadding: {
    height: 100,
  },
});
