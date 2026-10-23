import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import type { Prediction, ScanRecord, SelectedImage } from '../types/plant';

const STORAGE_KEY = '@plantcare-ai/scan-history-v1';
const HISTORY_DIRECTORY = `${FileSystem.documentDirectory}scan-history/`;

export async function readScanHistory(): Promise<ScanRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = JSON.parse(raw); }
  catch {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return [];
  }
  if (!Array.isArray(parsed)) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return [];
  }
  return parsed.filter(isScanRecord);
}

function isScanRecord(value: unknown): value is ScanRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.class === 'string' &&
    typeof item.confidence === 'number' && Number.isFinite(item.confidence) &&
    typeof item.scannedAt === 'string' && typeof item.thumbnailUri === 'string';
}

export async function addScanRecord(prediction: Prediction, image: SelectedImage): Promise<ScanRecord> {
  const dir = await FileSystem.getInfoAsync(HISTORY_DIRECTORY);
  if (!dir.exists) await FileSystem.makeDirectoryAsync(HISTORY_DIRECTORY, { intermediates: true });
  const resized = await ImageManipulator.manipulateAsync(image.uri, [{ resize: { width: 480 } }], {
    compress: 0.68,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const thumbnailUri = `${HISTORY_DIRECTORY}${id}.jpg`;
  await FileSystem.copyAsync({ from: resized.uri, to: thumbnailUri });
  const record: ScanRecord = { id, ...prediction, scannedAt: new Date().toISOString(), thumbnailUri };
  try {
    const existing = await readScanHistory();
    const next = [record, ...existing].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const retained = new Set(next.map((item) => item.id));
    await Promise.all(existing.filter((item) => !retained.has(item.id)).map((item) => FileSystem.deleteAsync(item.thumbnailUri, { idempotent: true }).catch(() => undefined)));
    return record;
  } catch (error) {
    await FileSystem.deleteAsync(thumbnailUri, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

export async function deleteScanRecord(id: string): Promise<void> {
  const existing = await readScanHistory();
  const removed = existing.find((item) => item.id === id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((item) => item.id !== id)));
  if (removed) await FileSystem.deleteAsync(removed.thumbnailUri, { idempotent: true }).catch(() => undefined);
}

export async function clearScanHistory(): Promise<void> {
  const existing = await readScanHistory();
  await AsyncStorage.removeItem(STORAGE_KEY);
  await Promise.all(existing.map((item) => FileSystem.deleteAsync(item.thumbnailUri, { idempotent: true }).catch(() => undefined)));
}
