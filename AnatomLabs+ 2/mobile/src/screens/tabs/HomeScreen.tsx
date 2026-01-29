import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function HomeScreen({ navigation }: any) {
  const { user, logout } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({
    bmr: 0,
    tdee: 0,
    workoutsThisWeek: 0,
    totalWorkouts: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const nutrition = await api.getNutritionPlan();
      setStats(prev => ({
        ...prev,
        bmr: nutrition.bmr,
        tdee: nutrition.tdee,
      }));
    } catch (error) {
      console.log('Stats load error:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadStats();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{user?.name || 'User'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.bmr}</Text>
          <Text style={styles.statLabel}>BMR (kcal/day)</Text>
          <Text style={styles.statSubtext}>Basal Metabolic Rate</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.tdee}</Text>
          <Text style={styles.statLabel}>TDEE (kcal/day)</Text>
          <Text style={styles.statSubtext}>Total Daily Energy</Text>
        </View>
      </View>

      <View style={styles.userInfo}>
        <Text style={styles.sectionTitle}>Your Profile</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Goal</Text>
            <Text style={styles.infoValue}>
              {user?.goal?.replace('_', ' ') || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Level</Text>
            <Text style={styles.infoValue}>
              {user?.experience_level || 'Beginner'}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Weight</Text>
            <Text style={styles.infoValue}>{user?.weight || 0} kg</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Height</Text>
            <Text style={styles.infoValue}>{user?.height || 0} cm</Text>
          </View>
        </View>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('BodyExplorer')}
        >
          <Text style={styles.actionButtonText}>Explore Anatomy</Text>
          <Text style={styles.actionButtonSubtext}>
            Learn about muscles and body parts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Workouts')}
        >
          <Text style={styles.actionButtonText}>Generate Workout</Text>
          <Text style={styles.actionButtonSubtext}>
            Science-based training plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Nutrition')}
        >
          <Text style={styles.actionButtonText}>View Nutrition Plan</Text>
          <Text style={styles.actionButtonSubtext}>
            BMR, TDEE & macro targets
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('Reports')}
        >
          <Text style={styles.actionButtonText}>Check Reports</Text>
          <Text style={styles.actionButtonSubtext}>
            Performance & injury prevention
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 16,
    color: '#888',
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 10,
  },
  logoutText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  statSubtext: {
    fontSize: 11,
    color: '#666',
  },
  userInfo: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
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
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  quickActions: {
    padding: 20,
    paddingBottom: 40,
  },
  actionButton: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  actionButtonSubtext: {
    fontSize: 14,
    color: '#888',
  },
});
