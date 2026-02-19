import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import api from '../../services/api';
import {
  AnimatedListItem,
  BlurHeader,
  GlassCard,
  FadeIn,
  useHaptics,
  COLORS,
} from '../../components/animations';

const INITIALS_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];

function getInitials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

export default function FollowerListScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { type = 'followers' } = route.params || {};
  const { trigger } = useHaptics();
  const scrollY = useSharedValue(0);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const data = type === 'followers' 
        ? await api.getCoachFollowers()
        : await api.getMyFollowing();
      setUsers(data);
    } catch (error) {
      console.error(`Failed to load ${type}:`, error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const renderUser = ({ item, index }: { item: any; index: number }) => {
    const avatarColor = INITIALS_COLORS[index % INITIALS_COLORS.length];

    return (
      <AnimatedListItem index={index} style={styles.itemWrapper}>
        <TouchableOpacity 
          style={styles.userItem}
          onPress={() => {
            if (type === 'following') {
              // If it's a coach we're following, we can navigate to their profile
              // But marketplace uses a modal for now. 
              // We could navigate to Marketplace and open the modal, or add a dedicated profile screen.
              navigation.navigate('Coaches', { openCoachId: item.id });
            }
          }}
        >
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: `${avatarColor}20` }]}>
              <Text style={[styles.avatarText, { color: avatarColor }]}>{getInitials(item.name)}</Text>
            </View>
          )}
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            {item.specialty && (
              <Text style={styles.userSubtitle}>{item.specialty.join(', ')}</Text>
            )}
            {item.followedAt && (
              <Text style={styles.userDate}>Since {new Date(item.followedAt).toLocaleDateString()}</Text>
            )}
          </View>
          {type === 'following' && (
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          )}
        </TouchableOpacity>
      </AnimatedListItem>
    );
  };

  return (
    <View style={styles.container}>
      <BlurHeader 
        title={type === 'followers' ? 'My Followers' : 'Following'} 
        scrollY={scrollY} 
        showBack
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <Animated.FlatList
          data={users}
          renderItem={renderUser}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <FadeIn style={styles.emptyContainer}>
              <Ionicons 
                name={type === 'followers' ? "people-outline" : "person-add-outline"} 
                size={64} 
                color={COLORS.textTertiary} 
              />
              <Text style={styles.emptyTitle}>
                {type === 'followers' ? 'No followers yet' : 'Not following anyone'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {type === 'followers' 
                  ? 'Keep posting content to grow your community!' 
                  : 'Discover expert coaches in the marketplace.'}
              </Text>
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
  itemWrapper: { marginBottom: 8 },
  userItem: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  userSubtitle: { fontSize: 13, color: COLORS.primary },
  userDate: { fontSize: 11, color: COLORS.textTertiary },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
});
