import { useEffect } from 'react';
import {
  useSharedValue,
  withTiming,
  withSpring,
  WithTimingConfig,
  WithSpringConfig,
} from 'react-native-reanimated';
import { ANIMATION_DURATION, SPRING_CONFIG } from './config';

interface UseAnimatedValueOptions {
  from?: number;
  to?: number;
  autoStart?: boolean;
  type?: 'timing' | 'spring';
  timingConfig?: WithTimingConfig;
  springConfig?: WithSpringConfig;
}

export function useAnimatedValue(options: UseAnimatedValueOptions = {}) {
  const {
    from = 0,
    to = 1,
    autoStart = true,
    type = 'timing',
    timingConfig = { duration: ANIMATION_DURATION.normal },
    springConfig = SPRING_CONFIG.gentle,
  } = options;

  const value = useSharedValue(from);

  const animate = (target: number = to) => {
    if (type === 'spring') {
      value.value = withSpring(target, springConfig);
    } else {
      value.value = withTiming(target, timingConfig);
    }
  };

  const reset = () => {
    value.value = from;
  };

  useEffect(() => {
    if (autoStart) {
      // Small delay to ensure component is mounted
      const timeout = setTimeout(() => animate(), 50);
      return () => clearTimeout(timeout);
    }
  }, [autoStart]);

  return { value, animate, reset };
}
