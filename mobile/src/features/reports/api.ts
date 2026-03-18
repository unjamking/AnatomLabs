import { apiClient } from '../../shared/api';
import {
  TrendData, TrendMetric, AnalyticsSummary, PeriodComparison,
  VolumeByMuscle, ExerciseProgression, TrainingHeatmapDay,
  BiomarkerEntry, HealthSummary, InsightItem, ShareableReport,
  DailyReport, WeeklyReport, ActivityLog,
} from '../../shared/types';
import * as nutritionApi from '../nutrition/api';
import * as workoutsApi from '../workouts/api';

export async function getInjuryRisk(): Promise<any> {
  const response = await apiClient.post('/reports/injury-risk');
  return response.data.assessment || {
    overallRisk: 'low',
    musclesAtRisk: [],
    recommendations: ['Start tracking your workouts to get injury risk assessments'],
    needsRestDay: false,
  };
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
  const reportDate = date || new Date().toISOString().split('T')[0];

  const [nutritionLogs, nutritionTargets, activity, workoutSessions, injuryRiskData] = await Promise.all([
    date ? nutritionApi.getLogsByDate(date).catch(() => null) : nutritionApi.getTodayLogs().catch(() => null),
    nutritionApi.calculateNutrition().catch(() => null),
    date ? getActivityLog(date).catch(() => null) : getTodayActivity().catch(() => null),
    workoutsApi.getWorkoutSessions(50).catch(() => []),
    getInjuryRisk().catch(() => null),
  ]);

  const actualCalories = nutritionLogs?.totals?.calories || 0;
  const actualProtein = nutritionLogs?.totals?.protein || 0;
  const actualCarbs = nutritionLogs?.totals?.carbs || 0;
  const actualFat = nutritionLogs?.totals?.fat || 0;

  const targetCalories = nutritionTargets?.targetCalories || 2000;
  const targetProtein = nutritionTargets?.macros?.protein || 150;
  const targetCarbs = nutritionTargets?.macros?.carbs || 250;
  const targetFat = nutritionTargets?.macros?.fat || 65;

  const calorieAdherence = Math.min((actualCalories / targetCalories) * 100, 100);
  const proteinAdherence = Math.min((actualProtein / targetProtein) * 100, 100);
  const carbsAdherence = Math.min((actualCarbs / targetCarbs) * 100, 100);
  const fatAdherence = Math.min((actualFat / targetFat) * 100, 100);
  const adherence = (calorieAdherence + proteinAdherence + carbsAdherence + fatAdherence) / 4;

  const todaysWorkouts = (workoutSessions || []).filter((w: any) => {
    const workoutDate = w.completedAt || w.startedAt || w.createdAt;
    return workoutDate && workoutDate.startsWith(reportDate);
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

  const sleepHours = activity?.sleepHours || 0;
  const workoutCount = todaysWorkouts.length;
  const recentWorkouts = (workoutSessions || []).slice(0, 7).length;

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

  return {
    date: reportDate,
    nutrition: {
      calories: actualCalories,
      protein: actualProtein,
      carbs: actualCarbs,
      fat: actualFat,
      targetCalories,
      targetProtein,
      targetCarbs,
      targetFat,
      adherence: Math.round(adherence),
    },
    activity: {
      steps: activity?.steps || 0,
      caloriesBurned: activity?.caloriesBurned || 0,
      waterIntake: activity?.waterIntake || 0,
      sleepHours: sleepHours,
    },
    training: {
      workoutsCompleted: workoutCount,
      totalVolume: totalSets,
      totalWeight,
      totalReps,
      musclesTrained: Array.from(allMuscles),
      sessions,
    },
    injuryRisk: {
      overallRisk,
      musclesAtRisk: injuryRiskData?.musclesAtRisk || [],
      recommendations: recommendations.slice(0, 3),
      needsRestDay,
    },
  } as DailyReport;
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

export async function updateTodayActivity(data: { steps?: number; waterIntake?: number; sleepHours?: number }): Promise<{ message: string; log: ActivityLog }> {
  const response = await apiClient.put<{ message: string; log: ActivityLog }>('/activity/today', data);
  return response.data;
}
