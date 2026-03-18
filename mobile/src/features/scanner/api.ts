import { apiClient } from '../../shared/api';
import { Food, FoodLog, StreakUpdate } from '../../shared/types';

export async function logScannedFood(
  foodData: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize: number;
    servingUnit: string;
    barcode?: string;
    brand?: string;
    category?: string;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    potassium?: number;
    calcium?: number;
    magnesium?: number;
    phosphorus?: number;
    iron?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
  },
  servings: number,
  mealType: string
): Promise<{ success: boolean; error?: string; log?: FoodLog }> {
  try {
    let foodId: string | null = null;

    if (foodData.barcode) {
      try {
        const response = await apiClient.get<Food[]>('/nutrition/foods', {});
        const existingFood = response.data.find((f: any) => f.barcode === foodData.barcode);
        if (existingFood) {
          foodId = existingFood.id;
        }
      } catch (e) {}
    }

    if (!foodId) {
      const createResponse = await apiClient.post<{ message: string; food: Food }>('/nutrition/foods', {
        name: foodData.name,
        calories: foodData.calories,
        protein: foodData.protein,
        carbs: foodData.carbs,
        fat: foodData.fat,
        fiber: foodData.fiber || 0,
        servingSize: foodData.servingSize,
        servingUnit: foodData.servingUnit,
        barcode: foodData.barcode,
        brand: foodData.brand,
        category: foodData.category || 'scanned',
        sodium: foodData.sodium || 0,
        potassium: foodData.potassium || 0,
        calcium: foodData.calcium || 0,
        magnesium: foodData.magnesium || 0,
        phosphorus: foodData.phosphorus || 0,
        iron: foodData.iron || 0,
        vitaminA: foodData.vitaminA || 0,
        vitaminC: foodData.vitaminC || 0,
        vitaminD: foodData.vitaminD || 0,
      });
      foodId = createResponse.data.food?.id;
    }

    if (!foodId) {
      return { success: false, error: 'Failed to create food entry' };
    }

    const logResponse = await apiClient.post<{ message: string; log: FoodLog; streak: StreakUpdate }>(
      '/nutrition/log',
      { foodId, servings, mealType, date: new Date().toISOString() }
    );

    return { success: true, log: logResponse.data.log };
  } catch (error: any) {
    console.error('Failed to log scanned food:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to log food',
    };
  }
}

export async function scanFoodImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<{
  success: boolean;
  foods: Array<{
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
    estimatedSodium: number;
    estimatedPotassium: number;
    estimatedCalcite: number;
    estimatedMagnesium: number;
    estimatedPhosphorus: number;
    estimatedIron: number;
    estimatedVitaminC: number;
    estimatedVitaminA: number;
  }>;
  totalEstimatedCalories: number;
  totalMacros: { protein: number; carbs: number; fat: number; fiber: number };
  totalElectrolytes: { sodium: number; potassium: number };
  totalMinerals: { calcium: number; magnesium: number; phosphorus: number; iron: number };
  mealDescription: string;
  confidence: 'low' | 'medium' | 'high';
  disclaimer: string;
}> {
  try {
    const response = await apiClient.post('/nutrition/scan-food', { image: imageBase64, mimeType });
    return response.data;
  } catch (error: any) {
    console.error('Food scan error:', error);
    return {
      success: false,
      foods: [],
      totalEstimatedCalories: 0,
      totalMacros: { protein: 0, carbs: 0, fat: 0, fiber: 0 },
      totalElectrolytes: { sodium: 0, potassium: 0 },
      totalMinerals: { calcium: 0, magnesium: 0, phosphorus: 0, iron: 0 },
      mealDescription: 'Failed to analyze image',
      confidence: 'low',
      disclaimer: error.message || 'Unable to scan food',
    };
  }
}
