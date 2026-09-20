import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform, Image as RNImage } from 'react-native';
import { CornerPoints } from '../../types';
import { EdgeDetector } from './edgeDetection';

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/**
 * Obtém as dimensões reais da imagem de forma segura e de alta fidelidade
 */
export async function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        resolve({
          width: img.naturalWidth || img.width || 1200,
          height: img.naturalHeight || img.height || 1600,
        });
      };
      img.onerror = () => resolve({ width: 1200, height: 1600 });
      img.src = uri;
    });
  }

  // No nativo, manipular sem ações é a forma mais rápida e precisa de obter a resolução nativa do sensor
  try {
    const info = await manipulateAsync(uri, [], { format: SaveFormat.JPEG });
    if (info.width && info.height) {
      return { width: info.width, height: info.height };
    }
  } catch {
    // Fallback silencioso para Image.getSize
  }

  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve({ width: 1200, height: 1600 })
    );
  });
}

/**
 * Calcula o retângulo delimitador a partir dos 4 cantos reais
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
 * Executa o corte e retificação de proporção da página de documento.
 * Se nenhum canto customizado for passado ou se cobrir a foto completa,
 * a imagem original é 100% preservada sem cortes ou zooms automáticos.
 */
export async function correctPerspectiveAndCrop(
  uri: string,
  corners?: CornerPoints | null
): Promise<{ uri: string; width: number; height: number; corners: CornerPoints }> {
  // 1. Obter dimensões reais da imagem capturada
  const { width: origW, height: origH } = await getImageDimensions(uri);

  // 2. Se os cantos forem nulos ou representarem a imagem quase inteira (97%+),
  // PRESERVAR A IMAGEM ORIGINAL SEM RECORTAR! Zero zoom falso!
  const isFullImage =
    !corners ||
    (corners.topLeft.x <= origW * 0.03 &&
      corners.topLeft.y <= origH * 0.03 &&
      corners.bottomRight.x >= origW * 0.97 &&
      corners.bottomRight.y >= origH * 0.97);

  if (isFullImage) {
    const fullCorners = EdgeDetector.createFullCorners(origW, origH);
    return {
      uri,
      width: origW,
      height: origH,
      corners: fullCorners,
    };
  }

  // 3. Caso o usuário tenha ajustado cantos manualmente no CropEditorModal:
  const crop = calculateBoundingCrop(corners, origW, origH);

  // Se o crop delimitado cobre mais de 98% da imagem, também não recorta
  if (crop.width >= origW * 0.98 && crop.height >= origH * 0.98) {
    return {
      uri,
      width: origW,
      height: origH,
      corners,
    };
  }

  // Ambiente Web
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = crop.width;
        canvas.height = crop.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ uri, width: origW, height: origH, corners });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

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
          corners,
        });
      };
      img.onerror = () => {
        resolve({ uri, width: origW, height: origH, corners });
      };
      img.src = uri;
    });
  }

  // Ambiente Nativo (Android / iOS):
  const result = await manipulateAsync(
    uri,
    [{ crop }],
    {
      compress: 0.94,
      format: SaveFormat.JPEG,
    }
  );

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    corners,
  };
}
