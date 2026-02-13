import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  AdminStats,
  AdminUser,
  AdminUserListResponse,
  AdminCoachApplication,
  AdminSegment,
} from '../../types';
import {
  BlurHeader,
  GlassCard,
  FadeIn,
  SlideIn,
  AnimatedCard,
  AnimatedButton,
  AnimatedListItem,
  Skeleton,
  COLORS,
} from '../../components/animations';

const SEGMENTS: { key: AdminSegment; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid-outline' },
  { key: 'users', label: 'Users', icon: 'people-outline' },
  { key: 'applications', label: 'Applications', icon: 'document-text-outline' },
];

const ROLE_FILTERS = ['All', 'Admins', 'Coaches'] as const;
const APP_FILTERS = ['All', 'Pending', 'Approved', 'Rejected'] as const;

export default function AdminDashboardScreen() {
  const { logout } = useAuth();
  const [segment, setSegment] = useState<AdminSegment>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<typeof ROLE_FILTERS[number]>('All');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const [applications, setApplications] = useState<AdminCoachApplication[]>([]);
  const [appFilter, setAppFilter] = useState<typeof APP_FILTERS[number]>('All');
  const [loadingApps, setLoadingApps] = useState(false);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => { scrollY.value = event.contentOffset.y; },
  });

  const loadStats = useCallback(async () => {
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }, []);

  const loadUsers = useCallback(async (page = 1, append = false) => {
    setLoadingUsers(true);
    try {
      const roleMap: Record<string, string | undefined> = {
        All: undefined,
        Admins: 'admin',
        Coaches: 'coach',
      };
      const data: AdminUserListResponse = await api.getAdminUsers({
        page,
        limit: 20,
        search: userSearch || undefined,
        role: roleMap[userRoleFilter],
      });
      setUsers(append ? [...users, ...data.users] : data.users);
      setUserPage(data.pagination.page);
      setUserTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, [userSearch, userRoleFilter]);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    try {
      const statusMap: Record<string, string | undefined> = {
        All: undefined,
        Pending: 'PENDING',
        Approved: 'APPROVED',
        Rejected: 'REJECTED',
      };
      const data = await api.getAdminApplications(statusMap[appFilter]);
      setApplications(data);
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setLoadingApps(false);
    }
  }, [appFilter]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadStats();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    if (segment === 'users') loadUsers(1);
  }, [segment, userRoleFilter]);

  useEffect(() => {
    if (segment === 'applications') loadApplications();
  }, [segment, appFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (segment === 'overview') await loadStats();
    else if (segment === 'users') await loadUsers(1);
    else await loadApplications();
    setRefreshing(false);
  };

  const handleSearchUsers = () => {
    loadUsers(1);
  };

  const handleToggleAdmin = (user: AdminUser) => {
    const newVal = !user.isAdmin;
    Alert.alert(
      newVal ? 'Grant Admin' : 'Remove Admin',
      `${newVal ? 'Grant' : 'Remove'} admin privileges for ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: newVal ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await api.updateAdminUser(user.id, { isAdmin: newVal });
              loadUsers(1);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to update user');
            }
          },
        },
      ]
    );
  };

  const handleToggleCoach = (user: AdminUser) => {
    const newVal = !user.isCoach;
    Alert.alert(
      newVal ? 'Grant Coach' : 'Remove Coach',
      `${newVal ? 'Grant' : 'Remove'} coach status for ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await api.updateAdminUser(user.id, { isCoach: newVal });
              loadUsers(1);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to update user');
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = (user: AdminUser) => {
    Alert.alert(
      'Delete User',
      `Permanently delete ${user.name} (${user.email})? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAdminUser(user.id);
              loadUsers(1);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleApproveApp = (app: AdminCoachApplication) => {
    Alert.alert('Approve Application', `Approve ${app.user.name} as a coach?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            await api.approveApplication(app.id);
            loadApplications();
            loadStats();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to approve');
          }
        },
      },
    ]);
  };

  const handleRejectApp = (app: AdminCoachApplication) => {
    Alert.prompt(
      'Reject Application',
      `Rejection note for ${app.user.name} (optional):`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async (note?: string) => {
            try {
              await api.rejectApplication(app.id, note);
              loadApplications();
              loadStats();
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'Failed to reject');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const renderOverview = () => {
    if (loading || !stats) {
      return (
        <View style={styles.kpiGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
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
      { label: 'Pending Apps', value: stats.pendingApplications, icon: 'hourglass', color: '#f39c12' },
      { label: 'Bookings', value: stats.totalBookings, icon: 'calendar', color: '#1abc9c' },
      { label: 'Workouts', value: stats.totalWorkoutSessions, icon: 'barbell', color: '#e74c3c' },
      { label: 'Foods', value: stats.totalFoods, icon: 'nutrition', color: '#27ae60' },
    ];

    return (
      <View style={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <GlassCard key={kpi.label} delay={100 + i * 50} style={styles.kpiCard} borderGlow glowColor={kpi.color}>
            <Ionicons name={kpi.icon} size={24} color={kpi.color} />
            <Text style={[styles.kpiValue, { color: kpi.color }]}>{kpi.value.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>{kpi.label}</Text>
          </GlassCard>
        ))}
      </View>
    );
  };

  const renderUserCard = (user: AdminUser, index: number) => {
    const isExpanded = expandedUserId === user.id;
    return (
      <AnimatedListItem key={user.id} index={index} enterFrom="right">
        <AnimatedCard
          style={styles.userCard}
          onPress={() => setExpandedUserId(isExpanded ? null : user.id)}
        >
          <View style={styles.userCardHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
            <View style={styles.badges}>
              {user.isAdmin && <View style={[styles.badge, styles.adminBadge]}><Text style={styles.badgeText}>Admin</Text></View>}
              {user.isCoach && <View style={[styles.badge, styles.coachBadge]}><Text style={styles.badgeText}>Coach</Text></View>}
            </View>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userMetaText}>Joined {new Date(user.createdAt).toLocaleDateString()}</Text>
            <Text style={styles.userMetaText}>{user._count.workoutSessions} workouts</Text>
            <Text style={styles.userMetaText}>{user._count.nutritionLogs} logs</Text>
          </View>
          {isExpanded && (
            <View style={styles.userActions}>
              <TouchableOpacity
                style={[styles.actionBtn, user.isAdmin ? styles.actionBtnDanger : styles.actionBtnPrimary]}
                onPress={() => handleToggleAdmin(user)}
              >
                <Ionicons name={user.isAdmin ? 'shield-outline' : 'shield'} size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{user.isAdmin ? 'Remove Admin' : 'Make Admin'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, user.isCoach ? styles.actionBtnWarning : styles.actionBtnSuccess]}
                onPress={() => handleToggleCoach(user)}
              >
                <Ionicons name={user.isCoach ? 'close-circle-outline' : 'fitness'} size={16} color="#fff" />
                <Text style={styles.actionBtnText}>{user.isCoach ? 'Remove Coach' : 'Make Coach'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger]}
                onPress={() => handleDeleteUser(user)}
              >
                <Ionicons name="trash-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </AnimatedCard>
      </AnimatedListItem>
    );
  };

  const renderUsers = () => (
    <View>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={userSearch}
          onChangeText={setUserSearch}
          placeholder="Search by name or email..."
          placeholderTextColor={COLORS.textTertiary}
          returnKeyType="search"
          onSubmitEditing={handleSearchUsers}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchUsers}>
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        {ROLE_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, userRoleFilter === f && styles.filterChipActive]}
            onPress={() => setUserRoleFilter(f)}
          >
            <Text style={[styles.filterChipText, userRoleFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loadingUsers && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <>
          {users.map((u, i) => renderUserCard(u, i))}
          {userPage < userTotalPages && (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={() => loadUsers(userPage + 1, true)}
              disabled={loadingUsers}
            >
              {loadingUsers ? (
                <ActivityIndicator color={COLORS.primary} size="small" />
              ) : (
                <Text style={styles.loadMoreText}>Load More</Text>
              )}
            </TouchableOpacity>
          )}
          {users.length === 0 && !loadingUsers && (
            <Text style={styles.emptyText}>No users found</Text>
          )}
        </>
      )}
    </View>
  );

  const renderAppCard = (app: AdminCoachApplication, index: number) => {
    const statusColors: Record<string, string> = {
      PENDING: '#f39c12',
      APPROVED: '#2ecc71',
      REJECTED: '#e74c3c',
    };
    return (
      <AnimatedListItem key={app.id} index={index} enterFrom="right">
        <AnimatedCard style={styles.appCard} pressable={false}>
          <View style={styles.appCardHeader}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{app.user.name}</Text>
              <Text style={styles.userEmail}>{app.user.email}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColors[app.status]}20` }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors[app.status] }]}>{app.status}</Text>
            </View>
          </View>
          <View style={styles.appDetails}>
            <View style={styles.specialtyRow}>
              {app.specialty.map(s => (
                <View key={s} style={styles.specialtyTag}>
                  <Text style={styles.specialtyTagText}>{s}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.appExperience}>{app.experience} years experience</Text>
            <Text style={styles.appBio} numberOfLines={3}>{app.bio}</Text>
          </View>
          {app.reviewNote && (
            <View style={styles.reviewNoteBox}>
              <Text style={styles.reviewNoteLabel}>Review Note:</Text>
              <Text style={styles.reviewNoteText}>{app.reviewNote}</Text>
            </View>
          )}
          {app.status === 'PENDING' && (
            <View style={styles.appActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnSuccess, { flex: 1 }]}
                onPress={() => handleApproveApp(app)}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnDanger, { flex: 1 }]}
                onPress={() => handleRejectApp(app)}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </AnimatedCard>
      </AnimatedListItem>
    );
  };

  const renderApplications = () => (
    <View>
      <View style={styles.filterRow}>
        {APP_FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, appFilter === f && styles.filterChipActive]}
            onPress={() => setAppFilter(f)}
          >
            <Text style={[styles.filterChipText, appFilter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loadingApps ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.primary} size="large" />
        </View>
      ) : (
        <>
          {applications.map((a, i) => renderAppCard(a, i))}
          {applications.length === 0 && (
            <Text style={styles.emptyText}>No applications found</Text>
          )}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Admin Dashboard"
        scrollY={scrollY}
        rightElement={
          <AnimatedButton
            variant="ghost"
            size="small"
            onPress={logout}
            title="Logout"
            textStyle={{ color: COLORS.primary }}
          />
        }
      />

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.segmentRow}>
          {SEGMENTS.map(s => (
            <TouchableOpacity
              key={s.key}
              style={[styles.segmentBtn, segment === s.key && styles.segmentBtnActive]}
              onPress={() => setSegment(s.key)}
            >
              <Ionicons
                name={s.icon}
                size={18}
                color={segment === s.key ? '#fff' : COLORS.textSecondary}
              />
              <Text style={[styles.segmentText, segment === s.key && styles.segmentTextActive]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.content}>
          {segment === 'overview' && renderOverview()}
          {segment === 'users' && renderUsers()}
          {segment === 'applications' && renderApplications()}
        </View>
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
    paddingBottom: 40,
  },
  segmentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: '#fff',
  },
  content: {
    padding: 16,
  },
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
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  userCard: {
    marginBottom: 10,
    padding: 14,
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  adminBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  coachBadge: {
    backgroundColor: 'rgba(230, 126, 34, 0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  userMetaText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#3498db',
  },
  actionBtnSuccess: {
    backgroundColor: '#2ecc71',
  },
  actionBtnWarning: {
    backgroundColor: '#e67e22',
  },
  actionBtnDanger: {
    backgroundColor: '#e74c3c',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: 15,
    paddingVertical: 40,
  },
  appCard: {
    marginBottom: 10,
    padding: 14,
  },
  appCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  appDetails: {
    marginTop: 10,
  },
  specialtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  specialtyTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
  },
  specialtyTagText: {
    fontSize: 12,
    color: '#3498db',
    fontWeight: '600',
  },
  appExperience: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  appBio: {
    fontSize: 13,
    color: COLORS.textTertiary,
    lineHeight: 18,
  },
  reviewNoteBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.2)',
  },
  reviewNoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f39c12',
    marginBottom: 4,
  },
  reviewNoteText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  appActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
