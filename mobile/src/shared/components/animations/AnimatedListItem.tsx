import React from 'react';
import Animated, { FadeInDown, FadeInLeft, FadeInRight, FadeIn } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';
import { STAGGER_DELAY, ANIMATION_DURATION } from './config';

interface AnimatedListItemProps {
  children: React.ReactNode;
  index?: number;
  style?: ViewStyle;
  enterFrom?: 'bottom' | 'left' | 'right' | 'fade';
}

export default function AnimatedListItem({ children, index = 0, style, enterFrom = 'bottom' }: AnimatedListItemProps) {
  const delay = index * STAGGER_DELAY;
  const entering =
    enterFrom === 'left' ? FadeInLeft.delay(delay).duration(ANIMATION_DURATION.normal) :
    enterFrom === 'right' ? FadeInRight.delay(delay).duration(ANIMATION_DURATION.normal) :
    enterFrom === 'fade' ? FadeIn.delay(delay).duration(ANIMATION_DURATION.normal) :
    FadeInDown.delay(delay).duration(ANIMATION_DURATION.normal);

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
