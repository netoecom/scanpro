/**
 * ScanPro — Telemetry & Production Analytics Types
 * Conforme especificado na Fase 10 do ROADMAP.md
 */

export type FunnelEventName =
  | 'app_open'
  | 'scanner_opened'
  | 'capture'
  | 'successful_processing'
  | 'pdf_generated'
  | 'pdf_shared'
  | 'second_scan'
  | 'paywall_viewed'
  | 'subscription_purchased';

export interface TelemetryEvent {
  id: string;
  name: FunnelEventName;
  timestamp: string;
  properties?: Record<string, any>;
}

export interface PerformanceTrace {
  name: string;
  durationMs: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface CrashReport {
  id: string;
  message: string;
  stack?: string;
  timestamp: string;
  context?: Record<string, any>;
}

export interface FunnelSummary {
  appOpens: number;
  scannerOpens: number;
  captures: number;
  processingSuccess: number;
  pdfGenerated: number;
  pdfShared: number;
  paywallViews: number;
  proPurchases: number;
  averageScanToPdfMs?: number;
}
