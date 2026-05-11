import { expandMuscleAliasToIds, normalizeAnatomyKey } from '../../anatomy/components/anatomyData';

function unique(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();

  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .filter((value) => {
      const normalized = normalizeAnatomyKey(value);
      if (!normalized || seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
}

function getSortedBodyParts(raw: any): any[] {
  const bodyParts = Array.isArray(raw?.bodyParts) ? [...raw.bodyParts] : [];
  return bodyParts.sort((a: any, b: any) => (a.activationRank || a.activationRanking || 99) - (b.activationRank || b.activationRanking || 99));
}

export function extractExerciseMuscles(raw: any): string[] {
  const fromBodyParts = getSortedBodyParts(raw).map((bp: any) => bp.bodyPart?.name || bp.name);
  const fromPrimary = Array.isArray(raw?.primaryMuscles) ? raw.primaryMuscles : [];
  const fromFallbackGroup = typeof raw?.muscleGroup === 'string' ? [raw.muscleGroup] : [];

  return unique([...fromBodyParts, ...fromPrimary, ...fromFallbackGroup]);
}

export function extractExerciseSecondaryMuscles(raw: any): string[] {
  const primaryMuscles = new Set(extractExerciseMuscles(raw).map((muscle) => normalizeAnatomyKey(muscle)));
  const fromSecondary = Array.isArray(raw?.secondaryMuscles) ? raw.secondaryMuscles : [];

  return unique(fromSecondary).filter((muscle) => !primaryMuscles.has(normalizeAnatomyKey(muscle)));
}

export function getExerciseTargetMuscles(raw: any): string[] {
  const muscles = extractExerciseMuscles(raw);
  return muscles.length > 0 ? muscles : ['other'];
}

export function getPrimaryExerciseMuscle(raw: any): string {
  return getExerciseTargetMuscles(raw)[0] || 'other';
}

export function getExerciseMuscleSummary(raw: any): string {
  const muscles = extractExerciseMuscles(raw);
  return muscles.length > 0 ? muscles.join(', ') : 'Unknown';
}

function toMuscleKeys(muscles: string[]): Set<string> {
  const keys = new Set<string>();

  muscles.forEach((muscle) => {
    const normalized = normalizeAnatomyKey(muscle);
    if (!normalized) {
      return;
    }

    const ids = expandMuscleAliasToIds(muscle);
    if (ids.length > 0) {
      ids.forEach((id) => keys.add(id));
      return;
    }

    keys.add(normalized);
  });

  return keys;
}

export function hasSharedExerciseMuscles(raw: any, muscles: string[]): boolean {
  const left = toMuscleKeys(extractExerciseMuscles(raw));
  const right = toMuscleKeys(muscles);

  if (left.size === 0 || right.size === 0) {
    return false;
  }

  for (const key of left) {
    if (right.has(key)) {
      return true;
    }
  }

  return false;
}
