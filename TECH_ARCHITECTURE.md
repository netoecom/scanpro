# ScanPro — Technical Architecture

## 1. Stack

### Mobile

- React Native
- Expo
- TypeScript
- Expo Router

### State

- Zustand

### Persistence

- SQLite para metadados estruturados
- File System para assets

### Backend

- Supabase

### Billing

- RevenueCat
- Google Play Billing através da integração suportada

## 2. Regra principal

Scanner = local-first.

Backend nunca deve ser requisito para:

- abrir câmera;
- capturar;
- corrigir perspectiva;
- processar imagem;
- gerar PDF;
- visualizar documento salvo localmente.

## 3. Arquitetura

```text
UI
 ↓
FEATURES
 ↓
DOMAIN / USE CASES
 ↓
REPOSITORIES
 ↓
LOCAL / REMOTE IMPLEMENTATIONS
```

## 4. Repository Pattern

```ts
export interface DocumentRepository {
  createDocument(input: CreateDocumentInput): Promise<Document>;
  getDocument(id: string): Promise<Document | null>;
  listDocuments(): Promise<Document[]>;
  updateDocument(id: string, input: UpdateDocumentInput): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
  searchDocuments(query: string): Promise<Document[]>;
}
```

Implementações:

```text
MockDocumentRepository
LocalDocumentRepository
CloudDocumentRepository
```

A UI não deve saber qual implementação está sendo usada.

## 5. Estrutura

```text
scanpro/
├── app/
│   ├── index.tsx
│   ├── scanner/
│   │   ├── index.tsx
│   │   ├── capture.tsx
│   │   ├── processing.tsx
│   │   └── result.tsx
│   ├── document/
│   │   ├── [id].tsx
│   │   ├── edit.tsx
│   │   ├── reorder.tsx
│   │   └── preview.tsx
│   ├── documents/
│   │   ├── index.tsx
│   │   └── search.tsx
│   ├── profile/
│   │   └── index.tsx
│   └── premium/
│       └── index.tsx
├── components/
├── features/
│   ├── scanner/
│   ├── documents/
│   ├── pdf/
│   ├── ocr/
│   └── sharing/
├── store/
├── services/
│   ├── scanner/
│   ├── ocr/
│   ├── pdf/
│   └── storage/
├── repositories/
├── theme/
├── types/
├── utils/
└── assets/
```

## 6. Estado

Separar:

### UI state

- modal;
- sheet;
- seleção;
- loading;
- toast.

### Domain state

- documento atual;
- páginas;
- status de processamento;
- biblioteca.

### Persistent state

- documentos;
- configurações;
- preferências.

## 7. Fluxo de documento

```text
CapturedImage
 ↓
ProcessedPage
 ↓
DocumentPage
 ↓
Document
 ↓
PDFAsset
```

## 8. IDs

Usar UUID.

Nunca usar índice do array como ID persistente.

## 9. Async

Operações demoradas devem:

- expor estado;
- permitir cancelamento quando possível;
- evitar bloquear UI;
- não perder trabalho já concluído.

## 10. Performance

Prioridades:

1. câmera;
2. processamento;
3. memória;
4. abertura;
5. scroll da biblioteca.

Não carregar PDFs inteiros para listas.

Usar thumbnails.

## 11. Offline

Persistir localmente primeiro.

Sincronização futura deve seguir:

```text
local change
 ↓
outbox
 ↓
sync worker
 ↓
Supabase
 ↓
ack
 ↓
mark synced
```

## 12. Segurança

- nunca colocar service-role keys no app;
- usar RLS no Supabase;
- separar dados por user_id;
- validar permissões no backend;
- não confiar apenas em filtros do cliente.

## 13. Environment

```text
.env.local
.env.development
.env.production
```

Nunca commitar secrets.

## 14. Observabilidade

Adicionar depois do MVP:

- crash reporting;
- performance;
- scanner failure rate;
- processing time;
- PDF generation failures.

Não sacrificar privacidade para analytics.
