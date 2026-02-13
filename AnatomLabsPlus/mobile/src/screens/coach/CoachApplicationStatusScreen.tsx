import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CoachApplication } from '../../types';
import api from '../../services/api';
import { COLORS } from '../../components/animations';

export default function CoachApplicationStatusScreen() {
  const navigation = useNavigation<any>();
  const [application, setApplication] = useState<CoachApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getMyApplication();
        setApplication(data);
      } catch (error: any) {
        if (error?.statusCode === 404) {
          setNotFound(true);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const statusConfig: Record<string, { icon: string; color: string; label: string; desc: string }> = {
    PENDING: { icon: 'time-outline', color: '#f39c12', label: 'Pending Review', desc: 'Your application is being reviewed by our team.' },
    APPROVED: { icon: 'checkmark-circle-outline', color: '#2ecc71', label: 'Approved', desc: 'Congratulations! You are now a coach.' },
    REJECTED: { icon: 'close-circle-outline', color: '#e74c3c', label: 'Rejected', desc: 'Unfortunately your application was not approved.' },
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
        <Text style={styles.headerTitle}>Application Status</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {notFound ? (
          <>
            <Ionicons name="document-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.statusLabel}>No Application</Text>
            <Text style={styles.statusDesc}>You haven't submitted a coach application yet.</Text>
          </>
        ) : application ? (
          <>
            <Ionicons
              name={statusConfig[application.status]?.icon as any || 'help-outline'}
              size={64}
              color={statusConfig[application.status]?.color || COLORS.textSecondary}
            />
            <Text style={[styles.statusLabel, { color: statusConfig[application.status]?.color }]}>
              {statusConfig[application.status]?.label}
            </Text>
            <Text style={styles.statusDesc}>
              {statusConfig[application.status]?.desc}
            </Text>

            {application.reviewNote && (
              <View style={styles.noteCard}>
                <Text style={styles.noteLabel}>Review Note:</Text>
                <Text style={styles.noteText}>{application.reviewNote}</Text>
              </View>
            )}

            <View style={styles.detailsCard}>
              <Text style={styles.detailRow}>Specialty: {application.specialty.join(', ')}</Text>
              <Text style={styles.detailRow}>Experience: {application.experience} years</Text>
              <Text style={styles.detailRow}>Submitted: {new Date(application.createdAt).toLocaleDateString()}</Text>
            </View>

            {application.status === 'APPROVED' && (
              <TouchableOpacity style={styles.dashboardButton} onPress={() => navigation.navigate('CoachDashboard')}>
                <Ionicons name="speedometer-outline" size={20} color="#fff" />
                <Text style={styles.dashboardButtonText}>Go to Coach Dashboard</Text>
              </TouchableOpacity>
            )}
          </>
        ) : null}
      </View>
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
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  statusLabel: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 16, marginBottom: 8 },
  statusDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  noteCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 16, marginTop: 24, width: '100%',
    borderWidth: 1, borderColor: COLORS.border,
  },
  noteLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 4 },
  noteText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },
  detailsCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 16, marginTop: 16, width: '100%',
    borderWidth: 1, borderColor: COLORS.border,
  },
  detailRow: { fontSize: 14, color: COLORS.text, marginBottom: 6 },
  dashboardButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, marginTop: 24,
  },
  dashboardButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
