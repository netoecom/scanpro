import { create } from 'zustand';
import { Document, DocumentPage, Folder } from '../types';
import { defaultDocumentRepository, DocumentRepository } from '../repositories';

interface DocumentState {
  documents: Document[];
  folders: Folder[];
  selectedDocument: Document | null;
  currentPages: DocumentPage[];
  activeFolderId: string | null;
  viewMode: 'list' | 'grid';
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  loadDocuments: () => Promise<void>;
  loadFolders: () => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  deleteFolder: (folderId: string) => Promise<void>;
  setActiveFolderId: (folderId: string | null) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
  setSearchQuery: (query: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  renameDocument: (id: string, newTitle: string) => Promise<void>;
  moveDocumentToFolder: (id: string, folderId: string | null) => Promise<void>;
  updateDocumentPdf: (id: string, pdfPath: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addDocument: (
    title: string,
    pages: Array<{
      originalPath: string;
      processedPath: string;
      thumbnailPath: string;
      width: number;
      height: number;
      ocrText?: string;
    }>,
    folderId?: string | null
  ) => Promise<Document>;
  addPagesToDocument: (
    documentId: string,
    pages: Array<{
      originalPath: string;
      processedPath: string;
      thumbnailPath: string;
      width: number;
      height: number;
      ocrText?: string;
    }>
  ) => Promise<void>;
  loadDocumentPages: (documentId: string) => Promise<DocumentPage[]>;
  reorderDocumentPages: (documentId: string, pageIdsInOrder: string[]) => Promise<void>;
  deleteDocumentPage: (documentId: string, pageId: string) => Promise<void>;
  selectDocument: (document: Document | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => {
  const repository: DocumentRepository = defaultDocumentRepository;

  return {
    documents: [],
    folders: [],
    selectedDocument: null,
    currentPages: [],
    activeFolderId: null,
    viewMode: 'list',
    isLoading: false,
    error: null,
    searchQuery: '',

    loadDocuments: async () => {
      set({ isLoading: true, error: null });
      try {
        const { searchQuery, activeFolderId } = get();
        const docs = searchQuery.trim()
          ? await repository.searchDocuments(searchQuery)
          : await repository.listDocuments(activeFolderId);
        set({ documents: docs, isLoading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao carregar documentos',
          isLoading: false,
        });
      }
    },

    loadFolders: async () => {
      try {
        const folders = await repository.listFolders();
        set({ folders });
      } catch (err) {
        console.error('Falha ao carregar pastas:', err);
      }
    },

    createFolder: async (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error('Nome da pasta não pode ser vazio');
      const folder = await repository.createFolder(trimmed);
      set((state) => ({ folders: [...state.folders, folder] }));
      return folder;
    },

    deleteFolder: async (folderId: string) => {
      try {
        await repository.deleteFolder(folderId);
        set((state) => ({
          folders: state.folders.filter((f) => f.id !== folderId),
          activeFolderId: state.activeFolderId === folderId ? null : state.activeFolderId,
        }));
        await get().loadDocuments();
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao excluir pasta',
        });
      }
    },

    setActiveFolderId: (folderId: string | null) => {
      set({ activeFolderId: folderId });
      get().loadDocuments();
    },

    setViewMode: (mode: 'list' | 'grid') => {
      set({ viewMode: mode });
    },

    setSearchQuery: async (query: string) => {
      set({ searchQuery: query, isLoading: true });
      try {
        const docs = query.trim()
          ? await repository.searchDocuments(query)
          : await repository.listDocuments(get().activeFolderId);
        set({ documents: docs, isLoading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao buscar documentos',
          isLoading: false,
        });
      }
    },

    toggleFavorite: async (id: string) => {
      const doc = get().documents.find((d) => d.id === id);
      if (!doc) return;

      try {
        const updated = await repository.updateDocument(id, {
          isFavorite: !doc.isFavorite,
        });
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? updated : d)),
          selectedDocument:
            state.selectedDocument?.id === id ? updated : state.selectedDocument,
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao atualizar favorito',
        });
      }
    },

    renameDocument: async (id: string, newTitle: string) => {
      if (!newTitle.trim()) return;

      try {
        const updated = await repository.updateDocument(id, { title: newTitle.trim() });
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? updated : d)),
          selectedDocument:
            state.selectedDocument?.id === id ? updated : state.selectedDocument,
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao renomear documento',
        });
      }
    },

    moveDocumentToFolder: async (id: string, folderId: string | null) => {
      try {
        const updated = await repository.updateDocument(id, { folderId });
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? updated : d)),
          selectedDocument:
            state.selectedDocument?.id === id ? updated : state.selectedDocument,
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao mover documento',
        });
      }
    },

    updateDocumentPdf: async (id: string, pdfPath: string) => {
      try {
        const updated = await repository.updateDocument(id, { pdfPath });
        set((state) => ({
          documents: state.documents.map((d) => (d.id === id ? updated : d)),
          selectedDocument:
            state.selectedDocument?.id === id ? updated : state.selectedDocument,
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao vincular PDF ao documento',
        });
      }
    },

    deleteDocument: async (id: string) => {
      try {
        await repository.deleteDocument(id);
        set((state) => ({
          documents: state.documents.filter((d) => d.id !== id),
          selectedDocument:
            state.selectedDocument?.id === id ? null : state.selectedDocument,
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao excluir documento',
        });
      }
    },

    addDocument: async (title, pages, folderId = null) => {
      set({ isLoading: true, error: null });
      try {
        const created = await repository.createDocument({
          title,
          folderId,
          pages: pages.map((p, idx) => ({
            ...p,
            pageIndex: idx,
          })),
        });
        set((state) => ({
          documents: [created, ...state.documents],
          isLoading: false,
        }));
        return created;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao salvar documento',
          isLoading: false,
        });
        throw err;
      }
    },

    addPagesToDocument: async (documentId, pages) => {
      set({ isLoading: true, error: null });
      try {
        const existingPages = await repository.getDocumentPages(documentId);
        const startIndex = existingPages.length;

        for (let i = 0; i < pages.length; i++) {
          const p = pages[i];
          await repository.addPage(documentId, {
            ...p,
            pageIndex: startIndex + i,
          });
        }

        const updatedPages = await repository.getDocumentPages(documentId);
        const updatedDoc = await repository.getDocument(documentId);

        set((state) => ({
          currentPages:
            state.selectedDocument?.id === documentId ? updatedPages : state.currentPages,
          documents: state.documents.map((d) =>
            d.id === documentId
              ? updatedDoc || {
                  ...d,
                  pageCount: updatedPages.length,
                  updatedAt: new Date().toISOString(),
                }
              : d
          ),
          selectedDocument:
            state.selectedDocument?.id === documentId && updatedDoc
              ? updatedDoc
              : state.selectedDocument,
          isLoading: false,
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao adicionar páginas ao documento',
          isLoading: false,
        });
        throw err;
      }
    },

    loadDocumentPages: async (documentId: string) => {
      set({ isLoading: true, error: null });
      try {
        const pages = await repository.getDocumentPages(documentId);
        set({ currentPages: pages, isLoading: false });
        return pages;
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao carregar páginas',
          isLoading: false,
        });
        return [];
      }
    },

    reorderDocumentPages: async (documentId: string, pageIdsInOrder: string[]) => {
      try {
        const reordered = await repository.reorderPages(documentId, pageIdsInOrder);
        set({ currentPages: reordered });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao reordenar páginas',
        });
      }
    },

    deleteDocumentPage: async (documentId: string, pageId: string) => {
      try {
        await repository.deletePage(documentId, pageId);
        set((state) => ({
          currentPages: state.currentPages.filter((p) => p.id !== pageId),
          documents: state.documents.map((doc) =>
            doc.id === documentId
              ? { ...doc, pageCount: Math.max(0, doc.pageCount - 1) }
              : doc
          ),
        }));
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao excluir página',
        });
      }
    },

    selectDocument: (document: Document | null) => {
      set({ selectedDocument: document });
    },
  };
});
