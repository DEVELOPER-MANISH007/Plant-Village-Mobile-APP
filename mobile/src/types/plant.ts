export type SelectedImage = { uri: string; fileName: string; mimeType: string };
export type Prediction = { class: string; confidence: number };
export type ScanRecord = Prediction & { id: string; scannedAt: string; thumbnailUri: string };
