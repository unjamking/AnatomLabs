import prisma from '../lib/prisma';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export type NotificationType = 'FOLLOW' | 'BOOKING_REQUEST' | 'BOOKING_CONFIRMED' | 'BOOKING_CANCELLED' | 'MESSAGE' | 'SYSTEM';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  content: string,
  data?: any
) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        data: data || {},
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    });

    if (user?.pushToken && Expo.isExpoPushToken(user.pushToken)) {
      await sendPushNotification(user.pushToken, title, content, { type, notificationId: notification.id, ...data });
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: any
) {
  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
  }
}
