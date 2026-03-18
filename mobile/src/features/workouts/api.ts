import { apiClient } from '../../shared/api';
import { Exercise, WorkoutPlan, GenerateWorkoutRequest, ApiResponse } from '../../shared/types';

export async function generateWorkout(request: GenerateWorkoutRequest): Promise<WorkoutPlan> {
  const backendRequest = {
    goal: request.goal,
    experienceLevel: request.experienceLevel,
    daysPerWeek: request.frequency,
    sport: request.sport,
  };
  const response = await apiClient.post('/workouts/generate', backendRequest);
  return response.data.plan;
}

export async function getWorkoutPlans(): Promise<WorkoutPlan[]> {
  const response = await apiClient.get('/workouts/plans');
  return response.data || [];
}

export async function getWorkoutPlan(id: string): Promise<WorkoutPlan> {
  const response = await apiClient.get(`/workouts/plans/${id}`);
  return response.data;
}

export async function createCustomPlan(data: { name: string; goal: string; daysPerWeek: number; workouts: any[] }): Promise<WorkoutPlan> {
  const response = await apiClient.post('/workouts/plans/custom', data);
  return response.data.plan;
}

export async function updateWorkoutPlan(id: string, data: { name?: string; goal?: string; daysPerWeek?: number; workouts?: any[] }): Promise<WorkoutPlan> {
  const response = await apiClient.put(`/workouts/plans/${id}`, data);
  return response.data.plan;
}

export async function deleteWorkoutPlan(id: string): Promise<void> {
  await apiClient.delete(`/workouts/plans/${id}`);
}

export async function logWorkout(workoutId: string, exercises: any[]): Promise<void> {
  await apiClient.post('/workouts/log', {
    workoutId,
    exercises,
    date: new Date().toISOString(),
  });
}

export async function saveWorkoutSession(sessionData: {
  name: string;
  startedAt: string;
  completedAt: string;
  duration: number;
  notes?: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  musclesWorked: string[];
  exercises: Array<{
    exerciseName: string;
    muscleGroup: string;
    sets: any[];
    totalVolume: number;
    maxWeight: number;
    maxReps: number;
  }>;
  workoutPlanId?: string;
}): Promise<any> {
  const response = await apiClient.post('/workouts/sessions', sessionData);
  return response.data.session;
}

export async function getWorkoutSessions(limit?: number, offset?: number): Promise<any[]> {
  const params: any = {};
  if (limit) params.limit = limit;
  if (offset) params.offset = offset;
  const response = await apiClient.get('/workouts/sessions', { params });
  return response.data;
}

export async function getRecentWorkoutNames(limit?: number): Promise<string[]> {
  const params = limit ? { limit } : {};
  const response = await apiClient.get<{ names: string[] }>('/workouts/sessions/recent-names', { params });
  return response.data.names;
}

export async function getWorkoutSession(sessionId: string): Promise<any> {
  const response = await apiClient.get(`/workouts/sessions/${sessionId}`);
  return response.data;
}

export async function getExercises(muscleId?: string): Promise<Exercise[]> {
  const url = muscleId ? `/exercises/for-muscle/${muscleId}` : '/exercises';
  const response = await apiClient.get<ApiResponse<Exercise[]>>(url);
  return response.data.data;
}

export async function getExercise(id: string): Promise<Exercise> {
  const response = await apiClient.get<ApiResponse<Exercise>>(`/exercises/${id}`);
  return response.data.data;
}

export async function getCustomExercises(): Promise<any[]> {
  const response = await apiClient.get('/custom-exercises');
  return response.data;
}

export async function createCustomExercise(data: { name: string; muscleGroup: string; equipment?: string; instructions?: string; notes?: string }): Promise<any> {
  const response = await apiClient.post('/custom-exercises', data);
  return response.data;
}

export async function updateCustomExercise(id: string, data: any): Promise<any> {
  const response = await apiClient.put(`/custom-exercises/${id}`, data);
  return response.data;
}

export async function deleteCustomExercise(id: string): Promise<void> {
  await apiClient.delete(`/custom-exercises/${id}`);
}
