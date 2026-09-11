import { ProcessPageInput, ProcessedPageResult } from './types';
import { correctPerspectiveAndCrop } from './perspectiveCorrection';
import { applyEnhancementFilter } from './enhancement';
import { generateThumbnail } from './thumbnails';

export class ProcessingPipeline {
  /**
   * Executa a esteira completa: Recorte/Perspectiva -> Realce -> Thumbnail
   */
  static async processPage(input: ProcessPageInput): Promise<ProcessedPageResult> {
    const filterMode = input.filterMode ?? 'auto';

    // 1. Correção geométrica e recorte
    const cropped = await correctPerspectiveAndCrop(input.imageUri, input.corners);

    // 2. Realce de imagem (Auto, P&B ou Original)
    const enhancedUri = await applyEnhancementFilter(cropped.uri, filterMode);

    // 3. Geração de thumbnail leve para a biblioteca
    const thumbnailUri = await generateThumbnail(enhancedUri);

    return {
      originalUri: input.imageUri,
      processedUri: enhancedUri,
      thumbnailUri: thumbnailUri,
      width: cropped.width,
      height: cropped.height,
      filterMode,
    };
  }
}
