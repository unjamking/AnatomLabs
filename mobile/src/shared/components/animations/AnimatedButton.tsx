import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  Text,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { useHaptics } from './useHaptics';
import { SPRING_CONFIG, COLORS, SHADOWS } from './config';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface AnimatedButtonProps extends TouchableOpacityProps {
  children?: React.ReactNode;
  title?: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  haptic?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'selection';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function AnimatedButton({
  children,
  title,
  variant = 'primary',
  size = 'medium',
  haptic = true,
  hapticType = 'light',
  style,
  textStyle,
  icon,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: AnimatedButtonProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);
  const { trigger } = useHaptics();

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.96, SPRING_CONFIG.snappy);
    pressed.value = withTiming(1, { duration: 100 });
    onPressIn?.(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, SPRING_CONFIG.bouncy);
    pressed.value = withTiming(0, { duration: 150 });
    onPressOut?.(e);
  };

  const handlePress = (e: any) => {
    if (haptic) {
      trigger(hapticType);
    }
    onPress?.(e);
  };

  const animatedStyle = useAnimatedStyle(() => {
    const backgroundColor = variant === 'primary'
      ? interpolateColor(
          pressed.value,
          [0, 1],
          [COLORS.primary, COLORS.primaryDark]
        )
      : variant === 'secondary'
      ? interpolateColor(
          pressed.value,
          [0, 1],
          [COLORS.cardBackground, COLORS.cardBackgroundLight]
        )
      : 'transparent';

    return {
      transform: [{ scale: scale.value }],
      backgroundColor,
    };
  });

  const sizeStyles = {
    small: { paddingVertical: 8, paddingHorizontal: 16 },
    medium: { paddingVertical: 14, paddingHorizontal: 24 },
    large: { paddingVertical: 18, paddingHorizontal: 32 },
  };

  const textSizes = {
    small: 14,
    medium: 16,
    large: 18,
  };

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: COLORS.primary,
      ...SHADOWS.small,
    },
    secondary: {
      backgroundColor: COLORS.cardBackground,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: COLORS.primary,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  };

  const textColors: Record<string, string> = {
    primary: COLORS.text,
    secondary: COLORS.text,
    outline: COLORS.primary,
    ghost: COLORS.primary,
  };

  return (
    <AnimatedTouchable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      disabled={disabled}
      style={[
        styles.button,
        sizeStyles[size],
        variantStyles[variant],
        animatedStyle,
        disabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {icon}
      {title ? (
        <Text
          style={[
            styles.text,
            { fontSize: textSizes[size], color: textColors[variant] },
            disabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      ) : (
        children
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  text: {
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: COLORS.textSecondary,
  },
});
