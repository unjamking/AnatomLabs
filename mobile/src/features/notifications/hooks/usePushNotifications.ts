import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as notificationsApi from '../api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId,
  });

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e74c3c',
    });
  }

  return tokenData.data;
}

export function usePushNotifications(navigationRef: any) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    try {
      getExpoPushToken().then(async (token) => {
        if (token) {
          setExpoPushToken(token);
          try {
            await notificationsApi.registerPushToken(token);
          } catch (err) {}
        }
      }).catch(() => {});

      if (typeof Notifications.addNotificationReceivedListener === 'function') {
        notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
      }

      if (typeof Notifications.addNotificationResponseReceivedListener === 'function') {
        responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = response.notification.request.content.data;
          if (!navigationRef?.current) return;
          const nav = navigationRef.current;
          if (data.type === 'MESSAGE' && data.conversationId) {
            nav.navigate('Conversation', { conversationId: data.conversationId });
          } else if (data.type?.startsWith('BOOKING')) {
            nav.navigate('Bookings');
          } else if (data.type === 'FOLLOW') {
            nav.navigate('Notifications');
          } else {
            nav.navigate('Notifications');
          }
        });
      }
    } catch (err) {}

    return () => {
      try {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      } catch (err) {}
    };
  }, []);

  return { expoPushToken };
}
