import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';

interface MuscleBodyDiagramProps {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  height?: number;
}

const PRIMARY_COLOR = '#2ecc71';
const SECONDARY_COLOR = '#2ecc7150';
const DEFAULT_COLOR = '#2a2a2e';
const OUTLINE_COLOR = '#444';

const MUSCLE_NAME_MAP: Record<string, string[]> = {
  chest: ['chest'],
  pectorals: ['chest'],
  pecs: ['chest'],
  shoulders: ['front_deltoids', 'rear_deltoids'],
  'front delts': ['front_deltoids'],
  'front deltoids': ['front_deltoids'],
  'rear delts': ['rear_deltoids'],
  'rear deltoids': ['rear_deltoids'],
  deltoids: ['front_deltoids', 'rear_deltoids'],
  biceps: ['biceps'],
  forearms: ['forearms'],
  abs: ['abs'],
  abdominals: ['abs'],
  'rectus abdominis': ['abs'],
  obliques: ['obliques'],
  quads: ['quads'],
  quadriceps: ['quads'],
  'hip flexors': ['hip_flexors'],
  tibialis: ['tibialis'],
  shins: ['tibialis'],
  traps: ['traps'],
  trapezius: ['traps'],
  lats: ['lats'],
  'latissimus dorsi': ['lats'],
  'lower back': ['lower_back'],
  'erector spinae': ['lower_back'],
  triceps: ['triceps'],
  glutes: ['glutes'],
  gluteus: ['glutes'],
  hamstrings: ['hamstrings'],
  calves: ['calves'],
  gastrocnemius: ['calves'],
};

const FRONT_MUSCLES: Record<string, string> = {
  chest: 'M 38,28 C 38,26 40,24 45,23 L 50,22 L 55,23 C 60,24 62,26 62,28 L 62,34 C 60,36 55,37 50,37 C 45,37 40,36 38,34 Z',
  front_deltoids: 'M 32,22 C 32,20 34,18 37,18 L 38,22 L 38,28 C 36,27 33,25 32,22 Z M 68,22 C 68,20 66,18 63,18 L 62,22 L 62,28 C 64,27 67,25 68,22 Z',
  biceps: 'M 30,28 C 29,30 28,34 29,38 C 30,40 32,41 33,38 L 34,30 L 32,27 Z M 70,28 C 71,30 72,34 71,38 C 70,40 68,41 67,38 L 66,30 L 68,27 Z',
  forearms: 'M 28,40 C 27,43 26,47 27,50 L 29,50 C 30,47 31,43 31,40 Z M 72,40 C 73,43 74,47 73,50 L 71,50 C 70,47 69,43 69,40 Z',
  abs: 'M 44,38 L 44,55 C 44,56 46,57 50,57 C 54,57 56,56 56,55 L 56,38 C 54,37 52,37 50,37 C 48,37 46,37 44,38 Z',
  obliques: 'M 38,36 L 38,52 C 39,54 41,55 44,55 L 44,38 C 42,37 40,36 38,36 Z M 62,36 L 62,52 C 61,54 59,55 56,55 L 56,38 C 58,37 60,36 62,36 Z',
  quads: 'M 38,58 C 37,62 36,68 37,74 L 42,74 C 43,68 44,62 44,58 Z M 62,58 C 63,62 64,68 63,74 L 58,74 C 57,68 56,62 56,58 Z',
  hip_flexors: 'M 44,55 C 43,57 42,58 42,58 L 44,58 Z M 56,55 C 57,57 58,58 58,58 L 56,58 Z',
  tibialis: 'M 38,76 C 37,80 37,85 37,90 L 41,90 C 41,85 42,80 42,76 Z M 62,76 C 63,80 63,85 63,90 L 59,90 C 59,85 58,80 58,76 Z',
};

const BACK_MUSCLES: Record<string, string> = {
  traps: 'M 38,18 C 40,20 44,22 50,22 C 56,22 60,20 62,18 L 58,16 C 55,17 52,18 50,18 C 48,18 45,17 42,16 Z',
  rear_deltoids: 'M 32,22 C 32,20 34,18 37,18 L 38,22 L 38,27 C 36,26 33,24 32,22 Z M 68,22 C 68,20 66,18 63,18 L 62,22 L 62,27 C 64,26 67,24 68,22 Z',
  lats: 'M 38,28 C 37,32 36,38 38,44 L 44,44 L 44,28 C 42,27 40,27 38,28 Z M 62,28 C 63,32 64,38 62,44 L 56,44 L 56,28 C 58,27 60,27 62,28 Z',
  lower_back: 'M 44,44 L 44,55 C 46,56 48,57 50,57 C 52,57 54,56 56,55 L 56,44 Z',
  triceps: 'M 30,28 C 29,30 28,34 29,38 C 30,40 32,40 33,38 L 34,30 L 32,27 Z M 70,28 C 71,30 72,34 71,38 C 70,40 68,40 67,38 L 66,30 L 68,27 Z',
  glutes: 'M 38,52 C 38,55 40,58 44,58 L 44,52 Z M 62,52 C 62,55 60,58 56,58 L 56,52 Z',
  hamstrings: 'M 38,58 C 37,62 36,68 37,74 L 42,74 C 43,68 44,62 44,58 Z M 62,58 C 63,62 64,68 63,74 L 58,74 C 57,68 56,62 56,58 Z',
  calves: 'M 38,76 C 37,80 37,85 37,90 L 41,90 C 41,85 42,80 42,76 Z M 62,76 C 63,80 63,85 63,90 L 59,90 C 59,85 58,80 58,76 Z',
};

const BODY_OUTLINE_FRONT = 'M 50,4 C 46,4 43,7 43,11 C 43,14 45,17 48,17 L 52,17 C 55,17 57,14 57,11 C 57,7 54,4 50,4 Z M 42,17 C 39,17 34,18 32,22 C 30,26 28,30 28,38 C 27,42 26,48 27,52 L 30,52 C 31,46 32,40 34,36 L 38,36 L 38,52 C 38,55 38,58 38,58 C 37,62 36,68 37,74 C 37,76 37,80 37,90 C 37,93 38,95 40,95 L 42,95 C 43,95 44,93 44,90 L 44,58 L 44,55 C 46,57 48,57 50,57 C 52,57 54,57 56,55 L 56,58 L 56,90 C 56,93 57,95 58,95 L 60,95 C 62,95 63,93 63,90 C 63,80 63,76 63,74 C 64,68 63,62 62,58 C 62,58 62,55 62,52 L 62,36 L 66,36 C 68,40 69,46 70,52 L 73,52 C 74,48 73,42 72,38 C 72,30 70,26 68,22 C 66,18 61,17 58,17 Z';

const BODY_OUTLINE_BACK = 'M 50,4 C 46,4 43,7 43,11 C 43,14 45,17 48,17 L 52,17 C 55,17 57,14 57,11 C 57,7 54,4 50,4 Z M 42,17 C 39,17 34,18 32,22 C 30,26 28,30 28,38 C 27,42 26,48 27,52 L 30,52 C 31,46 32,40 34,36 L 38,36 L 38,52 C 38,55 38,58 38,58 C 37,62 36,68 37,74 C 37,76 37,80 37,90 C 37,93 38,95 40,95 L 42,95 C 43,95 44,93 44,90 L 44,58 L 44,55 C 46,57 48,57 50,57 C 52,57 54,57 56,55 L 56,58 L 56,90 C 56,93 57,95 58,95 L 60,95 C 62,95 63,93 63,90 C 63,80 63,76 63,74 C 64,68 63,62 62,58 C 62,58 62,55 62,52 L 62,36 L 66,36 C 68,40 69,46 70,52 L 73,52 C 74,48 73,42 72,38 C 72,30 70,26 68,22 C 66,18 61,17 58,17 Z';

function resolveMuscleIds(muscles: string[]): Set<string> {
  const ids = new Set<string>();
  muscles.forEach(muscle => {
    const key = muscle.toLowerCase().trim();
    const mapped = MUSCLE_NAME_MAP[key];
    if (mapped) {
      mapped.forEach(id => ids.add(id));
    } else {
      ids.add(key);
    }
  });
  return ids;
}

function getMuscleColor(
  muscleId: string,
  primaryIds: Set<string>,
  secondaryIds: Set<string>,
): string {
  if (primaryIds.has(muscleId)) return PRIMARY_COLOR;
  if (secondaryIds.has(muscleId)) return SECONDARY_COLOR;
  return DEFAULT_COLOR;
}

export default function MuscleBodyDiagram({
  primaryMuscles,
  secondaryMuscles = [],
  height = 200,
}: MuscleBodyDiagramProps) {
  const primaryIds = resolveMuscleIds(primaryMuscles);
  const secondaryIds = resolveMuscleIds(secondaryMuscles);
  const svgWidth = height * 0.85;
  const halfWidth = svgWidth / 2 - 4;

  return (
    <View style={[styles.container, { height }]}>
      <Svg width={halfWidth} height={height} viewBox="0 0 100 100">
        <Path d={BODY_OUTLINE_FRONT} fill={DEFAULT_COLOR} stroke={OUTLINE_COLOR} strokeWidth={0.5} />
        <G>
          {Object.entries(FRONT_MUSCLES).map(([id, path]) => (
            <Path
              key={id}
              d={path}
              fill={getMuscleColor(id, primaryIds, secondaryIds)}
              stroke={OUTLINE_COLOR}
              strokeWidth={0.3}
            />
          ))}
        </G>
      </Svg>
      <Svg width={halfWidth} height={height} viewBox="0 0 100 100">
        <Path d={BODY_OUTLINE_BACK} fill={DEFAULT_COLOR} stroke={OUTLINE_COLOR} strokeWidth={0.5} />
        <G>
          {Object.entries(BACK_MUSCLES).map(([id, path]) => (
            <Path
              key={id}
              d={path}
              fill={getMuscleColor(id, primaryIds, secondaryIds)}
              stroke={OUTLINE_COLOR}
              strokeWidth={0.3}
            />
          ))}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
});
