import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { search, specialty } = req.query;

    const where: any = {};

    if (search) {
      where.OR = [
        { user: { name: { contains: search as string, mode: 'insensitive' } } },
        { specialty: { hasSome: [search as string] } },
        { bio: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (specialty && specialty !== 'All') {
      where.specialty = { has: specialty as string };
    }

    const profiles = await prisma.coachProfile.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        posts: { orderBy: { createdAt: 'desc' }, take: 6 },
        stories: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { rating: 'desc' },
    });

    const coaches = profiles.map(p => ({
      id: p.id,
      userId: p.userId,
      name: p.user.name,
      avatar: p.avatar,
      specialty: p.specialty,
      rating: p.rating,
      reviewCount: p.reviewCount,
      price: `$${p.price}/session`,
      bio: p.bio,
      experience: p.experience,
      certifications: p.certifications,
      clientCount: p.clientCount,
      verified: p.verified,
      availability: p.availability,
      stories: p.stories.map(s => ({
        id: s.id,
        type: s.type,
        title: s.title,
        description: s.description,
        timestamp: s.createdAt.toISOString(),
      })),
      posts: p.posts.map(post => ({
        id: post.id,
        type: post.type,
        caption: post.caption,
        imageUrl: post.imageUrl,
        likes: post.likes,
        comments: post.commentsCount,
        timestamp: post.createdAt.toISOString(),
      })),
    }));

    res.json(coaches);
  } catch (error) {
    console.error('Error fetching coaches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const profile = await prisma.coachProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        posts: { orderBy: { createdAt: 'desc' } },
        stories: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Coach not found' });
    }

    const coach = {
      id: profile.id,
      userId: profile.userId,
      name: profile.user.name,
      avatar: profile.avatar,
      specialty: profile.specialty,
      rating: profile.rating,
      reviewCount: profile.reviewCount,
      price: `$${profile.price}/session`,
      bio: profile.bio,
      experience: profile.experience,
      certifications: profile.certifications,
      clientCount: profile.clientCount,
      verified: profile.verified,
      availability: profile.availability,
      stories: profile.stories.map(s => ({
        id: s.id,
        type: s.type,
        title: s.title,
        description: s.description,
        timestamp: s.createdAt.toISOString(),
      })),
      posts: profile.posts.map(post => ({
        id: post.id,
        type: post.type,
        caption: post.caption,
        imageUrl: post.imageUrl,
        likes: post.likes,
        comments: post.commentsCount,
        timestamp: post.createdAt.toISOString(),
      })),
    };

    res.json(coach);
  } catch (error) {
    console.error('Error fetching coach:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
