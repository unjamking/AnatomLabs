import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Food } from '../../types';

interface QuickAddBarProps {
  recentFoods: (Food & { lastLogged?: string; defaultServings?: number })[];
  onQuickAdd: (food: Food, servings: number) => void;
}

export default function QuickAddBar({ recentFoods, onQuickAdd }: QuickAddBarProps) {
  if (recentFoods.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Add</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recentFoods.slice(0, 8).map((food, index) => (
          <TouchableOpacity
            key={food.id || index}
            style={styles.foodChip}
            onPress={() => onQuickAdd(food, food.defaultServings || 1)}
          >
            <Text style={styles.foodName} numberOfLines={1}>
              {food.name}
            </Text>
            <Text style={styles.foodCalories}>{food.calories} cal</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  title: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: 10,
  },
  foodChip: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 100,
    maxWidth: 150,
  },
  foodName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  foodCalories: {
    color: '#e74c3c',
    fontSize: 11,
  },
});
