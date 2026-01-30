import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User,
  LoginCredentials,
  RegisterData,
  AuthResponse,
  BodyPart,
  Exercise,
  WorkoutPlan,
  GenerateWorkoutRequest,
  NutritionPlan,
  DailyReport,
  WeeklyReport,
  ActivityLog,
  ApiResponse,
  ApiError,
  Food,
  FoodLog,
  DailyNutritionSummary,
  WeightLog,
  WeightTrend,
  UserStreak,
  StreakUpdate,
  SuggestionsResponse,
  RecentFoodsResponse,
  MealPreset,
} from '../types';

// IMPORTANT: Update this with your computer's IP address
// Find it using: ipconfig (Windows) or ifconfig (Mac/Linux)

// Configuration: Update your IP here
const YOUR_IP = '192.168.1.59';

// Automatic URL selection based on platform
import { Platform } from 'react-native';

const getApiUrl = () => {
  if (__DEV__) {
    // Development mode - use your Mac's IP for physical devices
    // Change to 'http://localhost:3001/api' if using iOS Simulator only
    return `http://${YOUR_IP}:3001/api`;
  }
  // Production mode
  return 'https://your-production-api.com/api';
};

const API_BASE_URL = getApiUrl();

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Handle response errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Clear token on unauthorized
          await AsyncStorage.removeItem('auth_token');
          await AsyncStorage.removeItem('user_data');
        }
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      return {
        success: false,
        error: 'API Error',
        message: (error.response.data as any)?.message || error.message,
        statusCode: error.response.status,
      };
    } else if (error.request) {
      return {
        success: false,
        error: 'Network Error',
        message: 'Unable to reach server. Check your connection.',
        statusCode: 0,
      };
    }
    return {
      success: false,
      error: 'Unknown Error',
      message: error.message,
      statusCode: 0,
    };
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post('/auth/login', credentials);
    // Backend returns { message, user, token } directly (not wrapped in data)
    const { token, user } = response.data;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    return { token, user };
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post('/auth/register', data);
    // Backend returns { message, user, token } directly (not wrapped in data)
    const { token, user } = response.data;
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(user));
    return { token, user };
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('auth_token');
    // Explicitly return boolean (not string) for Fabric compatibility
    return token !== null && token !== undefined && token !== '';
  }

  // Body Parts & Anatomy
  async getBodyParts(layer?: number): Promise<BodyPart[]> {
    const params = layer ? { layer } : {};
    const response = await this.api.get<ApiResponse<BodyPart[]>>('/body-parts', {
      params,
    });
    return response.data.data;
  }

  async getBodyPart(id: string): Promise<BodyPart> {
    const response = await this.api.get<ApiResponse<BodyPart>>(`/body-parts/${id}`);
    return response.data.data;
  }

  async getMuscles(): Promise<any[]> {
    const response = await this.api.get<ApiResponse<any[]>>('/body-parts');
    return response.data.data;
  }

  async getMuscle(id: string): Promise<any> {
    const response = await this.api.get<ApiResponse<any>>(`/body-parts/${id}`);
    return response.data.data;
  }

  // Exercises
  async getExercises(muscleId?: string): Promise<Exercise[]> {
    const url = muscleId
      ? `/exercises/for-muscle/${muscleId}`
      : '/exercises';
    const response = await this.api.get<ApiResponse<Exercise[]>>(url);
    return response.data.data;
  }

  async getExercise(id: string): Promise<Exercise> {
    const response = await this.api.get<ApiResponse<Exercise>>(`/exercises/${id}`);
    return response.data.data;
  }

  // Workouts
  async generateWorkout(request: GenerateWorkoutRequest): Promise<WorkoutPlan> {
    // Backend expects daysPerWeek, not frequency
    const backendRequest = {
      goal: request.goal,
      experienceLevel: request.experienceLevel,
      daysPerWeek: request.frequency,
      sport: request.sport,
    };
    const response = await this.api.post('/workouts/generate', backendRequest);
    // Backend returns { message, plan } directly
    return response.data.plan;
  }

  async getWorkoutPlans(): Promise<WorkoutPlan[]> {
    const response = await this.api.get('/workouts/plans');
    return response.data || [];
  }

  async getWorkoutPlan(id: string): Promise<WorkoutPlan> {
    const response = await this.api.get(`/workouts/plans/${id}`);
    return response.data;
  }

  async logWorkout(workoutId: string, exercises: any[]): Promise<void> {
    await this.api.post('/workouts/log', {
      workoutId,
      exercises,
      date: new Date().toISOString(),
    });
  }

  // Nutrition
  async calculateNutrition(): Promise<NutritionPlan> {
    const response = await this.api.post('/nutrition/calculate');
    // Backend returns the plan directly
    return response.data;
  }

  async getNutritionPlan(): Promise<NutritionPlan> {
    // Backend doesn't have a GET /nutrition endpoint, so we calculate
    const response = await this.api.post('/nutrition/calculate');
    return response.data;
  }

  async logFood(foodData: {
    foodId: string;
    servings: number;
    mealType: string;
  }): Promise<void> {
    await this.api.post('/nutrition/log', {
      ...foodData,
      date: new Date().toISOString(),
    });
  }

  async searchFood(query: string): Promise<Food[]> {
    const response = await this.api.get<Food[]>('/nutrition/foods', {
      params: { search: query },
    });
    return response.data;
  }

  async getFoods(category?: string): Promise<Food[]> {
    const params = category ? { category } : {};
    const response = await this.api.get<Food[]>('/nutrition/foods', { params });
    return response.data;
  }

  async getTodayLogs(): Promise<DailyNutritionSummary> {
    const response = await this.api.get<DailyNutritionSummary>('/nutrition/logs/today');
    return response.data;
  }

  async updateFoodLog(logId: string, data: { servings?: number; mealType?: string }): Promise<FoodLog> {
    const response = await this.api.put<{ message: string; log: FoodLog }>(`/nutrition/logs/${logId}`, data);
    return response.data.log;
  }

  async deleteFoodLog(logId: string): Promise<void> {
    await this.api.delete(`/nutrition/logs/${logId}`);
  }

  async logWeight(weight: number, note?: string): Promise<WeightLog> {
    const response = await this.api.post<{ message: string; weightLog: WeightLog }>('/nutrition/weight', {
      weight,
      note,
    });
    return response.data.weightLog;
  }

  async getWeightHistory(days?: number): Promise<WeightLog[]> {
    const params = days ? { days } : {};
    const response = await this.api.get<WeightLog[]>('/nutrition/weight', { params });
    return response.data;
  }

  async getWeightTrend(days?: number): Promise<WeightTrend> {
    const params = days ? { days } : {};
    const response = await this.api.get<WeightTrend>('/nutrition/weight/trend', { params });
    return response.data;
  }

  async getSuggestions(): Promise<SuggestionsResponse> {
    const response = await this.api.get<SuggestionsResponse>('/nutrition/suggestions');
    return response.data;
  }

  async getRecentFoods(limit?: number): Promise<RecentFoodsResponse> {
    const params = limit ? { limit } : {};
    const response = await this.api.get<RecentFoodsResponse>('/nutrition/recent', { params });
    return response.data;
  }

  async getStreak(): Promise<UserStreak> {
    const response = await this.api.get<UserStreak>('/nutrition/streak');
    return response.data;
  }

  async getMealPresets(): Promise<MealPreset[]> {
    const response = await this.api.get<MealPreset[]>('/nutrition/presets');
    return response.data;
  }

  async createMealPreset(name: string, items: { foodId: string; servings: number }[]): Promise<MealPreset> {
    const response = await this.api.post<{ message: string; preset: MealPreset }>('/nutrition/presets', {
      name,
      items,
    });
    return response.data.preset;
  }

  async deleteMealPreset(presetId: string): Promise<void> {
    await this.api.delete(`/nutrition/presets/${presetId}`);
  }

  async logMealPreset(presetId: string, mealType: string): Promise<{ logs: FoodLog[]; streak: StreakUpdate }> {
    const response = await this.api.post<{ message: string; logs: FoodLog[]; streak: StreakUpdate }>(
      `/nutrition/presets/${presetId}/log`,
      { mealType }
    );
    return { logs: response.data.logs, streak: response.data.streak };
  }

  async logFoodWithStreak(foodData: {
    foodId: string;
    servings: number;
    mealType: string;
  }): Promise<{ log: FoodLog; streak: StreakUpdate }> {
    const response = await this.api.post<{ message: string; log: FoodLog; streak: StreakUpdate }>(
      '/nutrition/log',
      {
        ...foodData,
        date: new Date().toISOString(),
      }
    );
    return { log: response.data.log, streak: response.data.streak };
  }

  // Activity
  async logActivity(activityData: Partial<ActivityLog>): Promise<void> {
    await this.api.post('/activity/log', {
      ...activityData,
      date: new Date().toISOString(),
    });
  }

  async getActivityLog(date?: string): Promise<ActivityLog> {
    const params = date ? { date } : {};
    const response = await this.api.get<ApiResponse<ActivityLog>>('/activity', {
      params,
    });
    return response.data.data;
  }

  // Reports
  async getDailyReport(date?: string): Promise<DailyReport> {
    // Backend doesn't have a daily report endpoint, so we construct one from available data
    try {
      const [nutrition, activity] = await Promise.all([
        this.calculateNutrition().catch(() => null),
        this.getActivityLog(date).catch(() => null),
      ]);

      // Return a constructed daily report
      return {
        date: date || new Date().toISOString().split('T')[0],
        nutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          targetCalories: nutrition?.targetCalories || 2000,
          targetProtein: nutrition?.macros?.protein || 150,
          targetCarbs: nutrition?.macros?.carbs || 250,
          targetFat: nutrition?.macros?.fat || 65,
          adherence: 0,
        },
        activity: {
          steps: activity?.steps || 0,
          caloriesBurned: activity?.caloriesBurned || 0,
          waterIntake: activity?.waterIntake || 0,
          sleepHours: activity?.sleepHours || 0,
        },
        training: {
          workoutsCompleted: 0,
          totalVolume: 0,
          musclesTrained: [],
        },
        injuryRisk: {
          overallRisk: 'low',
          musclesAtRisk: [],
          recommendations: [],
          needsRestDay: false,
        },
      } as DailyReport;
    } catch (error) {
      throw error;
    }
  }

  async getWeeklyReport(weekStart?: string): Promise<WeeklyReport> {
    // Construct weekly report from daily data
    const daily = await this.getDailyReport();
    return {
      ...daily,
      weekStart: weekStart || new Date().toISOString().split('T')[0],
      weekEnd: new Date().toISOString().split('T')[0],
      averageAdherence: 0,
      totalWorkouts: 0,
      progressIndicators: {},
    } as WeeklyReport;
  }

  async getInjuryRisk(): Promise<any> {
    // Backend uses POST /reports/injury-risk
    const response = await this.api.post('/reports/injury-risk');
    return response.data.assessment || {
      overallRisk: 'low',
      musclesAtRisk: [],
      recommendations: ['Start tracking your workouts to get injury risk assessments'],
      needsRestDay: false,
    };
  }
}

export default new ApiService();
