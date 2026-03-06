import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacros } from '../services/nutritionCalculator';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const MEAL_CALORIE_SPLIT = { breakfast: 0.25, lunch: 0.35, dinner: 0.30, snack: 0.10 };

const CATEGORY_MEAL_MAP: Record<string, string[]> = {
  breakfast: ['dairy', 'grains', 'fruits', 'protein'],
  lunch: ['protein', 'grains', 'vegetables', 'legumes'],
  dinner: ['protein', 'vegetables', 'grains', 'fats_oils'],
  snack: ['nuts_seeds', 'fruits', 'dairy', 'snacks'],
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildMeal(
  foods: any[],
  targetCals: number,
  targetProtein: number,
  mealType: string,
  allergies: string[],
  dietPrefs: string[]
) {
  const categories = CATEGORY_MEAL_MAP[mealType] || ['protein', 'grains', 'vegetables'];

  let filteredFoods = foods.filter(f => {
    if (allergies.length > 0) {
      const foodAllergens = (f.allergens || []).map((a: string) => a.toLowerCase());
      if (allergies.some(a => foodAllergens.includes(a.toLowerCase()))) return false;
    }
    if (dietPrefs.includes('vegetarian') && !f.isVegetarian && ['protein'].includes(f.category?.toLowerCase())) return false;
    if (dietPrefs.includes('vegan') && !f.isVegan) return false;
    if (dietPrefs.includes('halal') && !f.isHalal && f.category?.toLowerCase() === 'protein') return false;
    if (dietPrefs.includes('gluten_free') && !f.isGlutenFree && ['grains'].includes(f.category?.toLowerCase())) return false;
    return true;
  });

  const mealItems: { food: any; servings: number; calories: number; protein: number; carbs: number; fat: number }[] = [];
  let remainingCals = targetCals;
  let remainingProtein = targetProtein;

  for (const cat of categories) {
    if (remainingCals <= 20) break;

    const catFoods = shuffleArray(filteredFoods.filter(f =>
      f.category?.toLowerCase().replace(/[& ]/g, '_') === cat.toLowerCase() ||
      f.category?.toLowerCase() === cat.toLowerCase()
    ));

    if (catFoods.length === 0) continue;

    const food = catFoods[0];
    const calPerServing = food.calories || 100;
    let servings = Math.max(0.5, Math.min(3, Math.round((remainingCals * 0.4 / calPerServing) * 2) / 2));

    const cals = Math.round(calPerServing * servings);
    const protein = Math.round((food.protein || 0) * servings * 10) / 10;
    const carbs = Math.round((food.carbs || 0) * servings * 10) / 10;
    const fat = Math.round((food.fat || 0) * servings * 10) / 10;

    mealItems.push({ food: { id: food.id, name: food.name, servingSize: food.servingSize, servingUnit: food.servingUnit, category: food.category }, servings, calories: cals, protein, carbs, fat });

    remainingCals -= cals;
    remainingProtein -= protein;
  }

  const totalCals = mealItems.reduce((s, i) => s + i.calories, 0);
  const totalProtein = mealItems.reduce((s, i) => s + i.protein, 0);
  const totalCarbs = mealItems.reduce((s, i) => s + i.carbs, 0);
  const totalFat = mealItems.reduce((s, i) => s + i.fat, 0);

  return { mealType, items: mealItems, totals: { calories: totalCals, protein: totalProtein, carbs: totalCarbs, fat: totalFat } };
}

const router = Router();

router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { targetWeight, dietGoal } = req.body || {};

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        age: true, gender: true, weight: true, height: true,
        activityLevel: true, goal: true,
        foodAllergies: true, dietaryPreferences: true,
      },
    });

    if (!user || !user.age || !user.gender || !user.weight || !user.height) {
      return res.status(400).json({ error: 'Complete your profile (age, gender, weight, height) to generate a diet plan' });
    }

    const effectiveGoal = dietGoal || user.goal || 'general_fitness';

    const userData = {
      age: user.age, gender: user.gender as 'male' | 'female',
      weight: user.weight, height: user.height,
      activityLevel: (user.activityLevel || 'moderate') as any,
      fitnessGoal: effectiveGoal as any,
    };

    const bmr = calculateBMR(userData);
    const tdee = calculateTDEE(bmr, userData.activityLevel);

    let targetCalories: number;
    if (targetWeight && targetWeight !== user.weight) {
      if (targetWeight < user.weight) {
        const deficit = Math.min(750, Math.max(300, (user.weight - targetWeight) * 50));
        targetCalories = Math.round(tdee - deficit);
      } else {
        const surplus = Math.min(500, Math.max(200, (targetWeight - user.weight) * 40));
        targetCalories = Math.round(tdee + surplus);
      }
    } else {
      targetCalories = calculateTargetCalories(tdee, effectiveGoal);
    }

    const macroGoal = dietGoal === 'build_muscle' ? 'muscle_gain'
      : dietGoal === 'lose_fat' ? 'fat_loss'
      : dietGoal === 'maintain' ? 'general_fitness'
      : effectiveGoal;
    const macros = calculateMacros(targetCalories, userData.weight, macroGoal);

    const foods = await prisma.food.findMany({ take: 300 });

    const meals = MEAL_TYPES.map(mealType => {
      const mealCals = Math.round(targetCalories * MEAL_CALORIE_SPLIT[mealType]);
      const mealProtein = Math.round(macros.protein * MEAL_CALORIE_SPLIT[mealType]);
      return buildMeal(foods, mealCals, mealProtein, mealType, user.foodAllergies || [], user.dietaryPreferences || []);
    });

    const totalCals = meals.reduce((s, m) => s + m.totals.calories, 0);
    const totalProtein = meals.reduce((s, m) => s + m.totals.protein, 0);
    const totalCarbs = meals.reduce((s, m) => s + m.totals.carbs, 0);
    const totalFat = meals.reduce((s, m) => s + m.totals.fat, 0);

    const goalLabel = dietGoal
      ? dietGoal.replace(/_/g, ' ')
      : userData.fitnessGoal.replace(/_/g, ' ');
    const weightLabel = targetWeight ? ` · ${targetWeight}kg target` : '';
    const planName = `${goalLabel} plan - ${targetCalories} cal${weightLabel}`;

    const dietPlan = await prisma.dietPlan.create({
      data: {
        userId,
        name: planName,
        targetCalories,
        targetProtein: macros.protein,
        targetCarbs: macros.carbs,
        targetFat: macros.fat,
        meals: meals as any,
        preferences: { allergies: user.foodAllergies, dietary: user.dietaryPreferences, goal: effectiveGoal, targetWeight: targetWeight || null, dietGoal: dietGoal || null },
      },
    });

    res.status(201).json({
      id: dietPlan.id,
      name: dietPlan.name,
      targets: { calories: targetCalories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat },
      meals,
      totals: { calories: totalCals, protein: totalProtein, carbs: totalCarbs, fat: totalFat },
      bmr, tdee,
    });
  } catch (error) {
    console.error('Diet plan generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const plans = await prisma.dietPlan.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const plan = await prisma.dietPlan.findFirst({ where: { id: req.params.id, userId: req.userId! } });
    if (!plan) return res.status(404).json({ error: 'Diet plan not found' });

    await prisma.dietPlan.delete({ where: { id: req.params.id } });
    res.json({ message: 'Diet plan deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
