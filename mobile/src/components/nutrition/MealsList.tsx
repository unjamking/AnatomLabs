import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FoodLog } from '../../types';
import FoodLogItem from './FoodLogItem';

interface MealsListProps {
  meals: {
    breakfast: FoodLog[];
    lunch: FoodLog[];
    dinner: FoodLog[];
    snack: FoodLog[];
  };
  onEditLog: (log: FoodLog) => void;
  onDeleteLog: (logId: string) => void;
  onAddFood: (mealType: string) => void;
}

interface MealSectionProps {
  title: string;
  mealType: string;
  logs: FoodLog[];
  onEditLog: (log: FoodLog) => void;
  onDeleteLog: (logId: string) => void;
  onAddFood: (mealType: string) => void;
}

function MealSection({ title, mealType, logs, onEditLog, onDeleteLog, onAddFood }: MealSectionProps) {
  const [expanded, setExpanded] = useState(true);

  const totalCalories = logs.reduce((sum, log) => sum + (log.totalCalories || 0), 0);

  return (
    <View style={styles.mealSection}>
      <TouchableOpacity
        style={styles.mealHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.mealTitleRow}>
          <Text style={styles.mealTitle}>{title}</Text>
          <Text style={styles.mealCount}>
            {logs.length > 0 ? `${logs.length} item${logs.length > 1 ? 's' : ''}` : ''}
          </Text>
        </View>
        <View style={styles.mealHeaderRight}>
          <Text style={styles.mealCalories}>
            {logs.length > 0 ? `${Math.round(totalCalories)} cal` : ''}
          </Text>
          <Text style={styles.expandIcon}>{expanded ? '-' : '+'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.mealContent}>
          {logs.map(log => (
            <FoodLogItem
              key={log.id}
              log={log}
              onEdit={onEditLog}
              onDelete={onDeleteLog}
            />
          ))}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => onAddFood(mealType)}
          >
            <Text style={styles.addButtonText}>+ Add {title}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function MealsList({ meals, onEditLog, onDeleteLog, onAddFood }: MealsListProps) {
  return (
    <View style={styles.container}>
      <MealSection
        title="Breakfast"
        mealType="breakfast"
        logs={meals.breakfast}
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onAddFood={onAddFood}
      />
      <MealSection
        title="Lunch"
        mealType="lunch"
        logs={meals.lunch}
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onAddFood={onAddFood}
      />
      <MealSection
        title="Dinner"
        mealType="dinner"
        logs={meals.dinner}
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onAddFood={onAddFood}
      />
      <MealSection
        title="Snacks"
        mealType="snack"
        logs={meals.snack}
        onEditLog={onEditLog}
        onDeleteLog={onDeleteLog}
        onAddFood={onAddFood}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  mealSection: {
    marginBottom: 16,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  mealTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mealCount: {
    color: '#666',
    fontSize: 12,
  },
  mealHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealCalories: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '500',
  },
  expandIcon: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mealContent: {
    marginTop: 8,
    paddingLeft: 8,
  },
  addButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '500',
  },
});
