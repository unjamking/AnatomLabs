import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  Layout,
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
  FadeIn as FadeInComponent,
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  // Format date for display
  const formatDateDisplay = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (compareDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get date string in YYYY-MM-DD format for API
  const getDateString = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const dateStr = getDateString(selectedDate);

      // Load both daily report and injury risk in parallel
      const [dailyData, injuryData] = await Promise.all([
        api.getDailyReport(dateStr),
        api.getInjuryRisk(),
      ]);

      setReport(dailyData);
      setInjuryRisk(injuryData);
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

  const handleDateChange = (days: number) => {
    trigger('selection');
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    // Don't allow future dates
    if (newDate <= new Date()) {
      setSelectedDate(newDate);
    }
  };

  const handleDateSelect = (date: Date) => {
    trigger('selection');
    setSelectedDate(date);
    setShowCalendar(false);
  };

  const toggleSection = (section: string) => {
    trigger('selection');
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Generate calendar days for the current month view
  const generateCalendarDays = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: Array<{ date: Date | null; isToday: boolean; isSelected: boolean; isFuture: boolean }> = [];

    // Add padding for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      days.push({ date: null, isToday: false, isSelected: false, isFuture: false });
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      date.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);

      days.push({
        date,
        isToday: date.getTime() === today.getTime(),
        isSelected: date.getTime() === selected.getTime(),
        isFuture: date > today,
      });
    }

    return days;
  };

  const calendarDays = useMemo(() => generateCalendarDays(), [selectedDate]);

  const changeMonth = (delta: number) => {
    trigger('selection');
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setSelectedDate(newDate);
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

  const getRiskDescription = (level: string, needsRest: boolean) => {
    if (needsRest) return 'Rest recommended - your muscles need recovery time';
    switch (level) {
      case 'low':
        return 'All systems go! Your body is well-recovered';
      case 'moderate':
        return 'Light training recommended - some muscle groups need rest';
      case 'high':
        return 'Caution advised - high fatigue detected';
      default:
        return 'Keep training smart';
    }
  };

  // Calculate daily score based on all metrics
  const getDailyScore = () => {
    if (!report) return 0;

    const nutritionScore = Math.min(report.nutrition.adherence, 100);
    const activityScore = Math.min((report.activity.steps / 10000) * 100, 100);
    const trainingScore = report.training.workoutsCompleted > 0 ? 100 : 50;
    const recoveryScore = injuryRisk?.overallRisk === 'low' ? 100 :
                          injuryRisk?.overallRisk === 'moderate' ? 70 : 40;

    return Math.round((nutritionScore + activityScore + trainingScore + recoveryScore) / 4);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return COLORS.success;
    if (score >= 60) return COLORS.warning;
    return COLORS.error;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Great';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Needs Work';
  };

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Daily Report"
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
        {/* Date Selector */}
        <FadeInComponent delay={50}>
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={styles.dateArrow}
              onPress={() => handleDateChange(-1)}
            >
              <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateDisplay}
              onPress={() => setShowCalendar(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.dateText}>{formatDateDisplay(selectedDate)}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dateArrow, selectedDate.toDateString() === new Date().toDateString() && styles.dateArrowDisabled]}
              onPress={() => handleDateChange(1)}
              disabled={selectedDate.toDateString() === new Date().toDateString()}
            >
              <Ionicons
                name="chevron-forward"
                size={24}
                color={selectedDate.toDateString() === new Date().toDateString() ? COLORS.textTertiary : COLORS.primary}
              />
            </TouchableOpacity>
          </View>
        </FadeInComponent>

        {isLoading ? (
          <View style={styles.skeletonContainer}>
            <Skeleton width="100%" height={180} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={150} borderRadius={16} style={{ marginBottom: 16 }} />
            <Skeleton width="100%" height={150} borderRadius={16} />
          </View>
        ) : report ? (
          <>
            {/* Daily Score Card */}
            <SlideIn direction="bottom" delay={100}>
              <GlassCard
                style={styles.scoreCardContainer}
                contentStyle={styles.scoreCardContent}
                borderGlow
                glowColor={getScoreColor(getDailyScore())}
              >
                <View style={styles.scoreHeader}>
                  <Text style={styles.scoreLabel}>Daily Score</Text>
                  <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(getDailyScore()) + '20' }]}>
                    <Text style={[styles.scoreBadgeText, { color: getScoreColor(getDailyScore()) }]}>
                      {getScoreLabel(getDailyScore())}
                    </Text>
                  </View>
                </View>
                <View style={styles.scoreCircleContainer}>
                  <AnimatedProgressRing
                    progress={getDailyScore()}
                    size={120}
                    strokeWidth={10}
                    color={getScoreColor(getDailyScore())}
                    label=""
                    value={`${getDailyScore()}`}
                    delay={200}
                  />
                </View>
                <View style={styles.scoreBreakdown}>
                  <View style={styles.scoreItem}>
                    <Ionicons name="nutrition-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.scoreItemText}>Nutrition</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Ionicons name="footsteps-outline" size={16} color={COLORS.info} />
                    <Text style={styles.scoreItemText}>Activity</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Ionicons name="barbell-outline" size={16} color={COLORS.success} />
                    <Text style={styles.scoreItemText}>Training</Text>
                  </View>
                  <View style={styles.scoreItem}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={getRiskColor(injuryRisk?.overallRisk || 'low')} />
                    <Text style={styles.scoreItemText}>Recovery</Text>
                  </View>
                </View>
              </GlassCard>
            </SlideIn>

            {/* Recovery Status - Expandable */}
            <SlideIn direction="bottom" delay={150}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('recovery')}
              >
                <GlassCard
                  style={styles.sectionCardContainer}
                  contentStyle={styles.sectionCardContent}
                >
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={[styles.sectionIcon, { backgroundColor: getRiskColor(injuryRisk?.overallRisk || 'low') + '20' }]}>
                        <Ionicons
                          name={getRiskIcon(injuryRisk?.overallRisk || 'low') as any}
                          size={24}
                          color={getRiskColor(injuryRisk?.overallRisk || 'low')}
                        />
                      </View>
                      <View style={styles.sectionHeaderText}>
                        <Text style={styles.sectionTitle}>Recovery Status</Text>
                        <Text style={[styles.sectionSubtitle, { color: getRiskColor(injuryRisk?.overallRisk || 'low') }]}>
                          {(injuryRisk?.overallRisk || 'low').replace('_', ' ').toUpperCase()} RISK
                        </Text>
                      </View>
                    </View>
                    <Animated.View
                      style={[
                        styles.expandIcon,
                        expandedSection === 'recovery' && styles.expandIconRotated
                      ]}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={24}
                        color={COLORS.textSecondary}
                      />
                    </Animated.View>
                  </View>

                  <Text style={styles.sectionDescription}>
                    {getRiskDescription(injuryRisk?.overallRisk || 'low', injuryRisk?.needsRestDay)}
                  </Text>

                  {/* Expanded Content */}
                  {expandedSection === 'recovery' && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
                      style={styles.expandedContent}
                    >
                      {/* Recommendations */}
                      {injuryRisk?.recommendations && injuryRisk.recommendations.length > 0 && (
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedSectionTitle}>Recommendations</Text>
                          {injuryRisk.recommendations.map((rec: string, index: number) => (
                            <View key={index} style={styles.recommendationItem}>
                              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
                              <Text style={styles.recommendationText}>{rec}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Muscles at Risk */}
                      {injuryRisk?.musclesAtRisk && injuryRisk.musclesAtRisk.length > 0 && (
                        <View style={styles.expandedSection}>
                          <Text style={styles.expandedSectionTitle}>Muscles Needing Rest</Text>
                          {injuryRisk.musclesAtRisk.map((muscleRisk: any, index: number) => (
                            <View key={index} style={styles.muscleRiskItem}>
                              <View style={styles.muscleRiskLeft}>
                                <Ionicons name="body-outline" size={18} color={COLORS.textSecondary} />
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
                          ))}
                        </View>
                      )}

                      {/* No issues message */}
                      {(!injuryRisk?.musclesAtRisk || injuryRisk.musclesAtRisk.length === 0) &&
                       (!injuryRisk?.recommendations || injuryRisk.recommendations.length === 0) && (
                        <View style={styles.noIssuesContainer}>
                          <Ionicons name="thumbs-up" size={32} color={COLORS.success} />
                          <Text style={styles.noIssuesText}>
                            No muscle fatigue detected. You're ready for your next workout!
                          </Text>
                        </View>
                      )}
                    </Animated.View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            </SlideIn>

            {/* Nutrition Summary - Expandable */}
            <SlideIn direction="bottom" delay={200}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('nutrition')}
              >
                <GlassCard
                  style={styles.sectionCardContainer}
                  contentStyle={styles.sectionCardContent}
                >
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={[styles.sectionIcon, { backgroundColor: COLORS.primary + '20' }]}>
                        <Ionicons name="nutrition-outline" size={24} color={COLORS.primary} />
                      </View>
                      <View style={styles.sectionHeaderText}>
                        <Text style={styles.sectionTitle}>Nutrition</Text>
                        <Text style={styles.sectionSubtitle}>
                          {Math.round(report.nutrition.calories)} / {Math.round(report.nutrition.targetCalories)} cal
                        </Text>
                      </View>
                    </View>
                    <View style={styles.sectionHeaderRight}>
                      <Text style={[styles.adherencePercent, { color: report.nutrition.adherence >= 80 ? COLORS.success : COLORS.warning }]}>
                        {Math.round(report.nutrition.adherence)}%
                      </Text>
                      <Ionicons
                        name="chevron-down"
                        size={24}
                        color={COLORS.textSecondary}
                        style={expandedSection === 'nutrition' ? styles.expandIconRotated : undefined}
                      />
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <Animated.View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${Math.min(report.nutrition.adherence, 100)}%`,
                            backgroundColor: report.nutrition.adherence >= 80 ? COLORS.success : COLORS.warning
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Expanded Content */}
                  {expandedSection === 'nutrition' && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
                      style={styles.expandedContent}
                    >
                      <View style={styles.macroGrid}>
                        {[
                          { label: 'Protein', value: report.nutrition.protein, target: report.nutrition.targetProtein, unit: 'g', color: COLORS.primary },
                          { label: 'Carbs', value: report.nutrition.carbs, target: report.nutrition.targetCarbs, unit: 'g', color: COLORS.info },
                          { label: 'Fat', value: report.nutrition.fat, target: report.nutrition.targetFat, unit: 'g', color: COLORS.warning },
                        ].map((item) => (
                          <View key={item.label} style={styles.macroItem}>
                            <View style={styles.macroHeader}>
                              <Text style={styles.macroLabel}>{item.label}</Text>
                              <Text style={[styles.macroValue, { color: item.color }]}>
                                {Math.round(item.value)}{item.unit}
                              </Text>
                            </View>
                            <View style={styles.macroBar}>
                              <View
                                style={[
                                  styles.macroBarFill,
                                  {
                                    width: `${Math.min((item.value / item.target) * 100, 100)}%`,
                                    backgroundColor: item.color
                                  }
                                ]}
                              />
                            </View>
                            <Text style={styles.macroTarget}>Target: {Math.round(item.target)}{item.unit}</Text>
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            </SlideIn>

            {/* Activity Summary - Expandable */}
            <SlideIn direction="bottom" delay={250}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('activity')}
              >
                <GlassCard
                  style={styles.sectionCardContainer}
                  contentStyle={styles.sectionCardContent}
                >
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={[styles.sectionIcon, { backgroundColor: COLORS.info + '20' }]}>
                        <Ionicons name="fitness-outline" size={24} color={COLORS.info} />
                      </View>
                      <View style={styles.sectionHeaderText}>
                        <Text style={styles.sectionTitle}>Activity</Text>
                        <Text style={styles.sectionSubtitle}>
                          {report.activity.steps.toLocaleString()} steps
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-down"
                      size={24}
                      color={COLORS.textSecondary}
                      style={expandedSection === 'activity' ? styles.expandIconRotated : undefined}
                    />
                  </View>

                  {/* Expanded Content */}
                  {expandedSection === 'activity' && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
                      style={styles.expandedContent}
                    >
                      <View style={styles.activityGrid}>
                        {[
                          { icon: 'footsteps-outline', label: 'Steps', value: report.activity.steps.toLocaleString(), color: COLORS.info },
                          { icon: 'flame-outline', label: 'Calories Burned', value: `${Math.round(report.activity.caloriesBurned)} cal`, color: COLORS.primary },
                          { icon: 'water-outline', label: 'Water Intake', value: `${report.activity.waterIntake} ml`, color: '#3498db' },
                          { icon: 'moon-outline', label: 'Sleep', value: `${report.activity.sleepHours} hours`, color: '#9b59b6' },
                        ].map((item, index) => (
                          <View key={item.label} style={styles.activityItem}>
                            <View style={[styles.activityIcon, { backgroundColor: item.color + '20' }]}>
                              <Ionicons name={item.icon as any} size={22} color={item.color} />
                            </View>
                            <View style={styles.activityInfo}>
                              <Text style={styles.activityLabel}>{item.label}</Text>
                              <Text style={[styles.activityValue, { color: item.color }]}>{item.value}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            </SlideIn>

            {/* Training Summary - Expandable */}
            <SlideIn direction="bottom" delay={300}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => toggleSection('training')}
              >
                <GlassCard
                  style={styles.sectionCardContainer}
                  contentStyle={styles.sectionCardContent}
                >
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderLeft}>
                      <View style={[styles.sectionIcon, { backgroundColor: COLORS.success + '20' }]}>
                        <Ionicons name="barbell-outline" size={24} color={COLORS.success} />
                      </View>
                      <View style={styles.sectionHeaderText}>
                        <Text style={styles.sectionTitle}>Training</Text>
                        <Text style={styles.sectionSubtitle}>
                          {report.training.workoutsCompleted} workout{report.training.workoutsCompleted !== 1 ? 's' : ''} completed
                        </Text>
                      </View>
                    </View>
                    <Ionicons
                      name="chevron-down"
                      size={24}
                      color={COLORS.textSecondary}
                      style={expandedSection === 'training' ? styles.expandIconRotated : undefined}
                    />
                  </View>

                  <View style={styles.trainingStats}>
                    <View style={styles.trainingStat}>
                      <Text style={[styles.trainingValue, { color: COLORS.success }]}>
                        {report.training.workoutsCompleted}
                      </Text>
                      <Text style={styles.trainingLabel}>Workouts</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.trainingStat}>
                      <Text style={[styles.trainingValue, { color: COLORS.info }]}>
                        {report.training.totalWeight > 0
                          ? report.training.totalWeight >= 1000
                            ? `${(report.training.totalWeight / 1000).toFixed(1)}t`
                            : `${Math.round(report.training.totalWeight)}`
                          : '0'}
                      </Text>
                      <Text style={styles.trainingLabel}>Total Weight (kg)</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.trainingStat}>
                      <Text style={[styles.trainingValue, { color: COLORS.primary }]}>
                        {report.training.totalVolume}
                      </Text>
                      <Text style={styles.trainingLabel}>Sets</Text>
                    </View>
                  </View>

                  {expandedSection === 'training' && (
                    <Animated.View
                      entering={FadeIn.duration(200)}
                      exiting={FadeOut.duration(150)}
                      style={styles.expandedContent}
                    >
                      {report.training.sessions.length > 0 ? (
                        report.training.sessions.map((session, index) => (
                          <View key={index} style={styles.sessionItem}>
                            <View style={styles.sessionHeader}>
                              <View style={styles.sessionNameRow}>
                                <Ionicons name="fitness-outline" size={18} color={COLORS.success} />
                                <Text style={styles.sessionName}>{session.name}</Text>
                              </View>
                              {session.duration > 0 && (
                                <Text style={styles.sessionDuration}>{session.duration} min</Text>
                              )}
                            </View>
                            <View style={styles.sessionStats}>
                              <View style={styles.sessionStatItem}>
                                <Text style={styles.sessionStatValue}>
                                  {session.totalVolume >= 1000
                                    ? `${(session.totalVolume / 1000).toFixed(1)}t`
                                    : `${Math.round(session.totalVolume)} kg`}
                                </Text>
                                <Text style={styles.sessionStatLabel}>Volume</Text>
                              </View>
                              <View style={styles.sessionStatItem}>
                                <Text style={styles.sessionStatValue}>{session.totalSets}</Text>
                                <Text style={styles.sessionStatLabel}>Sets</Text>
                              </View>
                              <View style={styles.sessionStatItem}>
                                <Text style={styles.sessionStatValue}>{session.totalReps}</Text>
                                <Text style={styles.sessionStatLabel}>Reps</Text>
                              </View>
                            </View>
                            {session.musclesWorked.length > 0 && (
                              <View style={styles.sessionMuscles}>
                                {session.musclesWorked.map((muscle, i) => (
                                  <View key={i} style={styles.muscleBadge}>
                                    <Text style={styles.muscleBadgeText}>{muscle}</Text>
                                  </View>
                                ))}
                              </View>
                            )}
                          </View>
                        ))
                      ) : (
                        <View style={styles.noIssuesContainer}>
                          <Ionicons name="barbell-outline" size={32} color={COLORS.textTertiary} />
                          <Text style={styles.noIssuesText}>No workouts recorded for this day</Text>
                        </View>
                      )}
                    </Animated.View>
                  )}
                </GlassCard>
              </TouchableOpacity>
            </SlideIn>

            {/* Quick Tips */}
            <SlideIn direction="bottom" delay={350}>
              <GlassCard style={styles.tipsCard}>
                <View style={styles.tipsHeader}>
                  <Ionicons name="bulb-outline" size={20} color={COLORS.warning} />
                  <Text style={styles.tipsTitle}>Daily Insight</Text>
                </View>
                <Text style={styles.tipsText}>
                  {getDailyScore() >= 80
                    ? "Great job today! You're hitting your targets consistently. Keep up the momentum!"
                    : getDailyScore() >= 60
                    ? "Good progress! Focus on improving your nutrition adherence for better results."
                    : "Room for improvement. Try to hit your step goal and track your meals more consistently."}
                </Text>
              </GlassCard>
            </SlideIn>
          </>
        ) : (
          <FadeInComponent delay={200}>
            <GlassCard style={styles.emptyCard} contentStyle={styles.emptyCardContent}>
              <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No data available for this date</Text>
            </GlassCard>
          </FadeInComponent>
        )}
      </Animated.ScrollView>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCalendar(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeMonth(-1)}>
                  <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => changeMonth(1)}>
                  <Ionicons name="chevron-forward" size={24} color={COLORS.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.calendarWeekdays}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <Text key={day} style={styles.weekdayText}>{day}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {calendarDays.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.calendarDay,
                      day.isSelected && styles.calendarDaySelected,
                      day.isToday && !day.isSelected && styles.calendarDayToday,
                    ]}
                    onPress={() => day.date && !day.isFuture && handleDateSelect(day.date)}
                    disabled={!day.date || day.isFuture}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        day.isSelected && styles.calendarDayTextSelected,
                        day.isFuture && styles.calendarDayTextFuture,
                        !day.date && styles.calendarDayTextEmpty,
                      ]}
                    >
                      {day.date?.getDate() || ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.todayButton}
                onPress={() => handleDateSelect(new Date())}
              >
                <Text style={styles.todayButtonText}>Go to Today</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  skeletonContainer: {
    marginTop: 10,
  },
  // Date Selector
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dateArrow: {
    padding: 8,
  },
  dateArrowDisabled: {
    opacity: 0.3,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  // Score Card
  scoreCardContainer: {
    marginBottom: 16,
  },
  scoreCardContent: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scoreCircleContainer: {
    marginVertical: 8,
  },
  scoreBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  scoreItem: {
    alignItems: 'center',
    gap: 4,
  },
  scoreItemText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Section Cards
  sectionCardContainer: {
    marginBottom: 12,
  },
  sectionCardContent: {
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 12,
    lineHeight: 20,
  },
  expandIcon: {
    transform: [{ rotate: '0deg' }],
  },
  expandIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  adherencePercent: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Progress Bar
  progressBarContainer: {
    marginTop: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Expanded Content
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  expandedSection: {
    marginBottom: 16,
  },
  expandedSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  // Recommendations
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Muscle Risk
  muscleRiskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  muscleRiskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  muscleRiskName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  noIssuesContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noIssuesText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 10,
  },
  // Macro Grid
  macroGrid: {
    gap: 16,
  },
  macroItem: {
    gap: 6,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  macroValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  macroBar: {
    height: 8,
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroTarget: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  // Activity Grid
  activityGrid: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  activityValue: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  // Training Stats
  trainingStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  trainingStat: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  trainingValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  trainingLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  sessionItem: {
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sessionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  sessionDuration: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  sessionStatItem: {
    alignItems: 'center',
  },
  sessionStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  sessionStatLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sessionMuscles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  muscleBadge: {
    backgroundColor: COLORS.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
    textTransform: 'capitalize',
  },
  // Tips Card
  tipsCard: {
    marginTop: 4,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  tipsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  // Empty Card
  emptyCard: {
    marginTop: 20,
  },
  emptyCardContent: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 16,
  },
  // Calendar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: 340,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  calendarWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textTertiary,
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
    marginHorizontal: 3.5,
    borderRadius: 20,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.primary,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  calendarDayText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '500',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  calendarDayTextFuture: {
    color: COLORS.textTertiary,
    opacity: 0.5,
  },
  calendarDayTextEmpty: {
    color: 'transparent',
  },
  todayButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
