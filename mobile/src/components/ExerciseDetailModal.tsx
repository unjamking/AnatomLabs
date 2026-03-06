import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import MuscleBodyDiagram from './MuscleBodyDiagram';
import {
  AnimatedButton,
  AnimatedCard,
  AnimatedListItem,
  GlassCard,
  FadeIn,
  SlideIn,
  COLORS,
} from './animations';

interface ExerciseData {
  sets?: number;
  reps?: string;
  rest?: number;
  notes?: string;
  targetMuscles?: string[];
}

interface ExerciseDetailModalProps {
  exerciseId: string | null;
  exerciseName?: string;
  exerciseData?: ExerciseData;
  visible: boolean;
  onClose: () => void;
}

interface ParsedExercise {
  id: string;
  name: string;
  difficulty: string;
  description: string;
  equipment: string[];
  instructions: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  activationDetails: { name: string; rank: number; description: string; isPrimary: boolean }[];
  category: string;
  mechanicalLoad: string;
  jointInvolvement: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#2ecc71',
  intermediate: '#f39c12',
  advanced: '#e74c3c',
};

let exerciseCache: { data: any[] | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedExercises(): Promise<any[]> {
  const now = Date.now();
  if (exerciseCache.data && now - exerciseCache.timestamp < CACHE_TTL) {
    return exerciseCache.data;
  }
  const data = await api.getExercises();
  exerciseCache = { data, timestamp: now };
  return data;
}

function parseExerciseFromApi(raw: any): ParsedExercise {
  const bodyParts = raw.bodyParts || [];
  const sorted = [...bodyParts].sort((a: any, b: any) => (a.activationRank || 0) - (b.activationRank || 0));
  const primaryCutoff = Math.max(1, Math.ceil(sorted.length / 2));

  const primaryMuscles: string[] = [];
  const secondaryMuscles: string[] = [];
  const activationDetails: ParsedExercise['activationDetails'] = [];

  sorted.forEach((bp: any, index: number) => {
    const name = bp.bodyPart?.name || 'Unknown';
    const isPrimary = index < primaryCutoff;
    if (isPrimary) {
      primaryMuscles.push(name);
    } else {
      secondaryMuscles.push(name);
    }
    activationDetails.push({
      name,
      rank: bp.activationRank || bp.activationRanking || 0,
      description: bp.activationDescription || '',
      isPrimary,
    });
  });

  if (primaryMuscles.length === 0 && raw.primaryMuscles?.length > 0) {
    primaryMuscles.push(...raw.primaryMuscles);
  }
  if (secondaryMuscles.length === 0 && raw.secondaryMuscles?.length > 0) {
    secondaryMuscles.push(...raw.secondaryMuscles);
  }

  let instructions: string[] = [];
  if (Array.isArray(raw.instructions)) {
    instructions = raw.instructions;
  } else if (typeof raw.instructions === 'string' && raw.instructions.trim()) {
    instructions = raw.instructions
      .split(/\n+|\.\s+(?=[A-Z])|\d+\.\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  let equipment: string[] = [];
  if (Array.isArray(raw.equipment)) {
    equipment = raw.equipment;
  } else if (typeof raw.equipment === 'string' && raw.equipment.trim()) {
    equipment = raw.equipment.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
    if (equipment.length === 0 && raw.equipment.trim() !== 'none') {
      equipment = [raw.equipment.trim()];
    }
  }

  return {
    id: raw.id,
    name: raw.name,
    difficulty: raw.difficulty || 'intermediate',
    description: raw.description || '',
    equipment,
    instructions,
    primaryMuscles,
    secondaryMuscles,
    activationDetails,
    category: raw.category || '',
    mechanicalLoad: raw.mechanicalLoad || '',
    jointInvolvement: raw.jointInvolvement || '',
  };
}

function buildFallbackExercise(name: string, data?: ExerciseData): ParsedExercise {
  const muscles = data?.targetMuscles || [];
  return {
    id: 'fallback',
    name,
    difficulty: 'intermediate',
    description: data?.notes || '',
    equipment: [],
    instructions: [],
    primaryMuscles: muscles,
    secondaryMuscles: [],
    activationDetails: muscles.map((m, i) => ({
      name: m,
      rank: i + 1,
      description: '',
      isPrimary: true,
    })),
    category: '',
    mechanicalLoad: '',
    jointInvolvement: '',
  };
}

export default function ExerciseDetailModal({
  exerciseId,
  exerciseName,
  exerciseData,
  visible,
  onClose,
}: ExerciseDetailModalProps) {
  const [exercise, setExercise] = useState<ParsedExercise | null>(null);
  const [relatedExercises, setRelatedExercises] = useState<{ id: string; name: string; muscles: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    if (visible && (exerciseId || exerciseName)) {
      loadExercise(exerciseId, exerciseName);
    } else {
      setExercise(null);
      setRelatedExercises([]);
      setIsFallback(false);
    }
  }, [visible, exerciseId, exerciseName]);

  const findExerciseByName = async (name: string) => {
    const allExercises = await getCachedExercises();
    const lower = name.toLowerCase();
    const exact = allExercises.find((e: any) => e.name.toLowerCase() === lower);
    if (exact) return exact;
    const partial = allExercises.find(
      (e: any) => e.name.toLowerCase().includes(lower) || lower.includes(e.name.toLowerCase())
    );
    return partial || null;
  };

  const loadExercise = async (id: string | null, name?: string) => {
    setIsLoading(true);
    setIsFallback(false);
    try {
      let raw: any = null;

      if (id) {
        try {
          raw = await api.getExercise(id);
        } catch {
          if (name) {
            raw = await findExerciseByName(name);
          }
        }
      } else if (name) {
        raw = await findExerciseByName(name);
      }

      if (!raw) {
        if (name) {
          const fallback = buildFallbackExercise(name, exerciseData);
          setExercise(fallback);
          setIsFallback(true);

          if (fallback.primaryMuscles.length > 0) {
            try {
              const allExercises = await getCachedExercises();
              const related = allExercises
                .filter((e: any) => {
                  const eMuscles = (e.bodyParts || []).map((bp: any) => bp.bodyPart?.name?.toLowerCase());
                  const myMuscles = fallback.primaryMuscles.map(m => m.toLowerCase());
                  return eMuscles.some((m: string) => myMuscles.includes(m)) ||
                    e.primaryMuscles?.some((m: string) => myMuscles.includes(m.toLowerCase()));
                })
                .slice(0, 4)
                .map((e: any) => ({
                  id: e.id,
                  name: e.name,
                  muscles: (e.bodyParts || []).map((bp: any) => bp.bodyPart?.name).filter(Boolean).join(', ') ||
                    e.primaryMuscles?.join(', ') || 'Unknown',
                }));
              setRelatedExercises(related);
            } catch {
              setRelatedExercises([]);
            }
          }
        }
        setIsLoading(false);
        return;
      }

      const parsed = parseExerciseFromApi(raw);
      setExercise(parsed);

      if (parsed.primaryMuscles.length > 0) {
        try {
          const allExercises = await getCachedExercises();
          const related = allExercises
            .filter((e: any) => {
              if (e.id === id) return false;
              const eMuscles = (e.bodyParts || []).map((bp: any) => bp.bodyPart?.name?.toLowerCase());
              const myMuscles = parsed.primaryMuscles.map(m => m.toLowerCase());
              return eMuscles.some((m: string) => myMuscles.includes(m)) ||
                e.primaryMuscles?.some((m: string) => myMuscles.includes(m.toLowerCase()));
            })
            .slice(0, 4)
            .map((e: any) => ({
              id: e.id,
              name: e.name,
              muscles: (e.bodyParts || []).map((bp: any) => bp.bodyPart?.name).filter(Boolean).join(', ') ||
                e.primaryMuscles?.join(', ') || 'Unknown',
            }));
          setRelatedExercises(related);
        } catch {
          setRelatedExercises([]);
        }
      }
    } catch (err) {
      console.error('Failed to load exercise:', err);
      if (exerciseName) {
        const fallback = buildFallbackExercise(exerciseName, exerciseData);
        setExercise(fallback);
        setIsFallback(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getActivationPercent = (rank: number, total: number) => {
    if (total <= 1) return 95;
    return Math.max(20, 100 - ((rank - 1) / (total - 1)) * 70);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {exercise?.name || exerciseName || 'Exercise Detail'}
          </Text>
          <AnimatedButton
            variant="ghost"
            size="small"
            onPress={onClose}
            title="Close"
            textStyle={{ color: COLORS.primary }}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : exercise ? (
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <FadeIn delay={100}>
              <View style={styles.tagsRow}>
                {!isFallback && (
                  <View
                    style={[
                      styles.difficultyBadge,
                      { backgroundColor: `${DIFFICULTY_COLORS[exercise.difficulty] || COLORS.primary}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.difficultyText,
                        { color: DIFFICULTY_COLORS[exercise.difficulty] || COLORS.primary },
                      ]}
                    >
                      {exercise.difficulty}
                    </Text>
                  </View>
                )}
                {exercise.equipment.map((eq, i) => (
                  <View key={i} style={styles.equipmentPill}>
                    <Text style={styles.equipmentText}>{eq}</Text>
                  </View>
                ))}
                {exercise.category ? (
                  <View style={styles.categoryPill}>
                    <Text style={styles.categoryText}>{exercise.category.replace('_', ' ')}</Text>
                  </View>
                ) : null}
              </View>
            </FadeIn>

            {exerciseData && (exerciseData.sets || exerciseData.reps || exerciseData.rest) && (
              <SlideIn direction="bottom" delay={120}>
                <GlassCard style={styles.section}>
                  <Text style={styles.sectionTitle}>Workout Prescription</Text>
                  <View style={styles.prescriptionRow}>
                    {exerciseData.sets != null && (
                      <View style={styles.prescriptionItem}>
                        <Ionicons name="layers-outline" size={18} color={COLORS.primary} />
                        <Text style={styles.prescriptionValue}>{exerciseData.sets}</Text>
                        <Text style={styles.prescriptionLabel}>Sets</Text>
                      </View>
                    )}
                    {exerciseData.reps != null && (
                      <View style={styles.prescriptionItem}>
                        <Ionicons name="repeat-outline" size={18} color={COLORS.info} />
                        <Text style={styles.prescriptionValue}>{exerciseData.reps}</Text>
                        <Text style={styles.prescriptionLabel}>Reps</Text>
                      </View>
                    )}
                    {exerciseData.rest != null && (
                      <View style={styles.prescriptionItem}>
                        <Ionicons name="time-outline" size={18} color={COLORS.warning} />
                        <Text style={styles.prescriptionValue}>{exerciseData.rest}s</Text>
                        <Text style={styles.prescriptionLabel}>Rest</Text>
                      </View>
                    )}
                  </View>
                </GlassCard>
              </SlideIn>
            )}

            {exercise.primaryMuscles.length > 0 && (
              <SlideIn direction="bottom" delay={150}>
                <GlassCard style={styles.section}>
                  <Text style={styles.sectionTitle}>Muscle Groups</Text>
                  <MuscleBodyDiagram
                    primaryMuscles={exercise.primaryMuscles}
                    secondaryMuscles={exercise.secondaryMuscles}
                    height={180}
                  />
                  <View style={styles.muscleLabels}>
                    {exercise.activationDetails.map((detail, i) => {
                      const percent = getActivationPercent(detail.rank, exercise.activationDetails.length);
                      return (
                        <View key={i} style={styles.muscleDetailRow}>
                          <View style={[styles.muscleDot, { backgroundColor: detail.isPrimary ? '#2ecc71' : '#2ecc7160' }]} />
                          <Text style={styles.muscleName}>{detail.name}</Text>
                          <View style={styles.miniBarBg}>
                            <View style={[styles.miniBarFill, { width: `${percent}%` }]} />
                          </View>
                          <Text style={styles.percentText}>{Math.round(percent)}%</Text>
                        </View>
                      );
                    })}
                  </View>
                </GlassCard>
              </SlideIn>
            )}

            {exercise.description ? (
              <SlideIn direction="bottom" delay={200}>
                <GlassCard style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {isFallback ? 'Notes' : 'Description'}
                  </Text>
                  <Text style={styles.descriptionText}>{exercise.description}</Text>
                </GlassCard>
              </SlideIn>
            ) : null}

            {exercise.instructions.length > 0 && (
              <SlideIn direction="bottom" delay={250}>
                <GlassCard style={styles.section}>
                  <Text style={styles.sectionTitle}>Instructions</Text>
                  {exercise.instructions.map((step, i) => (
                    <View key={i} style={styles.instructionRow}>
                      <View style={styles.stepNumber}>
                        <Text style={styles.stepNumberText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.instructionText}>{step}</Text>
                    </View>
                  ))}
                </GlassCard>
              </SlideIn>
            )}

            {exercise.mechanicalLoad ? (
              <SlideIn direction="bottom" delay={300}>
                <GlassCard style={styles.section} borderGlow glowColor="#3498db">
                  <View style={styles.infoHeader}>
                    <Ionicons name="fitness-outline" size={18} color="#3498db" />
                    <Text style={[styles.sectionTitle, { color: '#3498db', marginBottom: 0 }]}>Biomechanics</Text>
                  </View>
                  <Text style={styles.descriptionText}>{exercise.mechanicalLoad}</Text>
                  {exercise.jointInvolvement ? (
                    <View style={styles.jointRow}>
                      <Ionicons name="body-outline" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.jointText}>{exercise.jointInvolvement}</Text>
                    </View>
                  ) : null}
                </GlassCard>
              </SlideIn>
            ) : null}

            {relatedExercises.length > 0 && (
              <FadeIn delay={350}>
                <Text style={styles.relatedTitle}>Related Exercises</Text>
                {relatedExercises.map((rel, index) => (
                  <AnimatedListItem key={rel.id} index={index} enterFrom="right">
                    <AnimatedCard
                      onPress={() => {
                        setIsFallback(false);
                        loadExercise(rel.id);
                      }}
                      style={styles.relatedCard}
                    >
                      <View style={styles.relatedContent}>
                        <Text style={styles.relatedName}>{rel.name}</Text>
                        <Text style={styles.relatedMuscle}>{rel.muscles}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
                    </AnimatedCard>
                  </AnimatedListItem>
                ))}
              </FadeIn>
            )}

            <View style={styles.bottomPadding} />
          </Animated.ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={48} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>Exercise not found</Text>
            <Text style={styles.emptySubtext}>This exercise is not in the database yet</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  equipmentPill: {
    backgroundColor: `${COLORS.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  equipmentText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  categoryPill: {
    backgroundColor: `${COLORS.info}20`,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    color: COLORS.info,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  section: {
    marginBottom: 12,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  prescriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  prescriptionItem: {
    alignItems: 'center',
    gap: 4,
  },
  prescriptionValue: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  prescriptionLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  muscleLabels: {
    marginTop: 12,
    gap: 8,
  },
  muscleDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  muscleName: {
    fontSize: 13,
    color: COLORS.text,
    width: 80,
    textTransform: 'capitalize',
  },
  miniBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 3,
    overflow: 'hidden',
  },
  miniBarFill: {
    height: '100%',
    backgroundColor: '#2ecc71',
    borderRadius: 3,
  },
  percentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2ecc71',
    width: 32,
    textAlign: 'right',
  },
  descriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  instructionText: {
    fontSize: 13,
    color: COLORS.text,
    flex: 1,
    lineHeight: 19,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  jointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  jointText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  relatedTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
    marginTop: 4,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 12,
  },
  relatedContent: {
    flex: 1,
  },
  relatedName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  relatedMuscle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  bottomPadding: {
    height: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
  },
});
