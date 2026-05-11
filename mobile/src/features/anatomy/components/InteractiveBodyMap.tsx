import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn as ReanimatedFadeIn,
  FadeOut as ReanimatedFadeOut,
  SlideInLeft,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useHaptics } from '../../../shared/components/animations';
import PremiumAnatomyFigure from './PremiumAnatomyFigure';
import {
  ANATOMY_THEMES,
  MUSCLE_NAME_TO_ID,
  MUSCLE_REGIONS,
  AnatomyCanvasView,
  AnatomyThemeId,
  TrainingData,
  expandMuscleAliasToIds,
  getAnatomyRegion,
} from './anatomyData';

interface InteractiveBodyMapProps {
  onMusclePress?: (muscleId: string, muscleName: string) => void;
  trainingData?: TrainingData[];
  selectedMuscle?: string | null;
  activeView?: AnatomyCanvasView;
  onViewChange?: (view: AnatomyCanvasView) => void;
  height?: number;
  showLabels?: boolean;
  mode?: 'explore' | 'heatmap';
  themeId?: AnatomyThemeId;
}

const VIEW_OPTIONS: AnatomyCanvasView[] = ['both', 'front', 'back'];

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

function HeatmapLegend() {
  const levels = [
    { color: '#50B9FF', label: 'Light' },
    { color: '#60E6A8', label: 'Warm' },
    { color: '#FFD166', label: 'Moderate' },
    { color: '#FF9B4B', label: 'Heavy' },
    { color: '#FF5D5D', label: 'Max' },
  ];

  return (
    <View style={styles.legendRow}>
      {levels.map((level) => (
        <View key={level.label} style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: level.color }]} />
          <Text style={styles.legendText}>{level.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function InteractiveBodyMap({
  onMusclePress,
  trainingData = [],
  selectedMuscle,
  activeView,
  onViewChange,
  height = 520,
  showLabels = true,
  mode = 'explore',
  themeId = 'neon',
}: InteractiveBodyMapProps) {
  const { trigger } = useHaptics();
  const [internalSelected, setInternalSelected] = useState<string | null>(selectedMuscle ?? null);
  const [internalView, setInternalView] = useState<AnatomyCanvasView>(activeView ?? 'both');
  const [controlWidth, setControlWidth] = useState(0);
  const indicatorIndex = useSharedValue(VIEW_OPTIONS.indexOf(activeView ?? 'both'));
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const currentSelected = typeof selectedMuscle === 'undefined' ? internalSelected : selectedMuscle;
  const currentView = activeView ?? internalView;
  const theme = ANATOMY_THEMES[themeId];

  useEffect(() => {
    indicatorIndex.value = withSpring(VIEW_OPTIONS.indexOf(currentView), {
      damping: 18,
      stiffness: 190,
    });
  }, [currentView, indicatorIndex]);

  const trainingMap = useMemo(() => {
    const map = new Map<string, TrainingData>();

    trainingData.forEach((entry) => {
      const ids = expandMuscleAliasToIds(entry.muscleId);
      const targetIds = ids.length > 0 ? ids : [entry.muscleId.toLowerCase().trim()];

      targetIds.forEach((id) => {
        const existing = map.get(id);
        if (!existing || entry.intensity > existing.intensity) {
          map.set(id, { ...entry, muscleId: id });
        }
      });
    });

    return map;
  }, [trainingData]);

  const resetZoom = useCallback(() => {
    scale.value = withTiming(1, { duration: 220 });
    savedScale.value = 1;
    translateX.value = withTiming(0, { duration: 220 });
    translateY.value = withTiming(0, { duration: 220 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [savedScale, savedTranslateX, savedTranslateY, scale, translateX, translateY]);

  const handleViewSelect = useCallback(
    (view: AnatomyCanvasView) => {
      trigger('selection');
      onViewChange?.(view);
      if (!onViewChange) {
        setInternalView(view);
      }
      resetZoom();
    },
    [onViewChange, resetZoom, trigger]
  );

  const handleMuscleSelect = useCallback(
    (muscleId: string) => {
      const region = getAnatomyRegion(muscleId);
      const nextId = currentSelected === muscleId ? null : muscleId;

      if (typeof selectedMuscle === 'undefined') {
        setInternalSelected(nextId);
      }

      trigger(nextId ? 'medium' : 'light');
      onMusclePress?.(nextId ?? '', nextId ? region?.name ?? muscleId : '');
    },
    [currentSelected, onMusclePress, selectedMuscle, trigger]
  );

  const segmentedIndicatorStyle = useAnimatedStyle(() => {
    const buttonWidth = controlWidth / VIEW_OPTIONS.length;
    return {
      width: Math.max(buttonWidth - 8, 0),
      transform: [{ translateX: buttonWidth * indicatorIndex.value + 4 }],
    };
  });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, 1, 2.4);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= 1.02) {
        scale.value = withTiming(1, { duration: 180 });
        savedScale.value = 1;
        translateX.value = withTiming(0, { duration: 180 });
        translateY.value = withTiming(0, { duration: 180 });
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value <= 1.01) {
        return;
      }
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const gesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const zoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const onControlLayout = (event: LayoutChangeEvent) => {
    setControlWidth(event.nativeEvent.layout.width);
  };

  const figureHeight = currentView === 'both' ? Math.max(height - 170, 290) : Math.max(height - 160, 330);
  const selectedRegion = currentSelected ? getAnatomyRegion(currentSelected) : null;

  return (
    <View style={[styles.container, { minHeight: height }]}>
      <View
        style={[
          styles.segmentedControl,
          { backgroundColor: '#E3EBF4', borderColor: '#C9D6E4' },
        ]}
        onLayout={onControlLayout}
      >
        <Animated.View
          style={[
            styles.segmentedIndicator,
            segmentedIndicatorStyle,
            { backgroundColor: '#FFFFFF', borderColor: '#C9D6E4' },
          ]}
        />

        {VIEW_OPTIONS.map((option) => {
          const active = currentView === option;
          return (
            <Pressable
              key={option}
              style={styles.segmentButton}
              onPress={() => handleViewSelect(option)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${option} anatomy`}
            >
              <Text style={[styles.segmentLabel, active && { color: '#233B58' }]}>
                {option === 'both' ? 'Both' : option === 'front' ? 'Front' : 'Back'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.stageCard, { borderColor: '#D7E2EE', backgroundColor: '#FFFFFF' }]}>
        <View style={styles.stageToolbar}>
          <View>
            <Text style={styles.stageTitle}>Interactive muscle atlas</Text>
            <Text style={styles.stageSubtitle}>
              Pinch to zoom, drag to pan, then tap any region for a synced detail view.
            </Text>
          </View>

          <Pressable
            onPress={resetZoom}
            style={[styles.resetButton, { borderColor: '#D7E2EE' }]}
            accessibilityRole="button"
            accessibilityLabel="Reset anatomy zoom"
          >
              <Ionicons name="scan-outline" size={16} color="#4F6F92" />
          </Pressable>
        </View>

        <GestureDetector gesture={gesture}>
          <View style={styles.sceneViewport}>
            <Animated.View style={[styles.sceneTransform, zoomStyle]}>
              <Animated.View
                key={currentView}
                entering={
                  currentView === 'back'
                    ? SlideInRight.duration(250)
                    : currentView === 'front'
                      ? SlideInLeft.duration(250)
                      : ReanimatedFadeIn.duration(220)
                }
                exiting={ReanimatedFadeOut.duration(160)}
                style={[styles.figureRow, currentView !== 'both' && styles.figureRowSingle]}
              >
                {currentView === 'both' ? (
                  <>
                    <PremiumAnatomyFigure
                      side="front"
                      label={showLabels ? 'Front' : undefined}
                      height={figureHeight}
                      width="48%"
                      themeId={themeId}
                      selectedMuscle={currentSelected}
                      trainingMap={trainingMap}
                      mode={mode}
                      onSelect={handleMuscleSelect}
                    />
                    <PremiumAnatomyFigure
                      side="back"
                      label={showLabels ? 'Back' : undefined}
                      height={figureHeight}
                      width="48%"
                      themeId={themeId}
                      selectedMuscle={currentSelected}
                      trainingMap={trainingMap}
                      mode={mode}
                      onSelect={handleMuscleSelect}
                    />
                  </>
                ) : (
                  <PremiumAnatomyFigure
                    side={currentView}
                    label={showLabels ? (currentView === 'front' ? 'Front' : 'Back') : undefined}
                    height={figureHeight}
                    width="76%"
                    themeId={themeId}
                    selectedMuscle={currentSelected}
                    trainingMap={trainingMap}
                    mode={mode}
                    onSelect={handleMuscleSelect}
                  />
                )}
              </Animated.View>
            </Animated.View>
          </View>
        </GestureDetector>

        <View style={styles.footerRow}>
          <View style={styles.helperBadge}>
            <Ionicons name="resize-outline" size={14} color="#4F6F92" />
            <Text style={styles.helperText}>Zoom & pan enabled</Text>
          </View>

          {selectedRegion ? (
            <View style={[styles.selectedBadge, { borderColor: '#F2C2C7', backgroundColor: '#FFF1F3' }]}>
              <Text style={styles.selectedText}>{selectedRegion.name}</Text>
            </View>
          ) : (
            <View style={styles.helperBadge}>
              <Ionicons name="sync-outline" size={14} color="#9BB0D8" />
              <Text style={styles.helperText}>Front/back synced</Text>
            </View>
          )}
        </View>
      </View>

      {mode === 'heatmap' ? <HeatmapLegend /> : null}
    </View>
  );
}

export { MUSCLE_NAME_TO_ID, MUSCLE_REGIONS };
export type { AnatomyCanvasView, AnatomyThemeId, TrainingData };

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    gap: 14,
  },
  segmentedControl: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  segmentedIndicator: {
    position: 'absolute',
    top: 4,
    left: 0,
    bottom: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  segmentLabel: {
    color: '#6C86A4',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  stageCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
  },
  stageToolbar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16,
  },
  stageTitle: {
    color: '#203752',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  stageSubtitle: {
    color: '#7289A4',
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 250,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F9FD',
  },
  sceneViewport: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#F8FBFF',
    paddingVertical: 18,
    paddingHorizontal: 10,
  },
  sceneTransform: {
    width: '100%',
  },
  figureRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  figureRowSingle: {
    justifyContent: 'center',
  },
  footerRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  helperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  helperText: {
    color: '#607A98',
    fontSize: 12,
    fontWeight: '600',
  },
  selectedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  selectedText: {
    color: '#B85460',
    fontSize: 12,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  legendText: {
    color: '#607A98',
    fontSize: 11,
    fontWeight: '600',
  },
});
