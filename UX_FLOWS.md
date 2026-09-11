# ScanPro — UX Flows

## Flow 01 — Primeiro uso

```text
App launch
 ↓
Home
 ↓
Escanear documento
 ↓
Camera permission
 ↓
Scanner
 ↓
Document detected
 ↓
Auto capture
 ↓
Processing
 ↓
Result
 ↓
Add page OR Done
 ↓
PDF ready
 ↓
Share / Save
```

## Flow 02 — Scanner automático

Estados:

```text
SCANNER_IDLE
SCANNER_SEARCHING
DOCUMENT_DETECTED
CAPTURING
PROCESSING
CAPTURE_SUCCESS
CAPTURE_ERROR
```

### Documento detectado

Mostrar indicação visual clara.

Não exigir toque se o modo automático estiver ativo.

## Flow 03 — Captura manual

```text
Scanner
 ↓
User taps capture
 ↓
Capture
 ↓
Processing
 ↓
Result
```

## Flow 04 — Multi-page

```text
Page 1
 ↓
Adicionar página
 ↓
Page 2
 ↓
Adicionar página
 ↓
Page 3
 ↓
Concluir
 ↓
PDF
```

## Flow 05 — Edição

```text
Preview
 ↓
Edit
 ├── Crop
 ├── Rotate
 ├── Filter
 └── Retake
```

A edição avançada não deve aparecer durante o caminho principal.

## Flow 06 — Reordenação

```text
Document
 ↓
Pages
 ↓
Long press
 ↓
Drag
 ↓
Drop
 ↓
Persist order
```

## Flow 07 — Biblioteca

```text
Home
 ↓
Documentos
 ↓
Recent / folders / search
 ↓
Document
 ↓
Preview
```

## Flow 08 — Busca OCR

```text
Search
 ↓
query
 ↓
local metadata search
 ↓
OCR text search
 ↓
results
```

## Flow 09 — Erro

### Não detectar

"Não consegui identificar o documento."

Ações:

- Tentar novamente
- Capturar manualmente

### Falha no processamento

"Não consegui processar esta página."

Ações:

- Tentar novamente
- Usar foto original

## Flow 10 — Offline

O scanner continua funcionando.

Se uma função exigir internet:

- informar;
- não bloquear o conteúdo local;
- sincronizar depois.

## Flow 11 — Conta

```text
User uses app
 ↓
benefit appears
 ↓
"Sincronize seus documentos"
 ↓
Create account / sign in
```

Não interromper o primeiro scan para autenticação.

## Flow 12 — Premium

Premium deve aparecer contextualizado.

Exemplos:

- OCR avançado;
- cloud sync;
- recursos de exportação;
- organização avançada.

Evitar pop-up agressivo após cada ação.
