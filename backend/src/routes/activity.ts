import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to get start and end of a day
function getDayBounds(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function normalizeNonNegativeInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = typeof value === 'string' ? Number.parseInt(value.trim(), 10) : value;
  if (typeof normalized !== 'number' || !Number.isFinite(normalized) || !Number.isInteger(normalized) || normalized < 0) {
    return undefined;
  }

  return normalized;
}

function normalizeNonNegativeFloat(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const normalized = typeof value === 'string'
    ? Number.parseFloat(value.trim().replace(',', '.'))
    : value;

  if (typeof normalized !== 'number' || !Number.isFinite(normalized) || normalized < 0) {
    return undefined;
  }

  return normalized;
}

// GET /api/activity/today - Get or create today's activity log
router.get('/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { start, end } = getDayBounds(new Date());

    // Find today's log or create one
    let todayLog = await prisma.activityLog.findFirst({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    if (!todayLog) {
      todayLog = await prisma.activityLog.create({
        data: {
          userId,
          date: new Date(),
          steps: 0,
          waterIntake: 0,
          sleepHours: null,
          caloriesBurned: 0,
        }
      });
    }

    res.json(todayLog);
  } catch (error) {
    console.error('Error getting today activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/activity/today - Update today's activity log
router.put('/today', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { steps, waterIntake, sleepHours, caloriesBurned } = req.body;
    const { start, end } = getDayBounds(new Date());
    const normalizedSteps = normalizeNonNegativeInt(steps);
    const normalizedWaterIntake = normalizeNonNegativeInt(waterIntake);
    const normalizedSleepHours = normalizeNonNegativeFloat(sleepHours);
    const normalizedCaloriesBurned = normalizeNonNegativeFloat(caloriesBurned);

    if (steps !== undefined && normalizedSteps === undefined) {
      return res.status(400).json({ error: 'steps must be a non-negative whole number' });
    }

    if (waterIntake !== undefined && normalizedWaterIntake === undefined) {
      return res.status(400).json({ error: 'waterIntake must be a non-negative whole number' });
    }

    if (sleepHours !== undefined && normalizedSleepHours === undefined) {
      return res.status(400).json({ error: 'sleepHours must be a non-negative number' });
    }

    if (caloriesBurned !== undefined && normalizedCaloriesBurned === undefined) {
      return res.status(400).json({ error: 'caloriesBurned must be a non-negative number' });
    }

    // Find today's log or create one
    let todayLog = await prisma.activityLog.findFirst({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    if (!todayLog) {
      todayLog = await prisma.activityLog.create({
        data: {
          userId,
          date: new Date(),
          steps: normalizedSteps ?? 0,
          waterIntake: normalizedWaterIntake ?? 0,
          sleepHours: normalizedSleepHours ?? null,
          caloriesBurned: normalizedCaloriesBurned ?? 0,
        }
      });
    } else {
      todayLog = await prisma.activityLog.update({
        where: { id: todayLog.id },
        data: {
          ...(steps !== undefined && { steps: normalizedSteps }),
          ...(waterIntake !== undefined && { waterIntake: normalizedWaterIntake }),
          ...(sleepHours !== undefined && { sleepHours: normalizedSleepHours }),
          ...(caloriesBurned !== undefined && { caloriesBurned: normalizedCaloriesBurned }),
        }
      });
    }

    res.json({
      message: 'Activity updated successfully',
      log: todayLog
    });
  } catch (error) {
    console.error('Error updating today activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/activity - Get activity log for a specific date (or today)
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const dateParam = req.query.date as string;

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const { start, end } = getDayBounds(targetDate);

    const activityLog = await prisma.activityLog.findFirst({
      where: {
        userId,
        date: { gte: start, lte: end }
      }
    });

    if (!activityLog) {
      return res.json({
        success: true,
        data: {
          date: targetDate.toISOString(),
          steps: 0,
          waterIntake: 0,
          sleepHours: null,
          caloriesBurned: 0,
        }
      });
    }

    res.json({ success: true, data: activityLog });
  } catch (error) {
    console.error('Error getting activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/activity/log - Log activity
router.post('/log', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { activityType, duration, intensity, caloriesBurned, steps, waterIntake, sleepHours, date, notes } = req.body;
    const normalizedDuration = normalizeNonNegativeInt(duration);
    const normalizedSteps = normalizeNonNegativeInt(steps);
    const normalizedWaterIntake = normalizeNonNegativeInt(waterIntake);
    const normalizedSleepHours = normalizeNonNegativeFloat(sleepHours);
    const normalizedCaloriesBurned = normalizeNonNegativeFloat(caloriesBurned);

    // For general activity logging (workouts, runs, etc.), require activityType and duration
    // For daily tracking (steps, water, sleep), allow without those fields
    const isGeneralActivity = activityType || duration;

    if (isGeneralActivity && (!activityType || normalizedDuration === undefined)) {
      return res.status(400).json({
        error: 'activityType and duration are required for activity logging'
      });
    }

    if (duration !== undefined && normalizedDuration === undefined) {
      return res.status(400).json({ error: 'duration must be a non-negative whole number' });
    }

    if (steps !== undefined && normalizedSteps === undefined) {
      return res.status(400).json({ error: 'steps must be a non-negative whole number' });
    }

    if (waterIntake !== undefined && normalizedWaterIntake === undefined) {
      return res.status(400).json({ error: 'waterIntake must be a non-negative whole number' });
    }

    if (sleepHours !== undefined && normalizedSleepHours === undefined) {
      return res.status(400).json({ error: 'sleepHours must be a non-negative number' });
    }

    if (caloriesBurned !== undefined && normalizedCaloriesBurned === undefined) {
      return res.status(400).json({ error: 'caloriesBurned must be a non-negative number' });
    }

    const log = await prisma.activityLog.create({
      data: {
        userId,
        activityType: activityType || null,
        duration: normalizedDuration ?? null,
        intensity: intensity || 'moderate',
        caloriesBurned: normalizedCaloriesBurned ?? 0,
        steps: normalizedSteps ?? 0,
        waterIntake: normalizedWaterIntake ?? 0,
        sleepHours: normalizedSleepHours ?? null,
        date: date ? new Date(date) : new Date(),
        notes: notes || null,
      }
    });

    res.status(201).json({
      message: 'Activity logged successfully',
      log
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/activity/logs - Get activity logs
router.get('/logs', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate, activityType } = req.query;

    const where: any = { userId };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string)
      };
    }

    if (activityType && typeof activityType === 'string') {
      where.activityType = activityType;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: {
        date: 'desc'
      }
    });

    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/activity/stats - Get activity statistics
router.get('/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required'
      });
    }

    const logs = await prisma.activityLog.findMany({
      where: {
        userId,
        date: {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        }
      }
    });

    const stats = {
      totalActivities: logs.length,
      totalDuration: logs.reduce((sum, log) => sum + (log.duration || 0), 0),
      totalCaloriesBurned: logs.reduce((sum, log) => sum + log.caloriesBurned, 0),
      totalSteps: logs.reduce((sum, log) => sum + log.steps, 0),
      activityBreakdown: logs.reduce((acc: any, log) => {
        const type = log.activityType || 'unknown';
        if (!acc[type]) {
          acc[type] = {
            count: 0,
            totalDuration: 0,
            totalCalories: 0
          };
        }
        acc[type].count++;
        acc[type].totalDuration += log.duration || 0;
        acc[type].totalCalories += log.caloriesBurned;
        return acc;
      }, {})
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/activity/logs/:id - Delete activity log
router.delete('/logs/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const log = await prisma.activityLog.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!log) {
      return res.status(404).json({ error: 'Activity log not found' });
    }

    await prisma.activityLog.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Activity log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
