/**
 * Apple Health Service - Full HealthKit integration
 *
 * This service provides comprehensive access to Apple HealthKit data including:
 * - Steps
 * - Active/Basal calories burned
 * - Distance walked/running
 * - Workouts
 * - Heart rate
 *
 * NOTE: Requires a native build (expo run:ios). Won't work with Expo Go.
 */

import { Platform } from 'react-native';

// Dynamically import react-native-health to avoid crashes in Expo Go
let AppleHealthKit: any = null;
let HealthKitAvailable = false;

try {
  AppleHealthKit = require('react-native-health').default;
  HealthKitAvailable = !!AppleHealthKit?.initHealthKit;
} catch (e) {
  console.log('react-native-health not available (requires native build)');
}

// Types for our health data
export interface HealthData {
  steps: number;
  activeCalories: number;
  basalCalories: number;
  totalCalories: number;
  distanceKm: number;
  flightsClimbed: number;
  date: Date;
}

export interface HeartRateData {
  value: number;
  startDate: Date;
  endDate: Date;
}

export interface WorkoutData {
  activityType: string;
  activityName: string;
  calories: number;
  distance: number;
  duration: number; // minutes
  startDate: Date;
  endDate: Date;
}

export interface HealthKitStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  error?: string;
}

// Permissions we want to read/write (only if HealthKit is available)
const getPermissions = () => {
  if (!HealthKitAvailable || !AppleHealthKit?.Constants) {
    return { permissions: { read: [], write: [] } };
  }

  return {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.StepCount,
        AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
        AppleHealthKit.Constants.Permissions.FlightsClimbed,
        AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
        AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
        AppleHealthKit.Constants.Permissions.Workout,
        AppleHealthKit.Constants.Permissions.HeartRate,
        AppleHealthKit.Constants.Permissions.ActivitySummary,
      ],
      write: [
        AppleHealthKit.Constants.Permissions.Steps,
        AppleHealthKit.Constants.Permissions.Workout,
      ],
    },
  };
};

class AppleHealthService {
  private isInitialized: boolean = false;
  private isAuthorized: boolean = false;

  /**
   * Check if HealthKit is available on this device (iOS only + native build)
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && HealthKitAvailable;
  }

  /**
   * Initialize HealthKit and request permissions
   */
  async initialize(): Promise<HealthKitStatus> {
    if (!this.isAvailable()) {
      const errorMsg = Platform.OS !== 'ios'
        ? 'HealthKit is only available on iOS devices'
        : 'HealthKit requires a native build (run: npx expo run:ios)';
      return {
        isAvailable: false,
        isAuthorized: false,
        error: errorMsg,
      };
    }

    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(getPermissions(), (error: string) => {
        if (error) {
          console.error('HealthKit initialization error:', error);
          this.isInitialized = false;
          this.isAuthorized = false;
          resolve({
            isAvailable: true,
            isAuthorized: false,
            error,
          });
        } else {
          this.isInitialized = true;
          this.isAuthorized = true;
          resolve({
            isAvailable: true,
            isAuthorized: true,
          });
        }
      });
    });
  }

  /**
   * Get the current authorization status
   */
  getStatus(): HealthKitStatus {
    return {
      isAvailable: this.isAvailable(),
      isAuthorized: this.isAuthorized,
    };
  }

  /**
   * Get today's comprehensive health data
   */
  async getTodayHealthData(): Promise<HealthData | null> {
    if (!this.isAuthorized) {
      const status = await this.initialize();
      if (!status.isAuthorized) {
        return null;
      }
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const options = {
      date: today.toISOString(),
      includeManuallyAdded: true,
    };

    try {
      const [steps, activeCalories, basalCalories, distance, flights] = await Promise.all([
        this.getSteps(startOfDay, today),
        this.getActiveCalories(startOfDay, today),
        this.getBasalCalories(startOfDay, today),
        this.getDistance(startOfDay, today),
        this.getFlightsClimbed(startOfDay, today),
      ]);

      return {
        steps,
        activeCalories,
        basalCalories,
        totalCalories: activeCalories + basalCalories,
        distanceKm: distance,
        flightsClimbed: flights,
        date: today,
      };
    } catch (error) {
      console.error('Error getting today health data:', error);
      return null;
    }
  }

  /**
   * Get step count for a date range
   */
  private getSteps(startDate: Date, endDate: Date): Promise<number> {
    return new Promise((resolve) => {
      AppleHealthKit.getStepCount(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err: string, results: HealthValue) => {
          if (err) {
            console.error('Error getting steps:', err);
            resolve(0);
          } else {
            resolve(Math.round(results.value || 0));
          }
        }
      );
    });
  }

  /**
   * Get active calories burned (from exercise/movement)
   */
  private getActiveCalories(startDate: Date, endDate: Date): Promise<number> {
    return new Promise((resolve) => {
      AppleHealthKit.getActiveEnergyBurned(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err: string, results: HealthValue[]) => {
          if (err) {
            console.error('Error getting active calories:', err);
            resolve(0);
          } else {
            const total = results.reduce((sum, item) => sum + (item.value || 0), 0);
            resolve(Math.round(total));
          }
        }
      );
    });
  }

  /**
   * Get basal calories burned (resting metabolism)
   */
  private getBasalCalories(startDate: Date, endDate: Date): Promise<number> {
    return new Promise((resolve) => {
      AppleHealthKit.getBasalEnergyBurned(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err: string, results: HealthValue[]) => {
          if (err) {
            console.error('Error getting basal calories:', err);
            resolve(0);
          } else {
            const total = results.reduce((sum, item) => sum + (item.value || 0), 0);
            resolve(Math.round(total));
          }
        }
      );
    });
  }

  /**
   * Get walking/running distance in kilometers
   */
  private getDistance(startDate: Date, endDate: Date): Promise<number> {
    return new Promise((resolve) => {
      AppleHealthKit.getDistanceWalkingRunning(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err: string, results: HealthValue) => {
          if (err) {
            console.error('Error getting distance:', err);
            resolve(0);
          } else {
            // Convert meters to km
            const km = (results.value || 0) / 1000;
            resolve(Math.round(km * 100) / 100);
          }
        }
      );
    });
  }

  /**
   * Get flights of stairs climbed
   */
  private getFlightsClimbed(startDate: Date, endDate: Date): Promise<number> {
    return new Promise((resolve) => {
      AppleHealthKit.getFlightsClimbed(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        (err: string, results: HealthValue) => {
          if (err) {
            console.error('Error getting flights climbed:', err);
            resolve(0);
          } else {
            resolve(Math.round(results.value || 0));
          }
        }
      );
    });
  }

  /**
   * Get recent heart rate samples
   */
  async getHeartRate(limit: number = 10): Promise<HeartRateData[]> {
    if (!this.isAuthorized) {
      return [];
    }

    return new Promise((resolve) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days

      AppleHealthKit.getHeartRateSamples(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          ascending: false,
          limit,
        },
        (err: string, results: HealthValue[]) => {
          if (err) {
            console.error('Error getting heart rate:', err);
            resolve([]);
          } else {
            const data = results.map((item) => ({
              value: Math.round(item.value),
              startDate: new Date(item.startDate),
              endDate: new Date(item.endDate),
            }));
            resolve(data);
          }
        }
      );
    });
  }

  /**
   * Get workouts from Apple Health
   */
  async getWorkouts(days: number = 7): Promise<WorkoutData[]> {
    if (!this.isAuthorized) {
      return [];
    }

    return new Promise((resolve) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      AppleHealthKit.getSamples(
        {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          type: 'Workout' as any, // Type cast for workout samples
        },
        (err: string, results: any[]) => {
          if (err) {
            console.error('Error getting workouts:', err);
            resolve([]);
          } else {
            const workouts = results.map((workout) => ({
              activityType: workout.activityType || 'Unknown',
              activityName: this.getWorkoutName(workout.activityType),
              calories: Math.round(workout.calories || 0),
              distance: Math.round((workout.distance || 0) / 1000 * 100) / 100, // Convert to km
              duration: Math.round((workout.duration || 0) / 60), // Convert to minutes
              startDate: new Date(workout.startDate),
              endDate: new Date(workout.endDate),
            }));
            resolve(workouts);
          }
        }
      );
    });
  }

  /**
   * Get health data history for the past N days
   */
  async getHealthHistory(days: number = 7): Promise<HealthData[]> {
    if (!this.isAuthorized) {
      const status = await this.initialize();
      if (!status.isAuthorized) {
        return [];
      }
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
        const [steps, activeCalories, basalCalories, distance, flights] = await Promise.all([
          this.getSteps(startOfDay, endOfDay),
          this.getActiveCalories(startOfDay, endOfDay),
          this.getBasalCalories(startOfDay, endOfDay),
          this.getDistance(startOfDay, endOfDay),
          this.getFlightsClimbed(startOfDay, endOfDay),
        ]);

        history.push({
          steps,
          activeCalories,
          basalCalories,
          totalCalories: activeCalories + basalCalories,
          distanceKm: distance,
          flightsClimbed: flights,
          date: startOfDay,
        });
      } catch (error) {
        console.error(`Error getting health data for day ${i}:`, error);
        history.push({
          steps: 0,
          activeCalories: 0,
          basalCalories: 0,
          totalCalories: 0,
          distanceKm: 0,
          flightsClimbed: 0,
          date: startOfDay,
        });
      }
    }

    return history;
  }

  /**
   * Save a workout to Apple Health
   */
  async saveWorkout(
    type: string,
    startDate: Date,
    endDate: Date,
    calories: number,
    distance?: number
  ): Promise<boolean> {
    if (!this.isAuthorized) {
      return false;
    }

    return new Promise((resolve) => {
      const options: any = {
        type, // e.g., 'Walking', 'Running', 'Cycling', 'Swimming'
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        energyBurned: calories,
      };

      if (distance) {
        options.distance = distance * 1000; // Convert km to meters
      }

      AppleHealthKit.saveWorkout(options, (err: string, result: any) => {
        if (err) {
          console.error('Error saving workout:', err);
          resolve(false);
        } else {
          resolve(!!result);
        }
      });
    });
  }

  /**
   * Get a friendly name for workout types
   */
  private getWorkoutName(activityType: string): string {
    const names: Record<string, string> = {
      Walking: 'Walking',
      Running: 'Running',
      Cycling: 'Cycling',
      Swimming: 'Swimming',
      Hiking: 'Hiking',
      Yoga: 'Yoga',
      FunctionalStrengthTraining: 'Strength Training',
      TraditionalStrengthTraining: 'Weight Training',
      CrossTraining: 'Cross Training',
      Elliptical: 'Elliptical',
      Rowing: 'Rowing',
      Stairstepping: 'Stair Stepper',
      HighIntensityIntervalTraining: 'HIIT',
      Dance: 'Dance',
      Pilates: 'Pilates',
      MartialArts: 'Martial Arts',
      Boxing: 'Boxing',
      Climbing: 'Climbing',
      Tennis: 'Tennis',
      Basketball: 'Basketball',
      Soccer: 'Soccer',
      Golf: 'Golf',
    };

    return names[activityType] || activityType || 'Workout';
  }
}

export default new AppleHealthService();
