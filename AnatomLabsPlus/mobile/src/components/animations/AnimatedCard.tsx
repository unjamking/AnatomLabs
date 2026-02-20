import React, { useCallback, useReducer } from 'react';
import { TouchableOpacity, TouchableOpacityProps, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useHaptics } from './useHaptics';
import { SPRING_CONFIG, COLORS, SHADOWS, ANIMATION_DURATION } from './config';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedCardProps extends TouchableOpacityProps {
  children: React.ReactNode;
  delay?: number;
  pressable?: boolean;
  haptic?: boolean;
  animateEntry?: boolean;
  variant?: 'default' | 'glass' | 'elevated';
  style?: ViewStyle;
}

export default function AnimatedCard({ children, delay = 0, pressable = true, haptic = true, animateEntry = true, variant = 'default', style, onPress, ...props }: AnimatedCardProps) {
  const scale = useSharedValue(1);
  const [key, bump] = useReducer(n => n + 1, 0);
  const { trigger } = useHaptics();

  useFocusEffect(useCallback(() => {
    if (!animateEntry) return;
    bump();
  }, [animateEntry]));

  const handlePressIn = () => { if (pressable) scale.value = withSpring(0.98, SPRING_CONFIG.snappy); };
  const handlePressOut = () => { if (pressable) scale.value = withSpring(1, SPRING_CONFIG.bouncy); };
  const handlePress = (e: any) => { if (haptic && pressable) trigger('light'); onPress?.(e); };

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const variantStyle: ViewStyle =
    variant === 'glass' ? { backgroundColor: 'rgba(26,26,26,0.8)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' } :
    variant === 'elevated' ? { backgroundColor: COLORS.cardBackground, ...SHADOWS.medium } :
    { backgroundColor: COLORS.cardBackground, borderWidth: 1, borderColor: COLORS.border };

  const entering = animateEntry ? FadeInDown.delay(delay).duration(ANIMATION_DURATION.normal) : undefined;

  if (!pressable && !onPress) {
    return (
      <Animated.View key={animateEntry ? key : undefined} entering={entering} style={[styles.card, variantStyle, style]}>
        {children}
      </Animated.View>
    );
  }

  return (
    <Animated.View key={animateEntry ? key : undefined} entering={entering}>
      <AnimatedTouchable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        activeOpacity={1}
        style={[styles.card, variantStyle, scaleStyle, style]}
        {...props}
      >
        {children}
      </AnimatedTouchable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, overflow: 'hidden' },
});
