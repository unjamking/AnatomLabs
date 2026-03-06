import React, { useCallback } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ANIMATION_DURATION, SPRING_CONFIG, EASING } from './config';

interface SlideInProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down' | 'bottom';
  delay?: number;
  duration?: number;
  distance?: number;
  useSpring?: boolean;
  style?: ViewStyle;
}

export default function SlideIn({ children, direction = 'up', delay = 0, duration = ANIMATION_DURATION.normal, distance = 30, useSpring: _useSpring = true, style }: SlideInProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(direction === 'left' ? -distance : direction === 'right' ? distance : 0);
  const translateY = useSharedValue(direction === 'up' || direction === 'bottom' ? distance : direction === 'down' ? -distance : 0);

  useFocusEffect(useCallback(() => {
    opacity.value = 0;
    translateX.value = direction === 'left' ? -distance : direction === 'right' ? distance : 0;
    translateY.value = direction === 'up' || direction === 'bottom' ? distance : direction === 'down' ? -distance : 0;

    opacity.value = withDelay(delay, withTiming(1, { duration, easing: EASING.easeOut }));
    translateX.value = withDelay(delay, withSpring(0, SPRING_CONFIG.gentle));
    translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIG.gentle));

    return () => { opacity.value = 1; translateX.value = 0; translateY.value = 0; };
  }, [delay, direction]));

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
