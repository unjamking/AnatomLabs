import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
} from 'react-native-reanimated';
import { ViewStyle } from 'react-native';
import { ANIMATION_DURATION, SPRING_CONFIG, EASING } from './config';

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  from?: number;
  to?: number;
  style?: ViewStyle;
  useSpring?: boolean;
}

export default function ScaleIn({
  children,
  delay = 0,
  duration = ANIMATION_DURATION.normal,
  from = 0.8,
  to = 1,
  style,
  useSpring = true,
}: ScaleInProps) {
  const scale = useSharedValue(from);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const scaleAnimation = useSpring
      ? withSpring(to, SPRING_CONFIG.bouncy)
      : withTiming(to, { duration, easing: EASING.spring });

    scale.value = withDelay(delay, scaleAnimation);
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: duration * 0.6, easing: EASING.easeOut })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
