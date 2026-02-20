import { Platform } from 'react-native';
import { HealthData, HealthKitStatus, WorkoutData } from './appleHealthService';

let HealthConnect: any = null;

try {
  HealthConnect = require('react-native-health-connect');
} catch (e) {
  console.log('react-native-health-connect not available');
}

const PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'BasalMetabolicRate' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'FloorsClimbed' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'write', recordType: 'Steps' },
  { accessType: 'write', recordType: 'ExerciseSession' },
];

class AndroidHealthService {
  private isAuthorized = false;

  isAvailable(): boolean {
    return Platform.OS === 'android' && !!HealthConnect;
  }

  async initialize(): Promise<HealthKitStatus> {
    if (!this.isAvailable()) {
      return { isAvailable: false, isAuthorized: false, error: 'Health Connect is only available on Android' };
    }

    try {
      const available = await HealthConnect.getSdkStatus();
      if (available !== HealthConnect.SdkAvailabilityStatus.SDK_AVAILABLE) {
        return { isAvailable: false, isAuthorized: false, error: 'Health Connect not installed on this device' };
      }

      await HealthConnect.initialize();
      const granted = await HealthConnect.requestPermission(PERMISSIONS);
      this.isAuthorized = granted.every((p: any) => p.accessType === 'write' || p.granted);

      return { isAvailable: true, isAuthorized: this.isAuthorized };
    } catch (e) {
      console.error('Health Connect init error:', e);
      return { isAvailable: false, isAuthorized: false, error: String(e) };
    }
  }

  getStatus(): HealthKitStatus {
    return { isAvailable: this.isAvailable(), isAuthorized: this.isAuthorized };
  }

  async getTodayHealthData(): Promise<HealthData | null> {
    if (!this.isAuthorized) {
      const status = await this.initialize();
      if (!status.isAuthorized) return null;
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    try {
      const timeRangeFilter = {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: today.toISOString(),
      };

      const [stepsRes, activeCalRes, basalRes, distanceRes, floorsRes] = await Promise.all([
        HealthConnect.readRecords('Steps', { timeRangeFilter }),
        HealthConnect.readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
        HealthConnect.readRecords('BasalMetabolicRate', { timeRangeFilter }),
        HealthConnect.readRecords('Distance', { timeRangeFilter }),
        HealthConnect.readRecords('FloorsClimbed', { timeRangeFilter }),
      ]);

      const steps = stepsRes.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
      const activeCalories = activeCalRes.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0);
      const basalCalories = basalRes.records.reduce((sum: number, r: any) => sum + (r.basalMetabolicRate?.inKilocaloriesPerDay || 0), 0) / 24;
      const distanceKm = distanceRes.records.reduce((sum: number, r: any) => sum + (r.distance?.inKilometers || 0), 0);
      const flightsClimbed = floorsRes.records.reduce((sum: number, r: any) => sum + (r.floors || 0), 0);

      return {
        steps: Math.round(steps),
        activeCalories: Math.round(activeCalories),
        basalCalories: Math.round(basalCalories),
        totalCalories: Math.round(activeCalories + basalCalories),
        distanceKm: Math.round(distanceKm * 100) / 100,
        flightsClimbed: Math.round(flightsClimbed),
        date: today,
      };
    } catch (e) {
      console.error('Error reading Health Connect data:', e);
      return null;
    }
  }

  async getHealthHistory(days: number = 7): Promise<HealthData[]> {
    if (!this.isAuthorized) {
      const status = await this.initialize();
      if (!status.isAuthorized) return [];
    }

    const history: HealthData[] = [];
    const now = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      try {
        const timeRangeFilter = {
          operator: 'between',
          startTime: startOfDay.toISOString(),
          endTime: endOfDay.toISOString(),
        };

        const [stepsRes, activeCalRes, basalRes, distanceRes, floorsRes] = await Promise.all([
          HealthConnect.readRecords('Steps', { timeRangeFilter }),
          HealthConnect.readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
          HealthConnect.readRecords('BasalMetabolicRate', { timeRangeFilter }),
          HealthConnect.readRecords('Distance', { timeRangeFilter }),
          HealthConnect.readRecords('FloorsClimbed', { timeRangeFilter }),
        ]);

        const steps = stepsRes.records.reduce((sum: number, r: any) => sum + (r.count || 0), 0);
        const activeCalories = activeCalRes.records.reduce((sum: number, r: any) => sum + (r.energy?.inKilocalories || 0), 0);
        const basalCalories = basalRes.records.reduce((sum: number, r: any) => sum + (r.basalMetabolicRate?.inKilocaloriesPerDay || 0), 0) / 24;
        const distanceKm = distanceRes.records.reduce((sum: number, r: any) => sum + (r.distance?.inKilometers || 0), 0);
        const flightsClimbed = floorsRes.records.reduce((sum: number, r: any) => sum + (r.floors || 0), 0);

        history.push({
          steps: Math.round(steps),
          activeCalories: Math.round(activeCalories),
          basalCalories: Math.round(basalCalories),
          totalCalories: Math.round(activeCalories + basalCalories),
          distanceKm: Math.round(distanceKm * 100) / 100,
          flightsClimbed: Math.round(flightsClimbed),
          date: startOfDay,
        });
      } catch {
        history.push({ steps: 0, activeCalories: 0, basalCalories: 0, totalCalories: 0, distanceKm: 0, flightsClimbed: 0, date: new Date(now.setDate(now.getDate() - i)) });
      }
    }

    return history;
  }

  async getWorkouts(days: number = 7): Promise<WorkoutData[]> {
    if (!this.isAuthorized) return [];

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { records } = await HealthConnect.readRecords('ExerciseSession', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      return records.map((r: any) => ({
        activityType: r.exerciseType || 'Unknown',
        activityName: r.title || this.getWorkoutName(r.exerciseType),
        calories: Math.round(r.energy?.inKilocalories || 0),
        distance: Math.round((r.distance?.inKilometers || 0) * 100) / 100,
        duration: Math.round((new Date(r.endTime).getTime() - new Date(r.startTime).getTime()) / 60000),
        startDate: new Date(r.startTime),
        endDate: new Date(r.endTime),
      }));
    } catch (e) {
      console.error('Error reading workouts:', e);
      return [];
    }
  }

  async saveWorkout(type: string, startDate: Date, endDate: Date, calories: number, distance?: number): Promise<boolean> {
    if (!this.isAuthorized) return false;

    try {
      await HealthConnect.insertRecords([{
        recordType: 'ExerciseSession',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        exerciseType: type,
        ...(calories > 0 && { energy: { value: calories, unit: 'kilocalories' } }),
        ...(distance && { distance: { value: distance, unit: 'kilometers' } }),
      }]);
      return true;
    } catch (e) {
      console.error('Error saving workout:', e);
      return false;
    }
  }

  private getWorkoutName(type: string): string {
    const names: Record<string, string> = {
      WALKING: 'Walking',
      RUNNING: 'Running',
      BIKING: 'Cycling',
      SWIMMING_OPEN_WATER: 'Swimming',
      SWIMMING_POOL: 'Swimming',
      HIKING: 'Hiking',
      YOGA: 'Yoga',
      STRENGTH_TRAINING: 'Strength Training',
      HIGH_INTENSITY_INTERVAL_TRAINING: 'HIIT',
      ELLIPTICAL: 'Elliptical',
      ROWING_MACHINE: 'Rowing',
      STAIR_CLIMBING: 'Stair Climbing',
      DANCING: 'Dance',
      PILATES: 'Pilates',
      MARTIAL_ARTS: 'Martial Arts',
      BOXING: 'Boxing',
      ROCK_CLIMBING: 'Climbing',
      TENNIS: 'Tennis',
      BASKETBALL: 'Basketball',
      SOCCER: 'Soccer',
      GOLF: 'Golf',
    };
    return names[type] || type || 'Workout';
  }
}

export default new AndroidHealthService();
