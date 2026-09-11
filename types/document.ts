/**
 * ScanPro — Tipos de Entidades e Persistência
 * Conforme especificado em DATA_MODEL.md e TECH_ARCHITECTURE.md
 */

export type SyncStatus = 'local' | 'pending' | 'synced' | 'error';

export interface Document {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  pdfPath?: string;
  thumbnailPath?: string;
  folderId?: string | null;
  isFavorite: boolean;
  syncStatus: SyncStatus;
}

export interface DocumentPage {
  id: string;
  documentId: string;
  pageIndex: number;
  originalPath: string;
  processedPath: string;
  thumbnailPath: string;
  ocrText?: string;
  width: number;
  height: number;
  createdAt: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentInput {
  title?: string;
  folderId?: string | null;
  pages?: Omit<DocumentPage, 'id' | 'documentId' | 'createdAt'>[];
}

export interface UpdateDocumentInput {
  title?: string;
  folderId?: string | null;
  isFavorite?: boolean;
  pdfPath?: string;
  thumbnailPath?: string;
  pageCount?: number;
  syncStatus?: SyncStatus;
}
