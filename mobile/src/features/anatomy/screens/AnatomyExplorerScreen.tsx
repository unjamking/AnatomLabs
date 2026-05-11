import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import InteractiveBodyMap, { AnatomyCanvasView, AnatomyThemeId } from '../components/InteractiveBodyMap';
import MuscleBodyDiagram from '../components/MuscleBodyDiagram';
import {
  ANATOMY_THEMES,
  ANATOMY_REGIONS,
  MUSCLE_REGIONS,
  getAnatomyRegion,
  getDefaultViewForMuscle,
  normalizeAnatomyKey,
} from '../components/anatomyData';
import { useHaptics } from '../../../shared/components/animations';
import api from '../../../services/api';

type DifficultyFilter = 'all' | 'beginner' | 'intermediate' | 'advanced';

interface DetailExercise {
  id: string;
  name: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  activationRating?: number;
}

interface MuscleDetail {
  id: string;
  name: string;
  description: string;
  functionText: string;
  recoveryHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  exercises: DetailExercise[];
  sides: AnatomyCanvasView[];
}

const QUICK_FOCUS = ['upper_chest', 'side_delts', 'upper_lats', 'lower_abs', 'glutes', 'hamstrings'];

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function mostCommonDifficulty(exercises: DetailExercise[], fallback: DetailExercise['difficulty']) {
  if (exercises.length === 0) {
    return fallback;
  }

  const counts = exercises.reduce<Record<string, number>>((acc, exercise) => {
    acc[exercise.difficulty] = (acc[exercise.difficulty] ?? 0) + 1;
    return acc;
  }, {});

  return (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as DetailExercise['difficulty']) ?? fallback;
}

function buildFallbackExercises(regionId: string): DetailExercise[] {
  const region = getAnatomyRegion(regionId);
  if (!region) {
    return [];
  }

  return region.exerciseHints.map((name, index) => ({
    id: `${region.id}-hint-${index}`,
    name,
    difficulty: region.defaultDifficulty,
    activationRating: 80 - index * 6,
  }));
}

function scoreBodyPartMatch(regionId: string, bodyPart: any) {
  const region = getAnatomyRegion(regionId);
  if (!region) {
    return 0;
  }

  const haystack = normalizeAnatomyKey(
    [bodyPart?.name, bodyPart?.scientificName, bodyPart?.function, bodyPart?.description]
      .filter(Boolean)
      .join(' ')
  );

  return [region.name, ...region.aliases, ...region.backendKeywords].reduce((score, term) => {
    const normalized = normalizeAnatomyKey(term);
    if (!normalized) {
      return score;
    }

    if (haystack === normalized) {
      return score + 14;
    }

    if (haystack.includes(normalized)) {
      return score + (normalized.length > 6 ? 7 : 4);
    }

    return score;
  }, 0);
}

export default function AnatomyExplorerScreen() {
  const navigation = useNavigation<any>();
  const { trigger } = useHaptics();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const isMountedRef = useRef(true);
  const detailRequestRef = useRef(0);

  const [allBodyParts, setAllBodyParts] = useState<any[]>([]);
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MuscleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeView, setActiveView] = useState<AnatomyCanvasView>('both');
  const [mode, setMode] = useState<'explore' | 'heatmap'>('explore');
  const [themeId] = useState<AnatomyThemeId>('neon');
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('all');
  const theme = ANATOMY_THEMES[themeId];

  useEffect(() => {
    loadBodyParts();
    return () => {
      isMountedRef.current = false;
      detailRequestRef.current += 1;
    };
  }, []);

  const loadBodyParts = async () => {
    try {
      const data = await api.getMuscles();
      if (isMountedRef.current) {
        setAllBodyParts(data || []);
      }
    } catch (error) {
      console.error('Failed to load body parts:', error);
    }
  };

  const handleBack = () => {
    trigger('light');
    navigation.goBack();
  };

  const handleMusclePress = useCallback(
    async (muscleId: string, muscleName: string) => {
      const requestId = ++detailRequestRef.current;

      if (!muscleId) {
        setSelectedMuscle(null);
        setSelectedDetail(null);
        setLoadingDetail(false);
        return;
      }

      const region = getAnatomyRegion(muscleId);
      if (!region) {
        return;
      }

      setSelectedMuscle(muscleId);
      setDifficultyFilter('all');
      setLoadingDetail(true);

      const bestBodyPart = [...allBodyParts]
        .map((bodyPart) => ({ bodyPart, score: scoreBodyPartMatch(muscleId, bodyPart) }))
        .sort((a, b) => b.score - a.score)[0];

      try {
        const fallbackExercises = buildFallbackExercises(muscleId);
        let exercises = fallbackExercises;
        let description = region.description;
        let functionText = region.description;
        let recoveryHours = region.recoveryHours;

        if (bestBodyPart?.score > 0) {
          const [detail, rawExercises] = await Promise.all([
            api.getMuscle(bestBodyPart.bodyPart.id),
            api.getExercises(bestBodyPart.bodyPart.id),
          ]);

          if (!isMountedRef.current || requestId !== detailRequestRef.current) {
            return;
          }

          description = detail?.description || region.description;
          functionText = detail?.function || detail?.importance || region.description;
          recoveryHours = detail?.recoveryTime || region.recoveryHours;

          if (Array.isArray(rawExercises) && rawExercises.length > 0) {
            exercises = rawExercises.slice(0, 6).map((exercise: any, index: number) => ({
              id: exercise.id ?? `${muscleId}-${index}`,
              name: exercise.name,
              difficulty: exercise.difficulty ?? region.defaultDifficulty,
              activationRating: exercise.activationRating,
            }));
          }
        }

        const difficulty = mostCommonDifficulty(exercises, region.defaultDifficulty);

        setSelectedDetail({
          id: muscleId,
          name: muscleName || region.name,
          description,
          functionText,
          recoveryHours,
          difficulty,
          exercises,
          sides: region.sides,
        });
      } catch (error) {
        if (!isMountedRef.current || requestId !== detailRequestRef.current) {
          return;
        }

        const fallbackExercises = buildFallbackExercises(muscleId);
        setSelectedDetail({
          id: muscleId,
          name: muscleName || region.name,
          description: region.description,
          functionText: region.description,
          recoveryHours: region.recoveryHours,
          difficulty: region.defaultDifficulty,
          exercises: fallbackExercises,
          sides: region.sides,
        });
      } finally {
        if (isMountedRef.current && requestId === detailRequestRef.current) {
          setLoadingDetail(false);
        }
      }
    },
    [allBodyParts]
  );

  const searchResults = useMemo(() => {
    const query = normalizeAnatomyKey(searchQuery);
    if (!query) {
      return QUICK_FOCUS.map((id) => getAnatomyRegion(id)).filter(Boolean).slice(0, 6);
    }

    return ANATOMY_REGIONS.filter((region) => {
      const values = [region.name, ...region.aliases, ...region.backendKeywords];
      return values.some((value) => normalizeAnatomyKey(value).includes(query));
    }).slice(0, 8);
  }, [searchQuery]);

  const filteredExercises = useMemo(() => {
    if (!selectedDetail) {
      return [];
    }

    return selectedDetail.exercises.filter((exercise) =>
      difficultyFilter === 'all' ? true : exercise.difficulty === difficultyFilter
    );
  }, [difficultyFilter, selectedDetail]);

  const closeDetailSheet = useCallback(() => {
    handleMusclePress('', '');
  }, [handleMusclePress]);

  const sheetMaxHeight = Math.min(windowHeight - insets.top - 88, 560);

  const selectSearchResult = (muscleId: string) => {
    const region = getAnatomyRegion(muscleId);
    if (!region) {
      return;
    }

    trigger('selection');
    setSearchQuery(region.name);
    setActiveView(getDefaultViewForMuscle(muscleId));
    handleMusclePress(muscleId, region.name);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#060912', '#090E19', '#0D1220']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.safeArea}>
        <View
          style={[
            styles.headerBar,
            {
              paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 14 : 10),
            },
          ]}
        >
          <View style={styles.headerRow}>
            <Pressable style={styles.iconButton} onPress={handleBack} accessibilityRole="button">
              <Ionicons name="chevron-back" size={22} color="#F6FAFF" />
            </Pressable>

            <View style={styles.headerPill}>
              <Ionicons name="body-outline" size={15} color="#8BFF72" />
              <Text style={styles.headerPillText}>Muscle Atlas</Text>
            </View>

            <Pressable
              style={[styles.iconButton, mode === 'heatmap' && styles.iconButtonActive]}
              onPress={() => {
                trigger('selection');
                setMode((current) => (current === 'explore' ? 'heatmap' : 'explore'));
              }}
              accessibilityRole="button"
            >
              <Ionicons name={mode === 'heatmap' ? 'flame' : 'flame-outline'} size={20} color="#F6FAFF" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: selectedDetail || loadingDetail ? 400 : 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.controlCard}>
            <Text style={styles.introTitle}>Reference muscle map</Text>
            <Text style={styles.introText}>
              Tap the body directly to open the matching highlighted reference model and exercise details.
            </Text>

            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={18} color="#7A92AF" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search upper chest, glutes, lats..."
                placeholderTextColor="#8AA0BA"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#8FA0C3" />
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {searchResults.map((region) => (
                <Pressable
                  key={region!.id}
                  onPress={() => selectSearchResult(region!.id)}
                  style={[
                    styles.suggestionChip,
                    selectedMuscle === region!.id && styles.optionPillActive,
                  ]}
                >
                  <Text style={styles.suggestionChipText}>{region!.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Mode</Text>
              <View style={styles.optionPills}>
                {(['explore', 'heatmap'] as const).map((option) => {
                  const active = mode === option;
                  return (
                    <Pressable
                      key={option}
                      onPress={() => {
                        trigger('selection');
                        setMode(option);
                      }}
                      style={[styles.optionPill, active && styles.optionPillActive]}
                    >
                      <Text style={[styles.optionPillText, active && styles.optionPillTextActive]}>
                        {capitalize(option)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.quickStatsRow}>
              <View style={styles.quickStatPill}>
                <Text style={styles.quickStatValue}>{MUSCLE_REGIONS.length}</Text>
                <Text style={styles.quickStatLabel}>regions</Text>
              </View>
              <View style={styles.quickStatPill}>
                <Text style={styles.quickStatValue}>{activeView === 'both' ? '2' : '1'}</Text>
                <Text style={styles.quickStatLabel}>view</Text>
              </View>
            </View>
          </View>

          <InteractiveBodyMap
            selectedMuscle={selectedMuscle}
            onMusclePress={handleMusclePress}
            height={560}
            mode={mode}
            activeView={activeView}
            onViewChange={setActiveView}
            themeId={themeId}
          />

        </ScrollView>

        {selectedMuscle ? (
          <>
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.sheetBackdrop}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeDetailSheet}
                accessibilityRole="button"
                accessibilityLabel="Close muscle detail sheet"
              />
            </Animated.View>

            <Animated.View
              entering={SlideInDown.duration(220)}
              exiting={SlideOutDown.duration(160)}
              style={[styles.sheetWrap, { bottom: Math.max(insets.bottom, 12) }]}
            >
              <View style={[styles.sheetCard, { maxHeight: sheetMaxHeight }]}>
              <View style={styles.sheetHandle} />

                <View style={styles.sheetHeader}>
                  <View style={styles.sheetHeaderLeft}>
                  <View style={styles.sheetBadge}>
                    <Ionicons name="fitness-outline" size={16} color="#E36171" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetTitle}>
                      {selectedDetail?.name || getAnatomyRegion(selectedMuscle)?.name || 'Muscle group'}
                    </Text>
                    <Text style={styles.sheetSubtitle}>Interactive detail sheet</Text>
                  </View>
                </View>

                <Pressable
                  onPress={closeDetailSheet}
                  hitSlop={12}
                  style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Close muscle detail sheet"
                >
                  <Ionicons name="close" size={20} color="#A4B0C8" />
                </Pressable>
              </View>

              {loadingDetail || !selectedDetail ? (
                <View style={styles.loadingState}>
                  <ActivityIndicator color={theme.accentStrong} />
                  <Text style={styles.loadingText}>Loading recovery, difficulty, and exercise suggestions...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.sheetScroll}
                  contentContainerStyle={styles.sheetScrollContent}
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                >
                  <View style={styles.sheetMetrics}>
                    <View style={styles.metricChip}>
                      <Ionicons name="speedometer-outline" size={14} color="#E36171" />
                      <Text style={styles.metricChipText}>{capitalize(selectedDetail.difficulty)}</Text>
                    </View>
                    <View style={styles.metricChip}>
                      <Ionicons name="time-outline" size={14} color="#E36171" />
                      <Text style={styles.metricChipText}>{selectedDetail.recoveryHours}h recovery</Text>
                    </View>
                    <View style={styles.metricChip}>
                      <Ionicons name="repeat-outline" size={14} color="#E36171" />
                      <Text style={styles.metricChipText}>
                        {selectedDetail.sides.length === 2 ? 'Front + back' : capitalize(selectedDetail.sides[0])}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.referenceCard}>
                    <Text style={styles.referenceTitle}>Target map</Text>
                    <MuscleBodyDiagram
                      primaryMuscles={[selectedDetail.id]}
                      height={220}
                      showLegend={false}
                    />
                  </View>

                  <Text style={styles.sheetBodyText}>{selectedDetail.description}</Text>
                  <Text style={styles.sheetSupportText}>{selectedDetail.functionText}</Text>

                  <View style={styles.difficultyRow}>
                    {(['all', 'beginner', 'intermediate', 'advanced'] as DifficultyFilter[]).map((filter) => {
                      const active = difficultyFilter === filter;
                      return (
                        <Pressable
                          key={filter}
                          onPress={() => setDifficultyFilter(filter)}
                          style={[styles.filterChip, active && styles.filterChipActive]}
                        >
                          <Text style={[styles.filterChipText, active && styles.optionPillTextActive]}>
                            {capitalize(filter)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.exerciseList}>
                    {filteredExercises.map((exercise, index) => (
                      <View key={exercise.id} style={styles.exerciseRow}>
                        <View style={styles.exerciseIndex}>
                          <Text style={styles.exerciseIndexText}>{index + 1}</Text>
                        </View>
                        <View style={styles.exerciseCopy}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                          <Text style={styles.exerciseMeta}>{capitalize(exercise.difficulty)}</Text>
                        </View>
                        <View style={styles.exerciseActivation}>
                          <Text style={styles.exerciseActivationText}>{exercise.activationRating ?? '--'}%</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
              </View>
            </Animated.View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EEF4FB',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#171B23',
  },
  headerBar: {
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#171B23',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    zIndex: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0E131B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 141, 58, 0.14)',
  },
  headerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    minWidth: 224,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0E131B',
  },
  headerPillText: {
    color: '#F6FAFF',
    fontSize: 16,
    fontWeight: '800',
  },
  controlCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D7E2EE',
    gap: 12,
  },
  introTitle: {
    color: '#203752',
    fontSize: 18,
    fontWeight: '800',
  },
  introText: {
    color: '#7087A2',
    fontSize: 13,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#D7E2EE',
    backgroundColor: '#F8FBFF',
  },
  searchInput: {
    flex: 1,
    color: '#203752',
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  chipsRow: {
    gap: 10,
  },
  suggestionChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7E2EE',
    backgroundColor: '#F8FBFF',
  },
  suggestionChipText: {
    color: '#516B87',
    fontSize: 13,
    fontWeight: '600',
  },
  optionGroup: {
    gap: 10,
  },
  optionLabel: {
    color: '#6D86A3',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  optionPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7E2EE',
    backgroundColor: '#F8FBFF',
  },
  optionPillActive: {
    borderColor: '#E7B2B9',
    backgroundColor: '#FFF1F3',
  },
  optionPillText: {
    color: '#516B87',
    fontSize: 13,
    fontWeight: '600',
  },
  optionPillTextActive: {
    color: '#B85460',
  },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7E2EE',
    backgroundColor: '#F8FBFF',
  },
  quickStatValue: {
    color: '#203752',
    fontSize: 13,
    fontWeight: '800',
  },
  quickStatLabel: {
    color: '#7087A2',
    fontSize: 12,
    fontWeight: '600',
  },
  sheetWrap: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 6,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(12, 17, 28, 0.16)',
    zIndex: 5,
  },
  sheetCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 14,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderColor: '#D7E2EE',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
    overflow: 'hidden',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D5DEE8',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  sheetHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sheetBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF1F3',
    borderColor: '#F2C2C7',
  },
  sheetTitle: {
    color: '#203752',
    fontSize: 22,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: '#7087A2',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F7FC',
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  closeButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  loadingState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#7087A2',
    fontSize: 13,
    textAlign: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    paddingBottom: 6,
  },
  referenceCard: {
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  referenceTitle: {
    color: '#203752',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  metricChipText: {
    color: '#516B87',
    fontSize: 12,
    fontWeight: '700',
  },
  sheetBodyText: {
    color: '#203752',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  sheetSupportText: {
    color: '#7087A2',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  difficultyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D7E2EE',
    backgroundColor: '#F8FBFF',
  },
  filterChipActive: {
    borderColor: '#E7B2B9',
    backgroundColor: '#FFF1F3',
  },
  filterChipText: {
    color: '#516B87',
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseList: {
    gap: 10,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 12,
    backgroundColor: '#F8FBFF',
    borderWidth: 1,
    borderColor: '#D7E2EE',
  },
  exerciseIndex: {
    width: 28,
    height: 28,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E9F0F8',
  },
  exerciseIndexText: {
    color: '#203752',
    fontSize: 12,
    fontWeight: '800',
  },
  exerciseCopy: {
    flex: 1,
  },
  exerciseName: {
    color: '#203752',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  exerciseMeta: {
    color: '#7087A2',
    fontSize: 12,
    fontWeight: '600',
  },
  exerciseActivation: {
    minWidth: 52,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#FFF1F3',
    alignItems: 'center',
  },
  exerciseActivationText: {
    color: '#B85460',
    fontSize: 12,
    fontWeight: '800',
  },
});
