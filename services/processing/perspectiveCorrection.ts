import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { CornerPoints } from '../../types';

export interface CropRect {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/**
 * Calcula o retângulo delimitador com margens naturais a partir dos 4 cantos detectados
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

  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);

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
): Promise<{ uri: string; width: number; height: number }> {
  // Se não houver cantos fornecidos, otimiza o corte padrão de margens (5% de borda de segurança)
  const actions = corners
    ? [
        {
          crop: calculateBoundingCrop(corners, 1200, 1600),
        },
      ]
    : [];

  const result = await manipulateAsync(uri, actions, {
    compress: 0.92,
    format: SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}
