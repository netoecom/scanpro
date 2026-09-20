import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { ScanFilterMode } from '../../types';
import { base64ToUint8Array, uint8ArrayToBase64 } from './base64Utils';

/**
 * Aplica os filtros e presets de melhoria de imagem do ScanPro:
 * - auto: Realce inteligente de contraste, branqueamento de papel e nitidez de texto (padrão)
 * - black_and_white: Binarização de alto contraste (fundo 100% branco e letras nítidas)
 * - grayscale: Escala de cinza balanceada (preserva fotos e carimbos)
 * - color_boost: Otimização de saturação e balanço para documentos coloridos (identidades, crachás)
 * - original: Foto sem alterações cromáticas
 */
export async function applyEnhancementFilter(
  uri: string,
  filterMode: ScanFilterMode = 'auto'
): Promise<string> {
  if (filterMode === 'original') {
    return uri;
  }

  // No ambiente Web, utilizamos Canvas 2D nativo para manipulação de pixels
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      return await applyCanvasFilterWeb(uri, filterMode);
    } catch (err) {
      console.warn('Fallback de filtro Web:', err);
      return uri;
    }
  }

  // No ambiente nativo (Android/iOS), processamento de pixels real via jpeg-js
  try {
    return await applyNativeFilter(uri, filterMode);
  } catch (err) {
    console.warn('Fallback de filtro nativo:', err);
    return uri;
  }
}

/**
 * Pipeline de processamento de pixels real no ambiente nativo (Android/iOS)
 * Lê os pixels da imagem, aplica a transformação matemática do filtro e salva o resultado.
 */
async function applyNativeFilter(uri: string, mode: ScanFilterMode): Promise<string> {
  // 1. Redimensiona para resolução ideal de documento (<= 1400px)
  let actions: any[] = [];
  try {
    const origInfo = await manipulateAsync(uri, [], { format: SaveFormat.JPEG });
    const maxDim = 1400;
    if (origInfo.width > maxDim || origInfo.height > maxDim) {
      if (origInfo.width >= origInfo.height) {
        actions.push({ resize: { width: maxDim } });
      } else {
        actions.push({ resize: { height: maxDim } });
      }
    }
  } catch {
    // Prossegue se getSize falhar
  }

  const prep = await manipulateAsync(uri, actions, {
    format: SaveFormat.JPEG,
    compress: 0.95,
    base64: true,
  });

  if (!prep.base64) {
    return uri;
  }

  // Decodifica base64 para Uint8Array sem atob (100% seguro no Hermes Android)
  const bytes = base64ToUint8Array(prep.base64);

  const decoded = jpeg.decode(bytes, { useTArray: true });
  if (!decoded || !decoded.data) {
    return uri;
  }

  const data = decoded.data as Uint8Array;
  const totalPixels = data.length;

  if (mode === 'black_and_white') {
    // P&B Nítido: Binarização de alto contraste (fundo 100% branco, texto preto puro)
    for (let i = 0; i < totalPixels; i += 4) {
      const gray = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
      const val = gray < 140 ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  } else if (mode === 'grayscale') {
    // Escala de Cinza: Preserva gradientes e carimbos com ganho de nitidez
    for (let i = 0; i < totalPixels; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const val = Math.min(255, Math.max(0, (gray - 128) * 1.18 + 128 + 10)) | 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
  } else if (mode === 'color_boost') {
    // Cores Vivas: Saturação 1.38x e clareamento de sombras
    const saturationBoost = 1.38;
    for (let i = 0; i < totalPixels; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = Math.min(255, Math.max(0, (gray + (r - gray) * saturationBoost - 128) * 1.15 + 128 + 8)) | 0;
      data[i + 1] = Math.min(255, Math.max(0, (gray + (g - gray) * saturationBoost - 128) * 1.15 + 128 + 8)) | 0;
      data[i + 2] = Math.min(255, Math.max(0, (gray + (b - gray) * saturationBoost - 128) * 1.15 + 128 + 8)) | 0;
    }
  } else if (mode === 'auto') {
    // Mágico (Auto): Branqueamento inteligente de papel e contraste de texto
    for (let i = 0; i < totalPixels; i += 4) {
      data[i] = Math.min(255, Math.max(0, (data[i] - 128) * 1.38 + 128 + 22)) | 0;
      data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * 1.38 + 128 + 22)) | 0;
      data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * 1.38 + 128 + 22)) | 0;
    }
  }

  // Codifica de volta para JPEG
  const encoded = jpeg.encode(
    {
      data,
      width: decoded.width,
      height: decoded.height,
    },
    92
  );

  // Converte Uint8Array para base64 com segurança (sem btoa)
  const base64Out = uint8ArrayToBase64(encoded.data);

  const cacheFile = `${FileSystem.cacheDirectory}filter_${Date.now()}_${mode}.jpg`;
  await FileSystem.writeAsStringAsync(cacheFile, base64Out, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return cacheFile;
}


/**
 * Pipeline de processamento de pixels via Canvas 2D (Web)
 */
function applyCanvasFilterWeb(uri: string, mode: ScanFilterMode): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(uri);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const len = data.length;

      if (mode === 'black_and_white') {
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const val = gray < 140 ? 0 : 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      } else if (mode === 'grayscale') {
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          let gray = 0.299 * r + 0.587 * g + 0.114 * b;
          gray = Math.min(255, Math.max(0, (gray - 128) * 1.18 + 128 + 10));
          data[i] = gray;
          data[i + 1] = gray;
          data[i + 2] = gray;
        }
      } else if (mode === 'color_boost') {
        const saturationBoost = 1.38;
        for (let i = 0; i < len; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * saturationBoost;
          g = gray + (g - gray) * saturationBoost;
          b = gray + (b - gray) * saturationBoost;
          r = Math.min(255, Math.max(0, (r - 128) * 1.15 + 128 + 8));
          g = Math.min(255, Math.max(0, (g - 128) * 1.15 + 128 + 8));
          b = Math.min(255, Math.max(0, (b - 128) * 1.15 + 128 + 8));
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      } else if (mode === 'auto') {
        for (let i = 0; i < len; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          r = Math.min(255, Math.max(0, (r - 128) * 1.38 + 128 + 22));
          g = Math.min(255, Math.max(0, (g - 128) * 1.38 + 128 + 22));
          b = Math.min(255, Math.max(0, (b - 128) * 1.38 + 128 + 22));
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.98));
    };

    img.onerror = () => {
      resolve(uri);
    };

    img.src = uri;
  });
}
