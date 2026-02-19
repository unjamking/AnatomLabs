import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import api from '../../services/api';
import {
  AnimatedListItem,
  BlurHeader,
  GlassCard,
  FadeIn,
  useHaptics,
  COLORS,
} from '../../components/animations';

const NOTIFICATION_ICONS: Record<string, { icon: string; color: string }> = {
  FOLLOW: { icon: 'person-add', color: '#3498db' },
  BOOKING_REQUEST: { icon: 'calendar', color: '#f39c12' },
  BOOKING_CONFIRMED: { icon: 'checkmark-circle', color: '#2ecc71' },
  BOOKING_CANCELLED: { icon: 'close-circle', color: '#e74c3c' },
  SYSTEM: { icon: 'information-circle', color: '#9b59b6' },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const { trigger } = useHaptics();
  const scrollY = useSharedValue(0);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(true);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error('Failed to mark read:', error);
    }
  };

  const handleReadAll = async () => {
    trigger('medium');
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderNotification = ({ item, index }: { item: any; index: number }) => {
    const config = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.SYSTEM;

    return (
      <AnimatedListItem index={index} style={styles.itemWrapper}>
        <TouchableOpacity 
          style={[styles.notificationItem, !item.read && styles.unreadItem]} 
          onPress={() => {
            if (!item.read) handleMarkRead(item.id);
            // Handle navigation based on type
            if (item.type.startsWith('BOOKING')) {
              navigation.navigate('Bookings');
            } else if (item.type === 'FOLLOW') {
              navigation.navigate('CoachMarketplace');
            }
          }}
        >
          <View style={[styles.iconBadge, { backgroundColor: `${config.color}20` }]}>
            <Ionicons name={config.icon as any} size={20} color={config.color} />
          </View>
          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            <Text style={styles.body}>{item.content}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      </AnimatedListItem>
    );
  };

  return (
    <View style={styles.container}>
      <BlurHeader 
        title="Notifications" 
        scrollY={scrollY} 
        rightElement={
          <TouchableOpacity onPress={handleReadAll} style={styles.readAllBtn}>
            <Text style={styles.readAllText}>Mark all read</Text>
          </TouchableOpacity>
        }
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <Animated.FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <FadeIn style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={64} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptySubtitle}>When you get updates, they'll appear here.</Text>
            </FadeIn>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  listContent: { paddingTop: 140, paddingHorizontal: 16, paddingBottom: 100 },
  itemWrapper: { marginBottom: 12 },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  unreadItem: {
    borderColor: `${COLORS.primary}40`,
    backgroundColor: 'rgba(231,76,60,0.05)',
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, gap: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textTertiary },
  body: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
  readAllBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  readAllText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
});
