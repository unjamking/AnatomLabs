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

type Direction = 'left' | 'right' | 'top' | 'bottom';

interface SlideInProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: ViewStyle;
  useSpring?: boolean;
}

export default function SlideIn({
  children,
  direction = 'bottom',
  delay = 0,
  duration = ANIMATION_DURATION.normal,
  distance = 30,
  style,
  useSpring = false,
}: SlideInProps) {
  const translateX = useSharedValue(
    direction === 'left' ? -distance : direction === 'right' ? distance : 0
  );
  const translateY = useSharedValue(
    direction === 'top' ? -distance : direction === 'bottom' ? distance : 0
  );
  const opacity = useSharedValue(0);

  useEffect(() => {
    const animation = useSpring
      ? withSpring(0, SPRING_CONFIG.gentle)
      : withTiming(0, { duration, easing: EASING.easeOut });

    translateX.value = withDelay(delay, animation);
    translateY.value = withDelay(delay, animation);
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: EASING.easeOut })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
