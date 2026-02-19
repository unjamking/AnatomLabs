import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
} from 'react-native-reanimated';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CoachApplication } from '../../types';
import api from '../../services/api';
import { COLORS } from '../../components/animations';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  gradient: [string, string];
  label: string;
  desc: string;
}> = {
  PENDING: {
    icon: 'hourglass-outline',
    color: '#f39c12',
    bg: 'rgba(243,156,18,0.12)',
    gradient: ['rgba(243,156,18,0.2)', 'rgba(243,156,18,0.04)'],
    label: 'Under Review',
    desc: 'Your application has been submitted and is being reviewed by our team. We\'ll update your status soon.',
  },
  APPROVED: {
    icon: 'checkmark-circle-outline',
    color: '#2ecc71',
    bg: 'rgba(46,204,113,0.12)',
    gradient: ['rgba(46,204,113,0.2)', 'rgba(46,204,113,0.04)'],
    label: 'Approved!',
    desc: 'Congratulations! Your application has been approved. You are now a certified coach on the platform.',
  },
  REJECTED: {
    icon: 'close-circle-outline',
    color: '#e74c3c',
    bg: 'rgba(231,76,60,0.12)',
    gradient: ['rgba(231,76,60,0.2)', 'rgba(231,76,60,0.04)'],
    label: 'Not Approved',
    desc: 'Unfortunately your application was not approved at this time. See the review note below for more details.',
  },
};

export default function CoachApplicationStatusScreen() {
  const navigation = useNavigation<any>();
  const { refreshUser } = useAuth();
  const [application, setApplication] = useState<CoachApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const iconScale = useSharedValue(0.5);
  const iconOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(24);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: iconOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const animateIn = () => {
    iconScale.value = withDelay(100, withSpring(1, { damping: 12, stiffness: 180 }));
    iconOpacity.value = withDelay(100, withTiming(1, { duration: 300 }));
    contentOpacity.value = withDelay(260, withTiming(1, { duration: 380 }));
    contentTranslateY.value = withDelay(260, withSpring(0, { damping: 16, stiffness: 160 }));
  };

  const fetchApplication = useCallback(async () => {
    try {
      const data = await api.getMyApplication();
      setApplication(data);
      if (data.status === 'APPROVED') {
        await refreshUser();
      }
      setNotFound(false);
    } catch (error: any) {
      if (error?.statusCode === 404 || error?.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshUser]);

  useFocusEffect(
    useCallback(() => {
      iconScale.value = 0.5;
      iconOpacity.value = 0;
      contentOpacity.value = 0;
      contentTranslateY.value = 24;
      fetchApplication().then(animateIn);
    }, [fetchApplication])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchApplication();
    setRefreshing(false);
    animateIn();
  };

  const handleGoToDashboard = async () => {
    await refreshUser();
    navigation.navigate('CoachDashboard');
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const status = application?.status;
  const cfg = status ? STATUS_CONFIG[status] : null;

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(280)} style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Status</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Ionicons name="refresh" size={18} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {notFound ? (
          <Animated.View entering={FadeIn.delay(200).duration(350)} style={styles.emptyState}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="document-outline" size={40} color={COLORS.textSecondary} />
            </View>
            <Text style={styles.emptyTitle}>No Application</Text>
            <Text style={styles.emptyDesc}>You haven't submitted a coach application yet.</Text>
          </Animated.View>
        ) : application && cfg ? (
          <>
            <Animated.View style={[styles.statusIconWrap, iconStyle]}>
              <LinearGradient colors={cfg.gradient} style={styles.statusIconBg}>
                <Ionicons name={cfg.icon} size={52} color={cfg.color} />
              </LinearGradient>
            </Animated.View>

            <Animated.View style={[styles.statusContent, contentStyle]}>
              <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
              <Text style={styles.statusDesc}>{cfg.desc}</Text>

              {application.reviewNote && (
                <View style={styles.noteCard}>
                  <View style={styles.noteLabelRow}>
                    <Ionicons name="chatbubble-outline" size={13} color="#f39c12" />
                    <Text style={styles.noteLabel}>Review Note</Text>
                  </View>
                  <Text style={styles.noteText}>{application.reviewNote}</Text>
                </View>
              )}

              <View style={styles.detailsCard}>
                <Text style={styles.detailsTitle}>Application Details</Text>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="fitness-outline" size={14} color={COLORS.primary} />
                  </View>
                  <Text style={styles.detailLabel}>Specialty</Text>
                  <Text style={styles.detailValue}>{application.specialty.join(', ')}</Text>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="time-outline" size={14} color={COLORS.primary} />
                  </View>
                  <Text style={styles.detailLabel}>Experience</Text>
                  <Text style={styles.detailValue}>{application.experience} years</Text>
                </View>
                <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="calendar-outline" size={14} color={COLORS.primary} />
                  </View>
                  <Text style={styles.detailLabel}>Submitted</Text>
                  <Text style={styles.detailValue}>{new Date(application.createdAt).toLocaleDateString()}</Text>
                </View>
              </View>

              <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
                <Ionicons name={cfg.icon} size={14} color={cfg.color} />
                <Text style={[styles.statusPillText, { color: cfg.color }]}>Status: {status}</Text>
              </View>

              {application.status === 'APPROVED' && (
                <TouchableOpacity
                  style={styles.dashboardButton}
                  onPress={handleGoToDashboard}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={['#2ecc71', '#27ae60']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  <Ionicons name="speedometer-outline" size={18} color="#fff" />
                  <Text style={styles.dashboardButtonText}>Go to Coach Dashboard</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const BG = '#0a0a0a';
const SURFACE = '#141414';
const BORDER = 'rgba(255,255,255,0.07)';
const TEXT = '#f0f0f0';
const TEXT_SEC = '#888';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: SURFACE,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: TEXT },
  scrollContent: { padding: 24, alignItems: 'center', flexGrow: 1 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: TEXT },
  emptyDesc: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 20 },

  statusIconWrap: { marginTop: 20, marginBottom: 24 },
  statusIconBg: {
    width: 110,
    height: 110,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContent: { width: '100%', alignItems: 'center', gap: 16 },
  statusLabel: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  statusDesc: { fontSize: 14, color: TEXT_SEC, textAlign: 'center', lineHeight: 21, maxWidth: 300 },

  noteCard: {
    width: '100%',
    backgroundColor: 'rgba(243,156,18,0.07)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(243,156,18,0.15)',
  },
  noteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  noteLabel: { fontSize: 12, fontWeight: '700', color: '#f39c12', textTransform: 'uppercase', letterSpacing: 0.5 },
  noteText: { fontSize: 14, color: TEXT, lineHeight: 20 },

  detailsCard: {
    width: '100%',
    backgroundColor: SURFACE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  detailsTitle: { fontSize: 11, fontWeight: '700', color: TEXT_SEC, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  detailIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(231,76,60,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  detailLabel: { fontSize: 13, color: TEXT_SEC, flex: 1, fontWeight: '500' },
  detailValue: { fontSize: 13, color: TEXT, fontWeight: '600', maxWidth: 180, textAlign: 'right' },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusPillText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.3 },

  dashboardButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    overflow: 'hidden',
  },
  dashboardButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
