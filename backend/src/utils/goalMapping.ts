export type PublicGoal = 'muscle_gain' | 'endurance' | 'cut' | 'maintain' | 'sport_specific';

export function normalizePublicGoal(value: unknown): PublicGoal | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'muscle_gain':
    case 'strength':
      return 'muscle_gain';
    case 'endurance':
      return 'endurance';
    case 'cut':
    case 'fat_loss':
    case 'body_recomposition':
      return 'cut';
    case 'maintain':
    case 'maintenance':
    case 'general_fitness':
      return 'maintain';
    case 'sport_specific':
      return 'sport_specific';
    default:
      return null;
  }
}

export function toStoredGoal(value: unknown): PublicGoal | null {
  return normalizePublicGoal(value);
}

export function toWorkoutGoal(value: unknown): 'muscle_gain' | 'endurance' | 'general_fitness' | 'sport_specific' {
  const normalized = normalizePublicGoal(value);

  switch (normalized) {
    case 'muscle_gain':
      return 'muscle_gain';
    case 'endurance':
      return 'endurance';
    case 'sport_specific':
      return 'sport_specific';
    case 'cut':
    case 'maintain':
    default:
      return 'general_fitness';
  }
}

export function toNutritionGoal(value: unknown): 'muscle_gain' | 'fat_loss' | 'general_fitness' | 'endurance' | 'sport_specific' {
  const normalized = normalizePublicGoal(value);

  switch (normalized) {
    case 'muscle_gain':
      return 'muscle_gain';
    case 'endurance':
      return 'endurance';
    case 'sport_specific':
      return 'sport_specific';
    case 'cut':
      return 'fat_loss';
    case 'maintain':
    default:
      return 'general_fitness';
  }
}
