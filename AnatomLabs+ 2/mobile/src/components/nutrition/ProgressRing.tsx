import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ProgressRingProps {
  progress: number; // 0-100
  size: number;
  strokeWidth: number;
  color: string;
  label: string;
  value: string;
  backgroundColor?: string;
}

export default function ProgressRing({
  progress,
  size,
  strokeWidth,
  color,
  label,
  value,
  backgroundColor = '#2a2a2a',
}: ProgressRingProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  // Simple circular progress using View-based approach
  const innerSize = size - strokeWidth * 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Background circle */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: backgroundColor,
          },
        ]}
      />

      {/* Progress indicator - using a simple arc visualization */}
      <View
        style={[
          styles.progressContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        {/* Top arc */}
        <View
          style={[
            styles.arcTop,
            {
              width: size,
              height: size / 2,
              borderTopLeftRadius: size / 2,
              borderTopRightRadius: size / 2,
              backgroundColor: clampedProgress >= 50 ? color : 'transparent',
            },
          ]}
        />
        {/* Bottom arc */}
        <View
          style={[
            styles.arcBottom,
            {
              width: size,
              height: size / 2,
              borderBottomLeftRadius: size / 2,
              borderBottomRightRadius: size / 2,
              backgroundColor: clampedProgress >= 100 ? color : 'transparent',
            },
          ]}
        />
        {/* Progress border */}
        <View
          style={[
            styles.progressBorder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              opacity: clampedProgress / 100,
            },
          ]}
        />
      </View>

      {/* Inner circle (cutout) */}
      <View
        style={[
          styles.innerCircle,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: '#0a0a0a',
          },
        ]}
      />

      {/* Label container */}
      <View style={styles.labelContainer}>
        <Text style={styles.value}>{value}</Text>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
  },
  progressContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  arcTop: {
    position: 'absolute',
    top: 0,
  },
  arcBottom: {
    position: 'absolute',
    bottom: 0,
  },
  progressBorder: {
    position: 'absolute',
  },
  innerCircle: {
    position: 'absolute',
  },
  labelContainer: {
    alignItems: 'center',
    zIndex: 10,
  },
  value: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  label: {
    color: '#888',
    fontSize: 11,
    marginTop: 2,
  },
});
