import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const fileUri = ((FileSystem as any).documentDirectory || '') + 'app_storage.json';

let memCache: Record<string, string> = {};
let isLoaded = false;

const loadFile = async () => {
  if (isLoaded) return;
  if (Platform.OS === 'web') return;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      const content = await FileSystem.readAsStringAsync(fileUri);
      memCache = JSON.parse(content);
    }
  } catch (e) {
    console.warn('Failed to load storage', e);
  }
  isLoaded = true;
};

const saveFile = async () => {
  if (Platform.OS === 'web') return;
  try {
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(memCache));
  } catch (e) {
    console.warn('Failed to save storage', e);
  }
};

export const AppStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    await loadFile();
    return memCache[key] || null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await loadFile();
    memCache[key] = value;
    await saveFile();
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await loadFile();
    delete memCache[key];
    await saveFile();
  }
};
