// utils/notifications.js
import * as Notifications from 'expo-notifications';

export const sendNotification = async (title, body) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
      },
      trigger: null, // Fire immediately
    });
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};
