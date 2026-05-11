import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../shared/api';
import {
  TrendData, TrendMetric, AnalyticsSummary, PeriodComparison,
  VolumeByMuscle, ExerciseProgression, TrainingHeatmapDay,
  BiomarkerEntry, HealthSummary, InsightItem, ShareableReport,
  DailyReport, WeeklyReport, ActivityLog, NutritionPlan,
} from '../../shared/types';
import * as nutritionApi from '../nutrition/api';
import * as workoutsApi from '../workouts/api';

const NUTRITION_OVERRIDES_KEY = 'nutrition_overrides';
const NUTRITION_PLAN_CACHE_KEY = '@reports:nutrition-plan';
const INJURY_RISK_CACHE_KEY = '@reports:injury-risk';
const DAILY_REPORT_CACHE_PREFIX = '@reports:daily-report:';
const ACTIVITY_CACHE_PREFIX = '@reports:activity:';
const NUTRITION_PLAN_TTL_MS = 5 * 60 * 1000;
const INJURY_RISK_TTL_MS = 2 * 60 * 1000;

type CacheEntry<T> = {
  timestamp: number;
  data: T;
};

type NutritionOverrides = {
  targetCalories?: number;
  proteinPct?: number;
  carbsPct?: number;
  fatPct?: number;
};

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateValue(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isSameLocalDate(value: string | Date | null | undefined, expectedDate: string): boolean {
  const parsed = parseDateValue(value);
  return parsed ? toLocalDateString(parsed) === expectedDate : false;
}

async function readCacheEntry<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry<T>;
  } catch {
    return null;
  }
}

async function writeCacheEntry<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ timestamp: Date.now(), data }));
  } catch {
    // Ignore cache write failures
  }
}

function applyNutritionOverrides(base: NutritionPlan | null, overrides: NutritionOverrides): NutritionPlan | null {
  if (!base) return null;
  if (!overrides.targetCalories && !overrides.proteinPct && !overrides.carbsPct && !overrides.fatPct) {
    return base;
  }

  const baseCalories = Math.max(base.targetCalories || 0, 1);
  const calories = overrides.targetCalories ?? base.targetCalories;
  const proteinPct = overrides.proteinPct ?? base.macros.proteinPercentage ?? Math.round((base.macros.protein * 4 / baseCalories) * 100);
  const carbsPct = overrides.carbsPct ?? base.macros.carbsPercentage ?? Math.round((base.macros.carbs * 4 / baseCalories) * 100);
  const fatPct = overrides.fatPct ?? base.macros.fatPercentage ?? Math.round((base.macros.fat * 9 / baseCalories) * 100);

  return {
    ...base,
    targetCalories: calories,
    macros: {
      ...base.macros,
      protein: Math.round((calories * proteinPct / 100) / 4),
      carbs: Math.round((calories * carbsPct / 100) / 4),
      fat: Math.round((calories * fatPct / 100) / 9),
      proteinPercentage: proteinPct,
      carbsPercentage: carbsPct,
      fatPercentage: fatPct,
    },
  };
}

async function getNutritionOverrides(): Promise<NutritionOverrides> {
  try {
    const raw = await AsyncStorage.getItem(NUTRITION_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function getResolvedNutritionTargets(): Promise<NutritionPlan | null> {
  const [overrides, cachedEntry] = await Promise.all([
    getNutritionOverrides(),
    readCacheEntry<NutritionPlan>(NUTRITION_PLAN_CACHE_KEY),
  ]);

  if (cachedEntry && Date.now() - cachedEntry.timestamp < NUTRITION_PLAN_TTL_MS) {
    return applyNutritionOverrides(cachedEntry.data, overrides);
  }

  try {
    const freshPlan = await nutritionApi.calculateNutrition();
    await writeCacheEntry(NUTRITION_PLAN_CACHE_KEY, freshPlan);
    return applyNutritionOverrides(freshPlan, overrides);
  } catch {
    return cachedEntry ? applyNutritionOverrides(cachedEntry.data, overrides) : null;
  }
}

async function getActivityWithCache(date?: string): Promise<ActivityLog | null> {
  const activityDate = date || toLocalDateString(new Date());
  const cacheKey = `${ACTIVITY_CACHE_PREFIX}${activityDate}`;
  const cachedEntry = await readCacheEntry<ActivityLog>(cacheKey);

  try {
    const freshActivity = date ? await getActivityLog(date) : await getTodayActivity();
    await writeCacheEntry(cacheKey, freshActivity);
    return freshActivity;
  } catch {
    return cachedEntry?.data ?? null;
  }
}

export async function getInjuryRisk(): Promise<any> {
  const cachedEntry = await readCacheEntry<any>(INJURY_RISK_CACHE_KEY);

  if (cachedEntry && Date.now() - cachedEntry.timestamp < INJURY_RISK_TTL_MS) {
    return cachedEntry.data;
  }

  try {
    const response = await apiClient.post('/reports/injury-risk');
    const assessment = response.data.assessment || {
      overallRisk: 'low',
      musclesAtRisk: [],
      recommendations: ['Start tracking your workouts to get injury risk assessments'],
      needsRestDay: false,
    };
    await writeCacheEntry(INJURY_RISK_CACHE_KEY, assessment);
    return assessment;
  } catch {
    return cachedEntry?.data || {
      overallRisk: 'low',
      musclesAtRisk: [],
      recommendations: ['Start tracking your workouts to get injury risk assessments'],
      needsRestDay: false,
    };
  }
}

export async function getTrends(metric: TrendMetric, days: number = 30): Promise<TrendData> {
  const response = await apiClient.get<TrendData>('/reports/analytics/trends', { params: { metric, days } });
  return response.data;
}

export async function getAnalyticsSummary(period: string = 'week', startDate?: string, endDate?: string): Promise<AnalyticsSummary> {
  const params: any = { period };
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await apiClient.get<AnalyticsSummary>('/reports/analytics/summary', { params });
  return response.data;
}

export async function getPeriodComparison(p1Start: string, p1End: string, p2Start: string, p2End: string): Promise<PeriodComparison> {
  const response = await apiClient.get<PeriodComparison>('/reports/analytics/comparisons', {
    params: { period1Start: p1Start, period1End: p1End, period2Start: p2Start, period2End: p2End },
  });
  return response.data;
}

export async function getVolumeByMuscle(days: number = 30): Promise<VolumeByMuscle[]> {
  const response = await apiClient.get<VolumeByMuscle[]>('/reports/training/volume-by-muscle', { params: { days } });
  return response.data;
}

export async function getExerciseProgression(exerciseName: string, days: number = 90): Promise<ExerciseProgression> {
  const response = await apiClient.get<ExerciseProgression>('/reports/training/progression', { params: { exerciseName, days } });
  return response.data;
}

export async function getTrainingHeatmap(weeks: number = 12): Promise<TrainingHeatmapDay[]> {
  const response = await apiClient.get<TrainingHeatmapDay[]>('/reports/training/heatmap', { params: { weeks } });
  return response.data;
}

export async function logBiomarker(data: { type: string; value: number; value2?: number; unit: string; date?: string; notes?: string; source?: string }): Promise<BiomarkerEntry> {
  const response = await apiClient.post<{ log: BiomarkerEntry }>('/reports/biomarkers', data);
  return response.data.log;
}

export async function getBiomarkers(type?: string, days: number = 90): Promise<BiomarkerEntry[]> {
  const params: any = { days };
  if (type) params.type = type;
  const response = await apiClient.get<BiomarkerEntry[]>('/reports/biomarkers', { params });
  return response.data;
}

export async function getHealthSummary(): Promise<HealthSummary> {
  const response = await apiClient.get<HealthSummary>('/reports/health-summary');
  return response.data;
}

export async function getInsights(): Promise<InsightItem[]> {
  const response = await apiClient.get<InsightItem[]>('/reports/insights');
  return response.data;
}

export async function generateReport(startDate: string, endDate: string, sections?: string[]): Promise<ShareableReport> {
  const response = await apiClient.post<ShareableReport>('/reports/generate', { startDate, endDate, sections });
  return response.data;
}

export async function shareReport(reportId: string, expiresInHours?: number): Promise<{ shareToken: string; expiresAt: string }> {
  const response = await apiClient.post<{ shareToken: string; expiresAt: string }>(`/reports/${reportId}/share`, { expiresInHours });
  return response.data;
}

export async function getDailyReport(date?: string): Promise<DailyReport> {
  const reportDate = date || toLocalDateString(new Date());
  const cachedReportEntry = await readCacheEntry<DailyReport>(`${DAILY_REPORT_CACHE_PREFIX}${reportDate}`);
  const cachedReport = cachedReportEntry?.data ?? null;

  const [nutritionLogs, nutritionTargets, activity, workoutSessions, injuryRiskData] = await Promise.all([
    date ? nutritionApi.getLogsByDate(date).catch(() => null) : nutritionApi.getTodayLogs().catch(() => null),
    getResolvedNutritionTargets(),
    getActivityWithCache(date),
    workoutsApi.getWorkoutSessions(50).catch(() => null),
    getInjuryRisk(),
  ]);

  const actualCalories = nutritionLogs?.totals?.calories ?? cachedReport?.nutrition.calories ?? 0;
  const actualProtein = nutritionLogs?.totals?.protein ?? cachedReport?.nutrition.protein ?? 0;
  const actualCarbs = nutritionLogs?.totals?.carbs ?? cachedReport?.nutrition.carbs ?? 0;
  const actualFat = nutritionLogs?.totals?.fat ?? cachedReport?.nutrition.fat ?? 0;

  const targetCalories = nutritionTargets?.targetCalories ?? cachedReport?.nutrition.targetCalories ?? Math.max(actualCalories, 0);
  const targetProtein = nutritionTargets?.macros?.protein ?? cachedReport?.nutrition.targetProtein ?? Math.max(actualProtein, 0);
  const targetCarbs = nutritionTargets?.macros?.carbs ?? cachedReport?.nutrition.targetCarbs ?? Math.max(actualCarbs, 0);
  const targetFat = nutritionTargets?.macros?.fat ?? cachedReport?.nutrition.targetFat ?? Math.max(actualFat, 0);

  const safeTargetCalories = Math.max(targetCalories, actualCalories, 1);
  const safeTargetProtein = Math.max(targetProtein, actualProtein, 1);
  const safeTargetCarbs = Math.max(targetCarbs, actualCarbs, 1);
  const safeTargetFat = Math.max(targetFat, actualFat, 1);

  const calorieAdherence = Math.min((actualCalories / safeTargetCalories) * 100, 100);
  const proteinAdherence = Math.min((actualProtein / safeTargetProtein) * 100, 100);
  const carbsAdherence = Math.min((actualCarbs / safeTargetCarbs) * 100, 100);
  const fatAdherence = Math.min((actualFat / safeTargetFat) * 100, 100);
  const adherence = (calorieAdherence + proteinAdherence + carbsAdherence + fatAdherence) / 4;

  let training = cachedReport?.training ?? {
    workoutsCompleted: 0,
    totalSets: 0,
    totalVolume: 0,
    totalWeight: 0,
    totalReps: 0,
    musclesTrained: [],
    sessions: [],
  };
  let recentWorkouts = cachedReport?.training.sessions.length ?? 0;

  if (workoutSessions) {
    const todaysWorkouts = workoutSessions.filter((w: any) => {
      const workoutDate = w.completedAt || w.startedAt || w.createdAt;
      return isSameLocalDate(workoutDate, reportDate);
    });

    let totalSets = 0;
    let totalWeight = 0;
    let totalReps = 0;
    const allMuscles = new Set<string>();

    const sessions = todaysWorkouts.map((w: any) => {
      let sessionSets = 0;
      if (w.exercises) {
        w.exercises.forEach((ex: any) => {
          sessionSets += ex.sets?.length || 0;
        });
      }
      totalSets += sessionSets;
      totalWeight += w.totalVolume || 0;
      totalReps += w.totalReps || 0;
      (w.musclesWorked || []).forEach((m: string) => allMuscles.add(m));

      return {
        name: w.name || 'Workout',
        duration: w.duration || 0,
        totalVolume: w.totalVolume || 0,
        totalSets: w.totalSets || sessionSets,
        totalReps: w.totalReps || 0,
        musclesWorked: w.musclesWorked || [],
      };
    });

    training = {
      workoutsCompleted: todaysWorkouts.length,
      totalSets,
      totalVolume: totalWeight,
      totalWeight,
      totalReps,
      musclesTrained: Array.from(allMuscles),
      sessions,
    };
    recentWorkouts = workoutSessions.slice(0, 7).length;
  }

  const activityData = activity ?? cachedReport?.activity ?? null;
  const sleepHours = activityData?.sleepHours || 0;
  const workoutCount = training.workoutsCompleted;

  let overallRisk: 'low' | 'moderate' | 'high' | 'very_high' = injuryRiskData?.overallRisk || 'low';
  let needsRestDay = injuryRiskData?.needsRestDay || false;
  const recommendations: string[] = injuryRiskData?.recommendations || [];

  if (sleepHours > 0 && sleepHours < 6) {
    if (overallRisk === 'low') overallRisk = 'moderate';
    else if (overallRisk === 'moderate') overallRisk = 'high';
    if (!recommendations.includes('Get more sleep for better recovery')) {
      recommendations.push('Get more sleep for better recovery');
    }
  }

  if (recentWorkouts >= 6) {
    if (overallRisk === 'low') overallRisk = 'moderate';
    else if (overallRisk === 'moderate') overallRisk = 'high';
    needsRestDay = true;
    if (!recommendations.includes('Consider a rest day - high training frequency')) {
      recommendations.push('Consider a rest day - high training frequency');
    }
  }

  if (workoutCount >= 2) {
    if (overallRisk === 'low') overallRisk = 'moderate';
    if (!recommendations.includes('Multiple workouts today - ensure adequate recovery')) {
      recommendations.push('Multiple workouts today - ensure adequate recovery');
    }
  }

  if (proteinAdherence < 50 && workoutCount > 0) {
    if (!recommendations.includes('Increase protein intake for muscle recovery')) {
      recommendations.push('Increase protein intake for muscle recovery');
    }
  }

  const report = {
    date: reportDate,
    nutrition: {
      calories: actualCalories,
      protein: actualProtein,
      carbs: actualCarbs,
      fat: actualFat,
      targetCalories: safeTargetCalories,
      targetProtein: safeTargetProtein,
      targetCarbs: safeTargetCarbs,
      targetFat: safeTargetFat,
      adherence: Math.round(adherence),
    },
    activity: {
      steps: activityData?.steps || 0,
      caloriesBurned: activityData?.caloriesBurned || 0,
      waterIntake: activityData?.waterIntake || 0,
      sleepHours,
    },
    training,
    injuryRisk: {
      overallRisk,
      musclesAtRisk: injuryRiskData?.musclesAtRisk || [],
      recommendations: recommendations.slice(0, 3),
      needsRestDay,
    },
  } as DailyReport;

  await writeCacheEntry(`${DAILY_REPORT_CACHE_PREFIX}${reportDate}`, report);
  return report;
}

export async function getWeeklyReport(weekStart?: string): Promise<WeeklyReport> {
  const daily = await getDailyReport();
  return {
    ...daily,
    weekStart: weekStart || new Date().toISOString().split('T')[0],
    weekEnd: new Date().toISOString().split('T')[0],
    averageAdherence: 0,
    totalWorkouts: 0,
    progressIndicators: {},
  } as WeeklyReport;
}

export async function getActivityLog(date?: string): Promise<ActivityLog> {
  const params = date ? { date } : {};
  const response = await apiClient.get<{ data: ActivityLog }>('/activity', { params });
  return response.data.data;
}

export async function getTodayActivity(): Promise<ActivityLog> {
  const response = await apiClient.get<ActivityLog>('/activity/today');
  return response.data;
}

export async function logActivity(activityData: Partial<ActivityLog>): Promise<void> {
  await apiClient.post('/activity/log', {
    ...activityData,
    date: new Date().toISOString(),
  });
}

export async function updateTodayActivity(data: { steps?: number; waterIntake?: number; sleepHours?: number; caloriesBurned?: number }): Promise<{ message: string; log: ActivityLog }> {
  const response = await apiClient.put<{ message: string; log: ActivityLog }>('/activity/today', data);
  return response.data;
}
