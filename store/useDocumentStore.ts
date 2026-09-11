import { create } from 'zustand';
import { Document, DocumentPage } from '../types';
import { defaultDocumentRepository, DocumentRepository } from '../repositories';

interface DocumentState {
  documents: Document[];
  selectedDocument: Document | null;
  currentPages: DocumentPage[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  loadDocuments: () => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addDocument: (
    title: string,
    pages: Array<{
      originalPath: string;
      processedPath: string;
      thumbnailPath: string;
      width: number;
      height: number;
    }>
  ) => Promise<Document>;
  loadDocumentPages: (documentId: string) => Promise<DocumentPage[]>;
  reorderDocumentPages: (documentId: string, pageIdsInOrder: string[]) => Promise<void>;
  deleteDocumentPage: (documentId: string, pageId: string) => Promise<void>;
  selectDocument: (document: Document | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => {
  const repository: DocumentRepository = defaultDocumentRepository;

  return {
    documents: [],
    selectedDocument: null,
    currentPages: [],
    isLoading: false,
    error: null,
    searchQuery: '',

    loadDocuments: async () => {
      set({ isLoading: true, error: null });
      try {
        const query = get().searchQuery;
        const docs = query.trim()
          ? await repository.searchDocuments(query)
          : await repository.listDocuments();
        set({ documents: docs, isLoading: false });
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : 'Falha ao carregar documentos',
          isLoading: false,
        });
      }
    },

    setSearchQuery: async (query: string) => {
      set({ searchQuery: query, isLoading: true });
      try {
        const docs = query.trim()
          ? await repository.searchDocuments(query)
          : await repository.listDocuments();
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

    addDocument: async (title, pages) => {
      set({ isLoading: true, error: null });
      try {
        const created = await repository.createDocument({
          title,
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
