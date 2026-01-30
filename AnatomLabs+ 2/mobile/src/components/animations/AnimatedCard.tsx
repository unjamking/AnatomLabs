import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useHaptics } from './useHaptics';
import { SPRING_CONFIG, COLORS, SHADOWS, ANIMATION_DURATION, EASING } from './config';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  delay?: number;
  pressable?: boolean;
  haptic?: boolean;
  variant?: 'default' | 'glass' | 'elevated';
  style?: ViewStyle;
}

export default function AnimatedCard({
  children,
  delay = 0,
  pressable = true,
  haptic = true,
  variant = 'default',
  style,
  onPress,
  ...props
}: AnimatedCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const { trigger } = useHaptics();

  // Entry animation
  React.useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: ANIMATION_DURATION.normal, easing: EASING.easeOut })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, SPRING_CONFIG.gentle)
    );
  }, []);

  const handlePressIn = () => {
    if (pressable) {
      scale.value = withSpring(0.98, SPRING_CONFIG.snappy);
    }
  };

  const handlePressOut = () => {
    if (pressable) {
      scale.value = withSpring(1, SPRING_CONFIG.bouncy);
    }
  };

  const handlePress = (e: any) => {
    if (haptic && pressable) {
      trigger('light');
    }
    onPress?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    glass: {
      backgroundColor: 'rgba(26, 26, 26, 0.8)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    elevated: {
      backgroundColor: COLORS.cardBackground,
      ...SHADOWS.medium,
    },
  };

  if (!pressable && !onPress) {
    return (
      <Animated.View
        style={[styles.card, variantStyles[variant], animatedStyle, style]}
      >
        {children}
      </Animated.View>
    );
  }

  return (
    <AnimatedTouchable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      style={[styles.card, variantStyles[variant], animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
});
