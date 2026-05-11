import React, { useMemo } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AnatomySide, AnatomyThemeId, TrainingData, getAnatomyRegion } from './anatomyData';

interface PremiumAnatomyFigureProps {
  side: AnatomySide;
  themeId?: AnatomyThemeId;
  width?: number | string;
  height?: number;
  label?: string;
  interactive?: boolean;
  selectedMuscle?: string | null;
  primaryIds?: Set<string>;
  secondaryIds?: Set<string>;
  trainingMap?: Map<string, TrainingData>;
  mode?: 'explore' | 'heatmap';
  onSelect?: (muscleId: string) => void;
}

type ReferenceVisualKey =
  | 'base'
  | 'shoulders'
  | 'biceps'
  | 'chest'
  | 'frontForearms'
  | 'abs'
  | 'quads'
  | 'frontCalves'
  | 'backTrapsLats'
  | 'backForearms'
  | 'backHamstrings';

interface Hotspot {
  key: string;
  muscleId: string;
  left: string;
  top: string;
  width: string;
  height: string;
  borderRadius?: number;
}

const FRONT_ASSETS: Record<ReferenceVisualKey, ImageSourcePropType> = {
  base: require('../../../../assets/anatomy-reference/front-base.png'),
  shoulders: require('../../../../assets/anatomy-reference/front-shoulders.jpeg'),
  biceps: require('../../../../assets/anatomy-reference/front-biceps.jpeg'),
  chest: require('../../../../assets/anatomy-reference/front-chest.jpeg'),
  frontForearms: require('../../../../assets/anatomy-reference/front-forearms.jpeg'),
  abs: require('../../../../assets/anatomy-reference/front-abs.jpeg'),
  quads: require('../../../../assets/anatomy-reference/front-quads.jpeg'),
  frontCalves: require('../../../../assets/anatomy-reference/front-calves.jpeg'),
  backTrapsLats: require('../../../../assets/anatomy-reference/front-base.png'),
  backForearms: require('../../../../assets/anatomy-reference/front-base.png'),
  backHamstrings: require('../../../../assets/anatomy-reference/front-base.png'),
};

const BACK_ASSETS: Record<ReferenceVisualKey, ImageSourcePropType> = {
  base: require('../../../../assets/anatomy-reference/back-base.png'),
  shoulders: require('../../../../assets/anatomy-reference/back-base.png'),
  biceps: require('../../../../assets/anatomy-reference/back-base.png'),
  chest: require('../../../../assets/anatomy-reference/back-base.png'),
  frontForearms: require('../../../../assets/anatomy-reference/back-base.png'),
  abs: require('../../../../assets/anatomy-reference/back-base.png'),
  quads: require('../../../../assets/anatomy-reference/back-base.png'),
  frontCalves: require('../../../../assets/anatomy-reference/back-base.png'),
  backTrapsLats: require('../../../../assets/anatomy-reference/back-traps-lats.jpeg'),
  backForearms: require('../../../../assets/anatomy-reference/back-forearms.jpeg'),
  backHamstrings: require('../../../../assets/anatomy-reference/back-hamstrings.jpeg'),
};

const FRONT_PRIORITY = [
  'front_delts',
  'side_delts',
  'upper_chest',
  'lower_chest',
  'biceps',
  'forearms',
  'upper_abs',
  'lower_abs',
  'obliques',
  'quads',
  'adductors',
  'tibialis',
  'calves',
];

const BACK_PRIORITY = [
  'traps',
  'upper_lats',
  'lower_lats',
  'spinal_erectors',
  'rear_delts',
  'side_delts',
  'triceps',
  'forearms',
  'glutes',
  'hamstrings',
  'calves',
];

const FRONT_HOTSPOTS: Hotspot[] = [
  { key: 'front-delts-left', muscleId: 'front_delts', left: '13%', top: '12%', width: '13%', height: '9%', borderRadius: 999 },
  { key: 'front-delts-right', muscleId: 'front_delts', left: '74%', top: '12%', width: '13%', height: '9%', borderRadius: 999 },
  { key: 'side-delts-left', muscleId: 'side_delts', left: '12%', top: '12%', width: '14%', height: '10%', borderRadius: 999 },
  { key: 'side-delts-right', muscleId: 'side_delts', left: '74%', top: '12%', width: '14%', height: '10%', borderRadius: 999 },
  { key: 'upper-chest-left', muscleId: 'upper_chest', left: '36%', top: '13%', width: '14%', height: '6%', borderRadius: 10 },
  { key: 'upper-chest-right', muscleId: 'upper_chest', left: '50%', top: '13%', width: '14%', height: '6%', borderRadius: 10 },
  { key: 'lower-chest-left', muscleId: 'lower_chest', left: '33%', top: '17%', width: '16%', height: '7%', borderRadius: 10 },
  { key: 'lower-chest-right', muscleId: 'lower_chest', left: '51%', top: '17%', width: '16%', height: '7%', borderRadius: 10 },
  { key: 'biceps-left', muscleId: 'biceps', left: '13%', top: '20%', width: '11%', height: '14%', borderRadius: 999 },
  { key: 'biceps-right', muscleId: 'biceps', left: '76%', top: '20%', width: '11%', height: '14%', borderRadius: 999 },
  { key: 'forearms-left', muscleId: 'forearms', left: '7%', top: '33%', width: '12%', height: '16%', borderRadius: 999 },
  { key: 'forearms-right', muscleId: 'forearms', left: '81%', top: '33%', width: '12%', height: '16%', borderRadius: 999 },
  { key: 'upper-abs', muscleId: 'upper_abs', left: '41%', top: '27%', width: '18%', height: '10%', borderRadius: 10 },
  { key: 'lower-abs', muscleId: 'lower_abs', left: '44%', top: '39%', width: '12%', height: '13%', borderRadius: 10 },
  { key: 'obliques-left', muscleId: 'obliques', left: '33%', top: '29%', width: '8%', height: '16%', borderRadius: 10 },
  { key: 'obliques-right', muscleId: 'obliques', left: '59%', top: '29%', width: '8%', height: '16%', borderRadius: 10 },
  { key: 'quads-left', muscleId: 'quads', left: '31%', top: '54%', width: '14%', height: '23%', borderRadius: 12 },
  { key: 'quads-right', muscleId: 'quads', left: '55%', top: '54%', width: '14%', height: '23%', borderRadius: 12 },
  { key: 'adductors-left', muscleId: 'adductors', left: '43%', top: '56%', width: '5%', height: '18%', borderRadius: 10 },
  { key: 'adductors-right', muscleId: 'adductors', left: '52%', top: '56%', width: '5%', height: '18%', borderRadius: 10 },
  { key: 'tibialis-left', muscleId: 'tibialis', left: '34%', top: '79%', width: '8%', height: '14%', borderRadius: 12 },
  { key: 'tibialis-right', muscleId: 'tibialis', left: '58%', top: '79%', width: '8%', height: '14%', borderRadius: 12 },
  { key: 'calves-left-front', muscleId: 'calves', left: '34%', top: '79%', width: '8%', height: '14%', borderRadius: 12 },
  { key: 'calves-right-front', muscleId: 'calves', left: '58%', top: '79%', width: '8%', height: '14%', borderRadius: 12 },
];

const BACK_HOTSPOTS: Hotspot[] = [
  { key: 'rear-delts-left', muscleId: 'rear_delts', left: '14%', top: '12%', width: '12%', height: '9%', borderRadius: 999 },
  { key: 'rear-delts-right', muscleId: 'rear_delts', left: '75%', top: '12%', width: '12%', height: '9%', borderRadius: 999 },
  { key: 'side-delts-left-back', muscleId: 'side_delts', left: '13%', top: '12%', width: '13%', height: '9%', borderRadius: 999 },
  { key: 'side-delts-right-back', muscleId: 'side_delts', left: '75%', top: '12%', width: '13%', height: '9%', borderRadius: 999 },
  { key: 'traps', muscleId: 'traps', left: '35%', top: '8%', width: '30%', height: '17%', borderRadius: 10 },
  { key: 'upper-lats-left', muscleId: 'upper_lats', left: '27%', top: '19%', width: '14%', height: '14%', borderRadius: 10 },
  { key: 'upper-lats-right', muscleId: 'upper_lats', left: '59%', top: '19%', width: '14%', height: '14%', borderRadius: 10 },
  { key: 'lower-lats-left', muscleId: 'lower_lats', left: '28%', top: '31%', width: '13%', height: '16%', borderRadius: 10 },
  { key: 'lower-lats-right', muscleId: 'lower_lats', left: '59%', top: '31%', width: '13%', height: '16%', borderRadius: 10 },
  { key: 'erectors', muscleId: 'spinal_erectors', left: '46%', top: '21%', width: '8%', height: '25%', borderRadius: 10 },
  { key: 'triceps-left', muscleId: 'triceps', left: '14%', top: '21%', width: '10%', height: '12%', borderRadius: 999 },
  { key: 'triceps-right', muscleId: 'triceps', left: '76%', top: '21%', width: '10%', height: '12%', borderRadius: 999 },
  { key: 'forearms-left-back', muscleId: 'forearms', left: '8%', top: '33%', width: '12%', height: '16%', borderRadius: 999 },
  { key: 'forearms-right-back', muscleId: 'forearms', left: '80%', top: '33%', width: '12%', height: '16%', borderRadius: 999 },
  { key: 'glutes-left', muscleId: 'glutes', left: '36%', top: '50%', width: '11%', height: '9%', borderRadius: 10 },
  { key: 'glutes-right', muscleId: 'glutes', left: '53%', top: '50%', width: '11%', height: '9%', borderRadius: 10 },
  { key: 'hamstrings-left', muscleId: 'hamstrings', left: '31%', top: '60%', width: '14%', height: '20%', borderRadius: 12 },
  { key: 'hamstrings-right', muscleId: 'hamstrings', left: '55%', top: '60%', width: '14%', height: '20%', borderRadius: 12 },
  { key: 'calves-left-back', muscleId: 'calves', left: '36%', top: '82%', width: '9%', height: '11%', borderRadius: 12 },
  { key: 'calves-right-back', muscleId: 'calves', left: '54%', top: '82%', width: '9%', height: '11%', borderRadius: 12 },
];

function muscleToVisual(muscleId: string, side: AnatomySide): ReferenceVisualKey {
  switch (muscleId) {
    case 'front_delts':
    case 'side_delts':
      return side === 'front' ? 'shoulders' : 'backTrapsLats';
    case 'rear_delts':
      return 'backTrapsLats';
    case 'upper_chest':
    case 'lower_chest':
      return 'chest';
    case 'biceps':
      return 'biceps';
    case 'triceps':
    case 'forearms':
      return side === 'front' ? 'frontForearms' : 'backForearms';
    case 'upper_abs':
    case 'lower_abs':
    case 'obliques':
      return 'abs';
    case 'quads':
    case 'adductors':
      return 'quads';
    case 'tibialis':
      return 'frontCalves';
    case 'calves':
      return side === 'front' ? 'frontCalves' : 'backHamstrings';
    case 'traps':
    case 'upper_lats':
    case 'lower_lats':
    case 'spinal_erectors':
      return 'backTrapsLats';
    case 'glutes':
    case 'hamstrings':
      return 'backHamstrings';
    default:
      return 'base';
  }
}

function pickDisplayMuscle(
  side: AnatomySide,
  selectedMuscle: string | null | undefined,
  primaryIds?: Set<string>,
  secondaryIds?: Set<string>,
  trainingMap?: Map<string, TrainingData>,
  mode?: 'explore' | 'heatmap'
) {
  const priority = side === 'front' ? FRONT_PRIORITY : BACK_PRIORITY;

  if (selectedMuscle) {
    const region = getAnatomyRegion(selectedMuscle);
    if (region?.sides.includes(side)) {
      return selectedMuscle;
    }
  }

  for (const id of priority) {
    if (primaryIds?.has(id)) {
      return id;
    }
  }

  for (const id of priority) {
    if (secondaryIds?.has(id)) {
      return id;
    }
  }

  if (mode === 'heatmap' && trainingMap) {
    let winner: string | null = null;
    let max = -1;
    for (const id of priority) {
      const training = trainingMap.get(id);
      if (training && training.intensity > max) {
        winner = id;
        max = training.intensity;
      }
    }
    return winner;
  }

  return null;
}

export default function PremiumAnatomyFigure({
  side,
  width = '100%',
  height = 360,
  label,
  interactive = true,
  selectedMuscle = null,
  primaryIds,
  secondaryIds,
  trainingMap = new Map<string, TrainingData>(),
  mode = 'explore',
  onSelect,
}: PremiumAnatomyFigureProps) {
  const displayMuscle = useMemo(
    () => pickDisplayMuscle(side, selectedMuscle, primaryIds, secondaryIds, trainingMap, mode),
    [side, selectedMuscle, primaryIds, secondaryIds, trainingMap, mode]
  );

  const visualKey = displayMuscle ? muscleToVisual(displayMuscle, side) : 'base';
  const source = side === 'front' ? FRONT_ASSETS[visualKey] : BACK_ASSETS[visualKey];
  const hotspots = side === 'front' ? FRONT_HOTSPOTS : BACK_HOTSPOTS;

  return (
    <View style={[styles.container, { width }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.figureFrame, { height }]}>
        <Image source={source} resizeMode="contain" style={styles.image} />

        {interactive &&
          hotspots.map((hotspot) => (
            <Pressable
              key={hotspot.key}
              onPress={() => onSelect?.(hotspot.muscleId)}
              style={[
                styles.hotspot,
                {
                  left: hotspot.left,
                  top: hotspot.top,
                  width: hotspot.width,
                  height: hotspot.height,
                  borderRadius: hotspot.borderRadius ?? 999,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${hotspot.muscleId.replace(/_/g, ' ')}`}
            />
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  label: {
    marginBottom: 10,
    color: '#86A1C4',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  figureFrame: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  hotspot: {
    position: 'absolute',
    backgroundColor: 'transparent',
  },
});
