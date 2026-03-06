import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ChatMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

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

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateHeader(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function BubbleIn({ children }: { children: React.ReactNode }) {
  const y = useSharedValue(10);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    y.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.exp) });
    opacity.value = withTiming(1, { duration: 180 });
    scale.value = withSpring(1, { damping: 16, stiffness: 280 });
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}

export default function ConversationScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { conversationId, recipientName, recipientAvatar } = route.params;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const sendScale = useSharedValue(1);

  const load = useCallback(async () => {
    try {
      const data = await api.getMessages(conversationId);
      setMessages(data);
    } catch {}
    finally { setLoading(false); }
  }, [conversationId]);

  useEffect(() => {
    load();
    api.markConversationRead(conversationId).catch(() => {});
    pollRef.current = setInterval(load, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load, conversationId]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    sendScale.value = withSpring(0.88, { damping: 10, stiffness: 400 }, () => {
      sendScale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    try {
      const msg = await api.sendMessage(conversationId, content);
      setMessages(prev => [...prev, msg]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
    } catch {
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const sendBtnStyle = useAnimatedStyle(() => ({ transform: [{ scale: sendScale.value }] }));

  const grouped = messages.reduce<{ type: 'date' | 'msg'; value: ChatMessage | string; key: string }[]>((acc, msg, i) => {
    const prev = messages[i - 1];
    const currDate = new Date(msg.createdAt).toDateString();
    const prevDate = prev ? new Date(prev.createdAt).toDateString() : null;
    if (currDate !== prevDate) {
      acc.push({ type: 'date', value: msg.createdAt, key: `date-${msg.id}` });
    }
    acc.push({ type: 'msg', value: msg, key: msg.id });
    return acc;
  }, []);

  const renderItem = ({ item, index }: { item: typeof grouped[0]; index: number }) => {
    if (item.type === 'date') {
      return (
        <Animated.View entering={FadeIn.duration(300)} style={s.dateHeader}>
          <Text style={s.dateHeaderText}>{formatDateHeader(item.value as string)}</Text>
        </Animated.View>
      );
    }

    const msg = item.value as ChatMessage;
    const isMine = msg.senderId === user?.id;
    const allItems = grouped.filter(g => g.type === 'msg');
    const msgIndex = allItems.findIndex(g => (g.value as ChatMessage).id === msg.id);
    const prevMsg = msgIndex > 0 ? (allItems[msgIndex - 1].value as ChatMessage) : null;
    const nextMsg = msgIndex < allItems.length - 1 ? (allItems[msgIndex + 1].value as ChatMessage) : null;
    const isFirst = !prevMsg || prevMsg.senderId !== msg.senderId;
    const isLast = !nextMsg || nextMsg.senderId !== msg.senderId;
    const isNewest = index === grouped.length - 1;

    const bubble = (
      <View style={[s.msgRow, isMine ? s.myRow : s.theirRow]}>
        {!isMine && (
          <View style={s.avatarCol}>
            {isLast && (
              recipientAvatar ? (
                <Image source={{ uri: recipientAvatar }} style={s.bubbleAvatar} />
              ) : (
                <View style={[s.bubbleAvatar, s.bubbleAvatarFallback]}>
                  <Text style={s.bubbleAvatarText}>{getInitials(recipientName)}</Text>
                </View>
              )
            )}
          </View>
        )}
        <View style={[s.bubbleCol, isMine ? s.myBubbleCol : s.theirBubbleCol]}>
          <View style={[
            s.bubble,
            isMine ? s.myBubble : s.theirBubble,
            isMine && isFirst && s.myBubbleFirst,
            isMine && isLast && s.myBubbleLast,
            !isMine && isFirst && s.theirBubbleFirst,
            !isMine && isLast && s.theirBubbleLast,
          ]}>
            <Text style={[s.bubbleText, isMine && s.myBubbleText]}>{msg.content}</Text>
          </View>
          {isLast && (
            <Text style={[s.msgTime, isMine ? s.myTime : s.theirTime]}>
              {isMine ? `${formatTime(msg.createdAt)} · Sent` : formatTime(msg.createdAt)}
            </Text>
          )}
        </View>
      </View>
    );

    return isNewest ? <BubbleIn key={msg.id}>{bubble}</BubbleIn> : bubble;
  };

  if (loading && messages.length === 0) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={s.header} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </TouchableOpacity>
        <TouchableOpacity style={s.headerInfo} activeOpacity={0.8}>
          {recipientAvatar ? (
            <Image source={{ uri: recipientAvatar }} style={s.headerAvatar} />
          ) : (
            <View style={[s.headerAvatar, s.headerAvatarFallback]}>
              <Text style={s.headerAvatarText}>{getInitials(recipientName)}</Text>
            </View>
          )}
          <View>
            <Text style={s.headerName}>{recipientName}</Text>
            <Text style={s.headerSub}>Active now</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={s.headerBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={TEXT2} />
        </TouchableOpacity>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={grouped}
          keyExtractor={item => item.key}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        />

        <SafeAreaView style={s.inputArea} edges={['bottom']}>
          <View style={[s.inputContainer, inputFocused && s.inputContainerFocused]}>
            <TextInput
              style={s.input}
              placeholder="Message..."
              placeholderTextColor={TEXT3}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={2000}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              onSubmitEditing={handleSend}
            />
            <Animated.View style={sendBtnStyle}>
              <TouchableOpacity
                style={[s.sendBtn, (!text.trim() || sending) && s.sendBtnOff]}
                onPress={handleSend}
                disabled={!text.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  centered: { flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  headerBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: { width: 38, height: 38, borderRadius: 19 },
  headerAvatarFallback: { backgroundColor: CARD, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  headerAvatarText: { fontSize: 14, fontWeight: '700', color: TEXT },
  headerName: { fontSize: 15, fontWeight: '700', color: TEXT },
  headerSub: { fontSize: 11, color: '#2ecc71', fontWeight: '600', marginTop: 1 },

  list: { paddingHorizontal: 12, paddingTop: 16, paddingBottom: 12 },

  dateHeader: { alignItems: 'center', marginVertical: 16 },
  dateHeaderText: { fontSize: 12, color: TEXT3, fontWeight: '600', letterSpacing: 0.3 },

  msgRow: { flexDirection: 'row', marginBottom: 2, alignItems: 'flex-end', gap: 6 },
  myRow: { justifyContent: 'flex-end' },
  theirRow: { justifyContent: 'flex-start' },

  avatarCol: { width: 28, alignItems: 'flex-end' },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14 },
  bubbleAvatarFallback: { backgroundColor: CARD, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  bubbleAvatarText: { fontSize: 10, fontWeight: '700', color: TEXT },

  bubbleCol: { maxWidth: '72%' },
  myBubbleCol: { alignItems: 'flex-end' },
  theirBubbleCol: { alignItems: 'flex-start' },

  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  myBubble: { backgroundColor: ACCENT },
  theirBubble: { backgroundColor: CARD, borderWidth: 1, borderColor: BORDER },
  myBubbleFirst: { borderTopRightRadius: 20 },
  myBubbleLast: { borderBottomRightRadius: 6 },
  theirBubbleFirst: { borderTopLeftRadius: 20 },
  theirBubbleLast: { borderBottomLeftRadius: 6 },

  bubbleText: { fontSize: 15, lineHeight: 21, color: TEXT2 },
  myBubbleText: { color: '#fff' },

  msgTime: { fontSize: 10, marginTop: 4, marginHorizontal: 4 },
  myTime: { color: TEXT3, textAlign: 'right' },
  theirTime: { color: TEXT3 },

  inputArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: CARD,
    borderRadius: 26,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
  },
  inputContainerFocused: { borderColor: 'rgba(231,76,60,0.4)' },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 120,
    paddingVertical: 8,
    fontSize: 15,
    color: TEXT,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ACCENT,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendBtnOff: { backgroundColor: '#333', opacity: 0.5 },
});
