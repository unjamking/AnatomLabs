import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { GlassCard, COLORS } from '../animations';

interface BMICardProps {
  bmi: number;
  category: string;
  categoryId: string;
  healthRisk: string;
  color?: string;
  idealWeightRange?: { min: number; max: number };
  weightToIdeal?: number;
  delay?: number;
}

const BMI_SCALE = {
  min: 15,
  max: 40,
  normalMin: 18.5,
  normalMax: 25,
};

const CATEGORY_COLORS: { [key: string]: string } = {
  severely_underweight: '#9b59b6',
  underweight: '#3498db',
  normal: '#2ecc71',
  overweight: '#f39c12',
  obese_1: '#e67e22',
  obese_2: '#e74c3c',
  obese_3: '#c0392b',
};

export default function BMICard({
  bmi,
  category,
  categoryId,
  healthRisk,
  color,
  idealWeightRange,
  weightToIdeal,
  delay = 0,
}: BMICardProps) {
  const categoryColor = color || CATEGORY_COLORS[categoryId] || COLORS.primary;

  const getScalePosition = (value: number): number => {
    const clamped = Math.max(BMI_SCALE.min, Math.min(BMI_SCALE.max, value));
    return ((clamped - BMI_SCALE.min) / (BMI_SCALE.max - BMI_SCALE.min)) * 100;
  };

  const indicatorPosition = getScalePosition(bmi);
  const normalStartPosition = getScalePosition(BMI_SCALE.normalMin);
  const normalEndPosition = getScalePosition(BMI_SCALE.normalMax);
  const normalWidth = normalEndPosition - normalStartPosition;

  const getWeightMessage = (): string => {
    if (!weightToIdeal || weightToIdeal === 0) {
      return 'You are at a healthy weight!';
    }
    if (weightToIdeal > 0) {
      return `Gain ${weightToIdeal.toFixed(1)} kg to reach healthy BMI`;
    }
    return `Lose ${Math.abs(weightToIdeal).toFixed(1)} kg to reach healthy BMI`;
  };

  const getRiskColor = (): string => {
    switch (healthRisk.toLowerCase()) {
      case 'low':
        return '#2ecc71';
      case 'moderate':
        return '#f39c12';
      case 'high':
        return '#e67e22';
      case 'very high':
      case 'extremely high':
        return '#e74c3c';
      default:
        return COLORS.textSecondary;
    }
  };

  return (
    <GlassCard delay={delay} style={styles.container} borderGlow glowColor={categoryColor}>
      <View style={styles.header}>
        <Text style={styles.title}>Body Mass Index</Text>
        <View style={[styles.riskBadge, { backgroundColor: getRiskColor() + '20' }]}>
          <Text style={[styles.riskText, { color: getRiskColor() }]}>
            {healthRisk} Risk
          </Text>
        </View>
      </View>

      <View style={styles.valueContainer}>
        <Text style={[styles.bmiValue, { color: categoryColor }]}>
          {bmi.toFixed(1)}
        </Text>
        <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
          <Text style={[styles.categoryText, { color: categoryColor }]}>
            {category}
          </Text>
        </View>
      </View>

      <View style={styles.scaleContainer}>
        <View style={styles.scale}>
          <View style={[styles.scaleSection, styles.scaleUnderweight]} />
          <View
            style={[
              styles.scaleSection,
              styles.scaleNormal,
              { left: `${normalStartPosition}%`, width: `${normalWidth}%` },
            ]}
          />
          <View
            style={[
              styles.scaleSection,
              styles.scaleOverweight,
              { left: `${normalEndPosition}%`, width: `${100 - normalEndPosition}%` },
            ]}
          />

          <View style={[styles.indicator, { left: `${indicatorPosition}%` }]}>
            <View style={[styles.indicatorDot, { backgroundColor: categoryColor }]} />
            <View style={[styles.indicatorLine, { backgroundColor: categoryColor }]} />
          </View>
        </View>

        <View style={styles.scaleLabels}>
          <Text style={styles.scaleLabel}>15</Text>
          <Text style={[styles.scaleLabel, styles.scaleLabelNormal]}>18.5</Text>
          <Text style={[styles.scaleLabel, styles.scaleLabelNormal]}>25</Text>
          <Text style={styles.scaleLabel}>40</Text>
        </View>
      </View>

      {idealWeightRange && (
        <View style={styles.idealContainer}>
          <Text style={styles.idealLabel}>Healthy Weight Range</Text>
          <Text style={styles.idealValue}>
            {idealWeightRange.min.toFixed(1)} - {idealWeightRange.max.toFixed(1)} kg
          </Text>
        </View>
      )}

      {weightToIdeal !== undefined && (
        <View style={styles.messageContainer}>
          <Text
            style={[
              styles.messageText,
              weightToIdeal === 0
                ? styles.messageSuccess
                : styles.messageAction,
            ]}
          >
            {getWeightMessage()}
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 11,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  bmiValue: {
    fontSize: 48,
    fontWeight: 'bold',
    marginRight: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scaleContainer: {
    marginBottom: 16,
  },
  scale: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
    position: 'relative',
  },
  scaleSection: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  scaleUnderweight: {
    left: 0,
    width: '14%',
    backgroundColor: '#3498db40',
  },
  scaleNormal: {
    backgroundColor: '#2ecc7160',
  },
  scaleOverweight: {
    backgroundColor: '#e74c3c40',
  },
  indicator: {
    position: 'absolute',
    top: -4,
    transform: [{ translateX: -6 }],
    alignItems: 'center',
  },
  indicatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  indicatorLine: {
    width: 2,
    height: 8,
    marginTop: -2,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingHorizontal: 2,
  },
  scaleLabel: {
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  scaleLabelNormal: {
    color: '#2ecc71',
  },
  idealContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  idealLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  idealValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  messageContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  messageText: {
    fontSize: 13,
    textAlign: 'center',
  },
  messageSuccess: {
    color: '#2ecc71',
  },
  messageAction: {
    color: COLORS.textSecondary,
  },
});
