import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withDelay,
  useAnimatedStyle,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { ANIMATION_DURATION, EASING, COLORS } from './config';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedProgressRingProps {
  progress: number; // 0-100
  size: number;
  strokeWidth: number;
  color?: string;
  backgroundColor?: string;
  label: string;
  value: string;
  delay?: number;
  duration?: number;
}

export default function AnimatedProgressRing({
  progress,
  size,
  strokeWidth,
  color = COLORS.primary,
  backgroundColor = '#2a2a2a',
  label,
  value,
  delay = 0,
  duration = ANIMATION_DURATION.slow,
}: AnimatedProgressRingProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const animatedProgress = useSharedValue(0);
  const opacity = useSharedValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
    animatedProgress.value = withDelay(
      delay + 100,
      withTiming(clampedProgress, {
        duration,
        easing: EASING.easeOut,
      })
    );
  }, [clampedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference - (circumference * animatedProgress.value) / 100;
    return {
      strokeDashoffset,
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, { width: size, height: size }, containerStyle]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.labelContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  svg: {
    position: 'absolute',
  },
  labelContainer: {
    alignItems: 'center',
  },
  value: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
