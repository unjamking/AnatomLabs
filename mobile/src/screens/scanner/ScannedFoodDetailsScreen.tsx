import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useNutrition } from '../../context/NutritionContext';
import api from '../../services/api';
import { ScannedFood } from './BarcodeScannerScreen';

type RouteParams = {
  ScannedFoodDetails: {
    food: ScannedFood;
    mealType: string;
  };
};

export default function ScannedFoodDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ScannedFoodDetails'>>();
  const { food, mealType } = route.params;
  const { refreshToday } = useNutrition();

  const [servings, setServings] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const calculatedNutrients = {
    calories: Math.round(food.calories * servings),
    protein: Math.round(food.protein * servings * 10) / 10,
    carbs: Math.round(food.carbs * servings * 10) / 10,
    fat: Math.round(food.fat * servings * 10) / 10,
    fiber: food.fiber ? Math.round(food.fiber * servings * 10) / 10 : undefined,
    sugar: food.sugar ? Math.round(food.sugar * servings * 10) / 10 : undefined,
    sodium: food.sodium ? Math.round(food.sodium * servings) : undefined,
  };

  const handleServingsChange = (delta: number) => {
    const newValue = Math.max(0.5, servings + delta);
    setServings(Math.round(newValue * 2) / 2); // Round to nearest 0.5
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddFood = async () => {
    setIsAdding(true);
    try {
      // First, create or find the food in the database
      const foodData = {
        name: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        servingSize: food.servingSize,
        servingUnit: food.servingUnit,
        barcode: food.barcode,
        brand: food.brand,
        category: 'scanned',
      };

      // Try to create food entry and log it
      const result = await api.logScannedFood(foodData, servings, mealType);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refreshToday();

        Alert.alert(
          'Added Successfully',
          `${food.name} added to ${mealType}`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Main', { screen: 'Nutrition' }),
            },
          ]
        );
      } else {
        throw new Error(result.error || 'Failed to add food');
      }
    } catch (error) {
      console.error('Failed to add food:', error);
      Alert.alert('Error', 'Failed to add food. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const getMealIcon = (type: string) => {
    switch (type) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'partly-sunny';
      case 'dinner': return 'moon';
      default: return 'cafe';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Food Image */}
        {food.imageUrl && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: food.imageUrl }} style={styles.foodImage} />
          </View>
        )}

        {/* Food Info */}
        <View style={styles.foodInfo}>
          {food.brand && <Text style={styles.brand}>{food.brand}</Text>}
          <Text style={styles.name}>{food.name}</Text>
          <View style={styles.barcodeTag}>
            <Ionicons name="barcode" size={14} color="#888" />
            <Text style={styles.barcodeText}>{food.barcode}</Text>
          </View>
        </View>

        {/* Meal Type */}
        <View style={styles.mealTypeCard}>
          <Ionicons name={getMealIcon(mealType) as any} size={20} color="#e74c3c" />
          <Text style={styles.mealTypeText}>
            Adding to <Text style={styles.mealTypeHighlight}>{mealType}</Text>
          </Text>
        </View>

        {/* Servings Selector */}
        <View style={styles.servingsCard}>
          <Text style={styles.servingsLabel}>Number of Servings</Text>
          <Text style={styles.servingSizeInfo}>
            1 serving = {food.servingSize}{food.servingUnit}
          </Text>

          <View style={styles.servingsSelector}>
            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => handleServingsChange(-0.5)}
            >
              <Ionicons name="remove" size={24} color="#e74c3c" />
            </TouchableOpacity>

            <View style={styles.servingsInputContainer}>
              <TextInput
                style={styles.servingsInput}
                value={String(servings)}
                onChangeText={(text) => {
                  const num = parseFloat(text);
                  if (!isNaN(num) && num > 0) setServings(num);
                }}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
            </View>

            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => handleServingsChange(0.5)}
            >
              <Ionicons name="add" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>

          {/* Quick serving buttons */}
          <View style={styles.quickServings}>
            {[0.5, 1, 1.5, 2].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.quickServingButton,
                  servings === val && styles.quickServingButtonActive,
                ]}
                onPress={() => {
                  setServings(val);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[
                  styles.quickServingText,
                  servings === val && styles.quickServingTextActive,
                ]}>
                  {val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Nutrition Facts */}
        <View style={styles.nutritionCard}>
          <Text style={styles.nutritionTitle}>Nutrition Facts</Text>
          <Text style={styles.nutritionSubtitle}>
            For {servings} serving{servings !== 1 ? 's' : ''} ({Math.round(food.servingSize * servings)}{food.servingUnit})
          </Text>

          {/* Calories */}
          <View style={styles.caloriesRow}>
            <Text style={styles.caloriesLabel}>Calories</Text>
            <Text style={styles.caloriesValue}>{calculatedNutrients.calories}</Text>
          </View>

          <View style={styles.divider} />

          {/* Macros */}
          <View style={styles.macrosGrid}>
            <View style={styles.macroCard}>
              <View style={[styles.macroIndicator, { backgroundColor: '#e74c3c' }]} />
              <Text style={styles.macroValue}>{calculatedNutrients.protein}g</Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroCard}>
              <View style={[styles.macroIndicator, { backgroundColor: '#3498db' }]} />
              <Text style={styles.macroValue}>{calculatedNutrients.carbs}g</Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroCard}>
              <View style={[styles.macroIndicator, { backgroundColor: '#f39c12' }]} />
              <Text style={styles.macroValue}>{calculatedNutrients.fat}g</Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>

          {/* Additional nutrients */}
          {(calculatedNutrients.fiber || calculatedNutrients.sugar || calculatedNutrients.sodium) && (
            <>
              <View style={styles.divider} />
              <View style={styles.additionalNutrients}>
                {calculatedNutrients.fiber !== undefined && (
                  <View style={styles.nutrientRow}>
                    <Text style={styles.nutrientName}>Dietary Fiber</Text>
                    <Text style={styles.nutrientValue}>{calculatedNutrients.fiber}g</Text>
                  </View>
                )}
                {calculatedNutrients.sugar !== undefined && (
                  <View style={styles.nutrientRow}>
                    <Text style={styles.nutrientName}>Sugars</Text>
                    <Text style={styles.nutrientValue}>{calculatedNutrients.sugar}g</Text>
                  </View>
                )}
                {calculatedNutrients.sodium !== undefined && (
                  <View style={styles.nutrientRow}>
                    <Text style={styles.nutrientName}>Sodium</Text>
                    <Text style={styles.nutrientValue}>{calculatedNutrients.sodium}mg</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.addButton, isAdding && styles.addButtonDisabled]}
          onPress={handleAddFood}
          disabled={isAdding}
        >
          {isAdding ? (
            <Text style={styles.addButtonText}>Adding...</Text>
          ) : (
            <>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.addButtonText}>
                Add {calculatedNutrients.calories} cal to {mealType}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  foodImage: {
    width: 150,
    height: 150,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
  },
  foodInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  brand: {
    color: '#e74c3c',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  barcodeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  barcodeText: {
    color: '#888',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  mealTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  mealTypeText: {
    color: '#888',
    fontSize: 14,
  },
  mealTypeHighlight: {
    color: '#e74c3c',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  servingsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  servingsLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  servingSizeInfo: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  servingsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  servingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsInputContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  servingsInput: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    minWidth: 60,
  },
  quickServings: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  quickServingButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
  },
  quickServingButtonActive: {
    backgroundColor: '#e74c3c',
  },
  quickServingText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  quickServingTextActive: {
    color: '#fff',
  },
  nutritionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  nutritionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  nutritionSubtitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 16,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  caloriesLabel: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  caloriesValue: {
    color: '#e74c3c',
    fontSize: 32,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  macrosGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  macroIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  macroValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  macroLabel: {
    color: '#888',
    fontSize: 12,
  },
  additionalNutrients: {
    gap: 12,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutrientName: {
    color: '#aaa',
    fontSize: 14,
  },
  nutrientValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 120,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingTop: 16,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  addButtonDisabled: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
