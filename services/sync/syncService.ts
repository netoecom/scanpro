import { DropboxService } from '../dropbox';
import { PdfService } from '../pdf';

export interface SyncQueueItem {
  id: string;
  entityType: 'document' | 'page' | 'folder' | 'dropbox_upload';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'upload';
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
    entityType: 'document' | 'page' | 'folder' | 'dropbox_upload',
    entityId: string,
    action: 'create' | 'update' | 'delete' | 'upload',
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
   * Enfileira upload de documento PDF para o Dropbox
   */
  static enqueueDropboxUpload(
    documentId: string,
    title: string,
    pdfUri: string
  ): void {
    this.enqueueChange('dropbox_upload', documentId, 'upload', {
      title,
      pdfUri,
    });
  }

  /**
   * Executa o upload para o Dropbox em background imediatamente ou enfileira se falhar
   */
  static async syncDropboxDocumentInBackground(
    documentId: string,
    title: string,
    pages: Array<{ uri: string; width?: number; height?: number }>
  ): Promise<void> {
    const dropboxState = DropboxService.getState();
    if (!dropboxState.isConnected || !dropboxState.autoUploadEnabled) {
      return;
    }

    try {
      // Gera o PDF consolidado
      const generated = await PdfService.generatePdf({
        title,
        pages,
      });

      // Tenta o envio imediato via API v2
      await DropboxService.uploadPdf(generated.uri, title);
    } catch (err) {
      console.warn('Upload imediato do Dropbox falhou. Enfileirando no outbox:', err);
      // Se falhar (ex: offline), enfileira para a próxima tentativa de sync
      try {
        const generated = await PdfService.generatePdf({
          title,
          pages,
        });
        this.enqueueDropboxUpload(documentId, title, generated.uri);
      } catch (genErr) {
        console.warn('Erro ao enfileirar PDF para Dropbox:', genErr);
      }
    }
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
    let processedCount = 0;

    try {
      // Processa itens do Dropbox na fila caso esteja conectado
      const remainingQueue: SyncQueueItem[] = [];

      for (const item of this.outboxQueue) {
        if (item.entityType === 'dropbox_upload' && item.payload?.pdfUri) {
          const dropboxState = DropboxService.getState();
          if (dropboxState.isConnected) {
            try {
              await DropboxService.uploadPdf(item.payload.pdfUri, item.payload.title || 'Documento');
              processedCount++;
            } catch (uploadErr) {
              item.attempts++;
              remainingQueue.push(item);
            }
          } else {
            remainingQueue.push(item);
          }
        } else {
          // Itens gerais de sync de entidades
          processedCount++;
        }
      }

      this.outboxQueue = remainingQueue;
      this.lastSyncTime = new Date().toISOString();

      return { processed: processedCount, success: true };
    } catch (err) {
      console.warn('Falha na sincronização em nuvem:', err);
      return { processed: processedCount, success: false };
    } finally {
      this.isSyncing = false;
    }
  }
}

