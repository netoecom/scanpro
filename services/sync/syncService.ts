/**
 * ScanPro — Sync Engine & Outbox Worker
 * Conforme especificado em TECH_ARCHITECTURE.md (Seção 11 - Offline Sync)
 * local change -> outbox -> sync worker -> remote -> ack -> mark synced
 */

export interface SyncQueueItem {
  id: string;
  entityType: 'document' | 'page' | 'folder';
  entityId: string;
  action: 'create' | 'update' | 'delete';
  payload?: any;
  createdAt: string;
  attempts: number;
}

export type SyncState = 'synced' | 'pending' | 'syncing' | 'offline';

export interface SyncOverview {
  state: SyncState;
  pendingCount: number;
  lastSyncTime: string | null;
}

export class SyncService {
  private static outboxQueue: SyncQueueItem[] = [];
  private static isSyncing = false;
  private static lastSyncTime: string | null = null;

  /**
   * Enfileira alteração local para sincronização futura na nuvem
   */
  static enqueueChange(
    entityType: 'document' | 'page' | 'folder',
    entityId: string,
    action: 'create' | 'update' | 'delete',
    payload?: any
  ): void {
    this.outboxQueue.push({
      id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entityType,
      entityId,
      action,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    });
  }

  /**
   * Retorna o status geral de sincronização do dispositivo
   */
  static getOverview(): SyncOverview {
    return {
      state: this.isSyncing
        ? 'syncing'
        : this.outboxQueue.length > 0
        ? 'pending'
        : 'synced',
      pendingCount: this.outboxQueue.length,
      lastSyncTime: this.lastSyncTime,
    };
  }

  /**
   * Dispara o worker de sincronização assíncrona
   */
  static async triggerSync(): Promise<{ processed: number; success: boolean }> {
    if (this.isSyncing) {
      return { processed: 0, success: true };
    }

    this.isSyncing = true;

    try {
      // Simulação do processamento assíncrono do outbox com latência resiliente
      await new Promise((resolve) => setTimeout(resolve, 800));

      const count = this.outboxQueue.length;
      // Drena os itens sincronizados
      this.outboxQueue = [];
      this.lastSyncTime = new Date().toISOString();

      return { processed: count, success: true };
    } catch (err) {
      console.warn('Falha na sincronização em nuvem:', err);
      return { processed: 0, success: false };
    } finally {
      this.isSyncing = false;
    }
  }
}
