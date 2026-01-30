import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withDelay,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { AnimatedProgressRing, FadeIn, COLORS, SPRING_CONFIG } from '../animations';

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
        <AnimatedProgressRing
          progress={calorieProgress}
          size={140}
          strokeWidth={12}
          color={COLORS.primary}
          label="Calories"
          value={`${Math.round(consumed.calories)}`}
          delay={0}
          duration={800}
        />
        <FadeIn delay={400}>
          <View style={styles.remainingBadge}>
            <Text style={styles.remainingText}>{Math.round(remaining.calories)} left</Text>
          </View>
        </FadeIn>
      </View>

      <View style={styles.macrosContainer}>
        <FadeIn delay={200} style={styles.macroItem}>
          <AnimatedProgressRing
            progress={proteinProgress}
            size={70}
            strokeWidth={6}
            color={COLORS.primary}
            label="Protein"
            value={`${Math.round(consumed.protein)}g`}
            delay={200}
            duration={600}
          />
          <Text style={styles.macroRemaining}>{Math.round(remaining.protein)}g left</Text>
        </FadeIn>

        <FadeIn delay={300} style={styles.macroItem}>
          <AnimatedProgressRing
            progress={carbsProgress}
            size={70}
            strokeWidth={6}
            color="#3498db"
            label="Carbs"
            value={`${Math.round(consumed.carbs)}g`}
            delay={300}
            duration={600}
          />
          <Text style={styles.macroRemaining}>{Math.round(remaining.carbs)}g left</Text>
        </FadeIn>

        <FadeIn delay={400} style={styles.macroItem}>
          <AnimatedProgressRing
            progress={fatProgress}
            size={70}
            strokeWidth={6}
            color="#f39c12"
            label="Fat"
            value={`${Math.round(consumed.fat)}g`}
            delay={400}
            duration={600}
          />
          <Text style={styles.macroRemaining}>{Math.round(remaining.fat)}g left</Text>
        </FadeIn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.cardBackgroundLight,
    borderRadius: 12,
  },
  remainingText: {
    color: COLORS.textSecondary,
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
    color: COLORS.textTertiary,
    fontSize: 10,
    marginTop: 4,
  },
});
