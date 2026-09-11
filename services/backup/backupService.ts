/**
 * ScanPro — Backup & Restore Engine
 * Conforme especificado no Roadmap (Fase 8) e TECH_ARCHITECTURE.md
 * Permite exportação completa dos metadados e restauração segura.
 */

import { Platform } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { defaultDocumentRepository } from '../../repositories';
import { Document, DocumentPage, Folder } from '../../types';

export interface BackupData {
  version: string;
  exportedAt: string;
  app: 'ScanPro';
  documents: Array<Document & { pages: DocumentPage[] }>;
  folders: Folder[];
}

export class BackupService {
  /**
   * Compila todos os dados do banco local em uma estrutura JSON validada
   */
  static async generateBackupData(): Promise<BackupData> {
    const documents = await defaultDocumentRepository.listDocuments();
    const folders = await defaultDocumentRepository.listFolders();

    const fullDocuments: Array<Document & { pages: DocumentPage[] }> = [];

    for (const doc of documents) {
      const pages = await defaultDocumentRepository.getDocumentPages(doc.id);
      fullDocuments.push({
        ...doc,
        pages,
      });
    }

    return {
      version: '1.0.0',
      app: 'ScanPro',
      exportedAt: new Date().toISOString(),
      documents: fullDocuments,
      folders,
    };
  }

  /**
   * Exporta o arquivo de backup para download ou compartilhamento nativo
   */
  static async exportBackup(): Promise<void> {
    const backupData = await this.generateBackupData();
    const jsonString = JSON.stringify(backupData, null, 2);
    const filename = `scanpro_backup_${new Date().toISOString().slice(0, 10)}.json`;

    if (Platform.OS === 'web') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const fileUri = `${FileSystem.documentDirectory || ''}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar Backup ScanPro',
        });
      }
    }
  }

  /**
   * Restaura um backup a partir de uma string JSON
   */
  static async restoreFromJson(jsonString: string): Promise<{ restoredDocs: number; restoredFolders: number }> {
    const data: BackupData = JSON.parse(jsonString);

    if (data.app !== 'ScanPro' || !Array.isArray(data.documents)) {
      throw new Error('Arquivo de backup inválido ou incompatível.');
    }

    let restoredFolders = 0;
    let restoredDocs = 0;

    // Restaura pastas
    if (Array.isArray(data.folders)) {
      for (const f of data.folders) {
        try {
          await defaultDocumentRepository.createFolder(f.name);
          restoredFolders++;
        } catch {
          // Ignora pasta duplicada
        }
      }
    }

    // Restaura documentos e suas respectivas páginas
    for (const doc of data.documents) {
      try {
        await defaultDocumentRepository.createDocument({
          title: doc.title,
          folderId: doc.folderId,
          pages: doc.pages.map((p, idx) => ({
            pageIndex: idx,
            originalPath: p.originalPath,
            processedPath: p.processedPath,
            thumbnailPath: p.thumbnailPath,
            ocrText: p.ocrText,
            width: p.width,
            height: p.height,
          })),
        });
        restoredDocs++;
      } catch (err) {
        console.warn('Erro ao restaurar documento:', err);
      }
    }

    return { restoredDocs, restoredFolders };
  }
}
