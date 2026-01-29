import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { FoodLog } from '../../types';

interface FoodLogItemProps {
  log: FoodLog;
  onEdit: (log: FoodLog) => void;
  onDelete: (logId: string) => void;
}

export default function FoodLogItem({ log, onEdit, onDelete }: FoodLogItemProps) {
  const handleDelete = () => {
    Alert.alert(
      'Delete Food Log',
      `Remove ${log.food.name} from your log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(log.id),
        },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={() => onEdit(log)}>
      <View style={styles.content}>
        <View style={styles.mainInfo}>
          <Text style={styles.foodName}>{log.food.name}</Text>
          <Text style={styles.serving}>
            {log.servings} {log.servings === 1 ? 'serving' : 'servings'} ({log.food.servingSize}{log.food.servingUnit})
          </Text>
        </View>
        <View style={styles.macros}>
          <Text style={styles.calories}>{Math.round((log.totalCalories || 0))} cal</Text>
          <View style={styles.macroRow}>
            <Text style={[styles.macroText, styles.protein]}>P {Math.round((log.totalProtein || 0))}g</Text>
            <Text style={[styles.macroText, styles.carbs]}>C {Math.round((log.totalCarbs || 0))}g</Text>
            <Text style={[styles.macroText, styles.fat]}>F {Math.round((log.totalFat || 0))}g</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteText}>x</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainInfo: {
    flex: 1,
  },
  foodName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  serving: {
    color: '#888',
    fontSize: 12,
  },
  macros: {
    alignItems: 'flex-end',
  },
  calories: {
    color: '#e74c3c',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroText: {
    fontSize: 10,
    fontWeight: '500',
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
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteText: {
    color: '#888',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
