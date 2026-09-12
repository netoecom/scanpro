/**
 * ScanPro — Tipos do Motor de Scanner
 * Conforme especificado em SCANNER_ENGINE.md e UX_FLOWS.md
 */

export interface Point {
  x: number;
  y: number;
}

export interface CornerPoints {
  topLeft: Point;
  topRight: Point;
  bottomRight: Point;
  bottomLeft: Point;
}

export interface DocumentDetection {
  detected: boolean;
  confidence: number;
  corners: CornerPoints | null;
}

export type ScannerStatus =
  | 'SCANNER_IDLE'
  | 'SCANNER_SEARCHING'
  | 'DOCUMENT_DETECTED'
  | 'CAPTURING'
  | 'PROCESSING'
  | 'CAPTURE_SUCCESS'
  | 'CAPTURE_ERROR';

export type ScanFilterMode = 'auto' | 'original' | 'black_and_white' | 'grayscale' | 'color_boost';

export interface ScannerSettings {
  autoCapture: boolean;
  flash: boolean;
  sound: boolean;
  haptics: boolean;
}
