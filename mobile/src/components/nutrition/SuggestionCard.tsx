import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FoodSuggestion } from '../../types';

interface SuggestionCardProps {
  suggestion: FoodSuggestion;
  onSelect: (suggestion: FoodSuggestion) => void;
}

export default function SuggestionCard({ suggestion, onSelect }: SuggestionCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onSelect(suggestion)}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>{suggestion.name}</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{suggestion.score}</Text>
        </View>
      </View>

      <Text style={styles.reason}>{suggestion.reason}</Text>

      <View style={styles.macros}>
        <Text style={styles.calories}>{suggestion.calories} cal</Text>
        <View style={styles.macroRow}>
          <Text style={[styles.macro, styles.protein]}>P: {suggestion.protein}g</Text>
          <Text style={[styles.macro, styles.carbs]}>C: {suggestion.carbs}g</Text>
          <Text style={[styles.macro, styles.fat]}>F: {suggestion.fat}g</Text>
        </View>
      </View>

      <View style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Add</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    width: 160,
    borderWidth: 1,
    borderColor: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  scoreBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 30,
    alignItems: 'center',
  },
  scoreText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  reason: {
    color: '#888',
    fontSize: 11,
    marginBottom: 10,
    height: 28,
  },
  macros: {
    marginBottom: 10,
  },
  calories: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macro: {
    fontSize: 10,
  },
  protein: {
    color: '#e74c3c',
  },
  carbs: {
    color: '#3498db',
  },
  fat: {
    color: '#f39c12',
  },
  addButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
  },
});
