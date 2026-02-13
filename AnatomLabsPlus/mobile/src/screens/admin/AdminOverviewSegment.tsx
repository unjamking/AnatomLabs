import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AdminStats, AdminAnalytics } from '../../types';
import { GlassCard, Skeleton, COLORS } from '../../components/animations';
import { LineChart, AreaChart } from '../../components/charts';

interface Props {
  stats: AdminStats | null;
  analytics: AdminAnalytics | null;
  loading: boolean;
}

export default function AdminOverviewSegment({ stats, analytics, loading }: Props) {
  if (loading || !stats) {
    return (
      <View style={styles.kpiGrid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} width="48%" height={100} borderRadius={16} />
        ))}
      </View>
    );
  }

  const kpis: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { label: 'Total Users', value: stats.totalUsers, icon: 'people', color: '#3498db' },
    { label: 'Active (7d)', value: stats.activeUsers, icon: 'pulse', color: '#2ecc71' },
    { label: 'New This Week', value: stats.newUsersThisWeek, icon: 'person-add', color: '#9b59b6' },
    { label: 'Coaches', value: stats.totalCoaches, icon: 'fitness', color: '#e67e22' },
    { label: 'Banned Users', value: stats.bannedUsers, icon: 'ban', color: '#e74c3c' },
    { label: 'Pending Apps', value: stats.pendingApplications, icon: 'hourglass', color: '#f39c12' },
    { label: 'Bookings', value: stats.totalBookings, icon: 'calendar', color: '#1abc9c' },
    { label: 'Workouts', value: stats.totalWorkoutSessions, icon: 'barbell', color: '#e74c3c' },
    { label: 'Foods', value: stats.totalFoods, icon: 'nutrition', color: '#27ae60' },
  ];

  return (
    <View>
      <View style={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <GlassCard key={kpi.label} delay={100 + i * 50} style={styles.kpiCard} borderGlow glowColor={kpi.color}>
            <Ionicons name={kpi.icon} size={24} color={kpi.color} />
            <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
          </GlassCard>
        ))}
      </View>

      {analytics && analytics.userGrowth.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>User Growth (30d)</Text>
          <GlassCard style={styles.chartCard}>
            <LineChart
              data={analytics.userGrowth.map(d => ({ date: d.date, value: d.count }))}
              color="#3498db"
              height={160}
              gradientFill
              showDots
            />
          </GlassCard>
        </View>
      )}

      {analytics && analytics.dailyActiveUsers.length > 0 && (
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Daily Active Users</Text>
          <GlassCard style={styles.chartCard}>
            <AreaChart
              series={[{
                data: analytics.dailyActiveUsers.map(d => ({ date: d.date, value: d.count })),
                color: '#2ecc71',
                label: 'DAU',
              }]}
              height={160}
            />
          </GlassCard>
        </View>
      )}

      {(stats.pendingApplications > 0 || stats.bannedUsers > 0) && (
        <View style={styles.alertsSection}>
          <Text style={styles.sectionTitle}>Alerts</Text>
          {stats.pendingApplications > 0 && (
            <GlassCard style={styles.alertCard} borderGlow glowColor="#f39c12">
              <Ionicons name="warning" size={20} color="#f39c12" />
              <Text style={styles.alertText}>{stats.pendingApplications} pending coach application{stats.pendingApplications > 1 ? 's' : ''}</Text>
            </GlassCard>
          )}
          {stats.bannedUsers > 0 && (
            <GlassCard style={styles.alertCard} borderGlow glowColor="#e74c3c">
              <Ionicons name="ban" size={20} color="#e74c3c" />
              <Text style={styles.alertText}>{stats.bannedUsers} banned user{stats.bannedUsers > 1 ? 's' : ''}</Text>
            </GlassCard>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  chartSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  chartCard: {
    padding: 12,
  },
  alertsSection: {
    marginTop: 24,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    marginBottom: 8,
  },
  alertText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
});
