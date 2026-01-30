import { Easing } from 'react-native-reanimated';

// Timing configurations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  verySlow: 800,
};

// Spring configurations
export const SPRING_CONFIG = {
  gentle: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 180,
    mass: 1,
  },
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  wobbly: {
    damping: 8,
    stiffness: 150,
    mass: 1,
  },
};

// Easing presets
export const EASING = {
  easeIn: Easing.bezier(0.42, 0, 1, 1),
  easeOut: Easing.bezier(0, 0, 0.58, 1),
  easeInOut: Easing.bezier(0.42, 0, 0.58, 1),
  spring: Easing.bezier(0.175, 0.885, 0.32, 1.275),
  bounce: Easing.bezier(0.68, -0.55, 0.265, 1.55),
};

// Theme colors (matching the app's dark theme)
export const COLORS = {
  primary: '#e74c3c',
  primaryDark: '#c0392b',
  background: '#0a0a0a',
  cardBackground: '#1a1a1a',
  cardBackgroundLight: '#2a2a2a',
  border: '#333',
  text: '#fff',
  textSecondary: '#888',
  textTertiary: '#666',
  success: '#2ecc71',
  warning: '#f39c12',
  error: '#e74c3c',
  info: '#3498db',
};

// Stagger delay for list animations
export const STAGGER_DELAY = 50;

// Common shadow styles for depth
export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  }),
};
