import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const exercises = await prisma.customExercise.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
    });
    res.json(exercises);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, muscleGroup, equipment, instructions, notes } = req.body;

    if (!name || !muscleGroup) {
      return res.status(400).json({ error: 'Name and muscle group are required' });
    }

    const exercise = await prisma.customExercise.create({
      data: {
        userId: req.userId!,
        name: name.trim(),
        muscleGroup,
        equipment: equipment || 'none',
        instructions: instructions || null,
        notes: notes || null,
      },
    });

    res.status(201).json(exercise);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'You already have an exercise with this name' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.customExercise.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!existing) return res.status(404).json({ error: 'Exercise not found' });

    const { name, muscleGroup, equipment, instructions, notes } = req.body;

    const updated = await prisma.customExercise.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(muscleGroup && { muscleGroup }),
        ...(equipment !== undefined && { equipment }),
        ...(instructions !== undefined && { instructions }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.customExercise.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!existing) return res.status(404).json({ error: 'Exercise not found' });

    await prisma.customExercise.delete({ where: { id: req.params.id } });
    res.json({ message: 'Exercise deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
