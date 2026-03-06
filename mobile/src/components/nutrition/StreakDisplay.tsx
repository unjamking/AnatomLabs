import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserStreak } from '../../types';

interface StreakDisplayProps {
  streak: UserStreak | null;
}

export default function StreakDisplay({ streak }: StreakDisplayProps) {
  if (!streak) {
    return null;
  }

  const getBadge = (days: number) => {
    if (days >= 100) return { emoji: '\u{1F525}', label: 'On Fire!' };
    if (days >= 30) return { emoji: '\u{1F31F}', label: 'Dedicated' };
    if (days >= 7) return { emoji: '\u{2B50}', label: 'Week Warrior' };
    if (days >= 3) return { emoji: '\u{1F4AA}', label: 'Getting Started' };
    return null;
  };

  const badge = getBadge(streak.currentStreak);

  return (
    <View style={styles.container}>
      <View style={styles.mainStreak}>
        <Text style={styles.streakEmoji}>{'\u{1F525}'}</Text>
        <View style={styles.streakInfo}>
          <Text style={styles.streakNumber}>{streak.currentStreak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
            <Text style={styles.badgeLabel}>{badge.label}</Text>
          </View>
        )}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak.longestStreak}</Text>
          <Text style={styles.statLabel}>Best Streak</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{streak.totalDaysLogged}</Text>
          <Text style={styles.statLabel}>Total Days</Text>
        </View>
      </View>

      {streak.currentStreak > 0 && (
        <View style={styles.motivationContainer}>
          <Text style={styles.motivationText}>
            {getMotivationMessage(streak.currentStreak)}
          </Text>
        </View>
      )}
    </View>
  );
}

function getMotivationMessage(days: number): string {
  if (days >= 100) return 'Incredible dedication! You\'re a nutrition master!';
  if (days >= 30) return 'A full month! Your consistency is inspiring!';
  if (days >= 14) return 'Two weeks strong! Keep building that habit!';
  if (days >= 7) return 'A full week! You\'re building great habits!';
  if (days >= 3) return 'Nice momentum! Keep it going!';
  if (days === 2) return 'Day 2! You\'re on your way!';
  if (days === 1) return 'Great start! Come back tomorrow!';
  return 'Start your streak today!';
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  mainStreak: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  streakInfo: {
    flex: 1,
  },
  streakNumber: {
    color: '#e74c3c',
    fontSize: 36,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  streakLabel: {
    color: '#888',
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    minWidth: 80,
  },
  badgeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  badgeLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#666',
    fontSize: 12,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#2a2a2a',
  },
  motivationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  motivationText: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
