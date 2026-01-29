import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  DailyNutritionSummary,
  NutritionPlan,
  UserStreak,
  FoodLog,
  WeightLog,
  WeightTrend,
  Food,
  RecentFoodsResponse,
  StreakUpdate,
} from '../types';
import api from '../services/api';

interface NutritionContextType {
  todaySummary: DailyNutritionSummary | null;
  targets: NutritionPlan | null;
  streak: UserStreak | null;
  weightTrend: WeightTrend | null;
  recentFoods: RecentFoodsResponse | null;
  isLoading: boolean;
  error: string | null;

  refreshToday: () => Promise<void>;
  refreshTargets: () => Promise<void>;
  refreshStreak: () => Promise<void>;
  refreshWeightTrend: () => Promise<void>;
  refreshRecentFoods: () => Promise<void>;
  refreshAll: () => Promise<void>;

  logFood: (foodId: string, servings: number, mealType: string) => Promise<StreakUpdate | null>;
  updateLog: (logId: string, servings?: number, mealType?: string) => Promise<void>;
  deleteLog: (logId: string) => Promise<void>;
  logWeight: (weight: number, note?: string) => Promise<void>;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within NutritionProvider');
  }
  return context;
};

interface NutritionProviderProps {
  children: ReactNode;
}

export const NutritionProvider: React.FC<NutritionProviderProps> = ({ children }) => {
  const [todaySummary, setTodaySummary] = useState<DailyNutritionSummary | null>(null);
  const [targets, setTargets] = useState<NutritionPlan | null>(null);
  const [streak, setStreak] = useState<UserStreak | null>(null);
  const [weightTrend, setWeightTrend] = useState<WeightTrend | null>(null);
  const [recentFoods, setRecentFoods] = useState<RecentFoodsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshToday = useCallback(async () => {
    try {
      const summary = await api.getTodayLogs();
      setTodaySummary(summary);
    } catch (err) {
      console.error('Failed to refresh today logs:', err);
    }
  }, []);

  const refreshTargets = useCallback(async () => {
    try {
      const plan = await api.calculateNutrition();
      setTargets(plan);
    } catch (err) {
      console.error('Failed to refresh targets:', err);
    }
  }, []);

  const refreshStreak = useCallback(async () => {
    try {
      const streakData = await api.getStreak();
      setStreak(streakData);
    } catch (err) {
      console.error('Failed to refresh streak:', err);
    }
  }, []);

  const refreshWeightTrend = useCallback(async () => {
    try {
      const trend = await api.getWeightTrend();
      setWeightTrend(trend);
    } catch (err) {
      console.error('Failed to refresh weight trend:', err);
    }
  }, []);

  const refreshRecentFoods = useCallback(async () => {
    try {
      const recent = await api.getRecentFoods();
      setRecentFoods(recent);
    } catch (err) {
      console.error('Failed to refresh recent foods:', err);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        refreshToday(),
        refreshTargets(),
        refreshStreak(),
        refreshWeightTrend(),
        refreshRecentFoods(),
      ]);
    } catch (err) {
      setError('Failed to load nutrition data');
    } finally {
      setIsLoading(false);
    }
  }, [refreshToday, refreshTargets, refreshStreak, refreshWeightTrend, refreshRecentFoods]);

  const logFood = useCallback(async (
    foodId: string,
    servings: number,
    mealType: string
  ): Promise<StreakUpdate | null> => {
    try {
      const result = await api.logFoodWithStreak({ foodId, servings, mealType });

      // Update streak immediately
      setStreak({
        currentStreak: result.streak.currentStreak,
        longestStreak: result.streak.longestStreak,
        totalDaysLogged: result.streak.totalDaysLogged,
        lastLoggedDate: result.streak.lastLoggedDate,
      });

      // Refresh today's summary
      await refreshToday();
      await refreshRecentFoods();

      return result.streak;
    } catch (err) {
      console.error('Failed to log food:', err);
      throw err;
    }
  }, [refreshToday, refreshRecentFoods]);

  const updateLog = useCallback(async (
    logId: string,
    servings?: number,
    mealType?: string
  ) => {
    try {
      await api.updateFoodLog(logId, { servings, mealType });
      await refreshToday();
    } catch (err) {
      console.error('Failed to update log:', err);
      throw err;
    }
  }, [refreshToday]);

  const deleteLog = useCallback(async (logId: string) => {
    try {
      await api.deleteFoodLog(logId);
      await refreshToday();
    } catch (err) {
      console.error('Failed to delete log:', err);
      throw err;
    }
  }, [refreshToday]);

  const logWeight = useCallback(async (weight: number, note?: string) => {
    try {
      await api.logWeight(weight, note);
      await refreshWeightTrend();
    } catch (err) {
      console.error('Failed to log weight:', err);
      throw err;
    }
  }, [refreshWeightTrend]);

  return (
    <NutritionContext.Provider
      value={{
        todaySummary,
        targets,
        streak,
        weightTrend,
        recentFoods,
        isLoading,
        error,
        refreshToday,
        refreshTargets,
        refreshStreak,
        refreshWeightTrend,
        refreshRecentFoods,
        refreshAll,
        logFood,
        updateLog,
        deleteLog,
        logWeight,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
};
