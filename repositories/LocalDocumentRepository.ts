/**
 * ScanPro — Local-First Physical Document Repository
 * Implementação resiliente com persistência física em disco e localStorage.
 * Garante que os dados e páginas permaneçam salvos permanentemente no aparelho mesmo offline.
 */

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Document, DocumentPage, Folder, CreateDocumentInput, UpdateDocumentInput } from '../types';
import { DocumentRepository } from './DocumentRepository';

interface SerializedState {
  documents: Document[];
  pages: Record<string, DocumentPage[]>;
  folders: Folder[];
}

const STORAGE_KEY = 'scanpro_local_database_v1';
const NATIVE_DB_FILE = (FileSystem.documentDirectory || '') + 'scanpro_database.json';

const INITIAL_FOLDERS: Folder[] = [
  { id: 'folder-1', name: 'Trabalho & Contratos', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'folder-2', name: 'Pessoal & Finanças', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export class LocalDocumentRepository implements DocumentRepository {
  private documents: Map<string, Document> = new Map();
  private pages: Map<string, DocumentPage[]> = new Map();
  private folders: Map<string, Folder> = new Map();
  private isLoaded = false;

  constructor() {
    this.loadFromDisk();
  }

  /**
   * Carrega metadados estruturados do armazenamento permanente
   */
  private async loadFromDisk(): Promise<void> {
    if (this.isLoaded) return;
    try {
      let rawJson: string | null = null;

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          rawJson = localStorage.getItem(STORAGE_KEY);
        }
      } else {
        const fileInfo = await FileSystem.getInfoAsync(NATIVE_DB_FILE);
        if (fileInfo.exists) {
          rawJson = await FileSystem.readAsStringAsync(NATIVE_DB_FILE);
        }
      }

      if (rawJson) {
        const state: SerializedState = JSON.parse(rawJson);
        this.documents.clear();
        this.pages.clear();
        this.folders.clear();

        state.documents.forEach((d) => this.documents.set(d.id, d));
        Object.entries(state.pages).forEach(([docId, docPages]) => this.pages.set(docId, docPages));
        state.folders.forEach((f) => this.folders.set(f.id, f));
      } else {
        // Primeira inicialização: cria pastas padrão
        INITIAL_FOLDERS.forEach((f) => this.folders.set(f.id, f));
        await this.persistToDisk();
      }
    } catch (err) {
      console.warn('Erro ao carregar banco local do ScanPro:', err);
    } finally {
      this.isLoaded = true;
    }
  }

  /**
   * Persiste todo o estado estruturado no armazenamento físico
   */
  private async persistToDisk(): Promise<void> {
    try {
      const state: SerializedState = {
        documents: Array.from(this.documents.values()),
        pages: Object.fromEntries(this.pages.entries()),
        folders: Array.from(this.folders.values()),
      };

      const json = JSON.stringify(state);

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, json);
        }
      } else {
        await FileSystem.writeAsStringAsync(NATIVE_DB_FILE, json);
      }
    } catch (err) {
      console.error('Falha ao persistir banco local do ScanPro:', err);
    }
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.isLoaded) {
      await this.loadFromDisk();
    }
  }

  async createDocument(input: CreateDocumentInput): Promise<Document> {
    await this.ensureLoaded();
    const now = new Date().toISOString();
    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const pageCount = input.pages?.length ?? 0;

    const newDoc: Document = {
      id,
      title: input.title?.trim() || 'Geral',
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

    await this.persistToDisk();
    return newDoc;
  }

  async getDocument(id: string): Promise<Document | null> {
    await this.ensureLoaded();
    const doc = this.documents.get(id);
    return doc ? { ...doc } : null;
  }

  async listDocuments(folderId?: string | null): Promise<Document[]> {
    await this.ensureLoaded();
    let docs = Array.from(this.documents.values());
    if (folderId !== undefined && folderId !== null) {
      docs = docs.filter((d) => d.folderId === folderId);
    }
    return docs.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async updateDocument(id: string, input: UpdateDocumentInput): Promise<Document> {
    await this.ensureLoaded();
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
    await this.persistToDisk();
    return { ...updated };
  }

  async deleteDocument(id: string): Promise<void> {
    await this.ensureLoaded();
    this.documents.delete(id);
    this.pages.delete(id);
    await this.persistToDisk();
  }

  async searchDocuments(query: string): Promise<Document[]> {
    await this.ensureLoaded();
    const q = query.toLowerCase().trim();
    if (!q) return this.listDocuments();

    return Array.from(this.documents.values()).filter((doc) => {
      if (doc.title.toLowerCase().includes(q)) return true;
      const docPages = this.pages.get(doc.id) ?? [];
      return docPages.some((page) => page.ocrText && page.ocrText.toLowerCase().includes(q));
    });
  }

  async getDocumentPages(documentId: string): Promise<DocumentPage[]> {
    await this.ensureLoaded();
    return [...(this.pages.get(documentId) ?? [])];
  }

  async addPage(
    documentId: string,
    pageInput: Omit<DocumentPage, 'id' | 'documentId' | 'createdAt'>
  ): Promise<DocumentPage> {
    await this.ensureLoaded();
    const existingDoc = this.documents.get(documentId);
    if (!existingDoc) {
      throw new Error(`Documento não encontrado: ${documentId}`);
    }

    const docPages = this.pages.get(documentId) ?? [];
    const newPage: DocumentPage = {
      ...pageInput,
      id: `page-${documentId}-${Date.now()}-${docPages.length + 1}`,
      documentId,
      createdAt: new Date().toISOString(),
    };

    docPages.push(newPage);
    this.pages.set(documentId, docPages);

    existingDoc.pageCount = docPages.length;
    existingDoc.updatedAt = new Date().toISOString();
    this.documents.set(documentId, existingDoc);

    await this.persistToDisk();
    return newPage;
  }

  async deletePage(documentId: string, pageId: string): Promise<void> {
    await this.ensureLoaded();
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

    await this.persistToDisk();
  }

  async reorderPages(documentId: string, pageIdsInOrder: string[]): Promise<DocumentPage[]> {
    await this.ensureLoaded();
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

    await this.persistToDisk();
    return reordered;
  }

  async listFolders(): Promise<Folder[]> {
    await this.ensureLoaded();
    return Array.from(this.folders.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async createFolder(name: string): Promise<Folder> {
    await this.ensureLoaded();
    const id = `folder-${Date.now()}`;
    const now = new Date().toISOString();
    const folder: Folder = { id, name: name.trim(), createdAt: now, updatedAt: now };
    this.folders.set(id, folder);
    await this.persistToDisk();
    return folder;
  }

  async deleteFolder(id: string): Promise<void> {
    await this.ensureLoaded();
    this.folders.delete(id);
    for (const doc of this.documents.values()) {
      if (doc.folderId === id) {
        doc.folderId = null;
      }
    }
    await this.persistToDisk();
  }
}
