import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { calculateNutritionPlan, UserPhysicalData } from '../services/nutritionCalculator';
import {
  getSuggestions,
  getRecentFoods,
  updateStreak,
  getStreak,
  getWeightTrend
} from '../services/nutritionSuggestions';

const router = Router();

// POST /api/nutrition/calculate - Calculate nutrition targets
router.post('/calculate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.age || !user.gender || !user.weight || !user.height || !user.activityLevel || !user.goal) {
      return res.status(400).json({
        error: 'Please complete your profile (age, gender, weight, height, activityLevel, goal) to calculate nutrition targets'
      });
    }

    const physicalData: UserPhysicalData = {
      age: user.age,
      gender: user.gender as 'male' | 'female',
      weight: user.weight,
      height: user.height,
      activityLevel: user.activityLevel as any,
      fitnessGoal: user.goal as any
    };

    const targets = calculateNutritionPlan(physicalData);

    res.status(200).json(targets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nutrition/log - Log food intake
router.post('/log', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { foodId, servings, mealType, date } = req.body;

    if (!foodId || !servings) {
      return res.status(400).json({
        error: 'foodId and servings are required'
      });
    }

    const food = await prisma.food.findUnique({
      where: { id: foodId }
    });

    if (!food) {
      return res.status(404).json({ error: 'Food not found' });
    }

    const log = await prisma.nutritionLog.create({
      data: {
        userId,
        foodId,
        servings,
        mealType: mealType || 'snack',
        date: date ? new Date(date) : new Date(),
        totalCalories: food.calories * servings,
        totalProtein: food.protein * servings,
        totalCarbs: food.carbs * servings,
        totalFat: food.fat * servings,
      },
      include: {
        food: true
      }
    });

    // Update streak
    const streakUpdate = await updateStreak(userId);

    res.status(201).json({
      message: 'Food logged successfully',
      log,
      streak: streakUpdate
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/logs/today - Get today's logs grouped by meal
router.get('/logs/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get start and end of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all logs for today
    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        food: true
      },
      orderBy: {
        date: 'asc'
      }
    });

    // Group by meal type
    const mealGroups: {
      breakfast: typeof logs;
      lunch: typeof logs;
      dinner: typeof logs;
      snack: typeof logs;
    } = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    };

    logs.forEach(log => {
      const mealType = log.mealType as keyof typeof mealGroups;
      if (mealGroups[mealType]) {
        mealGroups[mealType].push(log);
      } else {
        mealGroups.snack.push(log);
      }
    });

    // Calculate daily totals
    const totals = {
      calories: logs.reduce((sum, log) => sum + (log.totalCalories || 0), 0),
      protein: logs.reduce((sum, log) => sum + (log.totalProtein || 0), 0),
      carbs: logs.reduce((sum, log) => sum + (log.totalCarbs || 0), 0),
      fat: logs.reduce((sum, log) => sum + (log.totalFat || 0), 0)
    };

    // Get user's targets for remaining calculation
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    let remaining = null;
    if (user?.age && user?.gender && user?.weight && user?.height && user?.activityLevel && user?.goal) {
      const targets = calculateNutritionPlan({
        age: user.age,
        gender: user.gender as 'male' | 'female',
        weight: user.weight,
        height: user.height,
        activityLevel: user.activityLevel as any,
        fitnessGoal: user.goal as any
      });

      remaining = {
        calories: targets.targetCalories - totals.calories,
        protein: targets.macros.protein - totals.protein,
        carbs: targets.macros.carbs - totals.carbs,
        fat: targets.macros.fat - totals.fat
      };
    }

    res.status(200).json({
      date: today.toISOString(),
      meals: mealGroups,
      totals,
      remaining,
      logCount: logs.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/logs - Get nutrition logs
router.get('/logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    const where: any = { userId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    const logs = await prisma.nutritionLog.findMany({
      where,
      include: {
        food: true
      },
      orderBy: {
        date: 'desc'
      }
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/nutrition/logs/:id - Update a nutrition log
router.put('/logs/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { servings, mealType } = req.body;

    // Check ownership
    const existingLog = await prisma.nutritionLog.findFirst({
      where: { id, userId },
      include: { food: true }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Log not found' });
    }

    const updateData: any = {};
    if (servings !== undefined) {
      updateData.servings = servings;
      updateData.totalCalories = existingLog.food.calories * servings;
      updateData.totalProtein = existingLog.food.protein * servings;
      updateData.totalCarbs = existingLog.food.carbs * servings;
      updateData.totalFat = existingLog.food.fat * servings;
    }
    if (mealType) {
      updateData.mealType = mealType;
    }

    const log = await prisma.nutritionLog.update({
      where: { id },
      data: updateData,
      include: { food: true }
    });

    res.status(200).json({
      message: 'Log updated successfully',
      log
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/nutrition/logs/:id - Delete a nutrition log
router.delete('/logs/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    // Check ownership
    const existingLog = await prisma.nutritionLog.findFirst({
      where: { id, userId }
    });

    if (!existingLog) {
      return res.status(404).json({ error: 'Log not found' });
    }

    await prisma.nutritionLog.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/summary - Get nutrition summary for a date range
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required'
      });
    }

    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      }
    });

    const summary = {
      totalCalories: logs.reduce((sum, log) => sum + (log.totalCalories || 0), 0),
      totalProtein: logs.reduce((sum, log) => sum + (log.totalProtein || 0), 0),
      totalCarbs: logs.reduce((sum, log) => sum + (log.totalCarbs || 0), 0),
      totalFat: logs.reduce((sum, log) => sum + (log.totalFat || 0), 0),
      logCount: logs.length
    };

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nutrition/weight - Log weight
router.post('/weight', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { weight, note, date } = req.body;

    if (!weight || typeof weight !== 'number') {
      return res.status(400).json({ error: 'Weight is required and must be a number' });
    }

    const weightLog = await prisma.weightLog.create({
      data: {
        userId,
        weight,
        note: note || null,
        date: date ? new Date(date) : new Date()
      }
    });

    // Also update user's current weight
    await prisma.user.update({
      where: { id: userId },
      data: { weight }
    });

    res.status(201).json({
      message: 'Weight logged successfully',
      weightLog
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/weight - Get weight history
router.get('/weight', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { days } = req.query;

    const daysToFetch = days ? parseInt(days as string) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToFetch);

    const logs = await prisma.weightLog.findMany({
      where: {
        userId,
        date: { gte: startDate }
      },
      orderBy: { date: 'desc' }
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/weight/trend - Get weight trend analysis
router.get('/weight/trend', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { days } = req.query;

    const trend = await getWeightTrend(userId, days ? parseInt(days as string) : 30);

    res.status(200).json(trend);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/suggestions - Get food suggestions based on remaining macros
router.get('/suggestions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Get today's logs to calculate remaining
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const logs = await prisma.nutritionLog.findMany({
      where: {
        userId,
        date: { gte: today, lt: tomorrow }
      }
    });

    const consumed = {
      calories: logs.reduce((s, l) => s + (l.totalCalories || 0), 0),
      protein: logs.reduce((s, l) => s + (l.totalProtein || 0), 0),
      carbs: logs.reduce((s, l) => s + (l.totalCarbs || 0), 0),
      fat: logs.reduce((s, l) => s + (l.totalFat || 0), 0)
    };

    // Get user's targets
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.age || !user?.gender || !user?.weight || !user?.height || !user?.activityLevel || !user?.goal) {
      return res.status(400).json({
        error: 'Please complete your profile to get suggestions'
      });
    }

    const targets = calculateNutritionPlan({
      age: user.age,
      gender: user.gender as 'male' | 'female',
      weight: user.weight,
      height: user.height,
      activityLevel: user.activityLevel as any,
      fitnessGoal: user.goal as any
    });

    const remaining = {
      calories: targets.targetCalories - consumed.calories,
      protein: targets.macros.protein - consumed.protein,
      carbs: targets.macros.carbs - consumed.carbs,
      fat: targets.macros.fat - consumed.fat
    };

    const suggestions = await getSuggestions(userId, remaining);

    res.status(200).json({
      remaining,
      suggestions
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/recent - Get recently and frequently logged foods
router.get('/recent', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit } = req.query;

    const recentFoods = await getRecentFoods(userId, limit ? parseInt(limit as string) : 10);

    res.status(200).json(recentFoods);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/streak - Get user's logging streak
router.get('/streak', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const streak = await getStreak(userId);

    res.status(200).json(streak);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/foods - Get all foods
router.get('/foods', async (req, res: Response) => {
  try {
    const { search, category } = req.query;

    const where: any = {};

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (category && typeof category === 'string') {
      where.category = category;
    }

    const foods = await prisma.food.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json(foods);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nutrition/presets - Create a meal preset
router.post('/presets', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, items } = req.body;

    if (!name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Name and at least one food item are required'
      });
    }

    // Validate all food items exist
    const foodIds = items.map((i: any) => i.foodId);
    const foods = await prisma.food.findMany({
      where: { id: { in: foodIds } }
    });

    if (foods.length !== foodIds.length) {
      return res.status(400).json({ error: 'One or more foods not found' });
    }

    const preset = await prisma.mealPreset.create({
      data: {
        userId,
        name,
        items: {
          create: items.map((item: { foodId: string; servings: number }) => ({
            foodId: item.foodId,
            servings: item.servings
          }))
        }
      },
      include: {
        items: {
          include: { food: true }
        }
      }
    });

    res.status(201).json({
      message: 'Meal preset created successfully',
      preset
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/nutrition/presets - Get user's meal presets
router.get('/presets', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const presets = await prisma.mealPreset.findMany({
      where: { userId },
      include: {
        items: {
          include: { food: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(presets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/nutrition/presets/:id - Delete a meal preset
router.delete('/presets/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const preset = await prisma.mealPreset.findFirst({
      where: { id, userId }
    });

    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    await prisma.mealPreset.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Preset deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/nutrition/presets/:id/log - Log all items from a preset
router.post('/presets/:id/log', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { id } = req.params;
    const { mealType, date } = req.body;

    const preset = await prisma.mealPreset.findFirst({
      where: { id, userId },
      include: {
        items: {
          include: { food: true }
        }
      }
    });

    if (!preset) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    const logDate = date ? new Date(date) : new Date();

    // Create nutrition logs for each item
    const logs = await Promise.all(
      preset.items.map(item =>
        prisma.nutritionLog.create({
          data: {
            userId,
            foodId: item.foodId,
            servings: item.servings,
            mealType: mealType || 'snack',
            date: logDate,
            totalCalories: item.food.calories * item.servings,
            totalProtein: item.food.protein * item.servings,
            totalCarbs: item.food.carbs * item.servings,
            totalFat: item.food.fat * item.servings
          },
          include: { food: true }
        })
      )
    );

    // Update streak
    const streakUpdate = await updateStreak(userId);

    res.status(201).json({
      message: `Logged ${logs.length} items from "${preset.name}"`,
      logs,
      streak: streakUpdate
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
