import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const setupNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.warn('Failed to get push token for push notification!');
    return;
  }
};

// --- Specific Triggers ---

export const scheduleSleepReminder = async () => {
  await Notifications.cancelScheduledNotificationAsync('sleep_reminder');
  await Notifications.scheduleNotificationAsync({
    identifier: 'sleep_reminder',
    content: {
      title: "Log your sleep",
      body: "Don't forget to log last night's sleep before bed.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 22,
      minute: 0,
    },
  });
};

export const scheduleMealPrompt = async () => {
  // If no meals logged by 12:00
  await Notifications.cancelScheduledNotificationAsync('meal_prompt');
  await Notifications.scheduleNotificationAsync({
    identifier: 'meal_prompt',
    content: {
      title: "Log your meals",
      body: "You haven't logged any meals today. Tap to log your lunch.",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 12,
      minute: 0,
    },
  });
};

export const triggerDay7Milestone = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Risk Monitor unlocked!",
      body: "You've logged 7 days. Check your Risk Monitor for early pattern insights.",
    },
    trigger: null, // trigger immediately
  });
};

export const triggerDay30Milestone = async () => {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Trends & Baselines ready!",
      body: "30 days of data! Your personalized Trends and Baselines are now available.",
    },
    trigger: null,
  });
};
