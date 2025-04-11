// utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveName = async (name) => {
  try {
    await AsyncStorage.setItem('name', name);
  } catch (e) {
    console.log('Failed to save name.');
  }
};

export const getName = async () => {
  try {
    const value = await AsyncStorage.getItem('name');
    return value !== null ? value : '';
  } catch (e) {
    console.log('Failed to load name.');
    return '';
  }
};

export const clearName = async () => {
  try {
    await AsyncStorage.removeItem('name');
  } catch (e) {
    console.log('Failed to clear name.');
  }
};
