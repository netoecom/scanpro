import { Document, DocumentPage, CreateDocumentInput, UpdateDocumentInput } from '../types';
import { DocumentRepository } from './DocumentRepository';

// Seed inicial para viabilizar desenvolvimento e testes visuais (Fases 0 e 1)
const INITIAL_DOCUMENTS: Document[] = [
  {
    id: 'doc-001',
    title: 'Contrato de Prestação de Serviços',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    pageCount: 3,
    isFavorite: true,
    syncStatus: 'local',
  },
  {
    id: 'doc-002',
    title: 'Recibo Notarial - Cartório',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    pageCount: 1,
    isFavorite: false,
    syncStatus: 'local',
  },
  {
    id: 'doc-003',
    title: 'Comprovante Fiscal de Equipamentos',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    pageCount: 2,
    isFavorite: false,
    syncStatus: 'local',
  },
];

const INITIAL_PAGES: Record<string, DocumentPage[]> = {
  'doc-001': [
    {
      id: 'page-101',
      documentId: 'doc-001',
      pageIndex: 0,
      originalPath: 'mock://page-1.jpg',
      processedPath: 'mock://page-1-proc.jpg',
      thumbnailPath: 'mock://page-1-thumb.jpg',
      width: 1240,
      height: 1754,
      createdAt: new Date().toISOString(),
    },
  ],
};

export class MockDocumentRepository implements DocumentRepository {
  private documents: Map<string, Document> = new Map();
  private pages: Map<string, DocumentPage[]> = new Map();

  constructor(seed = true) {
    if (seed) {
      INITIAL_DOCUMENTS.forEach((doc) => this.documents.set(doc.id, { ...doc }));
      Object.entries(INITIAL_PAGES).forEach(([docId, docPages]) => {
        this.pages.set(docId, [...docPages]);
      });
    }
  }

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    const now = new Date().toISOString();
    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pageCount = input.pages?.length ?? 0;

    const newDoc: Document = {
      id,
      title: input.title?.trim() || `Scan ${new Date().toLocaleDateString('pt-BR')}`,
      createdAt: now,
      updatedAt: now,
      pageCount,
      folderId: input.folderId ?? null,
      isFavorite: false,
      syncStatus: 'local',
    };

    this.documents.set(id, newDoc);

    if (input.pages && input.pages.length > 0) {
      const createdPages: DocumentPage[] = input.pages.map((p, idx) => ({
        ...p,
        id: `page-${id}-${idx}`,
        documentId: id,
        createdAt: now,
      }));
      this.pages.set(id, createdPages);
    } else {
      this.pages.set(id, []);
    }

    return newDoc;
  }

  async getDocument(id: string): Promise<Document | null> {
    const doc = this.documents.get(id);
    return doc ? { ...doc } : null;
  }

  async listDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async updateDocument(id: string, input: UpdateDocumentInput): Promise<Document> {
    const existing = this.documents.get(id);
    if (!existing) {
      throw new Error(`Documento não encontrado: ${id}`);
    }

    const updated: Document = {
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    this.documents.set(id, updated);
    return { ...updated };
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents.delete(id);
    this.pages.delete(id);
  }

  async searchDocuments(query: string): Promise<Document[]> {
    const q = query.toLowerCase().trim();
    if (!q) return this.listDocuments();

    return Array.from(this.documents.values()).filter((doc) =>
      doc.title.toLowerCase().includes(q)
    );
  }

  async getDocumentPages(documentId: string): Promise<DocumentPage[]> {
    return [...(this.pages.get(documentId) ?? [])];
  }

  async addPage(
    documentId: string,
    pageInput: Omit<DocumentPage, 'id' | 'documentId' | 'createdAt'>
  ): Promise<DocumentPage> {
    const existingDoc = this.documents.get(documentId);
    if (!existingDoc) {
      throw new Error(`Documento não encontrado: ${documentId}`);
    }

    const docPages = this.pages.get(documentId) ?? [];
    const newPage: DocumentPage = {
      ...pageInput,
      id: `page-${documentId}-${docPages.length + 1}`,
      documentId,
      createdAt: new Date().toISOString(),
    };

    docPages.push(newPage);
    this.pages.set(documentId, docPages);

    existingDoc.pageCount = docPages.length;
    existingDoc.updatedAt = new Date().toISOString();
    this.documents.set(documentId, existingDoc);

    return newPage;
  }

  async deletePage(documentId: string, pageId: string): Promise<void> {
    const docPages = this.pages.get(documentId);
    if (!docPages) return;

    const filtered = docPages.filter((p) => p.id !== pageId);
    this.pages.set(documentId, filtered);

    const existingDoc = this.documents.get(documentId);
    if (existingDoc) {
      existingDoc.pageCount = filtered.length;
      existingDoc.updatedAt = new Date().toISOString();
      this.documents.set(documentId, existingDoc);
    }
  }

  async reorderPages(documentId: string, pageIdsInOrder: string[]): Promise<DocumentPage[]> {
    const docPages = this.pages.get(documentId);
    if (!docPages) return [];

    const pageMap = new Map(docPages.map((p) => [p.id, p]));
    const reordered: DocumentPage[] = [];

    pageIdsInOrder.forEach((id, index) => {
      const page = pageMap.get(id);
      if (page) {
        reordered.push({ ...page, pageIndex: index });
      }
    });

    this.pages.set(documentId, reordered);

    const existingDoc = this.documents.get(documentId);
    if (existingDoc) {
      existingDoc.updatedAt = new Date().toISOString();
      this.documents.set(documentId, existingDoc);
    }

    return reordered;
  }
}
