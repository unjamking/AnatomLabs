import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Platform,
  Vibration,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

type RouteParams = {
  BarcodeScannerScreen: {
    mealType?: string;
    onScanComplete?: (food: ScannedFood) => void;
  };
};

export interface ScannedFood {
  barcode: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  servingSize: number;
  servingUnit: string;
  imageUrl?: string;
}

interface OpenFoodFactsProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    'energy-kcal_serving'?: number;
    proteins_100g?: number;
    proteins_serving?: number;
    carbohydrates_100g?: number;
    carbohydrates_serving?: number;
    fat_100g?: number;
    fat_serving?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
  image_url?: string;
  image_front_url?: string;
}

export default function BarcodeScannerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RouteParams, 'BarcodeScannerScreen'>>();
  const mealType = route.params?.mealType || 'snack';

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [scannedData, setScannedData] = useState<ScannedFood | null>(null);
  const [scanHistory, setScanHistory] = useState<ScannedFood[]>([]);
  const [flashOn, setFlashOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startScanAnimation();
  }, []);

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const triggerSuccessFeedback = () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate(100);
    }

    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const lookupBarcode = async (barcode: string): Promise<ScannedFood | null> => {
    try {
      // Use Open Food Facts API (free, no API key required)
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
      );
      const data = await response.json();

      if (data.status !== 1 || !data.product) {
        return null;
      }

      const product: OpenFoodFactsProduct = data.product;
      const nutriments = product.nutriments || {};

      // Parse serving size
      let servingSize = 100;
      let servingUnit = 'g';
      if (product.serving_quantity) {
        servingSize = product.serving_quantity;
      } else if (product.serving_size) {
        const match = product.serving_size.match(/(\d+\.?\d*)\s*(g|ml|oz)?/i);
        if (match) {
          servingSize = parseFloat(match[1]);
          servingUnit = match[2] || 'g';
        }
      }

      // Calculate per serving if we have 100g values
      const factor = servingSize / 100;

      const scannedFood: ScannedFood = {
        barcode,
        name: product.product_name || 'Unknown Product',
        brand: product.brands,
        calories: Math.round(
          nutriments['energy-kcal_serving'] ||
          (nutriments['energy-kcal_100g'] || 0) * factor
        ),
        protein: Math.round(
          (nutriments.proteins_serving ||
            (nutriments.proteins_100g || 0) * factor) * 10
        ) / 10,
        carbs: Math.round(
          (nutriments.carbohydrates_serving ||
            (nutriments.carbohydrates_100g || 0) * factor) * 10
        ) / 10,
        fat: Math.round(
          (nutriments.fat_serving ||
            (nutriments.fat_100g || 0) * factor) * 10
        ) / 10,
        fiber: nutriments.fiber_100g
          ? Math.round(nutriments.fiber_100g * factor * 10) / 10
          : undefined,
        sugar: nutriments.sugars_100g
          ? Math.round(nutriments.sugars_100g * factor * 10) / 10
          : undefined,
        sodium: nutriments.sodium_100g
          ? Math.round(nutriments.sodium_100g * factor * 1000)
          : undefined,
        servingSize,
        servingUnit,
        imageUrl: product.image_front_url || product.image_url,
      };

      return scannedFood;
    } catch (error) {
      console.error('Barcode lookup failed:', error);
      return null;
    }
  };

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    const { data } = result;

    if (!isScanning || isLoading) return;
    if (data === lastScannedCode) return; // Prevent duplicate scans

    setIsScanning(false);
    setIsLoading(true);
    setLastScannedCode(data);
    triggerSuccessFeedback();

    const food = await lookupBarcode(data);

    if (food) {
      setScannedData(food);
      setScanHistory(prev => {
        const filtered = prev.filter(f => f.barcode !== food.barcode);
        return [food, ...filtered].slice(0, 10);
      });
    } else {
      Alert.alert(
        'Product Not Found',
        `Barcode ${data} not found in database. Would you like to add it manually?`,
        [
          {
            text: 'Cancel',
            onPress: () => {
              setIsScanning(true);
              setLastScannedCode(null);
            },
            style: 'cancel',
          },
          {
            text: 'Add Manually',
            onPress: () => {
              navigation.navigate('ManualFoodEntry', { barcode: data, mealType });
            },
          },
        ]
      );
    }
    setIsLoading(false);
  };

  const handleAddFood = () => {
    if (scannedData) {
      navigation.navigate('ScannedFoodDetails', {
        food: scannedData,
        mealType,
      });
    }
  };

  const handleScanAgain = () => {
    setScannedData(null);
    setIsScanning(true);
    setLastScannedCode(null);
  };

  const toggleFlash = () => {
    setFlashOn(!flashOn);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e74c3c" />
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera" size={64} color="#e74c3c" />
        <Text style={styles.permissionText}>Camera access required</Text>
        <Text style={styles.permissionSubtext}>
          Please enable camera access to scan food barcodes.
        </Text>
        <TouchableOpacity style={styles.settingsButton} onPress={requestPermission}>
          <Text style={styles.settingsButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        mode="picture"
        enableTorch={flashOn}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
        }}
        onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top overlay */}
        <View style={styles.overlayTop}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        </View>

        {/* Middle section with scan area */}
        <View style={styles.overlayMiddle}>
          <View style={styles.overlaySide}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          </View>

          {/* Scan area */}
          <Animated.View
            style={[
              styles.scanArea,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            {/* Corner markers */}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />

            {/* Scan line */}
            {isScanning && (
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, SCAN_AREA_SIZE - 4],
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}
          </Animated.View>

          <View style={styles.overlaySide}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          </View>
        </View>

        {/* Bottom overlay */}
        <View style={styles.overlayBottom}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        </View>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Barcode</Text>
        <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
          <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      {isScanning && !isLoading && (
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            Point your camera at a barcode
          </Text>
          <Text style={styles.instructionSubtext}>
            Works with food packages, nutrition labels, and QR codes
          </Text>
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#e74c3c" />
          <Text style={styles.loadingText}>Looking up product...</Text>
        </View>
      )}

      {/* Scanned Result */}
      {scannedData && !isLoading && (
        <View style={styles.resultContainer}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultBrand}>{scannedData.brand || 'Unknown Brand'}</Text>
                <Text style={styles.resultName}>{scannedData.name}</Text>
                <Text style={styles.resultServing}>
                  Per {scannedData.servingSize}{scannedData.servingUnit} serving
                </Text>
              </View>
              <View style={styles.caloriesBadge}>
                <Text style={styles.caloriesValue}>{scannedData.calories}</Text>
                <Text style={styles.caloriesLabel}>cal</Text>
              </View>
            </View>

            <View style={styles.macrosRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{scannedData.protein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{scannedData.carbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroDivider} />
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{scannedData.fat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>

            {(scannedData.fiber || scannedData.sugar || scannedData.sodium) && (
              <View style={styles.extraNutrients}>
                {scannedData.fiber && (
                  <Text style={styles.extraNutrientText}>Fiber: {scannedData.fiber}g</Text>
                )}
                {scannedData.sugar && (
                  <Text style={styles.extraNutrientText}>Sugar: {scannedData.sugar}g</Text>
                )}
                {scannedData.sodium && (
                  <Text style={styles.extraNutrientText}>Sodium: {scannedData.sodium}mg</Text>
                )}
              </View>
            )}

            <View style={styles.resultButtons}>
              <TouchableOpacity style={styles.scanAgainButton} onPress={handleScanAgain}>
                <Ionicons name="scan" size={20} color="#e74c3c" />
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addFoodButton} onPress={handleAddFood}>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.addFoodText}>Add to {mealType}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Recent Scans */}
      {scanHistory.length > 0 && isScanning && !scannedData && (
        <View style={styles.historyContainer}>
          <Text style={styles.historyTitle}>Recent Scans</Text>
          <View style={styles.historyList}>
            {scanHistory.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.barcode}
                style={styles.historyItem}
                onPress={() => {
                  setScannedData(item);
                  setIsScanning(false);
                }}
              >
                <Text style={styles.historyName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.historyCalories}>{item.calories} cal</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    overflow: 'hidden',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    overflow: 'hidden',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    overflow: 'hidden',
  },
  scanArea: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#e74c3c',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#e74c3c',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  instructions: {
    position: 'absolute',
    top: height * 0.5 + SCAN_AREA_SIZE / 2 + 30,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: height * 0.5 - 50,
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
  resultContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  resultInfo: {
    flex: 1,
    marginRight: 16,
  },
  resultBrand: {
    color: '#e74c3c',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  resultName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  resultServing: {
    color: '#888',
    fontSize: 13,
  },
  caloriesBadge: {
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caloriesValue: {
    color: '#e74c3c',
    fontSize: 24,
    fontWeight: 'bold',
  },
  caloriesLabel: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 2,
  },
  macrosRow: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroDivider: {
    width: 1,
    backgroundColor: '#444',
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
  extraNutrients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  extraNutrientText: {
    color: '#888',
    fontSize: 13,
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resultButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  scanAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  scanAgainText: {
    color: '#e74c3c',
    fontSize: 15,
    fontWeight: '600',
  },
  addFoodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addFoodText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  historyContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 16,
    right: 16,
  },
  historyTitle: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  historyList: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  historyName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  historyCalories: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  permissionSubtext: {
    color: '#888',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  settingsButton: {
    marginTop: 24,
    backgroundColor: '#e74c3c',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  settingsButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#888',
    fontSize: 16,
  },
});
