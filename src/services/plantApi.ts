import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../constants/config';
import type { Prediction, SelectedImage } from '../types/plant';

export class PlantApiError extends Error {
  constructor(message: string, public readonly kind: 'timeout' | 'network' | 'http' | 'response') {
    super(message);
    this.name = 'PlantApiError';
  }
}

export async function analyzePlant(image: SelectedImage, signal?: AbortSignal): Promise<Prediction> {
  const form = new FormData();
  form.append('file', { uri: image.uri, name: image.fileName, type: image.mimeType } as unknown as Blob);
  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  signal?.addEventListener('abort', abortRequest);
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, { method: 'POST', body: form, signal: controller.signal });
    if (!response.ok) {
      const message = response.status === 400 || response.status === 422
        ? 'The server could not use this image. Choose a clear leaf photo and try again.'
        : response.status >= 500
          ? 'The analysis server is unavailable or starting up. Please try again shortly.'
          : `The analysis request could not be completed (HTTP ${response.status}). Please try again.`;
      throw new PlantApiError(message, 'http');
    }
    let data: unknown;
    try { data = await response.json(); }
    catch { throw new PlantApiError('The server returned an unreadable response. Please try again.', 'response'); }
    if (!data || typeof data !== 'object' || !('class' in data) || typeof data.class !== 'string' ||
        !('confidence' in data) || typeof data.confidence !== 'number' || !Number.isFinite(data.confidence) ||
        data.confidence < 0 || data.confidence > 1) {
      throw new PlantApiError('The server response was missing a valid class or confidence value.', 'response');
    }
    return { class: data.class, confidence: data.confidence };
  } catch (error) {
    if (error instanceof PlantApiError) throw error;
    if (controller.signal.aborted && !signal?.aborted) throw new PlantApiError('The analysis took too long. The server may be starting; please try again.', 'timeout');
    throw new PlantApiError('Could not reach the analysis server. Check your internet connection and try again.', 'network');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }
}
