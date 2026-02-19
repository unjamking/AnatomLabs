import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { analyzeBMI, canCalculateBMI } from '../services/bmiCalculator';

const router = Router();

// GET /api/users - Get all users (admin only or for demo purposes)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        weight: true,
        height: true,
        activityLevel: true,
        goal: true,
        createdAt: true,
      }
    });

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me - Get current authenticated user
// IMPORTANT: This route must come before /:id to avoid matching "me" as an ID
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        weight: true,
        height: true,
        activityLevel: true,
        experienceLevel: true,
        goal: true,
        bmi: true,
        bmiCategory: true,
        healthConditions: true,
        physicalLimitations: true,
        foodAllergies: true,
        dietaryPreferences: true,
        healthProfileComplete: true,
        isAdmin: true,
        isCoach: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/:id - Get user by id
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Users can only access their own data unless admin (for now, allow any authenticated user)
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        weight: true,
        height: true,
        activityLevel: true,
        goal: true,
        createdAt: true,
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id - Update user profile
router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, age, gender, weight, height, activityLevel, goal } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate BMI if weight and height are provided
    let bmiData: { bmi?: number; bmiCategory?: string } = {};
    const newWeight = weight !== undefined ? weight : existingUser.weight;
    const newHeight = height !== undefined ? height : existingUser.height;

    if (canCalculateBMI(newWeight, newHeight)) {
      const bmiResult = analyzeBMI(newWeight!, newHeight!, goal || existingUser.goal || undefined);
      bmiData = {
        bmi: bmiResult.bmi,
        bmiCategory: bmiResult.categoryId
      };
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(age !== undefined && { age }),
        ...(gender && { gender }),
        ...(weight !== undefined && { weight }),
        ...(height !== undefined && { height }),
        ...(activityLevel && { activityLevel }),
        ...(goal && { goal }),
        ...bmiData
      },
      select: {
        id: true,
        email: true,
        name: true,
        age: true,
        gender: true,
        weight: true,
        height: true,
        activityLevel: true,
        goal: true,
        bmi: true,
        bmiCategory: true,
        healthConditions: true,
        physicalLimitations: true,
        foodAllergies: true,
        dietaryPreferences: true,
        healthProfileComplete: true,
        createdAt: true,
      }
    });

    res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/users/me/bmi - Get BMI analysis for current user
router.get('/me/bmi', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        weight: true,
        height: true,
        goal: true,
        activityLevel: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!canCalculateBMI(user.weight, user.height)) {
      return res.status(400).json({
        error: 'Insufficient data',
        message: 'Weight and height are required to calculate BMI'
      });
    }

    const bmiResult = analyzeBMI(
      user.weight!,
      user.height!,
      user.goal || undefined,
      user.activityLevel || undefined
    );

    // Update cached BMI in database
    await prisma.user.update({
      where: { id: userId },
      data: {
        bmi: bmiResult.bmi,
        bmiCategory: bmiResult.categoryId
      }
    });

    res.json(bmiResult);
  } catch (error) {
    console.error('BMI calculation error:', error);
    res.status(500).json({ error: 'Failed to calculate BMI' });
  }
});

// GET /api/users/me/health-profile - Get current user's health profile
router.get('/me/health-profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        healthConditions: true,
        physicalLimitations: true,
        foodAllergies: true,
        dietaryPreferences: true,
        healthProfileComplete: true,
        bmi: true,
        bmiCategory: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      healthProfile: {
        healthConditions: user.healthConditions,
        physicalLimitations: user.physicalLimitations,
        foodAllergies: user.foodAllergies,
        dietaryPreferences: user.dietaryPreferences,
        healthProfileComplete: user.healthProfileComplete,
        bmi: user.bmi,
        bmiCategory: user.bmiCategory
      }
    });
  } catch (error) {
    console.error('Error fetching health profile:', error);
    res.status(500).json({ error: 'Failed to fetch health profile' });
  }
});

// PUT /api/users/me/health-profile - Update current user's health profile
router.put('/me/health-profile', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      healthConditions,
      physicalLimitations,
      foodAllergies,
      dietaryPreferences
    } = req.body;

    // Validate arrays
    const validateArray = (arr: unknown): string[] => {
      if (!arr) return [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => typeof item === 'string');
    };

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        healthConditions: validateArray(healthConditions),
        physicalLimitations: validateArray(physicalLimitations),
        foodAllergies: validateArray(foodAllergies),
        dietaryPreferences: validateArray(dietaryPreferences),
        healthProfileComplete: true
      },
      select: {
        id: true,
        healthConditions: true,
        physicalLimitations: true,
        foodAllergies: true,
        dietaryPreferences: true,
        healthProfileComplete: true
      }
    });

    res.json({
      success: true,
      message: 'Health profile updated successfully',
      healthProfile: {
        healthConditions: updatedUser.healthConditions,
        physicalLimitations: updatedUser.physicalLimitations,
        foodAllergies: updatedUser.foodAllergies,
        dietaryPreferences: updatedUser.dietaryPreferences,
        healthProfileComplete: updatedUser.healthProfileComplete
      }
    });
  } catch (error) {
    console.error('Error updating health profile:', error);
    res.status(500).json({ error: 'Failed to update health profile' });
  }
});

// GET /api/users/me/following - Get coaches followed by current user
router.get('/me/following', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const following = await prisma.follow.findMany({
      where: { userId },
      include: {
        coachProfile: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const coaches = following.map(f => ({
      id: f.coachProfile.id,
      userId: f.coachProfile.userId,
      name: f.coachProfile.user.name,
      avatar: f.coachProfile.avatar,
      specialty: f.coachProfile.specialty,
      rating: f.coachProfile.rating,
      isFollowing: true
    }));

    res.json(coaches);
  } catch (error) {
    console.error('Error fetching following:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
