import { Document, DocumentPage, CreateDocumentInput, UpdateDocumentInput } from '../types';

export interface DocumentRepository {
  createDocument(input: CreateDocumentInput): Promise<Document>;
  getDocument(id: string): Promise<Document | null>;
  listDocuments(): Promise<Document[]>;
  updateDocument(id: string, input: UpdateDocumentInput): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  searchDocuments(query: string): Promise<Document[]>;
  getDocumentPages(documentId: string): Promise<DocumentPage[]>;
  addPage(documentId: string, page: Omit<DocumentPage, 'id' | 'documentId' | 'createdAt'>): Promise<DocumentPage>;
  deletePage(documentId: string, pageId: string): Promise<void>;
  reorderPages(documentId: string, pageIdsInOrder: string[]): Promise<DocumentPage[]>;
}
