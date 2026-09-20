import { Platform } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { CornerPoints, DocumentDetection, Point } from '../../types';
import { base64ToUint8Array } from './base64Utils';

export class EdgeDetector {
  /**
   * Gera cantos proporcionais A4 centralizados no meio da imagem (correspondendo ao visor da câmera)
   */
  static createDefaultCorners(width: number, height: number): CornerPoints {
    const isPortrait = height >= width;
    const a4Ratio = 1.414;

    let targetW: number;
    let targetH: number;

    if (isPortrait) {
      targetW = Math.round(width * 0.86);
      targetH = Math.round(targetW * a4Ratio);
      if (targetH > height * 0.90) {
        targetH = Math.round(height * 0.90);
        targetW = Math.round(targetH / a4Ratio);
      }
    } else {
      targetH = Math.round(height * 0.86);
      targetW = Math.round(targetH * a4Ratio);
      if (targetW > width * 0.90) {
        targetW = Math.round(width * 0.90);
        targetH = Math.round(targetW / a4Ratio);
      }
    }

    const startX = Math.max(0, Math.round((width - targetW) / 2));
    const startY = Math.max(0, Math.round((height - targetH) / 2));
    const endX = Math.min(width, startX + targetW);
    const endY = Math.min(height, startY + targetH);

    return {
      topLeft: { x: startX, y: startY },
      topRight: { x: endX, y: startY },
      bottomRight: { x: endX, y: endY },
      bottomLeft: { x: startX, y: endY },
    };
  }

  /**
   * Cantos de borda a borda (100% da imagem)
   */
  static createFullCorners(width: number, height: number): CornerPoints {
    return {
      topLeft: { x: 0, y: 0 },
      topRight: { x: width, y: 0 },
      bottomRight: { x: width, y: height },
      bottomLeft: { x: 0, y: height },
    };
  }

  /**
   * Analisa buffer de pixels RGBA e detecta os limites retangulares do documento
   */
  private static analyzePixels(
    data: Uint8Array,
    analysisW: number,
    analysisH: number,
    origW: number,
    origH: number
  ): DocumentDetection {
    const rowBrightness = new Float32Array(analysisH);
    const colBrightness = new Float32Array(analysisW);

    for (let y = 0; y < analysisH; y++) {
      let rowSum = 0;
      const yOffset = y * analysisW * 4;
      for (let x = 0; x < analysisW; x++) {
        const idx = yOffset + x * 4;
        const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        rowSum += lum;
        colBrightness[x] += lum;
      }
      rowBrightness[y] = rowSum / analysisW;
    }

    for (let x = 0; x < analysisW; x++) {
      colBrightness[x] = colBrightness[x] / analysisH;
    }

    const marginX = Math.max(2, Math.round(analysisW * 0.04));
    const marginY = Math.max(2, Math.round(analysisH * 0.04));

    let minX = marginX;
    let maxX = analysisW - marginX;
    let minY = marginY;
    let maxY = analysisH - marginY;

    // Acha limites horizontais pelo salto de luminância
    const midColBrightness = colBrightness.reduce((a, b) => a + b, 0) / analysisW;
    for (let x = marginX; x < analysisW / 2; x++) {
      if (colBrightness[x] > midColBrightness * 0.90) {
        minX = x;
        break;
      }
    }
    for (let x = analysisW - marginX; x > analysisW / 2; x--) {
      if (colBrightness[x] > midColBrightness * 0.90) {
        maxX = x;
        break;
      }
    }

    // Acha limites verticais pelo salto de luminância
    const midRowBrightness = rowBrightness.reduce((a, b) => a + b, 0) / analysisH;
    for (let y = marginY; y < analysisH / 2; y++) {
      if (rowBrightness[y] > midRowBrightness * 0.90) {
        minY = y;
        break;
      }
    }
    for (let y = analysisH - marginY; y > analysisH / 2; y--) {
      if (rowBrightness[y] > midRowBrightness * 0.90) {
        maxY = y;
        break;
      }
    }

    const detectedW = maxX - minX;
    const detectedH = maxY - minY;
    const areaRatio = (detectedW * detectedH) / (analysisW * analysisH);

    // Se detectou uma área coerente de documento (entre 25% e 94% da imagem)
    if (areaRatio >= 0.25 && areaRatio <= 0.94) {
      const scaleX = origW / analysisW;
      const scaleY = origH / analysisH;

      return {
        detected: true,
        confidence: 0.92,
        corners: {
          topLeft: { x: Math.round(minX * scaleX), y: Math.round(minY * scaleY) },
          topRight: { x: Math.round(maxX * scaleX), y: Math.round(minY * scaleY) },
          bottomRight: { x: Math.round(maxX * scaleX), y: Math.round(maxY * scaleY) },
          bottomLeft: { x: Math.round(minX * scaleX), y: Math.round(maxY * scaleY) },
        },
      };
    }

    // Caso de baixo contraste ou documento ocupando quadro inteiro: usa enquadramento padrão A4
    return {
      detected: false,
      confidence: 0.85,
      corners: this.createDefaultCorners(origW, origH),
    };
  }

  /**
   * Detecta os 4 cantos do documento na imagem usando processamento de pixels real (Android, iOS e Web)
   */
  static async detectDocumentCorners(
    imageUri: string
  ): Promise<DocumentDetection> {
    try {
      const analysisW = 320;
      const thumb = await manipulateAsync(
        imageUri,
        [{ resize: { width: analysisW } }],
        { format: SaveFormat.JPEG, base64: true }
      );

      let fullW = 1200;
      let fullH = 1600;

      try {
        const fullInfo = await manipulateAsync(imageUri, [], { format: SaveFormat.JPEG });
        if (fullInfo.width && fullInfo.height) {
          fullW = fullInfo.width;
          fullH = fullInfo.height;
        }
      } catch {
        // Fallback
      }

      if (thumb.base64) {
        const bytes = base64ToUint8Array(thumb.base64);
        const decoded = jpeg.decode(bytes, { useTArray: true });
        if (decoded && decoded.data) {
          return this.analyzePixels(decoded.data as Uint8Array, decoded.width, decoded.height, fullW, fullH);
        }
      }

      return {
        detected: false,
        confidence: 0.8,
        corners: this.createDefaultCorners(fullW, fullH),
      };
    } catch (err) {
      console.warn('Fallback na detecção automática de bordas:', err);
      return {
        detected: false,
        confidence: 0.7,
        corners: this.createDefaultCorners(1200, 1600),
      };
    }
  }
}
