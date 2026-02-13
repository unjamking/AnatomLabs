import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../services/api';
import { Booking } from '../../types';
import { COLORS } from '../../components/animations';

type Segment = 'profile' | 'posts' | 'stories' | 'bookings';

export default function CoachDashboardScreen() {
  const navigation = useNavigation<any>();
  const [segment, setSegment] = useState<Segment>('profile');
  const [profile, setProfile] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [editBio, setEditBio] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editAvailability, setEditAvailability] = useState('');
  const [saving, setSaving] = useState(false);

  const [newPostCaption, setNewPostCaption] = useState('');
  const [creatingPost, setCreatingPost] = useState(false);

  const [storyTitle, setStoryTitle] = useState('');
  const [storyDesc, setStoryDesc] = useState('');
  const [storyType, setStoryType] = useState('tip');
  const [creatingStory, setCreatingStory] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [p, b] = await Promise.all([
        api.getCoachDashboardProfile(),
        api.getCoachBookings(),
      ]);
      setProfile(p);
      setBookings(b);
      setEditBio(p.bio || '');
      setEditPrice(p.price?.toString() || '0');
      setEditAvailability((p.availability || []).join(', '));
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.updateCoachProfile({
        bio: editBio,
        price: parseFloat(editPrice) || 0,
        availability: editAvailability.split(',').map(s => s.trim()).filter(Boolean),
      });
      Alert.alert('Saved', 'Profile updated');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostCaption.trim()) return;
    setCreatingPost(true);
    try {
      await api.createCoachPost({ caption: newPostCaption.trim() });
      setNewPostCaption('');
      Alert.alert('Posted', 'Your post is live');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create post');
    } finally {
      setCreatingPost(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert('Delete Post', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.deleteCoachPost(postId);
            loadData();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to delete');
          }
        }
      },
    ]);
  };

  const handleCreateStory = async () => {
    if (!storyTitle.trim() || !storyDesc.trim()) return;
    setCreatingStory(true);
    try {
      await api.createCoachStory({ type: storyType, title: storyTitle.trim(), description: storyDesc.trim() });
      setStoryTitle('');
      setStoryDesc('');
      Alert.alert('Story Created', 'Your story will be visible for 24 hours');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to create story');
    } finally {
      setCreatingStory(false);
    }
  };

  const handleBookingAction = async (bookingId: string, status: string) => {
    try {
      await api.updateBookingStatus(bookingId, status);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to update booking');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Coach Dashboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.segments}>
        {(['profile', 'posts', 'stories', 'bookings'] as Segment[]).map(s => (
          <TouchableOpacity key={s} style={[styles.segmentTab, segment === s && styles.segmentTabActive]} onPress={() => setSegment(s)}>
            <Text style={[styles.segmentText, segment === s && styles.segmentTextActive]}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {segment === 'profile' && (
          <>
            <Text style={styles.label}>Bio</Text>
            <TextInput style={[styles.input, { minHeight: 80 }]} value={editBio} onChangeText={setEditBio} multiline textAlignVertical="top" />
            <Text style={styles.label}>Price per session ($)</Text>
            <TextInput style={styles.input} value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" />
            <Text style={styles.label}>Availability (comma separated)</Text>
            <TextInput style={styles.input} value={editAvailability} onChangeText={setEditAvailability} />
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
            </TouchableOpacity>
          </>
        )}

        {segment === 'posts' && (
          <>
            <Text style={styles.label}>New Post</Text>
            <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Write a caption..." placeholderTextColor={COLORS.textTertiary} value={newPostCaption} onChangeText={setNewPostCaption} multiline textAlignVertical="top" />
            <TouchableOpacity style={styles.saveButton} onPress={handleCreatePost} disabled={creatingPost || !newPostCaption.trim()}>
              <Text style={styles.saveButtonText}>{creatingPost ? 'Posting...' : 'Create Post'}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Your Posts ({profile?.posts?.length || 0})</Text>
            {(profile?.posts || []).map((post: any) => (
              <View key={post.id} style={styles.card}>
                <Text style={styles.cardText}>{post.caption}</Text>
                <View style={styles.cardRow}>
                  <Text style={styles.cardMeta}>{post.likes} likes</Text>
                  <TouchableOpacity onPress={() => handleDeletePost(post.id)}>
                    <Ionicons name="trash-outline" size={18} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {segment === 'stories' && (
          <>
            <Text style={styles.label}>New Story</Text>
            <View style={styles.storyTypes}>
              {['tip', 'workout', 'nutrition', 'motivation', 'transformation'].map(t => (
                <TouchableOpacity key={t} style={[styles.storyTypeChip, storyType === t && styles.storyTypeChipActive]} onPress={() => setStoryType(t)}>
                  <Text style={[styles.storyTypeText, storyType === t && styles.storyTypeTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder="Title" placeholderTextColor={COLORS.textTertiary} value={storyTitle} onChangeText={setStoryTitle} />
            <TextInput style={[styles.input, { minHeight: 60 }]} placeholder="Description" placeholderTextColor={COLORS.textTertiary} value={storyDesc} onChangeText={setStoryDesc} multiline textAlignVertical="top" />
            <TouchableOpacity style={styles.saveButton} onPress={handleCreateStory} disabled={creatingStory || !storyTitle.trim()}>
              <Text style={styles.saveButtonText}>{creatingStory ? 'Creating...' : 'Create Story'}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Active Stories ({profile?.stories?.length || 0})</Text>
            {(profile?.stories || []).map((story: any) => (
              <View key={story.id} style={styles.card}>
                <Text style={styles.cardTitle}>{story.title}</Text>
                <Text style={styles.cardText}>{story.description}</Text>
                <Text style={styles.cardMeta}>{story.type}</Text>
              </View>
            ))}
          </>
        )}

        {segment === 'bookings' && (
          <>
            <Text style={styles.sectionTitle}>Bookings ({bookings.length})</Text>
            {bookings.length === 0 && <Text style={styles.emptyText}>No bookings yet</Text>}
            {bookings.map(booking => (
              <View key={booking.id} style={styles.card}>
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>{booking.client?.name || 'Client'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: booking.status === 'CONFIRMED' ? '#2ecc71' : booking.status === 'PENDING' ? '#f39c12' : booking.status === 'CANCELLED' ? '#e74c3c' : '#3498db' }]}>
                    <Text style={styles.statusText}>{booking.status}</Text>
                  </View>
                </View>
                <Text style={styles.cardText}>{booking.timeSlot} - {new Date(booking.date).toLocaleDateString()}</Text>
                {booking.goal && <Text style={styles.cardMeta}>Goal: {booking.goal}</Text>}
                {booking.status === 'PENDING' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.confirmButton} onPress={() => handleBookingAction(booking.id, 'CONFIRMED')}>
                      <Text style={styles.confirmText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={() => handleBookingAction(booking.id, 'CANCELLED')}>
                      <Text style={styles.cancelText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  segments: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  segmentTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  segmentTabActive: { borderBottomColor: COLORS.primary },
  segmentText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  segmentTextActive: { color: COLORS.primary },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.cardBackground, borderRadius: 10, padding: 12, fontSize: 14,
    color: COLORS.text, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8,
  },
  saveButton: { backgroundColor: COLORS.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 24, marginBottom: 12 },
  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 4 },
  cardText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  cardMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  confirmButton: { flex: 1, backgroundColor: '#2ecc71', borderRadius: 8, padding: 10, alignItems: 'center' },
  confirmText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  cancelButton: { flex: 1, backgroundColor: COLORS.cardBackground, borderRadius: 8, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e74c3c' },
  cancelText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 },
  storyTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  storyTypeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border },
  storyTypeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  storyTypeText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  storyTypeTextActive: { color: '#fff' },
});
