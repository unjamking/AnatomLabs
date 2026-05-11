import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { generateWorkoutPlan, WorkoutGenerationParams } from '../services/workoutGenerator';

const router = Router();

const VALID_GOALS: WorkoutGenerationParams['goal'][] = [
  'muscle_gain',
  'fat_loss',
  'body_recomposition',
  'endurance',
  'general_fitness',
  'sport_specific',
];

const VALID_EXPERIENCE_LEVELS: WorkoutGenerationParams['experienceLevel'][] = [
  'beginner',
  'intermediate',
  'advanced',
];

const VALID_SPORTS: NonNullable<WorkoutGenerationParams['sport']>[] = [
  'football',
  'basketball',
  'volleyball',
  'boxing',
  'swimming',
];

function normalizeDaysPerWeek(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value.trim(), 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

function normalizeOptionalSport(value: unknown): WorkoutGenerationParams['sport'] {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  return VALID_SPORTS.includes(normalized as NonNullable<WorkoutGenerationParams['sport']>)
    ? (normalized as NonNullable<WorkoutGenerationParams['sport']>)
    : null;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);
}

// POST /api/workouts/generate - Generate a new workout plan
router.post('/generate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { goal, experienceLevel, daysPerWeek, sport } = req.body;
    const userId = req.userId!;
    const normalizedDaysPerWeek = normalizeDaysPerWeek(daysPerWeek);
    const normalizedSport = normalizeOptionalSport(sport);

    if (!goal || !experienceLevel || normalizedDaysPerWeek === null) {
      return res.status(400).json({
        error: 'goal, experienceLevel, and daysPerWeek are required'
      });
    }

    if (!VALID_GOALS.includes(goal)) {
      return res.status(400).json({
        error: 'Invalid goal selected'
      });
    }

    if (!VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
      return res.status(400).json({
        error: 'Invalid experience level selected'
      });
    }

    if (normalizedDaysPerWeek < 2 || normalizedDaysPerWeek > 6) {
      return res.status(400).json({
        error: 'daysPerWeek must be between 2 and 6'
      });
    }

    if (goal === 'sport_specific' && !normalizedSport) {
      return res.status(400).json({
        error: 'A supported sport is required for sport-specific workout plans'
      });
    }

    const fullPlan = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          physicalLimitations: true,
          healthConditions: true
        }
      });

      const params: WorkoutGenerationParams = {
        goal,
        experienceLevel,
        daysPerWeek: normalizedDaysPerWeek,
        sport: normalizedSport,
        healthContext: (user?.physicalLimitations?.length || user?.healthConditions?.length)
          ? {
              physicalLimitations: normalizeStringArray(user?.physicalLimitations),
              medicalConditions: normalizeStringArray(user?.healthConditions)
            }
          : undefined
      };

      const workoutSplit = generateWorkoutPlan(params);
      if (!workoutSplit.workouts.length) {
        return {
          fullPlan: null,
          healthModifications: workoutSplit.healthModifications || null,
        };
      }

      const workoutPlan = await tx.workoutPlan.create({
        data: {
          userId,
          name: workoutSplit.name,
          goal,
          daysPerWeek: normalizedDaysPerWeek,
          experienceLevel,
          sport: normalizedSport,
          description: workoutSplit.description,
          rationale: workoutSplit.rationale,
        }
      });

      const dbExercises = await tx.exercise.findMany({
        select: { id: true, name: true }
      });
      const exerciseNameToId = new Map<string, string>();
      dbExercises.forEach(e => {
        exerciseNameToId.set(e.name.toLowerCase(), e.id);
      });

      await Promise.all(
        workoutSplit.workouts.map(async (day) => {
          const workout = await tx.workout.create({
            data: {
              workoutPlanId: workoutPlan.id,
              dayName: day.dayName,
              dayOfWeek: day.dayOfWeek,
              split: day.split,
              focus: normalizeStringArray(day.focus),
            }
          });

          if (!day.exercises.length) {
            return workout;
          }

          await Promise.all(
            day.exercises.map(async (ex, index) => {
              const exerciseName = typeof ex.exerciseName === 'string' && ex.exerciseName.trim()
                ? ex.exerciseName.trim()
                : `Exercise ${index + 1}`;
              const matchedId = exerciseNameToId.get(exerciseName.toLowerCase()) || null;

              await tx.workoutExercise.create({
                data: {
                  workoutId: workout.id,
                  exerciseName,
                  exerciseId: matchedId,
                  sets: Number.isInteger(ex.sets) && ex.sets > 0 ? ex.sets : 3,
                  reps: typeof ex.reps === 'string' && ex.reps.trim() ? ex.reps.trim() : '8-12',
                  rest: Number.isInteger(ex.rest) && ex.rest > 0 ? ex.rest : 90,
                  notes: typeof ex.notes === 'string' ? ex.notes.trim() || null : null,
                  targetMuscles: normalizeStringArray(ex.targetMuscles),
                  orderIndex: index,
                }
              });
            })
          );

          return workout;
        })
      );

      return {
        fullPlan: await tx.workoutPlan.findUnique({
          where: { id: workoutPlan.id },
          include: {
            workouts: {
              include: {
                exercises: {
                  orderBy: { orderIndex: 'asc' }
                }
              },
              orderBy: { dayOfWeek: 'asc' }
            }
          }
        }),
        healthModifications: workoutSplit.healthModifications || null,
      };
    });

    if (!fullPlan.fullPlan) {
      return res.status(422).json({
        error: 'Unable to generate a valid workout plan for the selected options'
      });
    }

    res.status(201).json({
      message: 'Workout plan generated successfully',
      plan: fullPlan.fullPlan,
      healthModifications: fullPlan.healthModifications
    });
  } catch (error) {
    console.error('Generate workout error:', {
      userId: req.userId,
      body: req.body,
      error,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workouts/plans - Get all workout plans for user
router.get('/plans', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const plans = await prisma.workoutPlan.findMany({
      where: { userId },
      include: {
        workouts: {
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { dayOfWeek: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json(plans);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workouts/plans/:id - Get workout plan by id
router.get('/plans/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const plan = await prisma.workoutPlan.findFirst({
      where: {
        id,
        userId
      },
      include: {
        workouts: {
          include: {
            exercises: {
              orderBy: { orderIndex: 'asc' }
            }
          },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    res.status(200).json(plan);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/plans/custom', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, goal, daysPerWeek, workouts: workoutDays } = req.body;

    if (!name || !goal || !daysPerWeek || !workoutDays?.length) {
      return res.status(400).json({ error: 'name, goal, daysPerWeek, and workouts are required' });
    }

    const dbExercises = await prisma.exercise.findMany({ select: { id: true, name: true } });
    const exerciseNameToId = new Map<string, string>();
    dbExercises.forEach(e => exerciseNameToId.set(e.name.toLowerCase(), e.id));

    const workoutPlan = await prisma.workoutPlan.create({
      data: {
        userId,
        name,
        goal,
        daysPerWeek,
        isCustom: true,
      }
    });

    await Promise.all(
      workoutDays.map(async (day: any, dayIndex: number) => {
        const workout = await prisma.workout.create({
          data: {
            workoutPlanId: workoutPlan.id,
            dayName: day.dayName || `Day ${dayIndex + 1}`,
            dayOfWeek: dayIndex + 1,
            split: day.split || 'custom',
            focus: day.focus || [],
          }
        });

        if (day.exercises?.length) {
          await Promise.all(
            day.exercises.map(async (ex: any, exIndex: number) => {
              let matchedId = ex.exerciseId || exerciseNameToId.get(ex.exerciseName?.toLowerCase()) || null;
              if (matchedId && !exerciseNameToId.has(ex.exerciseName?.toLowerCase()) && !dbExercises.some(e => e.id === matchedId)) {
                matchedId = null;
              }
              await prisma.workoutExercise.create({
                data: {
                  workoutId: workout.id,
                  exerciseName: ex.exerciseName,
                  exerciseId: matchedId,
                  sets: ex.sets || 3,
                  reps: ex.reps || '8-12',
                  rest: ex.rest || 90,
                  notes: ex.notes || null,
                  targetMuscles: ex.targetMuscles || [],
                  orderIndex: exIndex,
                }
              });
            })
          );
        }
      })
    );

    const fullPlan = await prisma.workoutPlan.findUnique({
      where: { id: workoutPlan.id },
      include: {
        workouts: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    res.status(201).json({ message: 'Custom workout plan created', plan: fullPlan });
  } catch (error) {
    console.error('Create custom plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/plans/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    const { name, goal, daysPerWeek, workouts: workoutDays } = req.body;

    const plan = await prisma.workoutPlan.findFirst({ where: { id, userId } });
    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    const dbExercises = await prisma.exercise.findMany({ select: { id: true, name: true } });
    const exerciseNameToId = new Map<string, string>();
    dbExercises.forEach(e => exerciseNameToId.set(e.name.toLowerCase(), e.id));

    await prisma.workout.deleteMany({ where: { workoutPlanId: id } });

    await prisma.workoutPlan.update({
      where: { id },
      data: {
        name: name || plan.name,
        goal: goal || plan.goal,
        daysPerWeek: daysPerWeek || plan.daysPerWeek,
      }
    });

    if (workoutDays?.length) {
      await Promise.all(
        workoutDays.map(async (day: any, dayIndex: number) => {
          const workout = await prisma.workout.create({
            data: {
              workoutPlanId: id,
              dayName: day.dayName || `Day ${dayIndex + 1}`,
              dayOfWeek: dayIndex + 1,
              split: day.split || 'custom',
              focus: day.focus || [],
            }
          });

          if (day.exercises?.length) {
            await Promise.all(
              day.exercises.map(async (ex: any, exIndex: number) => {
                let matchedId = ex.exerciseId || exerciseNameToId.get(ex.exerciseName?.toLowerCase()) || null;
                if (matchedId && !exerciseNameToId.has(ex.exerciseName?.toLowerCase()) && !dbExercises.some(e => e.id === matchedId)) {
                  matchedId = null;
                }
                await prisma.workoutExercise.create({
                  data: {
                    workoutId: workout.id,
                    exerciseName: ex.exerciseName,
                    exerciseId: matchedId,
                    sets: ex.sets || 3,
                    reps: ex.reps || '8-12',
                    rest: ex.rest || 90,
                    notes: ex.notes || null,
                    targetMuscles: ex.targetMuscles || [],
                    orderIndex: exIndex,
                  }
                });
              })
            );
          }
        })
      );
    }

    const fullPlan = await prisma.workoutPlan.findUnique({
      where: { id },
      include: {
        workouts: {
          include: { exercises: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { dayOfWeek: 'asc' }
        }
      }
    });

    res.status(200).json({ message: 'Workout plan updated', plan: fullPlan });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/workouts/plans/:id - Delete workout plan
router.delete('/plans/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const plan = await prisma.workoutPlan.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!plan) {
      return res.status(404).json({ error: 'Workout plan not found' });
    }

    await prisma.workoutPlan.delete({
      where: { id }
    });

    res.status(200).json({ message: 'Workout plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== WORKOUT SESSION ENDPOINTS ==========

// POST /api/workouts/sessions - Save a completed workout session
router.post('/sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      name,
      startedAt,
      completedAt,
      duration,
      notes,
      totalVolume,
      totalSets,
      totalReps,
      musclesWorked,
      exercises,
      workoutPlanId,
    } = req.body;

    if (!name || !startedAt || duration === undefined) {
      return res.status(400).json({
        error: 'name, startedAt, and duration are required'
      });
    }

    const session = await prisma.workoutSession.create({
      data: {
        userId,
        name,
        startedAt: new Date(startedAt),
        completedAt: completedAt ? new Date(completedAt) : new Date(),
        duration,
        notes: notes || null,
        totalVolume: totalVolume || 0,
        totalSets: totalSets || 0,
        totalReps: totalReps || 0,
        musclesWorked: musclesWorked || [],
        workoutPlanId: workoutPlanId || null,
        exercises: {
          create: (exercises || []).map((ex: any, index: number) => ({
            exerciseName: ex.exerciseName,
            muscleGroup: ex.muscleGroup || 'other',
            orderIndex: index,
            setsData: JSON.stringify(ex.sets || []),
            totalVolume: ex.totalVolume || 0,
            maxWeight: ex.maxWeight || 0,
            maxReps: ex.maxReps || 0,
          }))
        }
      },
      include: {
        exercises: true
      }
    });

    res.status(201).json({
      message: 'Workout session saved successfully',
      session
    });
  } catch (error) {
    console.error('Save session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workouts/sessions - Get workout session history
router.get('/sessions', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit, offset } = req.query;

    const sessions = await prisma.workoutSession.findMany({
      where: { userId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
      skip: offset ? parseInt(offset as string) : 0
    });

    // Parse setsData JSON for each exercise
    const sessionsWithParsedSets = sessions.map(session => ({
      ...session,
      exercises: session.exercises.map(ex => ({
        ...ex,
        sets: typeof ex.setsData === 'string' ? JSON.parse(ex.setsData) : ex.setsData
      }))
    }));

    res.status(200).json(sessionsWithParsedSets);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workouts/sessions/recent-names - Get recent workout names for quick start
router.get('/sessions/recent-names', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { limit } = req.query;

    // Get unique workout names from recent sessions
    const sessions = await prisma.workoutSession.findMany({
      where: { userId },
      select: { name: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
      take: 50 // Get more to find unique names
    });

    // Get unique names preserving order (most recent first)
    const seenNames = new Set<string>();
    const uniqueNames: string[] = [];

    for (const session of sessions) {
      const normalizedName = session.name.trim();
      if (!seenNames.has(normalizedName.toLowerCase())) {
        seenNames.add(normalizedName.toLowerCase());
        uniqueNames.push(normalizedName);
        if (uniqueNames.length >= (limit ? parseInt(limit as string) : 6)) {
          break;
        }
      }
    }

    res.status(200).json({ names: uniqueNames });
  } catch (error) {
    console.error('Get recent names error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/workouts/sessions/:id - Get single workout session
router.get('/sessions/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const session = await prisma.workoutSession.findFirst({
      where: { id, userId },
      include: {
        exercises: {
          orderBy: { orderIndex: 'asc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: 'Workout session not found' });
    }

    // Parse setsData JSON
    const sessionWithParsedSets = {
      ...session,
      exercises: session.exercises.map(ex => ({
        ...ex,
        sets: typeof ex.setsData === 'string' ? JSON.parse(ex.setsData) : ex.setsData
      }))
    };

    res.status(200).json(sessionWithParsedSets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
