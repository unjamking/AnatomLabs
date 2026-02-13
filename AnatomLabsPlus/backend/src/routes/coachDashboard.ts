import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { requireCoach } from '../middleware/coach';

const router = Router();

router.get('/profile', authenticateToken, requireCoach, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.coachProfile.findUnique({
      where: { userId: req.userId! },
      include: {
        posts: { orderBy: { createdAt: 'desc' } },
        stories: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Coach profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching coach profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', authenticateToken, requireCoach, async (req: AuthRequest, res: Response) => {
  try {
    const { bio, price, availability, avatar, specialty } = req.body;

    const data: any = {};
    if (bio !== undefined) data.bio = bio;
    if (price !== undefined) data.price = parseFloat(price);
    if (availability !== undefined) data.availability = availability;
    if (avatar !== undefined) data.avatar = avatar;
    if (specialty !== undefined) data.specialty = specialty;

    const profile = await prisma.coachProfile.update({
      where: { userId: req.userId! },
      data,
    });

    res.json({ message: 'Profile updated', profile });
  } catch (error) {
    console.error('Error updating coach profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/posts', authenticateToken, requireCoach, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!profile) return res.status(404).json({ error: 'Coach profile not found' });

    const { caption, imageUrl, type } = req.body;

    if (!caption) {
      return res.status(400).json({ error: 'Caption is required' });
    }

    const post = await prisma.coachPost.create({
      data: {
        coachProfileId: profile.id,
        caption,
        imageUrl: imageUrl || null,
        type: type || 'photo',
      },
    });

    res.status(201).json({ message: 'Post created', post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/posts/:id', authenticateToken, requireCoach, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!profile) return res.status(404).json({ error: 'Coach profile not found' });

    const post = await prisma.coachPost.findUnique({ where: { id: req.params.id } });

    if (!post || post.coachProfileId !== profile.id) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await prisma.coachPost.delete({ where: { id: req.params.id } });

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/stories', authenticateToken, requireCoach, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.coachProfile.findUnique({ where: { userId: req.userId! } });
    if (!profile) return res.status(404).json({ error: 'Coach profile not found' });

    const { type, title, description } = req.body;

    if (!type || !title || !description) {
      return res.status(400).json({ error: 'type, title, and description are required' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const story = await prisma.coachStory.create({
      data: {
        coachProfileId: profile.id,
        type,
        title,
        description,
        expiresAt,
      },
    });

    res.status(201).json({ message: 'Story created', story });
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/bookings', authenticateToken, requireCoach, async (req: AuthRequest, res: Response) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { coachId: req.userId! },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
      orderBy: { date: 'desc' },
    });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching coach bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/bookings/:id', authenticateToken, requireCoach, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['CONFIRMED', 'CANCELLED', 'COMPLETED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking || booking.coachId !== req.userId!) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: { client: { select: { id: true, name: true } } },
    });

    res.json({ message: 'Booking updated', booking: updated });
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
