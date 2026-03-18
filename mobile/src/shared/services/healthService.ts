/**
 * Health Service - Step counting using expo-sensors Pedometer
 *
 * This service provides access to step count data from the device's
 * motion sensors via HealthKit (iOS) and Google Fit (Android).
 */

import { Pedometer } from 'expo-sensors';
import { Platform } from 'react-native';

export interface StepData {
  steps: number;
  startDate: Date;
  endDate: Date;
  estimatedCalories?: number;
  estimatedDistanceKm?: number;
}

// Constants for calorie/distance estimation
const CALORIES_PER_STEP = 0.04; // Average calories burned per step
const METERS_PER_STEP = 0.762; // Average step length (~30 inches)

export interface PedometerPermissionStatus {
  granted: boolean;
  canAskAgain?: boolean;
}

class HealthService {
  private isAvailable: boolean | null = null;
  private stepSubscription: { remove: () => void } | null = null;

  /**
   * Check if step counting is available on this device
   */
  async isStepCountingAvailable(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      this.isAvailable = await Pedometer.isAvailableAsync();
      return this.isAvailable;
    } catch (error) {
      console.error('Error checking pedometer availability:', error);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Request permission to access step data
   * On iOS, this triggers HealthKit permission dialog
   * On Android, this triggers activity recognition permission
   */
  async requestPermission(): Promise<PedometerPermissionStatus> {
    try {
      const { status } = await Pedometer.requestPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
      };
    } catch (error) {
      console.error('Error requesting pedometer permission:', error);
      return { granted: false, canAskAgain: true };
    }
  }

  /**
   * Get current permission status
   */
  async getPermissionStatus(): Promise<PedometerPermissionStatus> {
    try {
      const { status } = await Pedometer.getPermissionsAsync();
      return {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
      };
    } catch (error) {
      console.error('Error getting pedometer permission status:', error);
      return { granted: false };
    }
  }

  /**
   * Get step count for today (from midnight to now)
   */
  async getTodaySteps(): Promise<StepData | null> {
    try {
      const isAvailable = await this.isStepCountingAvailable();
      if (!isAvailable) {
        console.log('Pedometer not available on this device');
        return null;
      }

      const permission = await this.getPermissionStatus();
      if (!permission.granted) {
        console.log('Pedometer permission not granted');
        return null;
      }

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const result = await Pedometer.getStepCountAsync(startOfDay, now);

      return {
        steps: result.steps,
        startDate: startOfDay,
        endDate: now,
        estimatedCalories: Math.round(result.steps * CALORIES_PER_STEP),
        estimatedDistanceKm: Math.round((result.steps * METERS_PER_STEP) / 10) / 100, // Round to 2 decimals
      };
    } catch (error) {
      console.error('Error getting today steps:', error);
      return null;
    }
  }

  /**
   * Get step count for a specific date range
   */
  async getStepsForRange(startDate: Date, endDate: Date): Promise<StepData | null> {
    try {
      const isAvailable = await this.isStepCountingAvailable();
      if (!isAvailable) {
        return null;
      }

      const permission = await this.getPermissionStatus();
      if (!permission.granted) {
        return null;
      }

      const result = await Pedometer.getStepCountAsync(startDate, endDate);

      return {
        steps: result.steps,
        startDate,
        endDate,
        estimatedCalories: Math.round(result.steps * CALORIES_PER_STEP),
        estimatedDistanceKm: Math.round((result.steps * METERS_PER_STEP) / 10) / 100,
      };
    } catch (error) {
      console.error('Error getting steps for range:', error);
      return null;
    }
  }

  /**
   * Get step count for the past N days
   */
  async getStepsHistory(days: number = 7): Promise<StepData[]> {
    const history: StepData[] = [];

    try {
      const isAvailable = await this.isStepCountingAvailable();
      if (!isAvailable) {
        return history;
      }

      const permission = await this.getPermissionStatus();
      if (!permission.granted) {
        return history;
      }

      const now = new Date();

      for (let i = 0; i < days; i++) {
        const endDate = new Date(now);
        endDate.setDate(endDate.getDate() - i);
        endDate.setHours(23, 59, 59, 999);

        const startDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0);

        try {
          const result = await Pedometer.getStepCountAsync(startDate, endDate);
          history.push({
            steps: result.steps,
            startDate,
            endDate,
            estimatedCalories: Math.round(result.steps * CALORIES_PER_STEP),
            estimatedDistanceKm: Math.round((result.steps * METERS_PER_STEP) / 10) / 100,
          });
        } catch (e) {
          // Skip days with no data
          history.push({
            steps: 0,
            startDate,
            endDate,
            estimatedCalories: 0,
            estimatedDistanceKm: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error getting steps history:', error);
    }

    return history;
  }

  /**
   * Subscribe to live step count updates
   * This counts steps while the app is in the foreground
   */
  subscribeToStepUpdates(callback: (steps: number) => void): () => void {
    if (this.stepSubscription) {
      this.stepSubscription.remove();
    }

    this.stepSubscription = Pedometer.watchStepCount((result) => {
      callback(result.steps);
    });

    return () => {
      if (this.stepSubscription) {
        this.stepSubscription.remove();
        this.stepSubscription = null;
      }
    };
  }

  /**
   * Stop listening to step updates
   */
  unsubscribeFromStepUpdates(): void {
    if (this.stepSubscription) {
      this.stepSubscription.remove();
      this.stepSubscription = null;
    }
  }

  /**
   * Calculate personalized calories burned based on steps and user weight
   * More accurate than the default estimate
   */
  calculateCaloriesFromSteps(steps: number, weightKg: number = 70, heightCm: number = 170): {
    calories: number;
    distanceKm: number;
  } {
    // Personalized step length based on height (roughly 0.415 * height)
    const stepLengthMeters = (heightCm * 0.415) / 100;
    const distanceKm = (steps * stepLengthMeters) / 1000;

    // MET value for walking at moderate pace (~3.5 mph) is approximately 3.5
    // Calories = MET * weight(kg) * time(hours)
    // Average walking speed is ~5 km/h, so time = distance / 5
    const walkingTimeHours = distanceKm / 5;
    const MET = 3.5;
    const calories = Math.round(MET * weightKg * walkingTimeHours);

    return {
      calories,
      distanceKm: Math.round(distanceKm * 100) / 100,
    };
  }

  /**
   * Get platform-specific instructions for enabling step tracking
   */
  getSetupInstructions(): string {
    if (Platform.OS === 'ios') {
      return 'To track steps, please allow access to Motion & Fitness data in Settings > Privacy > Motion & Fitness.';
    } else if (Platform.OS === 'android') {
      return 'To track steps, please allow Physical Activity permission when prompted.';
    }
    return 'Step tracking is not available on this platform.';
  }
}

export default new HealthService();
