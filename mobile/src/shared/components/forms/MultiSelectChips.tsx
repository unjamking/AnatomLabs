import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ChipOption {
  id: string;
  name: string;
  description?: string;
  severity?: string;
}

interface MultiSelectChipsProps {
  title: string;
  options: ChipOption[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  maxSelections?: number;
  collapsible?: boolean;
  initiallyExpanded?: boolean;
  accentColor?: string;
}

const COLORS = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  surfaceLight: '#2a2a2a',
  primary: '#e74c3c',
  text: '#ffffff',
  textSecondary: '#888888',
  textTertiary: '#666666',
  border: '#333333',
};

export default function MultiSelectChips({
  title,
  options,
  selectedIds,
  onSelectionChange,
  maxSelections,
  collapsible = true,
  initiallyExpanded = false,
  accentColor = COLORS.primary,
}: MultiSelectChipsProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const toggleSelection = (id: string) => {
    const isSelected = selectedIds.includes(id);

    if (isSelected) {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      if (maxSelections && selectedIds.length >= maxSelections) {
        return;
      }
      onSelectionChange([...selectedIds, id]);
    }
  };

  const getSeverityColor = (severity?: string): string => {
    switch (severity?.toLowerCase()) {
      case 'high':
        return '#e74c3c';
      case 'moderate':
        return '#f39c12';
      case 'low':
        return '#3498db';
      default:
        return accentColor;
    }
  };

  const renderChip = (option: ChipOption) => {
    const isSelected = selectedIds.includes(option.id);
    const chipColor = option.severity ? getSeverityColor(option.severity) : accentColor;

    return (
      <AnimatedTouchable
        key={option.id}
        layout={Layout.springify().damping(15)}
        style={[
          styles.chip,
          isSelected && { backgroundColor: chipColor + '30', borderColor: chipColor },
        ]}
        onPress={() => toggleSelection(option.id)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.chipText,
            isSelected && { color: chipColor },
          ]}
        >
          {option.name}
        </Text>
        {isSelected && (
          <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(100)}>
            <Ionicons
              name="checkmark-circle"
              size={16}
              color={chipColor}
              style={styles.chipIcon}
            />
          </Animated.View>
        )}
      </AnimatedTouchable>
    );
  };

  const selectedCount = selectedIds.length;
  const hasSelections = selectedCount > 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={collapsible ? toggleExpand : undefined}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          {collapsible && (
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={20}
              color={COLORS.textSecondary}
              style={styles.expandIcon}
            />
          )}
          <Text style={styles.title}>{title}</Text>
          {hasSelections && (
            <View style={[styles.countBadge, { backgroundColor: accentColor + '30' }]}>
              <Text style={[styles.countText, { color: accentColor }]}>
                {selectedCount}
              </Text>
            </View>
          )}
        </View>
        {maxSelections && (
          <Text style={styles.maxText}>
            {selectedCount}/{maxSelections}
          </Text>
        )}
      </TouchableOpacity>

      {!isExpanded && hasSelections && (
        <View style={styles.selectedPreview}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {selectedIds.map(id => {
              const option = options.find(o => o.id === id);
              if (!option) return null;
              return (
                <View
                  key={id}
                  style={[styles.previewChip, { backgroundColor: accentColor + '20' }]}
                >
                  <Text style={[styles.previewChipText, { color: accentColor }]}>
                    {option.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleSelection(id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={14} color={accentColor} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {(isExpanded || !collapsible) && (
        <Animated.View
          entering={FadeIn.duration(200)}
          layout={Layout.springify()}
          style={styles.chipsContainer}
        >
          {options.map(renderChip)}
        </Animated.View>
      )}
    </View>
  );
}

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  initiallyExpanded?: boolean;
  badge?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  accentColor?: string;
}

export function CollapsibleSection({
  title,
  children,
  initiallyExpanded = false,
  badge,
  isExpanded: controlledIsExpanded,
  onToggle,
  accentColor = COLORS.primary,
}: CollapsibleSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(initiallyExpanded);

  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalExpanded;

  const rotation = useSharedValue(isExpanded ? 1 : 0);
  const contentHeight = useSharedValue(isExpanded ? 1 : 0);
  const borderWidth = useSharedValue(isExpanded ? 3 : 0);

  useEffect(() => {
    rotation.value = withSpring(isExpanded ? 1 : 0, { damping: 15, stiffness: 120 });
    contentHeight.value = withTiming(isExpanded ? 1 : 0, {
      duration: 300,
      easing: Easing.bezier(0.4, 0, 0.2, 1)
    });
    borderWidth.value = withTiming(isExpanded ? 3 : 0, { duration: 200 });
  }, [isExpanded]);

  const toggleExpand = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(rotation.value, [0, 1], [0, 90])}deg` }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    borderLeftWidth: borderWidth.value,
    borderLeftColor: accentColor,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentHeight.value,
    transform: [{
      translateY: interpolate(contentHeight.value, [0, 1], [-10, 0])
    }],
  }));

  return (
    <Animated.View style={styles.sectionContainer} layout={Layout.springify()}>
      <AnimatedTouchable
        style={[styles.sectionHeader, headerStyle]}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Animated.View style={chevronStyle}>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isExpanded ? accentColor : COLORS.textSecondary}
              style={styles.expandIcon}
            />
          </Animated.View>
          <Text style={[styles.sectionTitle, isExpanded && { color: accentColor }]}>{title}</Text>
          {badge && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[styles.sectionBadge, { backgroundColor: accentColor + '30' }]}
            >
              <Text style={[styles.sectionBadgeText, { color: accentColor }]}>{badge}</Text>
            </Animated.View>
          )}
        </View>
      </AnimatedTouchable>

      {isExpanded && (
        <Animated.View
          entering={FadeIn.duration(250).delay(50)}
          exiting={FadeOut.duration(150)}
          style={[styles.sectionContent, contentStyle]}
        >
          {children}
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  countBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  maxText: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  selectedPreview: {
    marginTop: 4,
    marginBottom: 8,
  },
  previewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  previewChipText: {
    fontSize: 12,
    marginRight: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipIcon: {
    marginLeft: 6,
  },
  sectionContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.surfaceLight,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: COLORS.primary + '30',
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  sectionContent: {
    padding: 16,
  },
});
