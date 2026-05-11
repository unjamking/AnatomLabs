import React, { useEffect, useMemo } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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

function formatPercent(value: number) {
  return `${Math.max(0, Number(value.toFixed(2)))}%`;
}

function insetHotspots(hotspots: Hotspot[], scaleX = 0.92, scaleY = 0.92) {
  return hotspots.map((hotspot) => {
    const left = Number.parseFloat(hotspot.left);
    const top = Number.parseFloat(hotspot.top);
    const width = Number.parseFloat(hotspot.width);
    const height = Number.parseFloat(hotspot.height);

    const nextWidth = width * scaleX;
    const nextHeight = height * scaleY;

    return {
      ...hotspot,
      left: formatPercent(left + (width - nextWidth) / 2),
      top: formatPercent(top + (height - nextHeight) / 2),
      width: formatPercent(nextWidth),
      height: formatPercent(nextHeight),
    };
  });
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
  { key: 'front-delts-left', muscleId: 'front_delts', left: '14%', top: '12.5%', width: '11.5%', height: '8%', borderRadius: 999 },
  { key: 'front-delts-right', muscleId: 'front_delts', left: '74.5%', top: '12.5%', width: '11.5%', height: '8%', borderRadius: 999 },
  { key: 'side-delts-left', muscleId: 'side_delts', left: '11.5%', top: '13%', width: '11.5%', height: '8.5%', borderRadius: 999 },
  { key: 'side-delts-right', muscleId: 'side_delts', left: '77%', top: '13%', width: '11.5%', height: '8.5%', borderRadius: 999 },
  { key: 'upper-chest-left', muscleId: 'upper_chest', left: '36%', top: '13%', width: '14%', height: '6%', borderRadius: 10 },
  { key: 'upper-chest-right', muscleId: 'upper_chest', left: '50%', top: '13%', width: '14%', height: '6%', borderRadius: 10 },
  { key: 'lower-chest-left', muscleId: 'lower_chest', left: '33%', top: '17%', width: '16%', height: '7%', borderRadius: 10 },
  { key: 'lower-chest-right', muscleId: 'lower_chest', left: '51%', top: '17%', width: '16%', height: '7%', borderRadius: 10 },
  { key: 'biceps-left', muscleId: 'biceps', left: '14%', top: '21%', width: '9%', height: '12%', borderRadius: 999 },
  { key: 'biceps-right', muscleId: 'biceps', left: '77%', top: '21%', width: '9%', height: '12%', borderRadius: 999 },
  { key: 'forearms-left', muscleId: 'forearms', left: '8%', top: '35%', width: '9%', height: '13%', borderRadius: 999 },
  { key: 'forearms-right', muscleId: 'forearms', left: '83%', top: '35%', width: '9%', height: '13%', borderRadius: 999 },
  { key: 'upper-abs', muscleId: 'upper_abs', left: '41%', top: '27%', width: '18%', height: '10%', borderRadius: 10 },
  { key: 'lower-abs', muscleId: 'lower_abs', left: '44%', top: '39%', width: '12%', height: '13%', borderRadius: 10 },
  { key: 'obliques-left', muscleId: 'obliques', left: '33%', top: '29%', width: '8%', height: '16%', borderRadius: 10 },
  { key: 'obliques-right', muscleId: 'obliques', left: '59%', top: '29%', width: '8%', height: '16%', borderRadius: 10 },
  { key: 'quads-left', muscleId: 'quads', left: '32%', top: '55%', width: '12%', height: '20%', borderRadius: 12 },
  { key: 'quads-right', muscleId: 'quads', left: '56%', top: '55%', width: '12%', height: '20%', borderRadius: 12 },
  { key: 'adductors-left', muscleId: 'adductors', left: '43.5%', top: '58%', width: '4%', height: '15%', borderRadius: 10 },
  { key: 'adductors-right', muscleId: 'adductors', left: '52.5%', top: '58%', width: '4%', height: '15%', borderRadius: 10 },
  { key: 'tibialis-left', muscleId: 'tibialis', left: '35%', top: '79%', width: '6%', height: '12%', borderRadius: 12 },
  { key: 'tibialis-right', muscleId: 'tibialis', left: '59%', top: '79%', width: '6%', height: '12%', borderRadius: 12 },
  { key: 'calves-left-front', muscleId: 'calves', left: '30.5%', top: '80.5%', width: '5.5%', height: '10%', borderRadius: 12 },
  { key: 'calves-right-front', muscleId: 'calves', left: '64%', top: '80.5%', width: '5.5%', height: '10%', borderRadius: 12 },
];

const BACK_HOTSPOTS: Hotspot[] = [
  { key: 'rear-delts-left', muscleId: 'rear_delts', left: '14.5%', top: '12.5%', width: '10.5%', height: '8%', borderRadius: 999 },
  { key: 'rear-delts-right', muscleId: 'rear_delts', left: '75%', top: '12.5%', width: '10.5%', height: '8%', borderRadius: 999 },
  { key: 'side-delts-left-back', muscleId: 'side_delts', left: '12.5%', top: '13%', width: '11%', height: '8%', borderRadius: 999 },
  { key: 'side-delts-right-back', muscleId: 'side_delts', left: '76.5%', top: '13%', width: '11%', height: '8%', borderRadius: 999 },
  { key: 'traps', muscleId: 'traps', left: '37%', top: '9%', width: '26%', height: '13%', borderRadius: 10 },
  { key: 'upper-lats-left', muscleId: 'upper_lats', left: '29%', top: '21%', width: '11%', height: '12%', borderRadius: 10 },
  { key: 'upper-lats-right', muscleId: 'upper_lats', left: '60%', top: '21%', width: '11%', height: '12%', borderRadius: 10 },
  { key: 'lower-lats-left', muscleId: 'lower_lats', left: '29.5%', top: '33%', width: '10%', height: '14%', borderRadius: 10 },
  { key: 'lower-lats-right', muscleId: 'lower_lats', left: '60.5%', top: '33%', width: '10%', height: '14%', borderRadius: 10 },
  { key: 'erectors', muscleId: 'spinal_erectors', left: '47%', top: '23%', width: '6%', height: '21%', borderRadius: 10 },
  { key: 'triceps-left', muscleId: 'triceps', left: '15%', top: '22%', width: '8.5%', height: '10.5%', borderRadius: 999 },
  { key: 'triceps-right', muscleId: 'triceps', left: '76.5%', top: '22%', width: '8.5%', height: '10.5%', borderRadius: 999 },
  { key: 'forearms-left-back', muscleId: 'forearms', left: '9%', top: '35%', width: '9.5%', height: '13%', borderRadius: 999 },
  { key: 'forearms-right-back', muscleId: 'forearms', left: '81.5%', top: '35%', width: '9.5%', height: '13%', borderRadius: 999 },
  { key: 'glutes-left', muscleId: 'glutes', left: '37%', top: '51%', width: '9%', height: '8%', borderRadius: 10 },
  { key: 'glutes-right', muscleId: 'glutes', left: '54%', top: '51%', width: '9%', height: '8%', borderRadius: 10 },
  { key: 'hamstrings-left', muscleId: 'hamstrings', left: '32%', top: '61%', width: '12%', height: '17%', borderRadius: 12 },
  { key: 'hamstrings-right', muscleId: 'hamstrings', left: '56%', top: '61%', width: '12%', height: '17%', borderRadius: 12 },
  { key: 'calves-left-back', muscleId: 'calves', left: '37%', top: '83%', width: '7%', height: '9%', borderRadius: 12 },
  { key: 'calves-right-back', muscleId: 'calves', left: '56%', top: '83%', width: '7%', height: '9%', borderRadius: 12 },
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
  const pulse = useSharedValue(0);

  const visualKey = displayMuscle ? muscleToVisual(displayMuscle, side) : 'base';
  const source = side === 'front' ? FRONT_ASSETS[visualKey] : BACK_ASSETS[visualKey];
  const hotspots = useMemo(
    () => insetHotspots(side === 'front' ? FRONT_HOTSPOTS : BACK_HOTSPOTS),
    [side]
  );
  const activeHotspots = useMemo(
    () => hotspots.filter((hotspot) => hotspot.muscleId === selectedMuscle),
    [hotspots, selectedMuscle]
  );

  useEffect(() => {
    if (activeHotspots.length === 0) {
      pulse.value = withTiming(0, { duration: 140 });
      return;
    }

    pulse.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 220 }), withTiming(1, { duration: 820 })),
      -1,
      true
    );
  }, [activeHotspots.length, pulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.18 + pulse.value * 0.24,
    transform: [{ scale: 0.96 + pulse.value * 0.05 }],
  }));

  return (
    <View style={[styles.container, { width }]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.figureFrame, { height }]}>
        <Image source={source} resizeMode="contain" style={styles.image} />

        {activeHotspots.map((hotspot) => (
          <Animated.View
            key={`${hotspot.key}-glow`}
            pointerEvents="none"
            style={[
              styles.selectionGlow,
              glowStyle,
              {
                left: hotspot.left,
                top: hotspot.top,
                width: hotspot.width,
                height: hotspot.height,
                borderRadius: hotspot.borderRadius ?? 999,
              },
            ]}
          />
        ))}

        {interactive &&
          hotspots.map((hotspot) => (
            <Pressable
              key={hotspot.key}
              onPress={() => onSelect?.(hotspot.muscleId)}
              style={({ pressed }) => [
                styles.hotspot,
                {
                  left: hotspot.left,
                  top: hotspot.top,
                  width: hotspot.width,
                  height: hotspot.height,
                  borderRadius: hotspot.borderRadius ?? 999,
                  opacity: pressed ? 0.92 : 1,
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                },
              ]}
              hitSlop={0}
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
  selectionGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(227, 97, 113, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(227, 97, 113, 0.5)',
    shadowColor: '#E36171',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
});
