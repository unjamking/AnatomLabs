import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Food } from '../../types';
import api from '../../services/api';

interface AddFoodModalProps {
  visible: boolean;
  mealType: string;
  onClose: () => void;
  onAddFood: (foodId: string, servings: number, mealType: string) => void;
}

export default function AddFoodModal({ visible, mealType, onClose, onAddFood }: AddFoodModalProps) {
  const navigation = useNavigation<any>();
  const [search, setSearch] = useState('');
  const [foods, setFoods] = useState<Food[]>([]);
  const [filteredFoods, setFilteredFoods] = useState<Food[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [servings, setServings] = useState('1');

  const handleOpenScanner = () => {
    onClose();
    navigation.navigate('BarcodeScanner', { mealType });
  };

  useEffect(() => {
    if (visible) {
      loadFoods();
    } else {
      setSearch('');
      setSelectedFood(null);
      setServings('1');
    }
  }, [visible]);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredFoods(foods);
    } else {
      const searchLower = search.toLowerCase();
      setFilteredFoods(
        foods.filter(
          food =>
            food.name.toLowerCase().includes(searchLower) ||
            (food.category && food.category.toLowerCase().includes(searchLower))
        )
      );
    }
  }, [search, foods]);

  const loadFoods = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFoods();
      setFoods(data);
      setFilteredFoods(data);
    } catch (error) {
      console.error('Failed to load foods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFood = (food: Food) => {
    setSelectedFood(food);
    setServings('1');
  };

  const handleAddFood = () => {
    if (selectedFood) {
      const servingsNum = parseFloat(servings) || 1;
      onAddFood(selectedFood.id, servingsNum, mealType);
      onClose();
    }
  };

  const getMealTypeLabel = (type: string) => {
    switch (type) {
      case 'breakfast':
        return 'Breakfast';
      case 'lunch':
        return 'Lunch';
      case 'dinner':
        return 'Dinner';
      case 'snack':
        return 'Snack';
      default:
        return type;
    }
  };

  const renderFoodItem = ({ item }: { item: Food }) => (
    <TouchableOpacity
      style={[styles.foodItem, selectedFood?.id === item.id && styles.foodItemSelected]}
      onPress={() => handleSelectFood(item)}
    >
      <View style={styles.foodInfo}>
        <Text style={styles.foodName}>{item.name}</Text>
        <Text style={styles.foodServing}>
          {item.servingSize}{item.servingUnit} per serving
        </Text>
      </View>
      <View style={styles.foodMacros}>
        <Text style={styles.foodCalories}>{item.calories} cal</Text>
        <Text style={styles.foodMacroText}>
          P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Add to {getMealTypeLabel(mealType)}</Text>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods..."
              placeholderTextColor="#666"
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <TouchableOpacity style={styles.scanButtonModal} onPress={handleOpenScanner}>
              <Ionicons name="barcode" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {selectedFood ? (
          <View style={styles.selectedFoodContainer}>
            <View style={styles.selectedFoodInfo}>
              <Text style={styles.selectedFoodName}>{selectedFood.name}</Text>
              <Text style={styles.selectedFoodMacros}>
                {selectedFood.calories} cal per {selectedFood.servingSize}{selectedFood.servingUnit}
              </Text>
            </View>

            <View style={styles.servingsContainer}>
              <Text style={styles.servingsLabel}>Servings:</Text>
              <View style={styles.servingsInputRow}>
                <TouchableOpacity
                  style={styles.servingsButton}
                  onPress={() => setServings(String(Math.max(0.5, parseFloat(servings) - 0.5)))}
                >
                  <Text style={styles.servingsButtonText}>-</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.servingsInput}
                  value={servings}
                  onChangeText={setServings}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
                <TouchableOpacity
                  style={styles.servingsButton}
                  onPress={() => setServings(String(parseFloat(servings) + 0.5))}
                >
                  <Text style={styles.servingsButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.totalMacros}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                {Math.round(selectedFood.calories * parseFloat(servings || '0'))} cal
              </Text>
              <Text style={styles.totalMacroDetail}>
                P: {Math.round(selectedFood.protein * parseFloat(servings || '0'))}g |
                C: {Math.round(selectedFood.carbs * parseFloat(servings || '0'))}g |
                F: {Math.round(selectedFood.fat * parseFloat(servings || '0'))}g
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setSelectedFood(null)}
              >
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={handleAddFood}>
                <Text style={styles.addButtonText}>Add Food</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e74c3c" />
          </View>
        ) : (
          <FlatList
            data={filteredFoods}
            renderItem={renderFoodItem}
            keyExtractor={item => item.id}
            style={styles.foodList}
            contentContainerStyle={styles.foodListContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No foods found</Text>
            }
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  cancelText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  scanButtonModal: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodList: {
    flex: 1,
  },
  foodListContent: {
    padding: 16,
  },
  foodItem: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  foodItemSelected: {
    borderColor: '#e74c3c',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  foodServing: {
    color: '#666',
    fontSize: 12,
  },
  foodMacros: {
    alignItems: 'flex-end',
  },
  foodCalories: {
    color: '#e74c3c',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  foodMacroText: {
    color: '#888',
    fontSize: 11,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
  },
  selectedFoodContainer: {
    flex: 1,
    padding: 20,
  },
  selectedFoodInfo: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  selectedFoodName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedFoodMacros: {
    color: '#888',
    fontSize: 14,
  },
  servingsContainer: {
    marginBottom: 20,
  },
  servingsLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 10,
  },
  servingsInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  servingsButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  servingsButtonText: {
    color: '#e74c3c',
    fontSize: 24,
    fontWeight: 'bold',
  },
  servingsInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    width: 100,
    borderWidth: 1,
    borderColor: '#333',
  },
  totalMacros: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  totalLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 4,
  },
  totalValue: {
    color: '#e74c3c',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  totalMacroDetail: {
    color: '#888',
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e74c3c',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
