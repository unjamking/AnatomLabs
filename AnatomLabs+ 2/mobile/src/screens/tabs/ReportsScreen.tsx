import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import api from '../../services/api';
import { DailyReport } from '../../types';

export default function ReportsScreen() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [injuryRisk, setInjuryRisk] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reportType, setReportType] = useState<'daily' | 'injury'>('daily');

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
    await loadData();
    setIsRefreshing(false);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return '#27ae60';
      case 'moderate':
        return '#f39c12';
      case 'high':
        return '#e67e22';
      case 'very_high':
        return '#e74c3c';
      default:
        return '#888';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, reportType === 'daily' && styles.tabActive]}
          onPress={() => setReportType('daily')}
        >
          <Text style={[styles.tabText, reportType === 'daily' && styles.tabTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, reportType === 'injury' && styles.tabActive]}
          onPress={() => setReportType('injury')}
        >
          <Text style={[styles.tabText, reportType === 'injury' && styles.tabTextActive]}>
            Injury Risk
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e74c3c" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {reportType === 'daily' && report ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Nutrition Summary</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {Math.round(report.nutrition.calories)}
                    </Text>
                    <Text style={styles.nutritionTarget}>
                      / {Math.round(report.nutrition.targetCalories)}
                    </Text>
                    <Text style={styles.nutritionLabel}>Calories</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {Math.round(report.nutrition.protein)}g
                    </Text>
                    <Text style={styles.nutritionTarget}>
                      / {Math.round(report.nutrition.targetProtein)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Protein</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {Math.round(report.nutrition.carbs)}g
                    </Text>
                    <Text style={styles.nutritionTarget}>
                      / {Math.round(report.nutrition.targetCarbs)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Carbs</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {Math.round(report.nutrition.fat)}g
                    </Text>
                    <Text style={styles.nutritionTarget}>
                      / {Math.round(report.nutrition.targetFat)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>Fat</Text>
                  </View>
                </View>
                <View style={styles.adherenceBar}>
                  <View
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Activity</Text>
                <View style={styles.activityGrid}>
                  <View style={styles.activityItem}>
                    <Text style={styles.activityValue}>
                      {report.activity.steps.toLocaleString()}
                    </Text>
                    <Text style={styles.activityLabel}>Steps</Text>
                  </View>
                  <View style={styles.activityItem}>
                    <Text style={styles.activityValue}>
                      {Math.round(report.activity.caloriesBurned)}
                    </Text>
                    <Text style={styles.activityLabel}>Calories Burned</Text>
                  </View>
                  <View style={styles.activityItem}>
                    <Text style={styles.activityValue}>
                      {report.activity.waterIntake}ml
                    </Text>
                    <Text style={styles.activityLabel}>Water</Text>
                  </View>
                  <View style={styles.activityItem}>
                    <Text style={styles.activityValue}>
                      {report.activity.sleepHours}h
                    </Text>
                    <Text style={styles.activityLabel}>Sleep</Text>
                  </View>
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Training</Text>
                <View style={styles.trainingCard}>
                  <Text style={styles.trainingText}>
                    Workouts completed: {report.training.workoutsCompleted}
                  </Text>
                  <Text style={styles.trainingText}>
                    Total volume: {report.training.totalVolume} sets
                  </Text>
                  {report.training.musclesTrained.length > 0 && (
                    <Text style={styles.trainingText}>
                      Muscles trained: {report.training.musclesTrained.join(', ')}
                    </Text>
                  )}
                </View>
              </View>

              {report.injuryRisk && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Injury Risk Overview</Text>
                  <View
                    style={[
                      styles.riskCard,
                      { borderColor: getRiskColor(report.injuryRisk.overallRisk) },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskLevel,
                        { color: getRiskColor(report.injuryRisk.overallRisk) },
                      ]}
                    >
                      {report.injuryRisk.overallRisk.replace('_', ' ').toUpperCase()}
                    </Text>
                    <Text style={styles.riskText}>
                      {report.injuryRisk.needsRestDay
                        ? 'Consider taking a rest day'
                        : 'You can continue training'}
                    </Text>
                  </View>
                </View>
              )}
            </>
          ) : injuryRisk ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overall Risk</Text>
                <View
                  style={[
                    styles.riskCard,
                    { borderColor: getRiskColor(injuryRisk.overallRisk) },
                  ]}
                >
                  <Text
                    style={[
                      styles.riskLevel,
                      { color: getRiskColor(injuryRisk.overallRisk) },
                    ]}
                  >
                    {injuryRisk.overallRisk?.replace('_', ' ').toUpperCase() || 'LOW'}
                  </Text>
                  <Text style={styles.riskText}>
                    {injuryRisk.needsRestDay
                      ? 'Rest day recommended'
                      : 'Safe to train'}
                  </Text>
                </View>
              </View>

              {injuryRisk.recommendations && injuryRisk.recommendations.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Recommendations</Text>
                  {injuryRisk.recommendations.map((rec: string, index: number) => (
                    <View key={index} style={styles.recommendationCard}>
                      <Text style={styles.recommendationText}>{rec}</Text>
                    </View>
                  ))}
                </View>
              )}

              {injuryRisk.musclesAtRisk && injuryRisk.musclesAtRisk.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Muscles at Risk</Text>
                  {injuryRisk.musclesAtRisk.map((muscleRisk: any, index: number) => (
                    <View key={index} style={styles.muscleRiskCard}>
                      <View style={styles.muscleRiskHeader}>
                        <Text style={styles.muscleName}>
                          {muscleRisk.muscle?.name || 'Unknown'}
                        </Text>
                        <Text
                          style={[
                            styles.muscleRiskLevel,
                            { color: getRiskColor(muscleRisk.riskLevel) },
                          ]}
                        >
                          {muscleRisk.riskLevel?.replace('_', ' ').toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.muscleRiskText}>
                        Used {muscleRisk.usageCount} times recently
                      </Text>
                      {muscleRisk.lastTrained && (
                        <Text style={styles.muscleRiskText}>
                          Last trained: {muscleRisk.hoursSinceTraining}h ago
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoTitle}>About Injury Prevention</Text>
                <Text style={styles.infoText}>
                  This system tracks muscle usage patterns and recovery time to detect
                  overtraining. Recommendations are based on:{'\n\n'}
                  • Muscle recovery time (24-72h depending on muscle group){'\n'}
                  • Training frequency and volume{'\n'}
                  • Cumulative fatigue patterns{'\n'}
                  • Sport-specific overuse risks
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  tabActive: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  tabText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  nutritionItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  nutritionTarget: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#666',
  },
  adherenceBar: {
    height: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  adherenceBarFill: {
    height: '100%',
    backgroundColor: '#27ae60',
  },
  adherenceText: {
    fontSize: 14,
    color: '#888',
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
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  activityValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 4,
  },
  activityLabel: {
    fontSize: 12,
    color: '#666',
  },
  trainingCard: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  trainingText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 8,
  },
  riskCard: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  riskLevel: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  riskText: {
    fontSize: 14,
    color: '#aaa',
  },
  recommendationCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  recommendationText: {
    fontSize: 14,
    color: '#ccc',
  },
  muscleRiskCard: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  muscleRiskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  muscleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  muscleRiskLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  muscleRiskText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  infoBox: {
    margin: 20,
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
});
