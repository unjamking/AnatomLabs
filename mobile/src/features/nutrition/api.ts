import { apiClient } from '../../shared/api';
import {
  NutritionPlan, Food, FoodLog, DailyNutritionSummary,
  WeightLog, WeightTrend, SuggestionsResponse, RecentFoodsResponse,
  UserStreak, StreakUpdate, MealPreset,
} from '../../shared/types';

export async function calculateNutrition(): Promise<NutritionPlan> {
  const response = await apiClient.post('/nutrition/calculate');
  return response.data;
}

export async function getNutritionPlan(): Promise<NutritionPlan> {
  const response = await apiClient.post('/nutrition/calculate');
  return response.data;
}

export async function logFood(foodData: { foodId: string; servings: number; mealType: string }): Promise<void> {
  await apiClient.post('/nutrition/log', {
    ...foodData,
    date: new Date().toISOString(),
  });
}

export async function searchFood(query: string): Promise<Food[]> {
  const response = await apiClient.get<Food[]>('/nutrition/foods', {
    params: { search: query },
  });
  return response.data;
}

export async function getFoods(category?: string): Promise<Food[]> {
  const params = category ? { category } : {};
  const response = await apiClient.get<Food[]>('/nutrition/foods', { params });
  return response.data;
}

export async function getTodayLogs(): Promise<DailyNutritionSummary> {
  const response = await apiClient.get<DailyNutritionSummary>('/nutrition/logs/today');
  return response.data;
}

export async function getLogsByDate(date: string): Promise<DailyNutritionSummary> {
  const response = await apiClient.get<DailyNutritionSummary>('/nutrition/logs/today', {
    params: { date }
  });
  return response.data;
}

export async function getCalorieHistory(days?: number): Promise<{
  history: Array<{ date: string; calories: number; dayOfWeek: string }>;
  stats: { average: number; target: number; adherence: number; daysTracked: number; totalDays: number };
}> {
  const params = days ? { days } : {};
  const response = await apiClient.get('/nutrition/logs/history', { params });
  return response.data;
}

export async function updateFoodLog(logId: string, data: { servings?: number; mealType?: string }): Promise<FoodLog> {
  const response = await apiClient.put<{ message: string; log: FoodLog }>(`/nutrition/logs/${logId}`, data);
  return response.data.log;
}

export async function deleteFoodLog(logId: string): Promise<void> {
  await apiClient.delete(`/nutrition/logs/${logId}`);
}

export async function logWeight(weight: number, note?: string): Promise<WeightLog> {
  const response = await apiClient.post<{ message: string; weightLog: WeightLog }>('/nutrition/weight', { weight, note });
  return response.data.weightLog;
}

export async function getWeightHistory(days?: number): Promise<WeightLog[]> {
  const params = days ? { days } : {};
  const response = await apiClient.get<WeightLog[]>('/nutrition/weight', { params });
  return response.data;
}

export async function getWeightTrend(days?: number): Promise<WeightTrend> {
  const params = days ? { days } : {};
  const response = await apiClient.get<WeightTrend>('/nutrition/weight/trend', { params });
  return response.data;
}

export async function getSuggestions(): Promise<SuggestionsResponse> {
  const response = await apiClient.get<SuggestionsResponse>('/nutrition/suggestions');
  return response.data;
}

export async function getRecentFoods(limit?: number): Promise<RecentFoodsResponse> {
  const params = limit ? { limit } : {};
  const response = await apiClient.get<RecentFoodsResponse>('/nutrition/recent', { params });
  return response.data;
}

export async function getStreak(): Promise<UserStreak> {
  const response = await apiClient.get<UserStreak>('/nutrition/streak');
  return response.data;
}

export async function getMealPresets(): Promise<MealPreset[]> {
  const response = await apiClient.get<MealPreset[]>('/nutrition/presets');
  return response.data;
}

export async function createMealPreset(name: string, items: { foodId: string; servings: number }[]): Promise<MealPreset> {
  const response = await apiClient.post<{ message: string; preset: MealPreset }>('/nutrition/presets', { name, items });
  return response.data.preset;
}

export async function deleteMealPreset(presetId: string): Promise<void> {
  await apiClient.delete(`/nutrition/presets/${presetId}`);
}

export async function logMealPreset(presetId: string, mealType: string): Promise<{ logs: FoodLog[]; streak: StreakUpdate }> {
  const response = await apiClient.post<{ message: string; logs: FoodLog[]; streak: StreakUpdate }>(
    `/nutrition/presets/${presetId}/log`,
    { mealType }
  );
  return { logs: response.data.logs, streak: response.data.streak };
}

export async function logFoodWithStreak(foodData: { foodId: string; servings: number; mealType: string }): Promise<{ log: FoodLog; streak: StreakUpdate }> {
  const response = await apiClient.post<{ message: string; log: FoodLog; streak: StreakUpdate }>(
    '/nutrition/log',
    { ...foodData, date: new Date().toISOString() }
  );
  return { log: response.data.log, streak: response.data.streak };
}

export async function generateDietPlan(params?: { targetWeight?: number; dietGoal?: string }): Promise<any> {
  const response = await apiClient.post('/diet-plans/generate', params || {});
  return response.data;
}

export async function getDietPlans(): Promise<any[]> {
  const response = await apiClient.get('/diet-plans');
  return response.data;
}

export async function deleteDietPlan(id: string): Promise<void> {
  await apiClient.delete(`/diet-plans/${id}`);
}
