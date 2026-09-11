import { Document, DocumentPage, Folder, CreateDocumentInput, UpdateDocumentInput } from '../types';

export interface DocumentRepository {
  createDocument(input: CreateDocumentInput): Promise<Document>;
  getDocument(id: string): Promise<Document | null>;
  listDocuments(folderId?: string | null): Promise<Document[]>;
  updateDocument(id: string, input: UpdateDocumentInput): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  searchDocuments(query: string): Promise<Document[]>;
  getDocumentPages(documentId: string): Promise<DocumentPage[]>;
  addPage(documentId: string, page: Omit<DocumentPage, 'id' | 'documentId' | 'createdAt'>): Promise<DocumentPage>;
  deletePage(documentId: string, pageId: string): Promise<void>;
  reorderPages(documentId: string, pageIdsInOrder: string[]): Promise<DocumentPage[]>;
  listFolders(): Promise<Folder[]>;
  createFolder(name: string): Promise<Folder>;
  deleteFolder(id: string): Promise<void>;
}
