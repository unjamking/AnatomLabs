import React, { useCallback } from 'react';
import { StyleSheet, View, ViewStyle, StyleProp, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withDelay } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useHaptics } from './useHaptics';
import { SPRING_CONFIG, ANIMATION_DURATION, EASING } from './config';

interface GlassCardProps {
  children: React.ReactNode;
  delay?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  blurIntensity?: number;
  gradientColors?: readonly [string, string, ...string[]];
  borderGlow?: boolean;
  glowColor?: string;
}

export default function GlassCard({ children, delay = 0, onPress, style, contentStyle, blurIntensity = 40, gradientColors = ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.02)'] as const, borderGlow = false, glowColor = '#e74c3c' }: GlassCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const { trigger } = useHaptics();

  useFocusEffect(useCallback(() => {
    opacity.value = 0;
    translateY.value = 20;
    opacity.value = withDelay(delay, withTiming(1, { duration: ANIMATION_DURATION.normal, easing: EASING.easeOut }));
    translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIG.gentle));
    return () => { opacity.value = 1; translateY.value = 0; };
  }, [delay]));

  const handlePressIn = () => { if (onPress) scale.value = withSpring(0.98, SPRING_CONFIG.snappy); };
  const handlePressOut = () => { if (onPress) scale.value = withSpring(1, SPRING_CONFIG.bouncy); };
  const handlePress = () => { if (onPress) { trigger('light'); onPress(); } };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const inner = (
    <Animated.View style={[styles.container, animatedStyle, style]}>
      <BlurView intensity={blurIntensity} tint="dark" style={StyleSheet.absoluteFill} />
      <LinearGradient colors={gradientColors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.border, borderGlow && { borderColor: glowColor, shadowColor: glowColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 8 }]} />
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress} activeOpacity={1}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}

const styles = StyleSheet.create({
  container: { borderRadius: 16, overflow: 'hidden' },
  border: { ...StyleSheet.absoluteFillObject, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  content: { padding: 16 },
});
