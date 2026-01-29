import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import ProgressRing from './ProgressRing';

interface DailyProgressProps {
  consumed: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export default function DailyProgress({ consumed, targets }: DailyProgressProps) {
  const calorieProgress = targets.calories > 0 ? (consumed.calories / targets.calories) * 100 : 0;
  const proteinProgress = targets.protein > 0 ? (consumed.protein / targets.protein) * 100 : 0;
  const carbsProgress = targets.carbs > 0 ? (consumed.carbs / targets.carbs) * 100 : 0;
  const fatProgress = targets.fat > 0 ? (consumed.fat / targets.fat) * 100 : 0;

  const remaining = {
    calories: Math.max(0, targets.calories - consumed.calories),
    protein: Math.max(0, targets.protein - consumed.protein),
    carbs: Math.max(0, targets.carbs - consumed.carbs),
    fat: Math.max(0, targets.fat - consumed.fat),
  };

  return (
    <View style={styles.container}>
      <View style={styles.mainRingContainer}>
        <ProgressRing
          progress={calorieProgress}
          size={140}
          strokeWidth={12}
          color="#e74c3c"
          label="Calories"
          value={`${Math.round(consumed.calories)}`}
        />
        <View style={styles.remainingBadge}>
          <Text style={styles.remainingText}>{Math.round(remaining.calories)} left</Text>
        </View>
      </View>

      <View style={styles.macrosContainer}>
        <View style={styles.macroItem}>
          <ProgressRing
            progress={proteinProgress}
            size={70}
            strokeWidth={6}
            color="#e74c3c"
            label="Protein"
            value={`${Math.round(consumed.protein)}g`}
          />
          <Text style={styles.macroRemaining}>{Math.round(remaining.protein)}g left</Text>
        </View>

        <View style={styles.macroItem}>
          <ProgressRing
            progress={carbsProgress}
            size={70}
            strokeWidth={6}
            color="#3498db"
            label="Carbs"
            value={`${Math.round(consumed.carbs)}g`}
          />
          <Text style={styles.macroRemaining}>{Math.round(remaining.carbs)}g left</Text>
        </View>

        <View style={styles.macroItem}>
          <ProgressRing
            progress={fatProgress}
            size={70}
            strokeWidth={6}
            color="#f39c12"
            label="Fat"
            value={`${Math.round(consumed.fat)}g`}
          />
          <Text style={styles.macroRemaining}>{Math.round(remaining.fat)}g left</Text>
        </View>
      </View>
    </View>
  );
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
    alignItems: 'center',
  },
  mainRingContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  remainingBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  remainingText: {
    color: '#888',
    fontSize: 12,
  },
  macrosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  macroItem: {
    alignItems: 'center',
  },
  macroRemaining: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
  },
});
