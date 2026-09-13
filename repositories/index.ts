import { DocumentRepository } from './DocumentRepository';
import { LocalDocumentRepository } from './LocalDocumentRepository';
import { MockDocumentRepository } from './MockDocumentRepository';

// Instância padrão do repositório com persistência permanente física (Local-First)
export const defaultDocumentRepository: DocumentRepository = new LocalDocumentRepository();

export * from './DocumentRepository';
export * from './MockDocumentRepository';
export * from './LocalDocumentRepository';
