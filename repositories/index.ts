import { DocumentRepository } from './DocumentRepository';
import { MockDocumentRepository } from './MockDocumentRepository';

// Instância padrão do repositório para o app (iniciando com Mock para Fases 0 e 1)
export const defaultDocumentRepository: DocumentRepository = new MockDocumentRepository(true);

export * from './DocumentRepository';
export * from './MockDocumentRepository';
