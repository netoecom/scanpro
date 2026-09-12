/**
 * ScanPro — Telemetry & Production Monitoring Service
 * Local-First, Anônimo e Resiliente (Fase 10 - Production Readiness).
 * Monitora o funil North Star e a integridade de performance do app.
 */

import {
  FunnelEventName,
  TelemetryEvent,
  PerformanceTrace,
  CrashReport,
  FunnelSummary,
} from './types';

const EVENTS_STORAGE_KEY = 'scanpro_telemetry_events';
const CRASHES_STORAGE_KEY = 'scanpro_crash_reports';
const TRACES_STORAGE_KEY = 'scanpro_perf_traces';
const MAX_STORED_EVENTS = 200;
const MAX_STORED_CRASHES = 50;
const MAX_STORED_TRACES = 100;

export class TelemetryService {
  private static scanStartTime: number | null = null;

  /**
   * Registra um evento no funil North Star
   */
  static track(name: FunnelEventName, properties?: Record<string, any>): void {
    try {
      const event: TelemetryEvent = {
        id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name,
        timestamp: new Date().toISOString(),
        properties,
      };

      const events = this.getStoredEvents();
      events.push(event);

      if (events.length > MAX_STORED_EVENTS) {
        events.splice(0, events.length - MAX_STORED_EVENTS);
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
      }
    } catch {
      // Ignora falhas silenciosas de storage para nunca quebrar a UI
    }
  }

  /**
   * Inicia o timer da métrica North Star (tempo entre abrir o scanner e PDF pronto)
   */
  static startScanTrace(): void {
    this.scanStartTime = Date.now();
  }

  /**
   * Finaliza o timer da métrica North Star ao gerar o PDF
   */
  static finishScanTrace(pdfTitle?: string): number | null {
    if (!this.scanStartTime) return null;
    const duration = Date.now() - this.scanStartTime;
    this.scanStartTime = null;

    this.recordTrace('scan_to_pdf_duration', duration, { title: pdfTitle });
    return duration;
  }

  /**
   * Inicia a medição de uma operação de performance genérica
   */
  static startTrace(traceName: string) {
    const startTime = Date.now();
    return (metadata?: Record<string, any>) => {
      const duration = Date.now() - startTime;
      TelemetryService.recordTrace(traceName, duration, metadata);
      return duration;
    };
  }

  /**
   * Salva uma métrica de performance
   */
  static recordTrace(name: string, durationMs: number, metadata?: Record<string, any>): void {
    try {
      const trace: PerformanceTrace = {
        name,
        durationMs,
        timestamp: new Date().toISOString(),
        metadata,
      };

      const traces = this.getStoredTraces();
      traces.push(trace);

      if (traces.length > MAX_STORED_TRACES) {
        traces.splice(0, traces.length - MAX_STORED_TRACES);
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(TRACES_STORAGE_KEY, JSON.stringify(traces));
      }
    } catch {
      // Falha segura
    }
  }

  /**
   * Registra erros e crashes sem travar a aplicação
   */
  static reportCrash(error: Error | any, context?: Record<string, any>): void {
    try {
      const report: CrashReport = {
        id: `crash_${Date.now()}`,
        message: error?.message || String(error),
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        context,
      };

      console.error('[ScanPro Telemetry] Crash reportado:', report);

      const crashes = this.getStoredCrashes();
      crashes.push(report);

      if (crashes.length > MAX_STORED_CRASHES) {
        crashes.splice(0, crashes.length - MAX_STORED_CRASHES);
      }

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(CRASHES_STORAGE_KEY, JSON.stringify(crashes));
      }
    } catch {
      // Falha segura
    }
  }

  /**
   * Retorna o resumo consolidado do funil de conversão e North Star
   */
  static getFunnelSummary(): FunnelSummary {
    const events = this.getStoredEvents();
    const traces = this.getStoredTraces();

    const scanTraces = traces.filter((t) => t.name === 'scan_to_pdf_duration');
    const avgDuration =
      scanTraces.length > 0
        ? Math.round(scanTraces.reduce((acc, t) => acc + t.durationMs, 0) / scanTraces.length)
        : undefined;

    return {
      appOpens: events.filter((e) => e.name === 'app_open').length,
      scannerOpens: events.filter((e) => e.name === 'scanner_opened').length,
      captures: events.filter((e) => e.name === 'capture').length,
      processingSuccess: events.filter((e) => e.name === 'successful_processing').length,
      pdfGenerated: events.filter((e) => e.name === 'pdf_generated').length,
      pdfShared: events.filter((e) => e.name === 'pdf_shared').length,
      paywallViews: events.filter((e) => e.name === 'paywall_viewed').length,
      proPurchases: events.filter((e) => e.name === 'subscription_purchased').length,
      averageScanToPdfMs: avgDuration,
    };
  }

  static getStoredEvents(): TelemetryEvent[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static getStoredTraces(): PerformanceTrace[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(TRACES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static getStoredCrashes(): CrashReport[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = localStorage.getItem(CRASHES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static clearAll(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(EVENTS_STORAGE_KEY);
      localStorage.removeItem(TRACES_STORAGE_KEY);
      localStorage.removeItem(CRASHES_STORAGE_KEY);
    }
  }
}
