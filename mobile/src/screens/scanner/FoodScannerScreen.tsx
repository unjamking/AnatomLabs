import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import api from '../../services/api';
import { useNutrition } from '../../context/NutritionContext';

type RouteParams = {
  FoodScanner: {
    mealType?: string;
  };
};

interface RecognizedFood {
  name: string;
  confidence: number;
  estimatedCalories: number;
  estimatedProtein: number;
  estimatedCarbs: number;
  estimatedFat: number;
  estimatedFiber: number;
  servingSize: string;
  servingUnit: string;
  category: string;
  // Electrolytes
  estimatedSodium: number;
  estimatedPotassium: number;
  // Macrominerals
  estimatedCalcite: number; // calcium
  estimatedMagnesium: number;
  estimatedPhosphorus: number;
  // Key vitamins
  estimatedIron: number;
  estimatedVitaminC: number;
  estimatedVitaminA: number;
}

interface ScanResult {
  success: boolean;
  foods: RecognizedFood[];
  totalEstimatedCalories: number;
  totalMacros: { protein: number; carbs: number; fat: number; fiber: number };
  totalElectrolytes: { sodium: number; potassium: number };
  totalMinerals: { calcium: number; magnesium: number; phosphorus: number; iron: number };
  mealDescription: string;
  confidence: 'low' | 'medium' | 'high';
  disclaimer: string;
}

export default function FoodScannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'FoodScanner'>>();
  const mealType = route.params?.mealType || 'snack';
  const { refreshToday } = useNutrition();

  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedFoods, setSelectedFoods] = useState<Set<number>>(new Set());
  const [isLogging, setIsLogging] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState(mealType);
  const [showMealPicker, setShowMealPicker] = useState(false);

  const cameraRef = useRef<any>(null);

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
    { id: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline' },
    { id: 'dinner', label: 'Dinner', icon: 'moon-outline' },
    { id: 'snack', label: 'Snack', icon: 'cafe-outline' },
  ];

  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.6, // Better quality for improved AI recognition accuracy
      });

      setCapturedImage(photo.uri);
      analyzeImage(photo.base64);
    } catch (error) {
      console.error('Failed to take picture:', error);
      Alert.alert('Error', 'Failed to capture image');
      setIsCapturing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6, // Better quality for improved AI recognition accuracy
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      analyzeImage(result.assets[0].base64 || '');
    }
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await api.scanFoodImage(base64, 'image/jpeg');
      setScanResult(result);

      if (result.success && result.foods.length > 0) {
        // Select all foods by default
        setSelectedFoods(new Set(result.foods.map((_, i) => i)));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      Alert.alert('Error', 'Failed to analyze the image. Please try again.');
    } finally {
      setIsAnalyzing(false);
      setIsCapturing(false);
    }
  };

  const toggleFoodSelection = (index: number) => {
    const newSelected = new Set(selectedFoods);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFoods(newSelected);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const logSelectedFoods = async () => {
    if (!scanResult || selectedFoods.size === 0) return;

    // Show meal picker first
    setShowMealPicker(true);
  };

  const confirmLogFoods = async () => {
    if (!scanResult || selectedFoods.size === 0) return;

    setShowMealPicker(false);
    setIsLogging(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Log each selected food
      for (const index of selectedFoods) {
        const food = scanResult.foods[index];

        // Create a custom food entry and log it with full nutrition data
        await api.logScannedFood(
          {
            name: food.name,
            calories: food.estimatedCalories,
            protein: food.estimatedProtein,
            carbs: food.estimatedCarbs,
            fat: food.estimatedFat,
            fiber: food.estimatedFiber || 0,
            servingSize: parseFloat(food.servingSize) || 1,
            servingUnit: food.servingUnit || 'serving',
            category: food.category || 'scanned',
            // Electrolytes & Minerals
            sodium: food.estimatedSodium || 0,
            potassium: food.estimatedPotassium || 0,
            calcium: food.estimatedCalcite || 0,
            magnesium: food.estimatedMagnesium || 0,
            phosphorus: food.estimatedPhosphorus || 0,
            iron: food.estimatedIron || 0,
            // Vitamins
            vitaminA: food.estimatedVitaminA || 0,
            vitaminC: food.estimatedVitaminC || 0,
          },
          1,
          selectedMealType
        );
      }

      await refreshToday();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert(
        'Foods Logged!',
        `Added ${selectedFoods.size} item(s) to ${selectedMealType}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Main', { screen: 'Nutrition' }),
          },
        ]
      );
    } catch (error) {
      console.error('Failed to log foods:', error);
      Alert.alert('Error', 'Failed to log some foods. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setScanResult(null);
    setSelectedFoods(new Set());
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#2ecc71';
    if (confidence >= 0.5) return '#f39c12';
    return '#e74c3c';
  };

  const getConfidenceBadge = (confidence: 'low' | 'medium' | 'high') => {
    const colors = { low: '#e74c3c', medium: '#f39c12', high: '#2ecc71' };
    return colors[confidence];
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e74c3c" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera" size={64} color="#e74c3c" />
        <Text style={styles.permissionText}>Camera access required</Text>
        <Text style={styles.permissionSubtext}>
          Allow camera access to scan your food
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Results view
  if (scanResult) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={retake}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Results</Text>
          <View style={styles.headerButton} />
        </View>

        <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          {/* Captured image preview */}
          {capturedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
            </View>
          )}

          {/* Meal description */}
          <View style={styles.descriptionCard}>
            <View style={styles.descriptionHeader}>
              <Text style={styles.descriptionText}>{scanResult.mealDescription}</Text>
              <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceBadge(scanResult.confidence) }]}>
                <Text style={styles.confidenceText}>{scanResult.confidence}</Text>
              </View>
            </View>
          </View>

          {/* Totals */}
          {scanResult.foods.length > 0 && (
            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>
                Total ({selectedFoods.size} selected)
              </Text>
              <View style={styles.totalsRow}>
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>
                    {scanResult.foods
                      .filter((_, i) => selectedFoods.has(i))
                      .reduce((sum, f) => sum + f.estimatedCalories, 0)}
                  </Text>
                  <Text style={styles.totalLabel}>Calories</Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>
                    {scanResult.foods
                      .filter((_, i) => selectedFoods.has(i))
                      .reduce((sum, f) => sum + f.estimatedProtein, 0).toFixed(1)}g
                  </Text>
                  <Text style={styles.totalLabel}>Protein</Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>
                    {scanResult.foods
                      .filter((_, i) => selectedFoods.has(i))
                      .reduce((sum, f) => sum + f.estimatedCarbs, 0).toFixed(1)}g
                  </Text>
                  <Text style={styles.totalLabel}>Carbs</Text>
                </View>
                <View style={styles.totalDivider} />
                <View style={styles.totalItem}>
                  <Text style={styles.totalValue}>
                    {scanResult.foods
                      .filter((_, i) => selectedFoods.has(i))
                      .reduce((sum, f) => sum + f.estimatedFat, 0).toFixed(1)}g
                  </Text>
                  <Text style={styles.totalLabel}>Fat</Text>
                </View>
              </View>

              {/* Electrolytes & Minerals Summary */}
              <View style={styles.micronutrientsSummary}>
                <Text style={styles.micronutrientsTitle}>Electrolytes & Minerals</Text>
                <View style={styles.micronutrientsRow}>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedSodium || 0), 0)}mg
                    </Text>
                    <Text style={styles.micronutrientLabel}>Sodium</Text>
                  </View>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedPotassium || 0), 0)}mg
                    </Text>
                    <Text style={styles.micronutrientLabel}>Potassium</Text>
                  </View>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedCalcite || 0), 0)}mg
                    </Text>
                    <Text style={styles.micronutrientLabel}>Calcium</Text>
                  </View>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedMagnesium || 0), 0)}mg
                    </Text>
                    <Text style={styles.micronutrientLabel}>Magnesium</Text>
                  </View>
                </View>
                <View style={styles.micronutrientsRow}>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedPhosphorus || 0), 0)}mg
                    </Text>
                    <Text style={styles.micronutrientLabel}>Phosphorus</Text>
                  </View>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedIron || 0), 0).toFixed(1)}mg
                    </Text>
                    <Text style={styles.micronutrientLabel}>Iron</Text>
                  </View>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedVitaminC || 0), 0)}mg
                    </Text>
                    <Text style={styles.micronutrientLabel}>Vitamin C</Text>
                  </View>
                  <View style={styles.micronutrientItem}>
                    <Text style={styles.micronutrientValue}>
                      {scanResult.foods
                        .filter((_, i) => selectedFoods.has(i))
                        .reduce((sum, f) => sum + (f.estimatedFiber || 0), 0).toFixed(1)}g
                    </Text>
                    <Text style={styles.micronutrientLabel}>Fiber</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Food items */}
          {scanResult.foods.length > 0 ? (
            <View style={styles.foodsList}>
              <Text style={styles.sectionTitle}>Detected Foods</Text>
              <Text style={styles.sectionSubtitle}>Tap to select/deselect items to log</Text>

              {scanResult.foods.map((food, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.foodCard,
                    selectedFoods.has(index) && styles.foodCardSelected,
                  ]}
                  onPress={() => toggleFoodSelection(index)}
                >
                  <View style={styles.foodCheckbox}>
                    <Ionicons
                      name={selectedFoods.has(index) ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selectedFoods.has(index) ? '#e74c3c' : '#666'}
                    />
                  </View>

                  <View style={styles.foodInfo}>
                    <View style={styles.foodHeader}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <View
                        style={[
                          styles.foodConfidence,
                          { backgroundColor: getConfidenceColor(food.confidence) + '30' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.foodConfidenceText,
                            { color: getConfidenceColor(food.confidence) },
                          ]}
                        >
                          {Math.round(food.confidence * 100)}%
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.foodServing}>
                      {food.servingSize} {food.servingUnit}
                    </Text>

                    <View style={styles.foodMacros}>
                      <Text style={styles.foodCalories}>{food.estimatedCalories} cal</Text>
                      <Text style={styles.foodMacroText}>
                        P: {food.estimatedProtein}g · C: {food.estimatedCarbs}g · F: {food.estimatedFat}g
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noFoodsCard}>
              <Ionicons name="restaurant-outline" size={48} color="#666" />
              <Text style={styles.noFoodsText}>No foods detected</Text>
              <Text style={styles.noFoodsSubtext}>
                Try taking a clearer photo or use manual entry
              </Text>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.disclaimerText}>{scanResult.disclaimer}</Text>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Action buttons */}
        {scanResult.foods.length > 0 && (
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <Ionicons name="camera" size={20} color="#e74c3c" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.logButton,
                (selectedFoods.size === 0 || isLogging) && styles.logButtonDisabled,
              ]}
              onPress={logSelectedFoods}
              disabled={selectedFoods.size === 0 || isLogging}
            >
              {isLogging ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.logText}>
                    Log {selectedFoods.size} item{selectedFoods.size !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Meal Type Picker Modal */}
        <Modal
          visible={showMealPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowMealPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.mealPickerContainer}>
              <View style={styles.mealPickerHeader}>
                <Text style={styles.mealPickerTitle}>Add to which meal?</Text>
                <TouchableOpacity onPress={() => setShowMealPicker(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>

              <View style={styles.mealOptions}>
                {mealTypes.map((meal) => (
                  <TouchableOpacity
                    key={meal.id}
                    style={[
                      styles.mealOption,
                      selectedMealType === meal.id && styles.mealOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedMealType(meal.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Ionicons
                      name={meal.icon as any}
                      size={28}
                      color={selectedMealType === meal.id ? '#e74c3c' : '#888'}
                    />
                    <Text
                      style={[
                        styles.mealOptionText,
                        selectedMealType === meal.id && styles.mealOptionTextSelected,
                      ]}
                    >
                      {meal.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.confirmMealButton}
                onPress={confirmLogFoods}
              >
                <Text style={styles.confirmMealText}>
                  Add to {mealTypes.find(m => m.id === selectedMealType)?.label}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Camera view
  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        mode="picture"
      />

      {/* Overlay */}
      <View style={styles.cameraOverlay}>
        {/* Header */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Scan Food</Text>
          <TouchableOpacity style={styles.headerButton} onPress={pickImage}>
            <Ionicons name="images" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Ionicons name="restaurant" size={32} color="#fff" />
          <Text style={styles.instructionText}>
            Point camera at your food
          </Text>
          <Text style={styles.instructionSubtext}>
            AI will identify items and estimate nutrition
          </Text>
        </View>

        {/* Capture button */}
        <View style={styles.captureArea}>
          {isCapturing || isAnalyzing ? (
            <View style={styles.analyzingContainer}>
              <ActivityIndicator size="large" color="#e74c3c" />
              <Text style={styles.analyzingText}>
                {isAnalyzing ? 'Analyzing food...' : 'Capturing...'}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          )}

          <Text style={styles.captureHint}>Tap to capture</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#0a0a0a',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructions: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  captureArea: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e74c3c',
  },
  captureHint: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 12,
  },
  analyzingContainer: {
    alignItems: 'center',
  },
  analyzingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12,
  },
  resultsScroll: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  imagePreview: {
    height: 200,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  descriptionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  descriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  descriptionText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  totalsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  totalsTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 12,
    textAlign: 'center',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalDivider: {
    width: 1,
    backgroundColor: '#333',
  },
  totalValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalLabel: {
    color: '#888',
    fontSize: 11,
    marginTop: 4,
  },
  micronutrientsSummary: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  micronutrientsTitle: {
    color: '#888',
    fontSize: 11,
    marginBottom: 10,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  micronutrientsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  micronutrientItem: {
    flex: 1,
    alignItems: 'center',
  },
  micronutrientValue: {
    color: '#aaa',
    fontSize: 13,
    fontWeight: '600',
  },
  micronutrientLabel: {
    color: '#666',
    fontSize: 9,
    marginTop: 2,
  },
  foodsList: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: '#666',
    fontSize: 12,
    marginBottom: 12,
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  foodCardSelected: {
    borderColor: '#e74c3c',
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  foodCheckbox: {
    marginRight: 12,
    justifyContent: 'center',
  },
  foodInfo: {
    flex: 1,
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  foodName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  foodConfidence: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  foodConfidenceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  foodServing: {
    color: '#666',
    fontSize: 12,
    marginBottom: 6,
  },
  foodMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  foodCalories: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  foodMacroText: {
    color: '#888',
    fontSize: 12,
  },
  noFoodsCard: {
    alignItems: 'center',
    padding: 40,
    marginHorizontal: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
  },
  noFoodsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  noFoodsSubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  disclaimerText: {
    color: '#666',
    fontSize: 11,
    flex: 1,
    lineHeight: 16,
  },
  bottomPadding: {
    height: 100,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 12,
  },
  retakeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  retakeText: {
    color: '#e74c3c',
    fontSize: 15,
    fontWeight: '600',
  },
  logButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logButtonDisabled: {
    opacity: 0.5,
  },
  logText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
  },
  permissionSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionButton: {
    marginTop: 24,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backLink: {
    color: '#888',
    fontSize: 14,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  mealPickerContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  mealPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  mealPickerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  mealOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  mealOption: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#2a2a2a',
    minWidth: 75,
  },
  mealOptionSelected: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    borderWidth: 2,
    borderColor: '#e74c3c',
  },
  mealOptionText: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  mealOptionTextSelected: {
    color: '#e74c3c',
  },
  confirmMealButton: {
    marginHorizontal: 20,
    backgroundColor: '#e74c3c',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmMealText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
