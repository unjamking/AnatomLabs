import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Conversation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { COLORS } from '../../components/animations';

const BG = '#0a0a0a';
const CARD = '#1a1a1a';
const BORDER = '#2a2a2a';
const TEXT = '#ffffff';
const TEXT2 = 'rgba(255,255,255,0.5)';
const TEXT3 = 'rgba(255,255,255,0.3)';
const ACCENT = '#e74c3c';

function getInitials(name: string): string {
  if (!name) return '??';
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConversationRow({ item, index, user, onPress }: any) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const other = item.participants.find((p: any) => p.id !== user?.id) || item.participants[0];
  const hasUnread = item.unreadCount > 0;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).duration(350).springify()}>
      <Animated.View style={anim}>
        <TouchableOpacity
          activeOpacity={1}
          onPressIn={() => { scale.value = withSpring(0.97, { damping: 15, stiffness: 300 }); }}
          onPressOut={() => { scale.value = withSpring(1, { damping: 12, stiffness: 300 }); }}
          onPress={onPress}
          style={s.row}
        >
          <View style={s.avatarWrap}>
            {other.avatar ? (
              <Image source={{ uri: other.avatar }} style={s.avatar} />
            ) : (
              <View style={[s.avatar, s.avatarFallback]}>
                <Text style={s.avatarText}>{getInitials(other.name)}</Text>
              </View>
            )}
            {hasUnread && <View style={s.activeDot} />}
          </View>

          <View style={s.info}>
            <View style={s.topRow}>
              <Text style={[s.name, hasUnread && s.nameBold]} numberOfLines={1}>
                {other.name}
              </Text>
              <Text style={[s.time, hasUnread && s.timeAccent]}>
                {item.lastMessage ? timeAgo(item.lastMessage.createdAt) : ''}
              </Text>
            </View>
            <View style={s.bottomRow}>
              <Text style={[s.preview, hasUnread && s.previewBold]} numberOfLines={1}>
                {item.lastMessage?.senderId === user?.id ? 'You: ' : ''}
                {item.lastMessage?.content || 'No messages yet'}
              </Text>
              {hasUnread && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

export default function ConversationsListScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch {}
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 8000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <SafeAreaView style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Messages</Text>
          {totalUnread > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 44 }} />
      </SafeAreaView>

      {conversations.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.empty}>
          <View style={s.emptyIcon}>
            <Ionicons name="chatbubbles-outline" size={38} color={ACCENT} />
          </View>
          <Text style={s.emptyTitle}>No messages yet</Text>
          <Text style={s.emptySub}>Your client conversations will appear here</Text>
        </Animated.View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={({ item, index }) => (
            <ConversationRow
              item={item}
              index={index}
              user={user}
              onPress={() => {
                const other = item.participants.find((p: any) => p.id !== user?.id) || item.participants[0];
                navigation.navigate('Conversation', {
                  conversationId: item.id,
                  recipientName: other.name,
                  recipientAvatar: other.avatar,
                });
              }}
            />
          )}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={ACCENT}
            />
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: TEXT, letterSpacing: -0.5 },
  headerBadge: { backgroundColor: ACCENT, height: 20, minWidth: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  headerBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  list: { paddingBottom: 40, paddingTop: 4 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: BORDER, marginLeft: 90 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 14 },

  avatarWrap: { position: 'relative' },
  avatar: { width: 58, height: 58, borderRadius: 29 },
  avatarFallback: { backgroundColor: CARD, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  avatarText: { fontSize: 20, fontWeight: '800', color: TEXT },
  activeDot: { position: 'absolute', bottom: 1, right: 1, width: 15, height: 15, borderRadius: 8, backgroundColor: ACCENT, borderWidth: 2.5, borderColor: BG },

  info: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 15, fontWeight: '500', color: TEXT2, flex: 1, marginRight: 8 },
  nameBold: { fontWeight: '800', color: TEXT },
  time: { fontSize: 12, color: TEXT3 },
  timeAccent: { color: ACCENT, fontWeight: '600' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  preview: { fontSize: 14, color: TEXT3, flex: 1, marginRight: 8 },
  previewBold: { color: TEXT2, fontWeight: '600' },
  badge: { backgroundColor: ACCENT, height: 20, minWidth: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 12 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(231,76,60,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TEXT },
  emptySub: { fontSize: 14, color: TEXT2, textAlign: 'center', lineHeight: 20 },
});
