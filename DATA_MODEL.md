# ScanPro — Data Model

## 1. Princípio

O banco deve representar documentos, páginas e estado de sincronização sem acoplar a UI.

## 2. Document

```ts
type Document = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  pageCount: number;
  pdfPath?: string;
  thumbnailPath?: string;
  folderId?: string | null;
  isFavorite: boolean;
  syncStatus: 'local' | 'pending' | 'synced' | 'error';
};
```

## 3. DocumentPage

```ts
type DocumentPage = {
  id: string;
  documentId: string;
  pageIndex: number;
  originalPath: string;
  processedPath: string;
  thumbnailPath: string;
  ocrText?: string;
  width: number;
  height: number;
  createdAt: string;
};
```

## 4. Folder

```ts
type Folder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};
```

## 5. User

```ts
type User = {
  id: string;
  email?: string;
  createdAt: string;
};
```

## 6. Subscription

```ts
type Subscription = {
  userId: string;
  entitlement: string;
  status: 'active' | 'inactive' | 'trial' | 'expired';
  providerCustomerId?: string;
  updatedAt: string;
};
```

## 7. Local tables

Sugestão:

```text
documents
document_pages
folders
settings
sync_queue
```

## 8. Supabase tables

Inicialmente:

```text
profiles
documents
document_pages
folders
subscriptions
```

## 9. Ownership

Todas as entidades sincronizadas devem possuir ownership inequívoco.

Regra:

```text
user_id → owns document
document_id → owns pages
folder_id → belongs to user
```

## 10. RLS

Toda tabela remota deve ter políticas de acesso.

Nunca permitir:

```text
select all documents
```

sem filtro de ownership.

## 11. Sync

Cada entidade sincronizável precisa de:

```text
created_at
updated_at
deleted_at (quando necessário)
sync_status local
```

## 12. Busca

MVP:

- título;
- pasta.

Depois:

- OCR;
- conteúdo completo;
- filtros.
