import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

type RouteParams = {
  ManualFoodEntry: {
    barcode?: string;
    mealType: string;
  };
};

interface FoodFormData {
  name: string;
  brand: string;
  servingSize: string;
  servingUnit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
}

export default function ManualFoodEntryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'ManualFoodEntry'>>();
  const { barcode, mealType } = route.params;
  const { refreshToday } = useNutrition();

  const [formData, setFormData] = useState<FoodFormData>({
    name: '',
    brand: '',
    servingSize: '100',
    servingUnit: 'g',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: '',
    sugar: '',
    sodium: '',
  });

  const [servings, setServings] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FoodFormData, string>>>({});

  const servingUnits = ['g', 'ml', 'oz', 'cup', 'tbsp', 'tsp', 'piece'];

  const updateField = (field: keyof FoodFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FoodFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Food name is required';
    }
    if (!formData.calories || parseFloat(formData.calories) < 0) {
      newErrors.calories = 'Valid calories required';
    }
    if (!formData.protein || parseFloat(formData.protein) < 0) {
      newErrors.protein = 'Valid protein required';
    }
    if (!formData.carbs || parseFloat(formData.carbs) < 0) {
      newErrors.carbs = 'Valid carbs required';
    }
    if (!formData.fat || parseFloat(formData.fat) < 0) {
      newErrors.fat = 'Valid fat required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsSubmitting(true);
    try {
      const foodData = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        calories: parseFloat(formData.calories),
        protein: parseFloat(formData.protein),
        carbs: parseFloat(formData.carbs),
        fat: parseFloat(formData.fat),
        fiber: formData.fiber ? parseFloat(formData.fiber) : undefined,
        sugar: formData.sugar ? parseFloat(formData.sugar) : undefined,
        sodium: formData.sodium ? parseFloat(formData.sodium) : undefined,
        servingSize: parseFloat(formData.servingSize) || 100,
        servingUnit: formData.servingUnit,
        barcode: barcode,
        category: 'custom',
      };

      const result = await api.logScannedFood(foodData, servings, mealType);

      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await refreshToday();

        Alert.alert(
          'Food Added',
          `${formData.name} has been added to ${mealType}`,
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
      setIsSubmitting(false);
    }
  };

  const renderInput = (
    label: string,
    field: keyof FoodFormData,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'numeric' | 'decimal-pad';
      suffix?: string;
      required?: boolean;
    }
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label}
        {options?.required && <Text style={styles.required}> *</Text>}
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, errors[field] && styles.inputError]}
          placeholder={placeholder}
          placeholderTextColor="#666"
          value={formData[field]}
          onChangeText={(value) => updateField(field, value)}
          keyboardType={options?.keyboardType || 'default'}
        />
        {options?.suffix && <Text style={styles.inputSuffix}>{options.suffix}</Text>}
      </View>
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Food Manually</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {barcode && (
          <View style={styles.barcodeInfo}>
            <Ionicons name="barcode" size={20} color="#e74c3c" />
            <Text style={styles.barcodeText}>Barcode: {barcode}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          {renderInput('Food Name', 'name', 'e.g., Chocolate Chip Cookies', {
            required: true,
          })}

          {renderInput('Brand (Optional)', 'brand', 'e.g., Nabisco')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Serving Size</Text>

          <View style={styles.servingRow}>
            <View style={styles.servingSizeInput}>
              <Text style={styles.inputLabel}>Amount</Text>
              <TextInput
                style={styles.input}
                placeholder="100"
                placeholderTextColor="#666"
                value={formData.servingSize}
                onChangeText={(value) => updateField('servingSize', value)}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.servingUnitPicker}>
              <Text style={styles.inputLabel}>Unit</Text>
              <View style={styles.unitButtons}>
                {servingUnits.slice(0, 4).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitButton,
                      formData.servingUnit === unit && styles.unitButtonActive,
                    ]}
                    onPress={() => updateField('servingUnit', unit)}
                  >
                    <Text
                      style={[
                        styles.unitButtonText,
                        formData.servingUnit === unit && styles.unitButtonTextActive,
                      ]}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Facts (per serving)</Text>

          {renderInput('Calories', 'calories', '0', {
            keyboardType: 'decimal-pad',
            suffix: 'kcal',
            required: true,
          })}

          <View style={styles.macroRow}>
            <View style={styles.macroInput}>
              {renderInput('Protein', 'protein', '0', {
                keyboardType: 'decimal-pad',
                suffix: 'g',
                required: true,
              })}
            </View>
            <View style={styles.macroInput}>
              {renderInput('Carbs', 'carbs', '0', {
                keyboardType: 'decimal-pad',
                suffix: 'g',
                required: true,
              })}
            </View>
            <View style={styles.macroInput}>
              {renderInput('Fat', 'fat', '0', {
                keyboardType: 'decimal-pad',
                suffix: 'g',
                required: true,
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Nutrients (Optional)</Text>

          <View style={styles.macroRow}>
            <View style={styles.macroInput}>
              {renderInput('Fiber', 'fiber', '0', {
                keyboardType: 'decimal-pad',
                suffix: 'g',
              })}
            </View>
            <View style={styles.macroInput}>
              {renderInput('Sugar', 'sugar', '0', {
                keyboardType: 'decimal-pad',
                suffix: 'g',
              })}
            </View>
            <View style={styles.macroInput}>
              {renderInput('Sodium', 'sodium', '0', {
                keyboardType: 'decimal-pad',
                suffix: 'mg',
              })}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servings to Log</Text>

          <View style={styles.servingsSelector}>
            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => setServings(Math.max(0.5, servings - 0.5))}
            >
              <Ionicons name="remove" size={24} color="#e74c3c" />
            </TouchableOpacity>

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

            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => setServings(servings + 0.5)}
            >
              <Ionicons name="add" size={24} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preview */}
        {formData.calories && (
          <View style={styles.preview}>
            <Text style={styles.previewTitle}>Total for {servings} serving(s)</Text>
            <View style={styles.previewRow}>
              <Text style={styles.previewLabel}>Calories</Text>
              <Text style={styles.previewValue}>
                {Math.round(parseFloat(formData.calories || '0') * servings)}
              </Text>
            </View>
            <View style={styles.previewMacros}>
              <Text style={styles.previewMacro}>
                P: {Math.round(parseFloat(formData.protein || '0') * servings)}g
              </Text>
              <Text style={styles.previewMacro}>
                C: {Math.round(parseFloat(formData.carbs || '0') * servings)}g
              </Text>
              <Text style={styles.previewMacro}>
                F: {Math.round(parseFloat(formData.fat || '0') * servings)}g
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? 'Adding...' : `Add to ${mealType}`}
          </Text>
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
  barcodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  barcodeText: {
    color: '#e74c3c',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  inputSuffix: {
    color: '#888',
    fontSize: 14,
    marginLeft: 10,
    width: 40,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
  servingRow: {
    flexDirection: 'row',
    gap: 16,
  },
  servingSizeInput: {
    flex: 1,
  },
  servingUnitPicker: {
    flex: 2,
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  unitButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  unitButtonActive: {
    backgroundColor: '#e74c3c',
    borderColor: '#e74c3c',
  },
  unitButtonText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  unitButtonTextActive: {
    color: '#fff',
  },
  macroRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroInput: {
    flex: 1,
  },
  servingsSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  servingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingsInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 80,
    borderWidth: 1,
    borderColor: '#333',
  },
  preview: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e74c3c',
    marginBottom: 20,
  },
  previewTitle: {
    color: '#888',
    fontSize: 13,
    marginBottom: 12,
    textAlign: 'center',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  previewLabel: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  previewValue: {
    color: '#e74c3c',
    fontSize: 28,
    fontWeight: 'bold',
  },
  previewMacros: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  previewMacro: {
    color: '#888',
    fontSize: 14,
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
  submitButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
