import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

/**
 * Gera um thumbnail leve (largura máxima 240px) para acelerar listas e economizar memória
 */
export async function generateThumbnail(uri: string): Promise<string> {
  // No ambiente Web, utiliza Canvas 2D diretamente para redimensionamento instantâneo
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const origW = img.naturalWidth || img.width || 1;
        const origH = img.naturalHeight || img.height || 1;
        const thumbW = 240;
        const thumbH = Math.max(20, Math.round(thumbW * (origH / origW)));

        const canvas = document.createElement('canvas');
        canvas.width = thumbW;
        canvas.height = thumbH;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(uri);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, thumbW, thumbH);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(uri);
      img.src = uri;
    });
  }

  // Ambiente Nativo
  try {
    const result = await manipulateAsync(
      uri,
      [
        {
          resize: { width: 240 },
        },
      ],
      {
        compress: 0.75,
        format: SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (err) {
    console.warn('Falha na geração de thumbnail, usando original como fallback:', err);
    return uri;
  }
}
