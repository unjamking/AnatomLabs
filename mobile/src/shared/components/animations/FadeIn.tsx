import React, { useCallback, useReducer } from 'react';
import Animated, { FadeIn as RNFadeIn } from 'react-native-reanimated';
import { ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ANIMATION_DURATION } from './config';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: ViewStyle;
  from?: number;
  to?: number;
}

export default function FadeIn({ children, delay = 0, duration = ANIMATION_DURATION.normal, style }: FadeInProps) {
  const [key, bump] = useReducer(n => n + 1, 0);

  useFocusEffect(useCallback(() => {
    bump();
  }, []));

  return (
    <Animated.View key={key} entering={RNFadeIn.delay(delay).duration(duration)} style={style}>
      {children}
    </Animated.View>
  );
}
