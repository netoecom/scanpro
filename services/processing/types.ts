import { CornerPoints, ScanFilterMode } from '../../types';

export interface ProcessPageInput {
  imageUri: string;
  corners?: CornerPoints | null;
  filterMode?: ScanFilterMode;
  targetWidth?: number;
  targetHeight?: number;
}

export interface ProcessedPageResult {
  originalUri: string;
  processedUri: string;
  thumbnailUri: string;
  width: number;
  height: number;
  filterMode: ScanFilterMode;
}
