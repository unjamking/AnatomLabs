import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { DailyReport } from '../../types';
import {
  AnimatedCard,
  AnimatedButton,
  AnimatedListItem,
  BlurHeader,
  GlassCard,
  FadeIn,
  SlideIn,
  Skeleton,
  AnimatedProgressRing,
  useHaptics,
  COLORS,
  SPRING_CONFIG,
} from '../../components/animations';

export default function ReportsScreen() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [injuryRisk, setInjuryRisk] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'injury'>('daily');

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  // Tab animation
  const tabIndicator = useSharedValue(0);

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicator.value }],
  }));

  useEffect(() => {
    loadData();
  }, [reportType]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      if (reportType === 'daily') {
        const data = await api.getDailyReport();
        setReport(data);
      } else {
        const data = await api.getInjuryRisk();
        setInjuryRisk(data);
      }
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    trigger('light');
    await loadData();
    setIsRefreshing(false);
    trigger('success');
  };

  const handleTabChange = (tab: 'daily' | 'injury') => {
    trigger('selection');
    setReportType(tab);
    tabIndicator.value = withSpring(tab === 'daily' ? 0 : 170, SPRING_CONFIG.snappy);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return COLORS.success;
      case 'moderate':
        return COLORS.warning;
      case 'high':
        return '#e67e22';
      case 'very_high':
        return COLORS.error;
      default:
        return COLORS.textSecondary;
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return 'checkmark-circle';
      case 'moderate':
        return 'alert-circle';
      case 'high':
      case 'very_high':
        return 'warning';
      default:
        return 'help-circle';
    }
  };

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Reports"
        scrollY={scrollY}
      />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <SlideIn direction="left" delay={0}>
          <Text style={styles.title}>Your Reports</Text>
        </SlideIn>

        {/* Tab Selector */}
        <FadeIn delay={100}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, reportType === 'daily' && styles.tabActive]}
              onPress={() => handleTabChange('daily')}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={reportType === 'daily' ? '#fff' : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, reportType === 'daily' && styles.tabTextActive]}>
                Daily
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, reportType === 'injury' && styles.tabActive]}
              onPress={() => handleTabChange('injury')}
            >
              <Ionicons
                name="shield-outline"
                size={18}
                color={reportType === 'injury' ? '#fff' : COLORS.textSecondary}
              />
              <Text style={[styles.tabText, reportType === 'injury' && styles.tabTextActive]}>
                Injury Risk
              </Text>
            </TouchableOpacity>
          </View>
        </FadeIn>

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={200} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={150} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={150} borderRadius={16} />
          </View>
        ) : reportType === 'daily' && report ? (
          <>
            {/* Nutrition Summary */}
            <SlideIn direction="bottom" delay={150}>
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="nutrition-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.sectionTitle}>Nutrition Summary</Text>
                </View>
                <View style={styles.nutritionGrid}>
                  {[
                    { label: 'Calories', value: report.nutrition.calories, target: report.nutrition.targetCalories, color: COLORS.primary },
                    { label: 'Protein', value: report.nutrition.protein, target: report.nutrition.targetProtein, unit: 'g', color: COLORS.primary },
                    { label: 'Carbs', value: report.nutrition.carbs, target: report.nutrition.targetCarbs, unit: 'g', color: COLORS.info },
                    { label: 'Fat', value: report.nutrition.fat, target: report.nutrition.targetFat, unit: 'g', color: COLORS.warning },
                  ].map((item, index) => (
                    <View key={item.label} style={styles.nutritionItem}>
                      <AnimatedProgressRing
                        progress={(item.value / item.target) * 100}
                        size={60}
                        strokeWidth={5}
                        color={item.color}
                        label={item.label}
                        value={`${Math.round(item.value)}${item.unit || ''}`}
                        delay={200 + index * 100}
                      />
                      <Text style={styles.nutritionTarget}>
                        / {Math.round(item.target)}{item.unit || ''}
                      </Text>
                    </View>
                  ))}
                </View>
                <View style={styles.adherenceContainer}>
                  <View style={styles.adherenceBar}>
                    <Animated.View
                      style={[
                        styles.adherenceBarFill,
                        { width: `${report.nutrition.adherence}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.adherenceText}>
                    {Math.round(report.nutrition.adherence)}% adherence
                  </Text>
                </View>
              </GlassCard>
            </SlideIn>

            {/* Activity */}
            <SlideIn direction="bottom" delay={250}>
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="fitness-outline" size={20} color={COLORS.info} />
                  <Text style={styles.sectionTitle}>Activity</Text>
                </View>
                <View style={styles.activityGrid}>
                  {[
                    { icon: 'footsteps-outline', label: 'Steps', value: report.activity.steps.toLocaleString(), color: COLORS.info },
                    { icon: 'flame-outline', label: 'Burned', value: `${Math.round(report.activity.caloriesBurned)}`, color: COLORS.primary },
                    { icon: 'water-outline', label: 'Water', value: `${report.activity.waterIntake}ml`, color: COLORS.info },
                    { icon: 'moon-outline', label: 'Sleep', value: `${report.activity.sleepHours}h`, color: '#9b59b6' },
                  ].map((item, index) => (
                    <AnimatedCard key={item.label} delay={300 + index * 50} pressable={false} style={styles.activityItem}>
                      <Ionicons name={item.icon as any} size={24} color={item.color} />
                      <Text style={[styles.activityValue, { color: item.color }]}>{item.value}</Text>
                      <Text style={styles.activityLabel}>{item.label}</Text>
                    </AnimatedCard>
                  ))}
                </View>
              </GlassCard>
            </SlideIn>

            {/* Training */}
            <SlideIn direction="bottom" delay={350}>
              <GlassCard style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="barbell-outline" size={20} color={COLORS.success} />
                  <Text style={styles.sectionTitle}>Training</Text>
                </View>
                <View style={styles.trainingStats}>
                  <View style={styles.trainingStat}>
                    <Text style={styles.trainingValue}>{report.training.workoutsCompleted}</Text>
                    <Text style={styles.trainingLabel}>Workouts</Text>
                  </View>
                  <View style={styles.trainingStat}>
                    <Text style={styles.trainingValue}>{report.training.totalVolume}</Text>
                    <Text style={styles.trainingLabel}>Total Sets</Text>
                  </View>
                </View>
                {report.training.musclesTrained.length > 0 && (
                  <View style={styles.musclesTrained}>
                    <Text style={styles.musclesTrainedLabel}>Muscles trained:</Text>
                    <View style={styles.musclesTags}>
                      {report.training.musclesTrained.map((muscle, i) => (
                        <View key={i} style={styles.muscleTag}>
                          <Text style={styles.muscleTagText}>{muscle}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </GlassCard>
            </SlideIn>

            {/* Injury Risk Overview */}
            {report.injuryRisk && (
              <SlideIn direction="bottom" delay={450}>
                <GlassCard
                  style={[styles.riskCard, { borderColor: getRiskColor(report.injuryRisk.overallRisk) }]}
                  borderGlow
                  glowColor={getRiskColor(report.injuryRisk.overallRisk)}
                >
                  <Ionicons
                    name={getRiskIcon(report.injuryRisk.overallRisk) as any}
                    size={32}
                    color={getRiskColor(report.injuryRisk.overallRisk)}
                  />
                  <Text style={[styles.riskLevel, { color: getRiskColor(report.injuryRisk.overallRisk) }]}>
                    {report.injuryRisk.overallRisk.replace('_', ' ').toUpperCase()}
                  </Text>
                  <Text style={styles.riskText}>
                    {report.injuryRisk.needsRestDay
                      ? 'Consider taking a rest day'
                      : 'You can continue training'}
                  </Text>
                </GlassCard>
              </SlideIn>
            )}
          </>
        ) : injuryRisk ? (
          <>
            {/* Overall Risk */}
            <SlideIn direction="bottom" delay={150}>
              <GlassCard
                style={styles.mainRiskCard}
                borderGlow
                glowColor={getRiskColor(injuryRisk.overallRisk)}
              >
                <Ionicons
                  name={getRiskIcon(injuryRisk.overallRisk) as any}
                  size={48}
                  color={getRiskColor(injuryRisk.overallRisk)}
                />
                <Text style={[styles.mainRiskLevel, { color: getRiskColor(injuryRisk.overallRisk) }]}>
                  {injuryRisk.overallRisk?.replace('_', ' ').toUpperCase() || 'LOW'}
                </Text>
                <Text style={styles.mainRiskText}>
                  {injuryRisk.needsRestDay ? 'Rest day recommended' : 'Safe to train'}
                </Text>
              </GlassCard>
            </SlideIn>

            {/* Recommendations */}
            {injuryRisk.recommendations && injuryRisk.recommendations.length > 0 && (
              <FadeIn delay={250}>
                <Text style={styles.subsectionTitle}>Recommendations</Text>
                {injuryRisk.recommendations.map((rec: string, index: number) => (
                  <AnimatedListItem key={index} index={index} enterFrom="right">
                    <GlassCard style={styles.recommendationCard}>
                      <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </GlassCard>
                  </AnimatedListItem>
                ))}
              </FadeIn>
            )}

            {/* Muscles at Risk */}
            {injuryRisk.musclesAtRisk && injuryRisk.musclesAtRisk.length > 0 && (
              <FadeIn delay={350}>
                <Text style={styles.subsectionTitle}>Muscles at Risk</Text>
                {injuryRisk.musclesAtRisk.map((muscleRisk: any, index: number) => (
                  <AnimatedListItem key={index} index={index} enterFrom="bottom">
                    <GlassCard style={styles.muscleRiskCard}>
                      <View style={styles.muscleRiskHeader}>
                        <View style={styles.muscleRiskInfo}>
                          <Ionicons name="body-outline" size={20} color={COLORS.textSecondary} />
                          <Text style={styles.muscleRiskName}>
                            {muscleRisk.muscle?.name || 'Unknown'}
                          </Text>
                        </View>
                        <View style={[styles.riskBadge, { backgroundColor: `${getRiskColor(muscleRisk.riskLevel)}20` }]}>
                          <Text style={[styles.riskBadgeText, { color: getRiskColor(muscleRisk.riskLevel) }]}>
                            {muscleRisk.riskLevel?.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.muscleRiskStats}>
                        <View style={styles.muscleRiskStat}>
                          <Ionicons name="repeat-outline" size={14} color={COLORS.textTertiary} />
                          <Text style={styles.muscleRiskStatText}>
                            Used {muscleRisk.usageCount}x recently
                          </Text>
                        </View>
                        {muscleRisk.lastTrained && (
                          <View style={styles.muscleRiskStat}>
                            <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} />
                            <Text style={styles.muscleRiskStatText}>
                              {muscleRisk.hoursSinceTraining}h ago
                            </Text>
                          </View>
                        )}
                      </View>
                    </GlassCard>
                  </AnimatedListItem>
                ))}
              </FadeIn>
            )}

            {/* Info Box */}
            <SlideIn direction="bottom" delay={450}>
              <GlassCard style={styles.infoBox}>
                <View style={styles.infoHeader}>
                  <Ionicons name="information-circle" size={20} color={COLORS.info} />
                  <Text style={styles.infoTitle}>About Injury Prevention</Text>
                </View>
                <Text style={styles.infoText}>
                  This system tracks muscle usage patterns and recovery time to detect
                  overtraining. Recommendations are based on:{'\n\n'}
                  • Muscle recovery time (24-72h depending on muscle group){'\n'}
                  • Training frequency and volume{'\n'}
                  • Cumulative fatigue patterns{'\n'}
                  • Sport-specific overuse risks
                </Text>
              </GlassCard>
            </SlideIn>
          </>
        ) : (
          <FadeIn delay={200}>
            <GlassCard style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No data available</Text>
            </GlassCard>
          </FadeIn>
        )}
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  skeletonContainer: {
    marginTop: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: 'center',
    marginBottom: 12,
  },
  nutritionTarget: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  adherenceContainer: {
    marginTop: 8,
  },
  adherenceBar: {
    height: 8,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  adherenceBarFill: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
  adherenceText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  activityItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 16,
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  trainingStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  trainingStat: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 16,
    borderRadius: 12,
  },
  trainingValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  trainingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  musclesTrained: {
    marginTop: 8,
  },
  musclesTrainedLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  musclesTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleTag: {
    backgroundColor: `${COLORS.success}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  muscleTagText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  riskCard: {
    alignItems: 'center',
    padding: 24,
    borderWidth: 2,
  },
  riskLevel: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  riskText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  mainRiskCard: {
    alignItems: 'center',
    padding: 32,
    marginBottom: 24,
  },
  mainRiskLevel: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  mainRiskText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 8,
  },
  recommendationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  muscleRiskCard: {
    marginBottom: 10,
  },
  muscleRiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  muscleRiskInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muscleRiskName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  muscleRiskStats: {
    flexDirection: 'row',
    gap: 16,
  },
  muscleRiskStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  muscleRiskStatText: {
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  infoBox: {
    marginTop: 16,
    marginBottom: 20,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
});
