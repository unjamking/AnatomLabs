import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import PremiumAnatomyFigure from './PremiumAnatomyFigure';
import { expandMuscleAliasToIds } from './anatomyData';

interface MuscleBodyDiagramProps {
  primaryMuscles: string[];
  secondaryMuscles?: string[];
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
}

function resolveMuscles(muscles: string[]) {
  const ids = new Set<string>();

  muscles.forEach((muscle) => {
    expandMuscleAliasToIds(muscle).forEach((id) => ids.add(id));
  });

  return ids;
}

export default function MuscleBodyDiagram({
  primaryMuscles,
  secondaryMuscles = [],
  height = 250,
  showLegend = true,
  showLabels = true,
}: MuscleBodyDiagramProps) {
  const primaryIds = useMemo(() => resolveMuscles(primaryMuscles), [primaryMuscles]);
  const secondaryIds = useMemo(() => resolveMuscles(secondaryMuscles), [secondaryMuscles]);
  const figureHeight = showLegend ? height - 46 : height - 10;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.figuresRow}>
        <PremiumAnatomyFigure
          side="front"
          height={figureHeight}
          width="48%"
          label={showLabels ? 'Front' : undefined}
          interactive={false}
          primaryIds={primaryIds}
          secondaryIds={secondaryIds}
          themeId="neon"
        />
        <PremiumAnatomyFigure
          side="back"
          height={figureHeight}
          width="48%"
          label={showLabels ? 'Back' : undefined}
          interactive={false}
          primaryIds={primaryIds}
          secondaryIds={secondaryIds}
          themeId="neon"
        />
      </View>

      {showLegend ? (
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.primaryDot]} />
            <Text style={styles.legendText}>Primary</Text>
          </View>
          {secondaryIds.size > 0 ? (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.secondaryDot]} />
              <Text style={styles.legendText}>Secondary</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'space-between',
    backgroundColor: '#F8FBFF',
    borderRadius: 22,
    padding: 10,
  },
  figuresRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  legendRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  primaryDot: {
    backgroundColor: '#FF6B79',
  },
  secondaryDot: {
    backgroundColor: 'rgba(255, 148, 158, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(237, 122, 133, 0.7)',
  },
  legendText: {
    color: '#C8D2EA',
    fontSize: 12,
    fontWeight: '600',
  },
});
