import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { createNotification } from '../services/notifications';

const router = Router();

router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { search, specialty } = req.query;
    const currentUserId = req.userId;

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
        followers: currentUserId ? { where: { userId: currentUserId } } : false,
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
      followerCount: p.followerCount,
      isFollowing: p.followers && p.followers.length > 0,
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
    const currentUserId = req.userId;

    const profile = await prisma.coachProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        posts: { orderBy: { createdAt: 'desc' } },
        stories: {
          where: { expiresAt: { gt: new Date() } },
          orderBy: { createdAt: 'desc' },
        },
        followers: currentUserId ? { where: { userId: currentUserId } } : false,
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
      followerCount: profile.followerCount,
      isFollowing: profile.followers && profile.followers.length > 0,
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

router.post('/:id/follow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const coachProfile = await prisma.coachProfile.findUnique({ 
      where: { id },
      include: { user: { select: { name: true } } }
    });
    if (!coachProfile) return res.status(404).json({ error: 'Coach not found' });

    if (coachProfile.userId === userId) {
      return res.status(400).json({ error: 'You cannot follow yourself' });
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    await prisma.$transaction([
      prisma.follow.upsert({
        where: { userId_coachProfileId: { userId, coachProfileId: id } },
        create: { userId, coachProfileId: id },
        update: {},
      }),
      prisma.coachProfile.update({
        where: { id },
        data: { followerCount: { increment: 1 } },
      }),
    ]);

    // Create notification for coach
    await createNotification(
      coachProfile.userId,
      'FOLLOW',
      'New Follower',
      `${currentUser?.name || 'Someone'} started following you!`,
      { followerId: userId }
    );

    res.json({ message: 'Followed successfully' });
  } catch (error) {
    console.error('Error following coach:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/unfollow', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const follow = await prisma.follow.findUnique({
      where: { userId_coachProfileId: { userId, coachProfileId: id } },
    });

    if (!follow) return res.status(400).json({ error: 'You are not following this coach' });

    await prisma.$transaction([
      prisma.follow.delete({
        where: { userId_coachProfileId: { userId, coachProfileId: id } },
      }),
      prisma.coachProfile.update({
        where: { id },
        data: { followerCount: { decrement: 1 } },
      }),
    ]);

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Error unfollowing coach:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
