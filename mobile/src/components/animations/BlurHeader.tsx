import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from './config';

interface BlurHeaderProps {
  title?: string;
  scrollY?: SharedValue<number>;
  children?: React.ReactNode;
  rightElement?: React.ReactNode;
  leftElement?: React.ReactNode;
  style?: ViewStyle;
  blurIntensity?: number;
  showBorder?: boolean;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export default function BlurHeader({
  title,
  scrollY,
  children,
  rightElement,
  leftElement,
  style,
  blurIntensity = 80,
  showBorder = true,
}: BlurHeaderProps) {
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => {
    if (!scrollY) {
      return { opacity: 1 };
    }

    const opacity = interpolate(
      scrollY.value,
      [0, 50, 100],
      [0, 0.5, 1],
      'clamp'
    );

    return {
      opacity,
    };
  });

  const titleStyle = useAnimatedStyle(() => {
    if (!scrollY) {
      return { opacity: 1, transform: [{ translateY: 0 }] };
    }

    const opacity = interpolate(
      scrollY.value,
      [0, 80, 120],
      [0, 0, 1],
      'clamp'
    );

    const translateY = interpolate(
      scrollY.value,
      [0, 80, 120],
      [10, 10, 0],
      'clamp'
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <AnimatedBlurView
        intensity={blurIntensity}
        tint="dark"
        style={[StyleSheet.absoluteFill, animatedStyle]}
      />
      <View style={[styles.content, showBorder && styles.border]}>
        <View style={styles.leftContainer}>
          {leftElement}
        </View>
        {title && (
          <Animated.Text style={[styles.title, titleStyle]}>
            {title}
          </Animated.Text>
        )}
        {children}
        <View style={styles.rightContainer}>
          {rightElement}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: 'rgba(10, 10, 10, 0.5)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    minHeight: 44,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  leftContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  rightContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
});
