import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { ANIMATION_DURATION, SPRING_CONFIG, EASING, STAGGER_DELAY } from './config';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
  enterFrom?: 'left' | 'right' | 'bottom' | 'fade';
}

export default function AnimatedListItem({
  children,
  index,
  style,
  enterFrom = 'bottom',
}: AnimatedListItemProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(enterFrom === 'left' ? -30 : enterFrom === 'right' ? 30 : 0);
  const translateY = useSharedValue(enterFrom === 'bottom' ? 20 : 0);

  useEffect(() => {
    const delay = index * STAGGER_DELAY;

    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: ANIMATION_DURATION.normal, easing: EASING.easeOut })
    );

    if (enterFrom !== 'fade') {
      translateX.value = withDelay(delay, withSpring(0, SPRING_CONFIG.gentle));
      translateY.value = withDelay(delay, withSpring(0, SPRING_CONFIG.gentle));
    }
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
