import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Appbar, Card, DataTable } from 'react-native-paper';
import { LineChart, BarChart } from '../../components/charts';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { FadeIn, SlideIn, AnimatedListItem, SPRING_CONFIG, ANIMATION_DURATION } from '../../components/animations';
import {
  AdminStats,
  AdminAnalytics,
  AdminDemographics,
  AdminEngagement,
  AdminUser,
  AdminUserListResponse,
  AdminCoachApplication,
  AdminSegment,
} from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;

const THEME = {
  bg: '#080808',
  surface: '#111111',
  surfaceLight: '#1a1a1c',
  surfaceMid: '#161618',
  border: 'rgba(255,255,255,0.07)',
  borderLight: 'rgba(255,255,255,0.04)',
  text: '#f5f5f5',
  textSec: '#9a9a9a',
  textMuted: '#555555',
  accent: '#e74c3c',
  accentDim: 'rgba(231,76,60,0.15)',
};

const SEGMENTS: { key: AdminSegment; label: string; icon: keyof typeof Ionicons.glyphMap; activeIcon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline', activeIcon: 'grid' },
  { key: 'analytics', label: 'Analytics', icon: 'analytics-outline', activeIcon: 'analytics' },
  { key: 'users', label: 'Users', icon: 'people-outline', activeIcon: 'people' },
  { key: 'applications', label: 'Apps', icon: 'document-text-outline', activeIcon: 'document-text' },
  { key: 'engagement', label: 'Engage', icon: 'pulse-outline', activeIcon: 'pulse' },
];

const KPI_CONFIGS = [
  { key: 'totalUsers' as const, label: 'Total Users', gradient: ['#667eea', '#764ba2'] as [string, string] },
  { key: 'activeUsers' as const, label: 'Active Users', gradient: ['#11998e', '#38ef7d'] as [string, string] },
  { key: 'pendingApplications' as const, label: 'Pending Apps', gradient: ['#eb3349', '#f45c43'] as [string, string] },
  { key: 'totalCoaches' as const, label: 'Coaches', gradient: ['#a18cd1', '#fbc2eb'] as [string, string] },
];

const ROLE_FILTERS = ['All', 'Admins', 'Coaches', 'Banned'] as const;
const ROLE_COLORS: Record<string, string> = { All: '#e74c3c', Admins: '#e74c3c', Coaches: '#e67e22', Banned: '#c0392b' };

const APP_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'] as const;
const FILTER_COLORS: Record<string, string> = { All: '#e74c3c', Pending: '#f39c12', Approved: '#2ecc71', Rejected: '#e74c3c' };

function SectionHeader({ title, subtitle, icon, color }: {
  title: string; subtitle?: string; icon: keyof typeof Ionicons.glyphMap; color: string;
}) {
  return (
    <View style={s.sectionHeader}>
      <View style={[s.sectionIcon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.sectionTitle}>{title}</Text>
        {subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

function StatCard({ label, value, gradient, delay = 0 }: { label: string; value: number; gradient: [string, string]; delay?: number }) {
  return (
    <FadeIn delay={delay} duration={ANIMATION_DURATION.normal} style={s.kpiCard}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.kpiGradient}>
        <View style={s.kpiIconRow}>
          <View style={s.kpiShimmer} />
        </View>
        <Text style={s.kpiValue}>{value.toLocaleString()}</Text>
        <Text style={s.kpiLabel}>{label}</Text>
      </LinearGradient>
    </FadeIn>
  );
}

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <SlideIn direction="bottom" delay={delay} duration={ANIMATION_DURATION.normal} distance={16} useSpring>
      {children}
    </SlideIn>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <Card style={s.chartCard}>
      <Card.Content style={s.chartContent}>{children}</Card.Content>
    </Card>
  );
}

function formatChartData(arr: Array<{ date: string; count: number }>) {
  return arr.map(d => ({ date: d.date, value: d.count }));
}

function formatRevenueData(arr: Array<{ date: string; amount: number }>) {
  return arr.map(d => ({ date: d.date, value: d.amount }));
}

function ActionButton({ icon, label, color, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; color: string; onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[s.actionBtn, { backgroundColor: `${color}18` }, animStyle]}>
      <TouchableOpacity
        style={s.actionBtnInner}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.95, SPRING_CONFIG.snappy); }}
        onPressOut={() => { scale.value = withSpring(1, SPRING_CONFIG.bouncy); }}
        activeOpacity={0.8}
      >
        <Ionicons name={icon} size={15} color={color} />
        <Text style={[s.actionBtnText, { color }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NewAdminDashboardScreen() {
  const { logout, user } = useAuth();
  const [segment, setSegment] = useState<AdminSegment>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const prevSegment = useRef<AdminSegment>('overview');

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [applications, setApplications] = useState<AdminCoachApplication[]>([]);

  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsData, setAnalyticsData] = useState<AdminAnalytics | null>(null);
  const [demographics, setDemographics] = useState<AdminDemographics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<typeof ROLE_FILTERS[number]>('All');
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersTotalPages, setUsersTotalPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const [appFilter, setAppFilter] = useState<typeof APP_FILTERS[number]>('All');
  const [appsList, setAppsList] = useState<AdminCoachApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);

  const [engagement, setEngagement] = useState<AdminEngagement | null>(null);
  const [engagementLoading, setEngagementLoading] = useState(false);

  const contentOpacity = useSharedValue(1);
  const contentTranslateX = useSharedValue(0);

  const chartWidth = SCREEN_WIDTH - 64;

  const animateSegmentChange = (newSeg: AdminSegment) => {
    const segKeys = SEGMENTS.map(s => s.key);
    const prevIdx = segKeys.indexOf(prevSegment.current);
    const newIdx = segKeys.indexOf(newSeg);
    const dir = newIdx > prevIdx ? 1 : -1;

    contentOpacity.value = withTiming(0, { duration: 140 });
    contentTranslateX.value = withTiming(dir * 18, { duration: 140 }, () => {
      contentTranslateX.value = -dir * 18;
      contentOpacity.value = withTiming(1, { duration: 200 });
      contentTranslateX.value = withTiming(0, { duration: 200 });
    });
    prevSegment.current = newSeg;
  };

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateX: contentTranslateX.value }],
  }));

  const loadOverview = useCallback(async () => {
    try {
      const [statsData, analyticsData, appsData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminAnalytics(30),
        api.getAdminApplications('PENDING'),
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
      setApplications(appsData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadOverview();
      setLoading(false);
    };
    init();
  }, [loadOverview]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (segment === 'overview') await loadOverview();
    else if (segment === 'analytics') await loadAnalytics();
    else if (segment === 'users') await loadUsers(1);
    else if (segment === 'applications') await loadApps();
    else if (segment === 'engagement') await loadEngagement();
    setRefreshing(false);
  };

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const [a, d] = await Promise.all([
        api.getAdminAnalytics(analyticsDays),
        api.getAdminDemographics(),
      ]);
      setAnalyticsData(a);
      setDemographics(d);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsDays]);

  useEffect(() => {
    if (segment === 'analytics') loadAnalytics();
  }, [segment, loadAnalytics]);

  const loadUsers = useCallback(async (p = 1, append = false) => {
    setUsersLoading(true);
    try {
      const roleMap: Record<string, string | undefined> = {
        All: undefined, Admins: 'admin', Coaches: 'coach', Banned: 'banned',
      };
      const data: AdminUserListResponse = await api.getAdminUsers({
        page: p, limit: 20, search: userSearch || undefined, role: roleMap[roleFilter],
      });
      setUsersList(append ? prev => [...prev, ...data.users] : data.users);
      setUsersPage(data.pagination.page);
      setUsersTotalPages(data.pagination.totalPages);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setUsersLoading(false);
    }
  }, [userSearch, roleFilter]);

  useEffect(() => {
    if (segment === 'users') loadUsers(1);
  }, [segment, roleFilter]);

  const loadApps = useCallback(async () => {
    setAppsLoading(true);
    try {
      const statusMap: Record<string, string | undefined> = {
        All: undefined, Pending: 'PENDING', Approved: 'APPROVED', Rejected: 'REJECTED',
      };
      const data = await api.getAdminApplications(statusMap[appFilter]);
      setAppsList(data);
    } catch (e) {
      console.error('Failed to load applications:', e);
    } finally {
      setAppsLoading(false);
    }
  }, [appFilter]);

  useEffect(() => {
    if (segment === 'applications') loadApps();
  }, [segment, loadApps]);

  const loadEngagement = useCallback(async () => {
    setEngagementLoading(true);
    try {
      const result = await api.getAdminEngagement(30);
      setEngagement(result);
    } catch (e) {
      console.error('Failed to load engagement:', e);
    } finally {
      setEngagementLoading(false);
    }
  }, []);

  useEffect(() => {
    if (segment === 'engagement') loadEngagement();
  }, [segment, loadEngagement]);

  const handleSegmentChange = (newSeg: AdminSegment) => {
    if (newSeg === segment) return;
    animateSegmentChange(newSeg);
    setSegment(newSeg);
  };

  const handleToggleAdmin = (u: AdminUser) => {
    const newVal = !u.isAdmin;
    Alert.alert(newVal ? 'Grant Admin' : 'Remove Admin', `${newVal ? 'Grant' : 'Remove'} admin for ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', style: newVal ? 'default' : 'destructive', onPress: async () => {
        try { await api.updateAdminUser(u.id, { isAdmin: newVal }); loadUsers(1); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  const handleToggleCoach = (u: AdminUser) => {
    const newVal = !u.isCoach;
    Alert.alert(newVal ? 'Grant Coach' : 'Remove Coach', `${newVal ? 'Grant' : 'Remove'} coach for ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: async () => {
        try { await api.updateAdminUser(u.id, { isCoach: newVal }); loadUsers(1); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  const handleBan = (u: AdminUser) => {
    const banning = !u.isBanned;
    Alert.alert(banning ? 'Ban User' : 'Unban User', banning ? `Ban ${u.name}?` : `Unban ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: banning ? 'Ban' : 'Unban', style: banning ? 'destructive' : 'default', onPress: async () => {
        try { await api.banAdminUser(u.id, banning); loadUsers(1); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  const handleDeleteUser = (u: AdminUser) => {
    Alert.alert('Delete User', `Permanently delete ${u.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.deleteAdminUser(u.id); loadUsers(1); }
        catch (e: any) { Alert.alert('Error', e?.message || 'Failed'); }
      }},
    ]);
  };

  const handleApproveApp = (app: AdminCoachApplication) => {
    Alert.alert('Approve Application', `Approve ${app.user.name} as a coach?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        setProcessingAppId(app.id);
        try {
          await api.approveApplication(app.id);
          setAppsList(prev => prev.filter(a => a.id !== app.id));
          setApplications(prev => prev.filter(a => a.id !== app.id));
          loadOverview();
        } catch (e: any) {
          setTimeout(() => Alert.alert('Error', e?.error || e?.message || 'Failed to approve'), 500);
        } finally {
          setProcessingAppId(null);
        }
      }},
    ]);
  };

  const handleRejectApp = (app: AdminCoachApplication) => {
    Alert.alert('Reject Application', `Reject ${app.user.name}'s application?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        setProcessingAppId(app.id);
        try {
          await api.rejectApplication(app.id);
          setAppsList(prev => prev.filter(a => a.id !== app.id));
          setApplications(prev => prev.filter(a => a.id !== app.id));
          loadOverview();
        } catch (e: any) {
          setTimeout(() => Alert.alert('Error', e?.error || e?.message || 'Failed to reject'), 500);
        } finally {
          setProcessingAppId(null);
        }
      }},
    ]);
  };

  const getAvatarColor = (name: string) => {
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  const renderOverview = () => {
    const dauData = analytics?.dailyActiveUsers ? formatChartData(analytics.dailyActiveUsers) : [];

    return (
      <>
        {stats && (
          <View style={s.kpiRow}>
            {KPI_CONFIGS.map((cfg, index) => (
              <StatCard key={cfg.key} label={cfg.label} value={stats[cfg.key]} gradient={cfg.gradient} delay={index * 80} />
            ))}
          </View>
        )}

        {dauData.length > 0 && (
          <AnimatedSection delay={350}>
            <View style={s.section}>
              <SectionHeader title="Daily Active Users" subtitle="Last 30 days" icon="analytics-outline" color="#11998e" />
              <ChartCard>
                <LineChart data={dauData} width={chartWidth} height={180} color="#11998e" />
              </ChartCard>
            </View>
          </AnimatedSection>
        )}

        {analytics && (
          <AnimatedSection delay={430}>
            <View style={s.section}>
              <SectionHeader title="Platform Metrics" subtitle="Workouts & Nutrition" icon="bar-chart-outline" color="#667eea" />
              <View style={s.metricsRow}>
                {[
                  { icon: 'barbell' as const, value: stats?.totalWorkoutSessions ?? 0, label: 'Workouts', color: '#e74c3c', adoption: analytics.featureAdoption?.workouts },
                  { icon: 'nutrition' as const, value: stats?.totalFoods ?? 0, label: 'Foods', color: '#27ae60', adoption: analytics.featureAdoption?.nutrition },
                  { icon: 'calendar' as const, value: stats?.totalBookings ?? 0, label: 'Bookings', color: '#1abc9c', adoption: analytics.featureAdoption?.coaching },
                ].map((m, i) => (
                  <AnimatedListItem key={m.label} index={i} enterFrom="bottom" style={{ flex: 1 }}>
                    <Card style={s.metricCard}>
                      <Card.Content style={s.metricContent}>
                        <View style={[s.metricIcon, { backgroundColor: `${m.color}18` }]}>
                          <Ionicons name={m.icon} size={17} color={m.color} />
                        </View>
                        <Text style={s.metricValue}>{m.value.toLocaleString()}</Text>
                        <Text style={s.metricLabel}>{m.label}</Text>
                        {m.adoption && (
                          <View style={s.adoptionBadge}>
                            <Text style={s.adoptionText}>{m.adoption.percentage}%</Text>
                          </View>
                        )}
                      </Card.Content>
                    </Card>
                  </AnimatedListItem>
                ))}
              </View>
            </View>
          </AnimatedSection>
        )}

        <AnimatedSection delay={520}>
          <View style={s.section}>
            <SectionHeader title="Pending Applications" subtitle={`${applications.length} awaiting review`} icon="document-text-outline" color="#f39c12" />
            <Card style={s.tableCard}>
              <DataTable>
                <DataTable.Header style={s.tableHeader}>
                  <DataTable.Title textStyle={s.tableHeaderText}>Applicant</DataTable.Title>
                  <DataTable.Title textStyle={s.tableHeaderText}>Email</DataTable.Title>
                  <DataTable.Title textStyle={s.tableHeaderText} numeric>Date</DataTable.Title>
                </DataTable.Header>
                {applications.length === 0 ? (
                  <View style={s.emptyTable}>
                    <Ionicons name="checkmark-circle-outline" size={28} color={THEME.textMuted} />
                    <Text style={s.emptyTableText}>No pending applications</Text>
                  </View>
                ) : (
                  applications.slice(0, 5).map(app => (
                    <DataTable.Row key={app.id} style={s.tableRow}>
                      <DataTable.Cell textStyle={s.tableCellText}>
                        <View style={s.applicantCell}>
                          <View style={s.applicantAvatar}>
                            <Text style={s.applicantInitial}>{app.user.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <Text style={s.applicantName} numberOfLines={1}>{app.user.name}</Text>
                        </View>
                      </DataTable.Cell>
                      <DataTable.Cell textStyle={s.tableCellText}>
                        <Text style={s.emailText} numberOfLines={1}>{app.user.email}</Text>
                      </DataTable.Cell>
                      <DataTable.Cell textStyle={s.tableCellText} numeric>
                        <Text style={s.dateText}>
                          {new Date(app.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))
                )}
              </DataTable>
            </Card>
          </View>
        </AnimatedSection>

        {stats && (stats.newUsersThisWeek > 0 || stats.bannedUsers > 0 || stats.pendingApplications > 0) && (
          <AnimatedSection delay={600}>
            <View style={s.section}>
              <SectionHeader title="Recent Activity" subtitle="Latest events" icon="notifications-outline" color="#9b59b6" />
              <Card style={s.activityCard}>
                <Card.Content style={{ paddingVertical: 4 }}>
                  {[
                    stats.newUsersThisWeek > 0 && {
                      dot: '#2ecc71', title: `+${stats.newUsersThisWeek} new user${stats.newUsersThisWeek > 1 ? 's' : ''} this week`,
                      time: 'This week', badge: 'trending-up' as const, badgeBg: 'rgba(46,204,113,0.1)', badgeColor: '#2ecc71',
                    },
                    stats.bannedUsers > 0 && {
                      dot: '#e74c3c', title: `${stats.bannedUsers} banned user${stats.bannedUsers > 1 ? 's' : ''}`,
                      time: 'Requires attention', badge: 'warning' as const, badgeBg: 'rgba(231,76,60,0.1)', badgeColor: '#e74c3c',
                    },
                    stats.pendingApplications > 0 && {
                      dot: '#f39c12', title: `${stats.pendingApplications} pending application${stats.pendingApplications > 1 ? 's' : ''}`,
                      time: 'Awaiting review', badge: 'hourglass' as const, badgeBg: 'rgba(243,156,18,0.1)', badgeColor: '#f39c12',
                    },
                  ].filter(Boolean).map((item: any, idx) => (
                    <View key={item.title} style={[s.activityItem, idx > 0 && { borderTopWidth: 1, borderTopColor: THEME.borderLight }]}>
                      <View style={[s.activityDot, { backgroundColor: item.dot }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.activityTitle}>{item.title}</Text>
                        <Text style={s.activityTime}>{item.time}</Text>
                      </View>
                      <View style={[s.activityBadge, { backgroundColor: item.badgeBg }]}>
                        <Ionicons name={item.badge} size={14} color={item.badgeColor} />
                      </View>
                    </View>
                  ))}
                </Card.Content>
              </Card>
            </View>
          </AnimatedSection>
        )}
      </>
    );
  };

  const renderAnalytics = () => {
    if (analyticsLoading) {
      return <View style={s.centered}><ActivityIndicator size="large" color={THEME.accent} /></View>;
    }
    if (!analyticsData) return <Text style={s.emptyMsg}>Failed to load analytics</Text>;

    const totalWorkouts = analyticsData.workoutSessionsPerDay.reduce((sum, d) => sum + d.count, 0);
    const totalNutrition = analyticsData.nutritionLogsPerDay.reduce((sum, d) => sum + d.count, 0);
    const avgAdoption = Math.round(
      (analyticsData.featureAdoption.workouts.percentage +
       analyticsData.featureAdoption.nutrition.percentage +
       analyticsData.featureAdoption.activity.percentage +
       analyticsData.featureAdoption.coaching.percentage) / 4
    );

    const growthData = formatChartData(analyticsData.userGrowth);
    const dauData = formatChartData(analyticsData.dailyActiveUsers);
    const workoutData = formatChartData(analyticsData.workoutSessionsPerDay);
    const revenueData = formatRevenueData(analyticsData.revenue);

    const demoBarData = (arr: Array<{ label: string; value: number }>, color: string) =>
      arr.map(d => ({
        value: d.value,
        label: d.label.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        color,
      }));

    return (
      <>
        <AnimatedSection delay={0}>
          <View style={s.dayToggle}>
            {([30, 90] as const).map(d => (
              <TouchableOpacity key={d} style={[s.dayChip, analyticsDays === d && s.dayChipActive]} onPress={() => setAnalyticsDays(d)}>
                {analyticsDays === d && (
                  <LinearGradient colors={['rgba(231,76,60,0.85)', 'rgba(192,57,43,0.85)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                )}
                <Text style={[s.dayChipText, analyticsDays === d && s.dayChipTextActive]}>{d} days</Text>
              </TouchableOpacity>
            ))}
          </View>
        </AnimatedSection>

        <AnimatedSection delay={80}>
          <View style={s.analyticsMetrics}>
            {[
              { icon: 'cash-outline' as const, label: 'Revenue', value: `$${analyticsData.totalRevenue.toLocaleString()}`, color: '#f39c12' },
              { icon: 'barbell-outline' as const, label: 'Sessions', value: totalWorkouts.toLocaleString(), color: '#e74c3c' },
              { icon: 'nutrition-outline' as const, label: 'Logs', value: totalNutrition.toLocaleString(), color: '#2ecc71' },
              { icon: 'rocket-outline' as const, label: 'Adoption', value: `${avgAdoption}%`, color: '#3498db' },
            ].map(m => (
              <Card key={m.label} style={s.analyticMetricCard}>
                <Card.Content style={s.analyticMetricContent}>
                  <View style={[s.analyticMetricIconBg, { backgroundColor: `${m.color}18` }]}>
                    <Ionicons name={m.icon} size={15} color={m.color} />
                  </View>
                  <Text style={[s.analyticMetricValue, { color: m.color }]}>{m.value}</Text>
                  <Text style={s.analyticMetricLabel}>{m.label}</Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        </AnimatedSection>

        {growthData.length > 0 && (
          <AnimatedSection delay={160}>
            <View style={s.section}>
              <SectionHeader title="User Growth" subtitle={`${analyticsDays}-day trend`} icon="trending-up-outline" color="#3498db" />
              <ChartCard>
                <LineChart data={growthData} width={chartWidth} height={180} color="#3498db" />
              </ChartCard>
            </View>
          </AnimatedSection>
        )}

        {dauData.length > 0 && (
          <AnimatedSection delay={230}>
            <View style={s.section}>
              <SectionHeader title="Daily Active Users" subtitle="Session tracking" icon="people-outline" color="#2ecc71" />
              <ChartCard>
                <LineChart data={dauData} width={chartWidth} height={180} color="#2ecc71" />
              </ChartCard>
            </View>
          </AnimatedSection>
        )}

        {workoutData.length > 0 && (
          <AnimatedSection delay={300}>
            <View style={s.section}>
              <SectionHeader title="Workout Sessions" subtitle={`${analyticsDays}-day trend`} icon="barbell-outline" color="#e74c3c" />
              <ChartCard>
                <LineChart data={workoutData} width={chartWidth} height={180} color="#e74c3c" />
              </ChartCard>
            </View>
          </AnimatedSection>
        )}

        {revenueData.length > 0 && (
          <AnimatedSection delay={370}>
            <View style={s.section}>
              <SectionHeader title="Revenue" subtitle={`Total: $${analyticsData.totalRevenue.toLocaleString()}`} icon="wallet-outline" color="#f39c12" />
              <ChartCard>
                <LineChart data={revenueData} width={chartWidth} height={180} color="#f39c12" yAxisSuffix="$" />
              </ChartCard>
            </View>
          </AnimatedSection>
        )}

        <AnimatedSection delay={440}>
          <View style={s.section}>
            <SectionHeader title="Feature Adoption" subtitle="Usage rates" icon="apps-outline" color="#1abc9c" />
            <Card style={s.chartCard}>
              <Card.Content>
                <View style={s.adoptionGrid}>
                  {[
                    { label: 'Workouts', pct: analyticsData.featureAdoption.workouts.percentage, users: analyticsData.featureAdoption.workouts.users, color: '#e74c3c', icon: 'barbell' as const },
                    { label: 'Nutrition', pct: analyticsData.featureAdoption.nutrition.percentage, users: analyticsData.featureAdoption.nutrition.users, color: '#2ecc71', icon: 'nutrition' as const },
                    { label: 'Activity', pct: analyticsData.featureAdoption.activity.percentage, users: analyticsData.featureAdoption.activity.users, color: '#3498db', icon: 'footsteps' as const },
                    { label: 'Coaching', pct: analyticsData.featureAdoption.coaching.percentage, users: analyticsData.featureAdoption.coaching.users, color: '#9b59b6', icon: 'people' as const },
                  ].map(f => (
                    <View key={f.label} style={s.adoptionItem}>
                      <View style={s.adoptionItemTop}>
                        <View style={[s.adoptionItemIcon, { backgroundColor: `${f.color}18` }]}>
                          <Ionicons name={f.icon} size={13} color={f.color} />
                        </View>
                        <Text style={[s.adoptionPct, { color: f.color }]}>{f.pct}%</Text>
                      </View>
                      <View style={s.adoptionBarTrack}>
                        <View style={[s.adoptionBarFill, { width: `${Math.min(f.pct, 100)}%`, backgroundColor: f.color }]} />
                      </View>
                      <Text style={s.adoptionItemLabel}>{f.label}</Text>
                      <Text style={s.adoptionItemUsers}>{f.users} users</Text>
                    </View>
                  ))}
                </View>
              </Card.Content>
            </Card>
          </View>
        </AnimatedSection>

        {demographics && (
          <>
            <AnimatedSection delay={500}>
              <View style={s.demoHeader}>
                <View style={s.demoHeaderLine} />
                <Text style={s.demoHeaderText}>Demographics</Text>
                <View style={s.demoHeaderLine} />
              </View>
            </AnimatedSection>

            {[
              { data: demographics.genderSplit, title: 'Gender Split', icon: 'male-female-outline', color: '#3498db', delay: 560 },
              { data: demographics.activityLevels, title: 'Activity Levels', icon: 'speedometer-outline', color: '#2ecc71', delay: 620 },
              { data: demographics.healthConditions, title: 'Health Conditions', icon: 'medical-outline', color: '#e74c3c', delay: 680 },
              { data: demographics.goalDistribution, title: 'Goals', icon: 'flag-outline', color: '#3498db', delay: 740 },
              { data: demographics.experienceLevels, title: 'Experience', icon: 'school-outline', color: '#e67e22', delay: 800 },
              { data: demographics.ageRanges, title: 'Age Ranges', icon: 'calendar-outline', color: '#9b59b6', delay: 860 },
            ].filter(item => item.data.length > 0).map(item => (
              <AnimatedSection key={item.title} delay={item.delay}>
                <View style={s.section}>
                  <SectionHeader title={item.title} icon={item.icon as any} color={item.color} />
                  <ChartCard>
                    <BarChart data={demoBarData(item.data, item.color)} width={chartWidth} height={180} color={item.color} />
                  </ChartCard>
                </View>
              </AnimatedSection>
            ))}
          </>
        )}
      </>
    );
  };

  const renderUsers = () => {
    const totalCount = usersList.length > 0 ? `${usersList.length}${usersPage < usersTotalPages ? '+' : ''} users` : '';

    return (
      <>
        <AnimatedSection delay={0}>
          <View style={s.searchContainer}>
            <View style={s.searchInputWrap}>
              <Ionicons name="search-outline" size={17} color={THEME.textMuted} style={{ marginRight: 10 }} />
              <TextInput
                style={s.searchInput}
                value={userSearch}
                onChangeText={setUserSearch}
                placeholder="Search users..."
                placeholderTextColor={THEME.textMuted}
                returnKeyType="search"
                onSubmitEditing={() => loadUsers(1)}
              />
              {userSearch.length > 0 && (
                <TouchableOpacity onPress={() => { setUserSearch(''); setTimeout(() => loadUsers(1), 100); }}>
                  <Ionicons name="close-circle" size={17} color={THEME.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </AnimatedSection>

        <AnimatedSection delay={60}>
          <View style={s.filterRow}>
            {ROLE_FILTERS.map(f => {
              const isActive = roleFilter === f;
              const color = ROLE_COLORS[f];
              return (
                <TouchableOpacity key={f} style={[s.filterChip, isActive && { borderColor: color, backgroundColor: `${color}12` }]} onPress={() => setRoleFilter(f)}>
                  <Text style={[s.filterChipText, isActive && { color }]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimatedSection>

        {totalCount !== '' && (
          <AnimatedSection delay={100}>
            <View style={s.countHeader}>
              <Text style={s.countText}>{totalCount}</Text>
              {roleFilter !== 'All' && (
                <View style={[s.countBadge, { backgroundColor: `${ROLE_COLORS[roleFilter]}12` }]}>
                  <Text style={[s.countBadgeText, { color: ROLE_COLORS[roleFilter] }]}>{roleFilter}</Text>
                </View>
              )}
            </View>
          </AnimatedSection>
        )}

        {usersLoading && usersList.length === 0 ? (
          <View style={s.centered}><ActivityIndicator size="large" color={THEME.accent} /></View>
        ) : (
          <>
            {usersList.map((u, index) => {
              const isExpanded = expandedUserId === u.id;
              const avatarColor = getAvatarColor(u.name);
              return (
                <AnimatedListItem key={u.id} index={index} enterFrom="bottom">
                  <TouchableOpacity activeOpacity={0.75} onPress={() => setExpandedUserId(isExpanded ? null : u.id)}>
                    <Card style={[s.userCard, u.isBanned && s.userCardBanned]}>
                      <Card.Content>
                        <View style={s.userCardHeader}>
                          <View style={[s.avatarCircle, { backgroundColor: `${avatarColor}18` }]}>
                            <Text style={[s.avatarText, { color: avatarColor }]}>{u.name.charAt(0).toUpperCase()}</Text>
                            {u.isAdmin && (
                              <View style={s.avatarBadge}><Ionicons name="shield" size={7} color="#fff" /></View>
                            )}
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[s.userName, u.isBanned && s.userNameBanned]} numberOfLines={1}>{u.name}</Text>
                            <Text style={s.userEmail} numberOfLines={1}>{u.email}</Text>
                          </View>
                          <View style={s.badges}>
                            {u.isAdmin && (
                              <View style={s.roleBadge}>
                                <LinearGradient colors={['rgba(231,76,60,0.22)', 'rgba(231,76,60,0.08)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                                <Text style={[s.roleBadgeText, { color: '#e74c3c' }]}>Admin</Text>
                              </View>
                            )}
                            {u.isCoach && (
                              <View style={s.roleBadge}>
                                <LinearGradient colors={['rgba(230,126,34,0.22)', 'rgba(230,126,34,0.08)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
                                <Text style={[s.roleBadgeText, { color: '#e67e22' }]}>Coach</Text>
                              </View>
                            )}
                            {u.isBanned && (
                              <View style={[s.roleBadge, s.bannedBadge]}>
                                <Text style={s.bannedBadgeText}>BANNED</Text>
                              </View>
                            )}
                          </View>
                          <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={THEME.textMuted} style={{ marginLeft: 4 }} />
                        </View>

                        <View style={s.userMeta}>
                          <View style={s.metaItem}>
                            <Ionicons name="calendar-outline" size={11} color={THEME.textMuted} />
                            <Text style={s.userMetaText}>{new Date(u.createdAt).toLocaleDateString()}</Text>
                          </View>
                          <View style={s.metaDivider} />
                          <View style={s.metaItem}>
                            <Ionicons name="barbell-outline" size={11} color={THEME.textMuted} />
                            <Text style={s.userMetaText}>{u._count.workoutSessions}</Text>
                          </View>
                          <View style={s.metaDivider} />
                          <View style={s.metaItem}>
                            <Ionicons name="nutrition-outline" size={11} color={THEME.textMuted} />
                            <Text style={s.userMetaText}>{u._count.nutritionLogs}</Text>
                          </View>
                        </View>

                        {(u.goal || u.experienceLevel) && (
                          <View style={s.tagRow}>
                            {u.goal && (
                              <View style={s.infoTag}>
                                <Ionicons name="flag-outline" size={9} color="#1abc9c" />
                                <Text style={s.infoTagText}>{u.goal.replace(/_/g, ' ')}</Text>
                              </View>
                            )}
                            {u.experienceLevel && (
                              <View style={[s.infoTag, { backgroundColor: 'rgba(52,152,219,0.1)' }]}>
                                <Ionicons name="school-outline" size={9} color="#3498db" />
                                <Text style={[s.infoTagText, { color: '#3498db' }]}>{u.experienceLevel}</Text>
                              </View>
                            )}
                          </View>
                        )}

                        {isExpanded && (
                          <View style={s.userActions}>
                            <View style={s.actionsGrid}>
                              <ActionButton
                                icon={u.isAdmin ? 'shield-outline' : 'shield'}
                                label={u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                color={u.isAdmin ? '#e74c3c' : '#3498db'}
                                onPress={() => handleToggleAdmin(u)}
                              />
                              <ActionButton
                                icon={u.isCoach ? 'close-circle-outline' : 'fitness'}
                                label={u.isCoach ? 'Remove Coach' : 'Make Coach'}
                                color={u.isCoach ? '#e67e22' : '#2ecc71'}
                                onPress={() => handleToggleCoach(u)}
                              />
                              <ActionButton
                                icon={u.isBanned ? 'checkmark-circle' : 'ban'}
                                label={u.isBanned ? 'Unban' : 'Ban'}
                                color={u.isBanned ? '#2ecc71' : '#c0392b'}
                                onPress={() => handleBan(u)}
                              />
                              <ActionButton
                                icon="trash-outline"
                                label="Delete"
                                color="#e74c3c"
                                onPress={() => handleDeleteUser(u)}
                              />
                            </View>
                          </View>
                        )}
                      </Card.Content>
                    </Card>
                  </TouchableOpacity>
                </AnimatedListItem>
              );
            })}

            {usersPage < usersTotalPages && (
              <TouchableOpacity style={s.loadMoreBtn} onPress={() => loadUsers(usersPage + 1, true)} disabled={usersLoading}>
                {usersLoading ? (
                  <ActivityIndicator color={THEME.accent} size="small" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="chevron-down" size={16} color={THEME.accent} />
                    <Text style={s.loadMoreText}>Load More</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {usersList.length === 0 && !usersLoading && (
              <View style={s.emptyBlock}>
                <Ionicons name="people-outline" size={36} color={THEME.textMuted} />
                <Text style={s.emptyMsg}>No users found</Text>
              </View>
            )}
          </>
        )}
      </>
    );
  };

  const renderApplications = () => {
    const statusConfig: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; bg: string }> = {
      PENDING: { color: '#f39c12', icon: 'hourglass', bg: 'rgba(243,156,18,0.1)' },
      APPROVED: { color: '#2ecc71', icon: 'checkmark-circle', bg: 'rgba(46,204,113,0.1)' },
      REJECTED: { color: '#e74c3c', icon: 'close-circle', bg: 'rgba(231,76,60,0.1)' },
    };

    return (
      <>
        <AnimatedSection delay={0}>
          <View style={s.filterRow}>
            {APP_FILTERS.map(f => {
              const isActive = appFilter === f;
              const color = FILTER_COLORS[f];
              return (
                <TouchableOpacity key={f} style={[s.filterChip, isActive && { borderColor: color, backgroundColor: `${color}12` }]} onPress={() => setAppFilter(f)}>
                  <Text style={[s.filterChipText, isActive && { color }]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </AnimatedSection>

        {appsLoading ? (
          <View style={s.centered}><ActivityIndicator size="large" color={THEME.accent} /></View>
        ) : (
          <>
            {appsList.map((app, index) => {
              const st = statusConfig[app.status] || statusConfig.PENDING;
              return (
                <AnimatedListItem key={app.id} index={index} enterFrom="bottom">
                  <Card style={s.appCard}>
                    <Card.Content>
                      <View style={s.appCardHeader}>
                        <View style={s.appApplicantInfo}>
                          <View style={s.appApplicantAvatar}>
                            <Text style={s.appApplicantAvatarText}>{app.user.name.charAt(0).toUpperCase()}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.appApplicantName}>{app.user.name}</Text>
                            <Text style={s.appApplicantEmail}>{app.user.email}</Text>
                          </View>
                        </View>
                        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
                          <Ionicons name={st.icon} size={11} color={st.color} />
                          <Text style={[s.statusBadgeText, { color: st.color }]}>{app.status}</Text>
                        </View>
                      </View>

                      {app.specialty.length > 0 && (
                        <View style={s.specialtyRow}>
                          {app.specialty.map(sp => (
                            <View key={sp} style={s.specialtyTag}>
                              <Text style={s.specialtyTagText}>{sp}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      <View style={s.appMetaRow}>
                        <View style={s.metaItem}>
                          <Ionicons name="time-outline" size={12} color={THEME.textMuted} />
                          <Text style={s.userMetaText}>{app.experience} yrs exp</Text>
                        </View>
                        <View style={s.metaDivider} />
                        <View style={s.metaItem}>
                          <Ionicons name="calendar-outline" size={12} color={THEME.textMuted} />
                          <Text style={s.userMetaText}>{new Date(app.createdAt || Date.now()).toLocaleDateString()}</Text>
                        </View>
                      </View>

                      {app.bio && (
                        <View style={s.bioSection}>
                          <Text style={s.bioText} numberOfLines={3}>{app.bio}</Text>
                        </View>
                      )}

                      {app.reviewNote && (
                        <View style={s.reviewNoteBox}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                            <Ionicons name="chatbubble-outline" size={11} color="#f39c12" />
                            <Text style={s.reviewNoteLabel}>Review Note</Text>
                          </View>
                          <Text style={s.reviewNoteText}>{app.reviewNote}</Text>
                        </View>
                      )}

                      {app.status === 'PENDING' && (
                        <View style={s.appActions}>
                          <TouchableOpacity
                            style={[s.approveBtn, processingAppId === app.id && { opacity: 0.6 }]}
                            onPress={() => handleApproveApp(app)}
                            activeOpacity={0.7}
                            disabled={processingAppId !== null}
                          >
                            {processingAppId === app.id ? (
                              <ActivityIndicator size="small" color="#2ecc71" />
                            ) : (
                              <>
                                <Ionicons name="checkmark-circle" size={16} color="#2ecc71" />
                                <Text style={[s.appActionText, { color: '#2ecc71' }]}>Approve</Text>
                              </>
                            )}
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[s.rejectBtn, processingAppId === app.id && { opacity: 0.6 }]}
                            onPress={() => handleRejectApp(app)}
                            activeOpacity={0.7}
                            disabled={processingAppId !== null}
                          >
                            {processingAppId === app.id ? (
                              <ActivityIndicator size="small" color="#e74c3c" />
                            ) : (
                              <>
                                <Ionicons name="close-circle" size={16} color="#e74c3c" />
                                <Text style={[s.appActionText, { color: '#e74c3c' }]}>Reject</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </Card.Content>
                  </Card>
                </AnimatedListItem>
              );
            })}
            {appsList.length === 0 && (
              <View style={s.emptyBlock}>
                <Ionicons name="document-text-outline" size={36} color={THEME.textMuted} />
                <Text style={s.emptyMsg}>No applications found</Text>
              </View>
            )}
          </>
        )}
      </>
    );
  };

  const renderEngagement = () => {
    if (engagementLoading) {
      return <View style={s.centered}><ActivityIndicator size="large" color={THEME.accent} /></View>;
    }
    if (!engagement) return <Text style={s.emptyMsg}>Failed to load engagement data</Text>;

    const healthScore = Math.round(
      (engagement.retention.days7.percentage + engagement.retention.days30.percentage + engagement.retention.days90.percentage) / 3
    );
    const healthColor = healthScore >= 70 ? '#2ecc71' : healthScore >= 40 ? '#f39c12' : '#e74c3c';
    const healthLabel = healthScore >= 70 ? 'Healthy' : healthScore >= 40 ? 'Moderate' : 'Needs Attention';

    const retentionCards = [
      { label: '7-Day', ...engagement.retention.days7, color: '#2ecc71' },
      { label: '30-Day', ...engagement.retention.days30, color: '#3498db' },
      { label: '90-Day', ...engagement.retention.days90, color: '#9b59b6' },
    ];

    const compMax = Math.max(engagement.avgWorkoutsPerUserPerWeek, engagement.avgNutritionLogsPerUserPerDay, 1);

    const exerciseBarData = engagement.topExercises.map(d => ({
      value: d.value,
      label: d.label.length > 10 ? d.label.substring(0, 10) + '..' : d.label,
      color: '#e74c3c',
    }));

    const foodBarData = engagement.topFoods.map(d => ({
      value: d.value,
      label: d.label.length > 10 ? d.label.substring(0, 10) + '..' : d.label,
      color: '#2ecc71',
    }));

    const heatmapData = engagement.platformHeatmap || [];

    return (
      <>
        <AnimatedSection delay={0}>
          <Card style={[s.chartCard, { marginBottom: 16 }]}>
            <Card.Content>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Ionicons name="heart-circle" size={26} color={healthColor} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: THEME.text }}>Platform Health</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <Text style={{ fontSize: 48, fontWeight: '800', color: healthColor, letterSpacing: -2 }}>{healthScore}</Text>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: healthColor }}>{healthLabel}</Text>
                  <Text style={{ fontSize: 11, color: THEME.textMuted, marginTop: 3 }}>Avg retention 7/30/90d</Text>
                </View>
              </View>
              <View style={s.healthBar}>
                <View style={[s.healthBarFill, { width: `${Math.min(healthScore, 100)}%`, backgroundColor: healthColor }]} />
              </View>
            </Card.Content>
          </Card>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <SectionHeader title="Retention" icon="shield-checkmark-outline" color="#3498db" />
          <View style={[s.retentionRow, { marginBottom: 20 }]}>
            {retentionCards.map((r, i) => (
              <FadeIn key={r.label} delay={140 + i * 60} duration={ANIMATION_DURATION.normal} style={{ flex: 1 }}>
                <Card style={[s.retentionCard, { borderLeftWidth: 3, borderLeftColor: r.color }]}>
                  <Card.Content style={{ alignItems: 'center', paddingVertical: 14 }}>
                    <Text style={{ fontSize: 26, fontWeight: '800', color: r.color, letterSpacing: -1 }}>{r.percentage}%</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: THEME.textSec, marginTop: 4 }}>{r.label}</Text>
                    <Text style={{ fontSize: 10, color: THEME.textMuted, marginTop: 2 }}>{r.active}/{r.total}</Text>
                  </Card.Content>
                </Card>
              </FadeIn>
            ))}
          </View>
        </AnimatedSection>

        <AnimatedSection delay={260}>
          <SectionHeader title="Engagement" icon="swap-horizontal-outline" color="#e74c3c" />
          <Card style={[s.chartCard, { marginBottom: 16 }]}>
            <Card.Content style={{ gap: 16 }}>
              {[
                { label: 'Workouts/user/wk', value: engagement.avgWorkoutsPerUserPerWeek, color: '#e74c3c', icon: 'barbell' as const },
                { label: 'Logs/user/day', value: engagement.avgNutritionLogsPerUserPerDay, color: '#2ecc71', icon: 'nutrition' as const },
              ].map(item => {
                const pct = compMax > 0 ? (item.value / compMax) * 100 : 0;
                return (
                  <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, width: 138 }}>
                      <Ionicons name={item.icon} size={14} color={item.color} />
                      <Text style={{ fontSize: 11, color: THEME.textSec, fontWeight: '600' }}>{item.label}</Text>
                    </View>
                    <View style={s.compBarTrack}>
                      <View style={[s.compBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: item.color }]} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: item.color, width: 34, textAlign: 'right' }}>{item.value}</Text>
                  </View>
                );
              })}
            </Card.Content>
          </Card>
        </AnimatedSection>

        {heatmapData.length > 0 && (
          <AnimatedSection delay={340}>
            <View style={s.section}>
              <SectionHeader title="Training Heatmap" subtitle="Last 12 weeks" icon="grid-outline" color="#2ecc71" />
              <Card style={s.chartCard}>
                <Card.Content>
                  <View style={s.heatmapContainer}>
                    {(() => {
                      const weeks: Array<Array<{ date: string; value: number }>> = [];
                      for (let i = 0; i < heatmapData.length; i += 7) {
                        weeks.push(heatmapData.slice(i, i + 7));
                      }
                      const maxVal = Math.max(...heatmapData.map(d => d.value), 1);
                      return weeks.map((week, wi) => (
                        <View key={wi} style={s.heatmapWeek}>
                          {week.map((day, di) => {
                            const intensity = day.value / maxVal;
                            const bg = day.value === 0 ? 'rgba(255,255,255,0.04)' : `rgba(46,204,113,${0.12 + intensity * 0.75})`;
                            return <View key={di} style={[s.heatmapCell, { backgroundColor: bg }]} />;
                          })}
                        </View>
                      ));
                    })()}
                  </View>
                </Card.Content>
              </Card>
            </View>
          </AnimatedSection>
        )}

        {exerciseBarData.length > 0 && (
          <AnimatedSection delay={420}>
            <View style={s.section}>
              <SectionHeader title="Top Exercises" icon="barbell-outline" color="#e74c3c" />
              <ChartCard>
                <BarChart data={exerciseBarData} width={chartWidth} height={180} color="#e74c3c" />
              </ChartCard>
            </View>
          </AnimatedSection>
        )}

        {foodBarData.length > 0 && (
          <AnimatedSection delay={490}>
            <View style={s.section}>
              <SectionHeader title="Top Foods" icon="nutrition-outline" color="#2ecc71" />
              <ChartCard>
                <BarChart data={foodBarData} width={chartWidth} height={180} color="#2ecc71" />
              </ChartCard>
            </View>
          </AnimatedSection>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <View style={[s.container, s.centered]}>
        <ActivityIndicator size="large" color={THEME.accent} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FadeIn duration={ANIMATION_DURATION.normal}>
        <Appbar.Header style={s.appbar} statusBarHeight={48}>
          <View style={s.appbarLeft}>
            <View style={s.adminBadge}>
              <Ionicons name="shield-checkmark" size={15} color="#fff" />
            </View>
            <View>
              <Text style={s.appbarGreeting}>Admin Dashboard</Text>
              <Text style={s.appbarUser}>{user?.name || 'Admin'}</Text>
            </View>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={THEME.textSec} />
          </TouchableOpacity>
        </Appbar.Header>
      </FadeIn>

      <Animated.View style={[{ flex: 1 }, contentAnimStyle]}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.accent} />}
        >
          {segment === 'overview' && renderOverview()}
          {segment === 'analytics' && renderAnalytics()}
          {segment === 'users' && renderUsers()}
          {segment === 'applications' && renderApplications()}
          {segment === 'engagement' && renderEngagement()}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      <SlideIn direction="bottom" delay={150} duration={ANIMATION_DURATION.normal} useSpring style={s.navBarContainer}>
        <LinearGradient colors={['rgba(8,8,8,0)', 'rgba(8,8,8,0.97)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, height: 120 }} />
        <View style={s.navBarBorder} />
        <View style={s.navBar}>
          {SEGMENTS.map(seg => {
            const isActive = segment === seg.key;
            return (
              <TouchableOpacity key={seg.key} style={s.navTab} onPress={() => handleSegmentChange(seg.key)} activeOpacity={0.7}>
                <View style={s.navTabInner}>
                  {isActive && (
                    <View style={[StyleSheet.absoluteFill, s.navTabActiveBg]}>
                      <LinearGradient colors={['rgba(231,76,60,0.18)', 'rgba(231,76,60,0.04)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
                    </View>
                  )}
                  <View style={s.navIconWrap}>
                    <Ionicons name={isActive ? seg.activeIcon : seg.icon} size={21} color={isActive ? THEME.accent : THEME.textMuted} />
                    {seg.key === 'applications' && stats && stats.pendingApplications > 0 && (
                      <View style={s.navBadge}>
                        <Text style={s.navBadgeText}>{stats.pendingApplications > 9 ? '9+' : stats.pendingApplications}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[s.navTabLabel, isActive && s.navTabLabelActive]}>{seg.label}</Text>
                  {isActive && <View style={s.navActiveBar} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </SlideIn>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, flex: 1 },
  appbar: { backgroundColor: THEME.surface, borderBottomWidth: 1, borderBottomColor: THEME.border, elevation: 0, height: 96, paddingHorizontal: 16 },
  appbarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  adminBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.accent, alignItems: 'center', justifyContent: 'center' },
  appbarGreeting: { fontSize: 10, fontWeight: '700', color: THEME.accent, textTransform: 'uppercase', letterSpacing: 1.4 },
  appbarUser: { fontSize: 16, fontWeight: '700', color: THEME.text, marginTop: 1 },
  logoutBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.surfaceLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: THEME.border },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingTop: 20 },

  kpiRow: { flexDirection: 'row', gap: CARD_GAP, marginBottom: 22, flexWrap: 'wrap' },
  kpiCard: { width: '47.5%' as any, borderRadius: 14, overflow: 'hidden' },
  kpiGradient: { padding: 14, minHeight: 82, justifyContent: 'flex-end' },
  kpiIconRow: { marginBottom: 6 },
  kpiShimmer: { width: 20, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  kpiValue: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  kpiLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 3 },

  section: { marginBottom: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: THEME.text },
  sectionSubtitle: { fontSize: 11, color: THEME.textMuted, marginTop: 1 },

  chartCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0, overflow: 'hidden' },
  chartContent: { paddingVertical: 14, paddingHorizontal: 6 },
  tooltip: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 6 },
  tooltipText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  metricsRow: { flexDirection: 'row', gap: 10 },
  metricCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0 },
  metricContent: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, gap: 6 },
  metricIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 19, fontWeight: '800', color: THEME.text, letterSpacing: -0.3 },
  metricLabel: { fontSize: 10, fontWeight: '600', color: THEME.textMuted },
  adoptionBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, marginTop: 1 },
  adoptionText: { fontSize: 9, fontWeight: '700', color: THEME.textSec },

  tableCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0, overflow: 'hidden' },
  tableHeader: { backgroundColor: THEME.surfaceLight, borderBottomWidth: 1, borderBottomColor: THEME.border },
  tableHeaderText: { color: THEME.textSec, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  tableRow: { borderBottomWidth: 1, borderBottomColor: THEME.borderLight },
  tableCellText: { color: THEME.text, fontSize: 12 },
  applicantCell: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  applicantAvatar: { width: 26, height: 26, borderRadius: 7, backgroundColor: 'rgba(155,89,182,0.14)', alignItems: 'center', justifyContent: 'center' },
  applicantInitial: { fontSize: 11, fontWeight: '700', color: '#9b59b6' },
  applicantName: { fontSize: 12, fontWeight: '600', color: THEME.text, maxWidth: 80 },
  emailText: { fontSize: 11, color: THEME.textSec, maxWidth: 120 },
  dateText: { fontSize: 11, color: THEME.textMuted },
  emptyTable: { alignItems: 'center', paddingVertical: 28, gap: 7 },
  emptyTableText: { fontSize: 13, color: THEME.textMuted, fontWeight: '500' },

  activityCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0 },
  activityItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  activityDot: { width: 7, height: 7, borderRadius: 3.5 },
  activityTitle: { fontSize: 13, fontWeight: '600', color: THEME.text },
  activityTime: { fontSize: 10, color: THEME.textMuted, marginTop: 2 },
  activityBadge: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  dayToggle: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  dayChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border, alignItems: 'center', overflow: 'hidden' },
  dayChipActive: { borderColor: THEME.accent },
  dayChipText: { fontSize: 13, fontWeight: '600', color: THEME.textSec },
  dayChipTextActive: { color: '#fff', fontWeight: '700' },

  analyticsMetrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  analyticMetricCard: { width: '48%' as any, backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0 },
  analyticMetricContent: { alignItems: 'flex-start', paddingVertical: 14, paddingHorizontal: 13 },
  analyticMetricIconBg: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  analyticMetricValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  analyticMetricLabel: { fontSize: 11, color: THEME.textSec, marginTop: 2, fontWeight: '600' },

  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 10, paddingHorizontal: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 11, color: THEME.textSec, fontWeight: '600' },

  adoptionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, padding: 12 },
  adoptionItem: { width: '47%' as any },
  adoptionItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  adoptionItemIcon: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  adoptionPct: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  adoptionBarTrack: { height: 3.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 5 },
  adoptionBarFill: { height: '100%' as any, borderRadius: 2 },
  adoptionItemLabel: { fontSize: 11, fontWeight: '600', color: THEME.textSec },
  adoptionItemUsers: { fontSize: 10, color: THEME.textMuted },

  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8, marginBottom: 20 },
  demoHeaderLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  demoHeaderText: { fontSize: 11, fontWeight: '700', color: THEME.textSec, textTransform: 'uppercase', letterSpacing: 2 },

  searchContainer: { marginBottom: 12 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.surface, borderRadius: 13, borderWidth: 1, borderColor: THEME.border, paddingHorizontal: 13 },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 14, color: THEME.text },

  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 11, backgroundColor: THEME.surface, borderWidth: 1, borderColor: THEME.border },
  filterChipText: { fontSize: 11, fontWeight: '600', color: THEME.textMuted },

  countHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingHorizontal: 2 },
  countText: { fontSize: 13, fontWeight: '700', color: THEME.textSec },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 7 },
  countBadgeText: { fontSize: 10, fontWeight: '600' },

  userCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0, marginBottom: 8 },
  userCardBanned: { borderColor: 'rgba(231,76,60,0.25)' },
  userCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' as const },
  avatarText: { fontSize: 17, fontWeight: '700' },
  avatarBadge: { position: 'absolute' as const, bottom: -2, right: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: THEME.surface },
  userName: { fontSize: 14, fontWeight: '600', color: THEME.text },
  userNameBanned: { textDecorationLine: 'line-through' as const, color: THEME.textMuted },
  userEmail: { fontSize: 11, color: THEME.textMuted, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' as const },
  roleBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' as const },
  roleBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  bannedBadge: { backgroundColor: 'rgba(231,76,60,0.8)' },
  bannedBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  userMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: THEME.borderLight },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaDivider: { width: 2, height: 2, borderRadius: 1, backgroundColor: THEME.textMuted, opacity: 0.4 },
  userMetaText: { fontSize: 11, color: THEME.textMuted, fontWeight: '500' },
  tagRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  infoTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, backgroundColor: 'rgba(26,188,156,0.1)' },
  infoTagText: { fontSize: 10, color: '#1abc9c', fontWeight: '600', textTransform: 'capitalize' as const },
  userActions: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.borderLight },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 7 },
  actionBtn: { borderRadius: 9, minWidth: '47%' as any, flex: 1 },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 8 },
  actionBtnText: { fontSize: 11, fontWeight: '600' },

  loadMoreBtn: { alignItems: 'center', paddingVertical: 13, marginTop: 6, backgroundColor: THEME.surface, borderRadius: 13, borderWidth: 1, borderColor: THEME.border },
  loadMoreText: { fontSize: 13, fontWeight: '600', color: THEME.accent },

  emptyBlock: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyMsg: { textAlign: 'center', color: THEME.textSec, fontSize: 14, paddingVertical: 40 },

  appCard: { backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0, marginBottom: 10 },
  appCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  appApplicantInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  appApplicantAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(155,89,182,0.14)', alignItems: 'center', justifyContent: 'center' },
  appApplicantAvatarText: { fontSize: 16, fontWeight: '700', color: '#9b59b6' },
  appApplicantName: { fontSize: 14, fontWeight: '600', color: THEME.text },
  appApplicantEmail: { fontSize: 11, color: THEME.textMuted, marginTop: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3 },
  specialtyRow: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 6, marginTop: 12, marginBottom: 10 },
  specialtyTag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: 'rgba(52,152,219,0.09)', borderWidth: 1, borderColor: 'rgba(52,152,219,0.12)' },
  specialtyTagText: { fontSize: 10, color: '#3498db', fontWeight: '600' },
  appMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  bioSection: { padding: 10, backgroundColor: 'rgba(255,255,255,0.025)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  bioText: { fontSize: 12, color: THEME.textSec, lineHeight: 17 },
  reviewNoteBox: { marginTop: 11, padding: 11, backgroundColor: 'rgba(243,156,18,0.05)', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(243,156,18,0.1)' },
  reviewNoteLabel: { fontSize: 10, fontWeight: '700', color: '#f39c12' },
  reviewNoteText: { fontSize: 12, color: THEME.textSec, lineHeight: 17 },
  appActions: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: THEME.borderLight },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 11, backgroundColor: 'rgba(46,204,113,0.12)', borderWidth: 1, borderColor: 'rgba(46,204,113,0.25)' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 11, backgroundColor: 'rgba(231,76,60,0.12)', borderWidth: 1, borderColor: 'rgba(231,76,60,0.25)' },
  appActionText: { fontSize: 13, fontWeight: '600' },

  healthBar: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  healthBarFill: { height: '100%' as any, borderRadius: 3 },
  retentionRow: { flexDirection: 'row', gap: 10 },
  retentionCard: { flex: 1, backgroundColor: THEME.surface, borderRadius: 14, borderWidth: 1, borderColor: THEME.border, elevation: 0 },
  compBarTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  compBarFill: { height: '100%' as any, borderRadius: 5 },

  heatmapContainer: { flexDirection: 'row', flexWrap: 'wrap' as const, gap: 3 },
  heatmapWeek: { gap: 3 },
  heatmapCell: { width: 13, height: 13, borderRadius: 3 },

  navBarContainer: { position: 'absolute' as const, bottom: 0, left: 0, right: 0 },
  navBarBorder: { height: 1, backgroundColor: THEME.border },
  navBar: { flexDirection: 'row', paddingBottom: 28, paddingTop: 8, backgroundColor: THEME.surface },
  navTab: { flex: 1, alignItems: 'center' },
  navTabInner: { alignItems: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, position: 'relative' as const, overflow: 'hidden' },
  navTabActiveBg: { borderRadius: 12 },
  navIconWrap: { position: 'relative' as const },
  navBadge: { position: 'absolute' as const, top: -4, right: -8, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  navBadgeText: { fontSize: 8, fontWeight: '800', color: '#fff' },
  navTabLabel: { fontSize: 9, fontWeight: '600', color: THEME.textMuted, marginTop: 3 },
  navTabLabelActive: { color: THEME.accent, fontWeight: '700' },
  navActiveBar: { width: 14, height: 2, borderRadius: 1, backgroundColor: THEME.accent, marginTop: 4 },

});
