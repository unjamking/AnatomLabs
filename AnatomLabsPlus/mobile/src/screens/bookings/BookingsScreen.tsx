import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Booking } from '../../types';
import api from '../../services/api';
import { COLORS } from '../../components/animations';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f39c12',
  CONFIRMED: '#2ecc71',
  CANCELLED: '#e74c3c',
  COMPLETED: '#3498db',
};

export default function BookingsScreen() {
  const navigation = useNavigation<any>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBookings = useCallback(async () => {
    try {
      const data = await api.getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadBookings(); }, [loadBookings]);

  const handleCancel = (booking: Booking) => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Booking', style: 'destructive', onPress: async () => {
          try {
            await api.cancelBooking(booking.id);
            loadBookings();
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.coachName}>{item.coach?.name || 'Coach'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || COLORS.textSecondary }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="calendar-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.infoText}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
        <Text style={styles.infoText}>{item.timeSlot}</Text>
      </View>
      {item.goal && (
        <View style={styles.infoRow}>
          <Ionicons name="flag-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>{item.goal}</Text>
        </View>
      )}
      {item.price != null && (
        <View style={styles.infoRow}>
          <Ionicons name="pricetag-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.infoText}>${item.price}</Text>
        </View>
      )}
      {(item.status === 'PENDING' || item.status === 'CONFIRMED') && (
        <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(item)}>
          <Text style={styles.cancelText}>Cancel Booking</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      {bookings.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No bookings yet</Text>
          <Text style={styles.emptySubtext}>Book a session with a coach to get started</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
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
  list: { padding: 16 },
  card: {
    backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  coachName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  infoText: { fontSize: 14, color: COLORS.text },
  cancelButton: {
    marginTop: 12, borderWidth: 1, borderColor: '#e74c3c', borderRadius: 8,
    padding: 10, alignItems: 'center',
  },
  cancelText: { color: '#e74c3c', fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 16, color: COLORS.textSecondary, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: COLORS.textTertiary, marginTop: 4 },
});
