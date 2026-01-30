import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  AnimatedCard,
  AnimatedButton,
  AnimatedListItem,
  FadeIn,
  SlideIn,
  BlurHeader,
  GlassCard,
  Skeleton,
  useHaptics,
  COLORS,
  SHADOWS,
} from '../../components/animations';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    bmr: 0,
    tdee: 0,
    workoutsThisWeek: 0,
    totalWorkouts: 0,
  });

  const scrollY = useSharedValue(0);
  const { trigger } = useHaptics();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const nutrition = await api.getNutritionPlan();
      setStats(prev => ({
        ...prev,
        bmr: nutrition.bmr,
        tdee: nutrition.tdee,
      }));
    } catch (error) {
      console.log('Stats load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    trigger('light');
    await loadStats();
    setIsRefreshing(false);
    trigger('success');
  };

  const handleLogout = async () => {
    trigger('medium');
    await logout();
  };

  const headerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, 100],
      [1, 0],
      'clamp'
    );
    const translateY = interpolate(
      scrollY.value,
      [0, 100],
      [0, -20],
      'clamp'
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const quickActions = [
    {
      title: 'Explore Anatomy',
      subtitle: 'Learn about muscles and body parts',
      icon: 'body-outline' as const,
      screen: 'BodyExplorer',
      color: '#3498db',
    },
    {
      title: 'Generate Workout',
      subtitle: 'Science-based training plan',
      icon: 'barbell-outline' as const,
      screen: 'Workouts',
      color: '#e74c3c',
    },
    {
      title: 'View Nutrition Plan',
      subtitle: 'BMR, TDEE & macro targets',
      icon: 'nutrition-outline' as const,
      screen: 'Nutrition',
      color: '#2ecc71',
    },
    {
      title: 'Check Reports',
      subtitle: 'Performance & injury prevention',
      icon: 'analytics-outline' as const,
      screen: 'Reports',
      color: '#9b59b6',
    },
  ];

  return (
    <View style={styles.container}>
      <BlurHeader
        title="Home"
        scrollY={scrollY}
        rightElement={
          <AnimatedButton
            variant="ghost"
            size="small"
            onPress={handleLogout}
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
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.header, headerStyle]}>
          <SlideIn direction="left" delay={0}>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.name}>{user?.name || 'User'}</Text>
          </SlideIn>
        </Animated.View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {isLoading ? (
            <>
              <Skeleton width="48%" height={120} borderRadius={16} />
              <Skeleton width="48%" height={120} borderRadius={16} />
            </>
          ) : (
            <>
              <GlassCard delay={100} style={styles.statCard} borderGlow glowColor="#e74c3c">
                <Text style={styles.statValue}>{stats.bmr}</Text>
                <Text style={styles.statLabel}>BMR (kcal/day)</Text>
                <Text style={styles.statSubtext}>Basal Metabolic Rate</Text>
              </GlassCard>
              <GlassCard delay={200} style={styles.statCard} borderGlow glowColor="#3498db">
                <Text style={[styles.statValue, { color: '#3498db' }]}>{stats.tdee}</Text>
                <Text style={styles.statLabel}>TDEE (kcal/day)</Text>
                <Text style={styles.statSubtext}>Total Daily Energy</Text>
              </GlassCard>
            </>
          )}
        </View>

        {/* User Profile */}
        <View style={styles.userInfo}>
          <FadeIn delay={300}>
            <Text style={styles.sectionTitle}>Your Profile</Text>
          </FadeIn>
          <View style={styles.infoGrid}>
            {isLoading ? (
              <>
                <Skeleton width="48%" height={80} borderRadius={12} />
                <Skeleton width="48%" height={80} borderRadius={12} />
                <Skeleton width="48%" height={80} borderRadius={12} />
                <Skeleton width="48%" height={80} borderRadius={12} />
              </>
            ) : (
              [
                { label: 'Goal', value: user?.goal?.replace('_', ' ') || 'Not set' },
                { label: 'Level', value: user?.experience_level || 'Beginner' },
                { label: 'Weight', value: `${user?.weight || 0} kg` },
                { label: 'Height', value: `${user?.height || 0} cm` },
              ].map((item, index) => (
                <AnimatedCard
                  key={item.label}
                  delay={350 + index * 50}
                  pressable={false}
                  style={styles.infoItem}
                >
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  <Text style={styles.infoValue}>{item.value}</Text>
                </AnimatedCard>
              ))
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <FadeIn delay={500}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </FadeIn>
          {quickActions.map((action, index) => (
            <AnimatedListItem key={action.screen} index={index} enterFrom="right">
              <AnimatedCard
                onPress={() => {
                  trigger('light');
                  navigation.navigate(action.screen);
                }}
                style={styles.actionButton}
                variant="elevated"
              >
                <View style={styles.actionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: `${action.color}20` }]}>
                    <Ionicons name={action.icon} size={24} color={action.color} />
                  </View>
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionButtonText}>{action.title}</Text>
                    <Text style={styles.actionButtonSubtext}>{action.subtitle}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </View>
              </AnimatedCard>
            </AnimatedListItem>
          ))}
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
  header: {
    padding: 20,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  userInfo: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  quickActions: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    marginBottom: 12,
    padding: 0,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionButtonSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
