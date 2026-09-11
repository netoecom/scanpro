import { create } from 'zustand';
import { Document } from '../types';
import { defaultDocumentRepository, DocumentRepository } from '../repositories';

interface DocumentState {
  documents: Document[];
  selectedDocument: Document | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;

  // Actions
  loadDocuments: () => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  renameDocument: (id: string, newTitle: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  selectDocument: (document: Document | null) => void;
}

export const useDocumentStore = create<DocumentState>((set, get) => {
  const repository: DocumentRepository = defaultDocumentRepository;

  return {
    documents: [],
    selectedDocument: null,
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

    selectDocument: (document: Document | null) => {
      set({ selectedDocument: document });
    },
  };
});
