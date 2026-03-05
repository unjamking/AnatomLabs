import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { generateToken, authenticateToken, AuthRequest } from '../middleware/auth';
import { analyzeBMI, canCalculateBMI } from '../services/bmiCalculator';
import { containsInappropriateContent, getContentError } from '../services/contentFilter';
import { generateVerificationCode, sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';

const router = Router();

router.get('/test-email', async (_req: Request, res: Response) => {
  const hasUser = !!process.env.EMAIL_USER;
  const hasPass = !!process.env.EMAIL_PASS;
  const passLen = process.env.EMAIL_PASS?.length || 0;
  res.json({ hasUser, hasPass, passLen, emailUser: process.env.EMAIL_USER });
});


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
      healthConditions,
      physicalLimitations,
      foodAllergies,
      dietaryPreferences
    } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    if (containsInappropriateContent(name)) {
      return res.status(400).json({ error: getContentError('Name') });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let bmiData: { bmi?: number; bmiCategory?: string } = {};
    if (canCalculateBMI(weight, height)) {
      const bmiResult = analyzeBMI(weight, height, goal || undefined);
      bmiData = {
        bmi: bmiResult.bmi,
        bmiCategory: bmiResult.categoryId
      };
    }

    const validateArray = (arr: unknown): string[] => {
      if (!arr) return [];
      if (!Array.isArray(arr)) return [];
      return arr.filter(item => typeof item === 'string');
    };

    const hasHealthProfile =
      (healthConditions && healthConditions.length > 0) ||
      (physicalLimitations && physicalLimitations.length > 0) ||
      (foodAllergies && foodAllergies.length > 0) ||
      (dietaryPreferences && dietaryPreferences.length > 0);

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000);

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
        healthProfileComplete: hasHealthProfile,
        verificationCode,
        verificationExpiry,
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
        emailVerified: true,
        createdAt: true,
      }
    });

    sendVerificationEmail(email, verificationCode, name).catch(() => {});

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

router.post('/verify-email', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.userId!;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { verificationCode: true, verificationExpiry: true, emailVerified: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    if (!user.verificationCode || !user.verificationExpiry) {
      return res.status(400).json({ error: 'No verification code found. Request a new one.' });
    }

    if (new Date() > user.verificationExpiry) {
      return res.status(400).json({ error: 'Verification code expired. Request a new one.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, verificationCode: null, verificationExpiry: null },
    });

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/resend-verification', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, emailVerified: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.emailVerified) {
      return res.json({ message: 'Email already verified' });
    }

    const verificationCode = generateVerificationCode();
    const verificationExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: { verificationCode, verificationExpiry },
    });

    const sent = await sendVerificationEmail(user.email, verificationCode, user.name);

    res.json({ message: sent ? 'Verification code sent' : 'Email service unavailable, try again later' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.json({ message: 'If an account exists with that email, a reset code has been sent.' });
    }

    const resetCode = generateVerificationCode();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCode: resetCode, verificationExpiry: resetExpiry },
    });

    try {
      await sendPasswordResetEmail(user.email, resetCode, user.name);
      console.log('Reset email sent successfully to:', user.email);
    } catch (emailErr) {
      console.error('Reset email failed:', emailErr);
    }

    res.json({ message: 'If an account exists with that email, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, verificationCode: true, verificationExpiry: true },
    });

    if (!user || !user.verificationCode || !user.verificationExpiry) {
      return res.status(400).json({ error: 'Invalid or expired reset code' });
    }

    if (new Date() > user.verificationExpiry) {
      return res.status(400).json({ error: 'Reset code expired. Request a new one.' });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword, verificationCode: null, verificationExpiry: null },
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    const { password: _, verificationCode: _vc, verificationExpiry: _ve, ...userWithoutSensitive } = user;

    res.status(200).json({
      message: 'Login successful',
      user: userWithoutSensitive,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
