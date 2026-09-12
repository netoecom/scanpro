/**
 * ScanPro — Edge Detection & Smart Document Framing
 * Detecção inteligente de bordas e alinhamento de enquadramento local-first.
 */

import { Platform } from 'react-native';
import { CornerPoints, DocumentDetection, Point } from '../../types';

export class EdgeDetector {
  /**
   * Gera cantos proporcionais A4 centralizados no meio da imagem (fallback do visor)
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
   * Detecta os 4 cantos do documento na imagem usando processamento de pixels
   */
  static async detectDocumentCorners(
    imageUri: string
  ): Promise<DocumentDetection> {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return {
        detected: false,
        confidence: 0.7,
        corners: this.createDefaultCorners(1200, 1600),
      };
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const origW = img.naturalWidth || img.width || 1200;
        const origH = img.naturalHeight || img.height || 1600;

        try {
          // Redimensiona para resolução de análise ultra-rápida (<=320px)
          const analysisW = 320;
          const analysisH = Math.round(analysisW * (origH / origW));

          const canvas = document.createElement('canvas');
          canvas.width = analysisW;
          canvas.height = analysisH;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve({
              detected: false,
              confidence: 0.75,
              corners: this.createDefaultCorners(origW, origH),
            });
            return;
          }

          ctx.drawImage(img, 0, 0, analysisW, analysisH);
          const imageData = ctx.getImageData(0, 0, analysisW, analysisH);
          const data = imageData.data;

          // 1. Mapa de luminância e detecção de gradientes nas linhas/colunas
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

          // 2. Encontra transições abruptas de brilho (bordas do papel em relação ao fundo)
          // Margem mínima de segurança (5% para evitar cortes espúrios nas bordas do sensor)
          const marginX = Math.round(analysisW * 0.05);
          const marginY = Math.round(analysisH * 0.05);

          let minX = marginX;
          let maxX = analysisW - marginX;
          let minY = marginY;
          let maxY = analysisH - marginY;

          // Acha borda esquerda e direita
          const midColBrightness = colBrightness.reduce((a, b) => a + b, 0) / analysisW;
          for (let x = marginX; x < analysisW / 2; x++) {
            if (colBrightness[x] > midColBrightness * 0.92) {
              minX = x;
              break;
            }
          }
          for (let x = analysisW - marginX; x > analysisW / 2; x--) {
            if (colBrightness[x] > midColBrightness * 0.92) {
              maxX = x;
              break;
            }
          }

          // Acha borda superior e inferior
          const midRowBrightness = rowBrightness.reduce((a, b) => a + b, 0) / analysisH;
          for (let y = marginY; y < analysisH / 2; y++) {
            if (rowBrightness[y] > midRowBrightness * 0.92) {
              minY = y;
              break;
            }
          }
          for (let y = analysisH - marginY; y > analysisH / 2; y--) {
            if (rowBrightness[y] > midRowBrightness * 0.92) {
              maxY = y;
              break;
            }
          }

          const detectedW = maxX - minX;
          const detectedH = maxY - minY;
          const areaRatio = (detectedW * detectedH) / (analysisW * analysisH);

          // Se a área detectada for razoável (entre 25% e 95% do quadro), mapeia de volta para as dimensões originais
          if (areaRatio >= 0.25 && areaRatio <= 0.96) {
            const scaleX = origW / analysisW;
            const scaleY = origH / analysisH;

            const corners: CornerPoints = {
              topLeft: { x: Math.round(minX * scaleX), y: Math.round(minY * scaleY) },
              topRight: { x: Math.round(maxX * scaleX), y: Math.round(minY * scaleY) },
              bottomRight: { x: Math.round(maxX * scaleX), y: Math.round(maxY * scaleY) },
              bottomLeft: { x: Math.round(minX * scaleX), y: Math.round(maxY * scaleY) },
            };

            resolve({
              detected: true,
              confidence: 0.91,
              corners,
            });
            return;
          }

          // Fallback para quadrante A4 do visor
          resolve({
            detected: false,
            confidence: 0.8,
            corners: this.createDefaultCorners(origW, origH),
          });
        } catch (err) {
          console.warn('Falha na detecção de bordas:', err);
          resolve({
            detected: false,
            confidence: 0.7,
            corners: this.createDefaultCorners(origW, origH),
          });
        }
      };

      img.onerror = () => {
        resolve({
          detected: false,
          confidence: 0.5,
          corners: this.createDefaultCorners(1200, 1600),
        });
      };

      img.src = imageUri;
    });
  }
}
