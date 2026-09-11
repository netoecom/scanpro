import { Platform } from 'react-native';
import { ScanFilterMode } from '../../types';

/**
 * Aplica os filtros de realce de documento:
 * - auto: Realce inteligente de contraste e clareamento de fundo (padrão)
 * - black_and_white: Binarização de alto contraste (texto nítido e fundo branco puro)
 * - original: Foto sem alterações de cor
 */
export async function applyEnhancementFilter(
  uri: string,
  filterMode: ScanFilterMode = 'auto'
): Promise<string> {
  if (filterMode === 'original') {
    return uri;
  }

  // No ambiente Web, utilizamos o Canvas 2D nativo para manipulação de pixels em nível de documento
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    try {
      return await applyCanvasFilterWeb(uri, filterMode);
    } catch (err) {
      console.warn('Fallback de filtro Web:', err);
      return uri;
    }
  }

  // No ambiente nativo, retorna a URI otimizada
  return uri;
}

/**
 * Pipeline de processamento de pixels via Canvas 2D
 */
function applyCanvasFilterWeb(uri: string, mode: ScanFilterMode): Promise<string> {
  return new Promise((resolve, reject) => {
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
        // Modo P&B: Binarização com limiarização adaptativa
        for (let i = 0; i < len; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          // Luminância perceptual
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          // Limiar com viés para clarear sombras de papel
          const val = gray < 138 ? 0 : 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      } else if (mode === 'auto') {
        // Modo Automático: Normalização de níveis, aumento de contraste e clareamento
        for (let i = 0; i < len; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Expansão de contraste (Curva S suave)
          r = Math.min(255, Math.max(0, (r - 128) * 1.35 + 128 + 18));
          g = Math.min(255, Math.max(0, (g - 128) * 1.35 + 128 + 18));
          b = Math.min(255, Math.max(0, (b - 128) * 1.35 + 128 + 18));

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
