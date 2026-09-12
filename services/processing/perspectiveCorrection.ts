import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { CornerPoints } from '../../types';
import { EdgeDetector } from './edgeDetection';

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/**
 * Calcula o retângulo delimitador com margens naturais a partir dos 4 cantos
 */
export function calculateBoundingCrop(
  corners: CornerPoints,
  imageWidth: number,
  imageHeight: number
): CropRect {
  const minX = Math.max(0, Math.min(corners.topLeft.x, corners.bottomLeft.x));
  const maxX = Math.min(imageWidth, Math.max(corners.topRight.x, corners.bottomRight.x));
  const minY = Math.max(0, Math.min(corners.topLeft.y, corners.topRight.y));
  const maxY = Math.min(imageHeight, Math.max(corners.bottomLeft.y, corners.bottomRight.y));

  const width = Math.max(20, maxX - minX);
  const height = Math.max(20, maxY - minY);

  return {
    originX: Math.round(minX),
    originY: Math.round(minY),
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Executa o corte e retificação de proporção da página de documento
 */
export async function correctPerspectiveAndCrop(
  uri: string,
  corners?: CornerPoints | null
): Promise<{ uri: string; width: number; height: number; corners: CornerPoints }> {
  // No ambiente Web, executa o crop diretamente via Canvas 2D de alta fidelidade
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const origW = img.naturalWidth || img.width || 1200;
        const origH = img.naturalHeight || img.height || 1600;

        const effectiveCorners = corners || EdgeDetector.createDefaultCorners(origW, origH);
        const crop = calculateBoundingCrop(effectiveCorners, origW, origH);

        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ uri, width: origW, height: origH, corners: effectiveCorners });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Desenha a fatia recortada do documento
        ctx.drawImage(
          img,
          crop.originX,
          crop.originY,
          crop.width,
          crop.height,
          0,
          0,
          crop.width,
          crop.height
        );

        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        resolve({
          uri: croppedDataUrl,
          width: crop.width,
          height: crop.height,
          corners: effectiveCorners,
        });
      };

      img.onerror = () => {
        resolve({
          uri,
          width: 1200,
          height: 1600,
          corners: corners || EdgeDetector.createDefaultCorners(1200, 1600),
        });
      };

      img.src = uri;
    });
  }

  // No ambiente Nativo (iOS/Android):
  const fallbackCorners = corners || EdgeDetector.createDefaultCorners(1200, 1600);
  const crop = calculateBoundingCrop(fallbackCorners, 1200, 1600);

  const result = await manipulateAsync(
    uri,
    [{ crop }],
    {
      compress: 0.92,
      format: SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    corners: fallbackCorners,
  };
}
