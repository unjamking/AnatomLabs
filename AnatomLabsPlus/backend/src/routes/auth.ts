import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { generateToken } from '../middleware/auth';
import { analyzeBMI, canCalculateBMI } from '../services/bmiCalculator';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      name,
      age,
      gender,
      weight,
      height,
      activityLevel,
      experienceLevel,
      goal,
      // Health profile fields (optional)
      healthConditions,
      physicalLimitations,
      foodAllergies,
      dietaryPreferences
    } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Calculate BMI if weight and height are provided
    let bmiData: { bmi?: number; bmiCategory?: string } = {};
    if (canCalculateBMI(weight, height)) {
      const bmiResult = analyzeBMI(weight, height, goal || undefined);
      bmiData = {
        bmi: bmiResult.bmi,
        bmiCategory: bmiResult.categoryId
      };
    }

    // Validate array fields
    const validateArray = (arr: unknown): string[] => {
      if (!arr) return [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => typeof item === 'string');
    };

    // Check if health profile was provided
    const hasHealthProfile =
      (healthConditions && healthConditions.length > 0) ||
      (physicalLimitations && physicalLimitations.length > 0) ||
      (foodAllergies && foodAllergies.length > 0) ||
      (dietaryPreferences && dietaryPreferences.length > 0);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        age: age || null,
        gender: gender || null,
        weight: weight || null,
        height: height || null,
        activityLevel: activityLevel || null,
        experienceLevel: experienceLevel || null,
        goal: goal || null,
        ...bmiData,
        healthConditions: validateArray(healthConditions),
        physicalLimitations: validateArray(physicalLimitations),
        foodAllergies: validateArray(foodAllergies),
        dietaryPreferences: validateArray(dietaryPreferences),
        healthProfileComplete: hasHealthProfile
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
      }
    });

    // Generate JWT token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(user.id);

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
