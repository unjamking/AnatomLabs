import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { WeightLog, WeightTrend } from '../../types';

interface WeightChartProps {
  weightLogs: WeightLog[];
  trend: WeightTrend | null;
}

export default function WeightChart({ weightLogs, trend }: WeightChartProps) {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 80;
  const chartHeight = 120;

  if (weightLogs.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Weight Trend</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No weight data yet</Text>
          <Text style={styles.emptySubtext}>Log your weight to see your progress</Text>
        </View>
      </View>
    );
  }

  // Sort logs by date (oldest first for chart)
  const sortedLogs = [...weightLogs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get min/max for scaling
  const weights = sortedLogs.map(l => l.weight);
  const minWeight = Math.floor(Math.min(...weights) - 1);
  const maxWeight = Math.ceil(Math.max(...weights) + 1);
  const weightRange = maxWeight - minWeight || 1;

  // Calculate bar heights
  const barWidth = Math.max(8, Math.min(20, (chartWidth - 40) / sortedLogs.length - 4));

  // Trend indicator
  const getTrendInfo = () => {
    if (!trend) return null;
    switch (trend.trend) {
      case 'up':
        return { arrow: '\u2191', color: '#e74c3c', label: 'Gaining' };
      case 'down':
        return { arrow: '\u2193', color: '#2ecc71', label: 'Losing' };
      case 'stable':
        return { arrow: '\u2192', color: '#3498db', label: 'Stable' };
      default:
        return null;
    }
  };

  const trendInfo = getTrendInfo();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weight Trend</Text>
        {trend && trend.current && (
          <View style={styles.currentWeight}>
            <Text style={styles.currentValue}>{trend.current} kg</Text>
            {trendInfo && (
              <View style={[styles.trendBadge, { backgroundColor: trendInfo.color + '20' }]}>
                <Text style={[styles.trendText, { color: trendInfo.color }]}>
                  {trendInfo.arrow} {trendInfo.label}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Simple bar chart */}
      <View style={[styles.chartContainer, { height: chartHeight }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel}>{maxWeight}</Text>
          <Text style={styles.axisLabel}>{Math.round((maxWeight + minWeight) / 2)}</Text>
          <Text style={styles.axisLabel}>{minWeight}</Text>
        </View>

        {/* Bars */}
        <View style={styles.barsContainer}>
          {sortedLogs.slice(-15).map((log, index) => {
            const heightPercent = ((log.weight - minWeight) / weightRange) * 100;
            return (
              <View key={index} style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: `${Math.max(5, heightPercent)}%`,
                      backgroundColor: index === sortedLogs.slice(-15).length - 1 ? '#e74c3c' : '#444',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {trend && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>7-Day Avg</Text>
            <Text style={styles.statValue}>
              {trend.average7Day ? `${trend.average7Day} kg` : '-'}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>30-Day Avg</Text>
            <Text style={styles.statValue}>
              {trend.average30Day ? `${trend.average30Day} kg` : '-'}
            </Text>
          </View>
          {trend.change !== null && (
            <>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Change</Text>
                <Text style={[
                  styles.statValue,
                  { color: trend.change > 0 ? '#e74c3c' : trend.change < 0 ? '#2ecc71' : '#fff' }
                ]}>
                  {trend.change > 0 ? '+' : ''}{trend.change} kg
                </Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  currentWeight: {
    alignItems: 'flex-end',
  },
  currentValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trendBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  chartContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  yAxis: {
    width: 35,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  axisLabel: {
    color: '#666',
    fontSize: 10,
    textAlign: 'right',
    paddingRight: 8,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
  },
  bar: {
    borderRadius: 3,
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    marginBottom: 4,
  },
  emptySubtext: {
    color: '#444',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2a2a2a',
  },
  statLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 4,
  },
  statValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
