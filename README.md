# ScanPro — Document Scanner

Documentação mestre para desenvolvimento do ScanPro, um aplicativo mobile de scanner de documentos com foco em velocidade, simplicidade e qualidade de resultado.

## Produto

Promessa central:

> Abra → aponte → capture → PDF pronto.

O usuário não deve sentir que está "operando um scanner". Ele deve sentir que está simplesmente fotografando um documento e recebendo um PDF.

## Stack inicial

- React Native
- Expo
- TypeScript
- Expo Router
- NativeWind ou solução equivalente de tokens/componentes
- Zustand para estado de UI e fluxo
- SQLite/local persistence para metadados
- File System local para imagens/PDFs
- Engine de câmera/document detection nativa
- OCR on-device quando possível
- PDF local
- Native Share Sheet
- Supabase somente para recursos que realmente exigem backend/cloud
- RevenueCat para assinaturas

## Princípio arquitetural

O scanner deve funcionar sem internet.

```text
CAMERA
  ↓
DOCUMENT DETECTION
  ↓
CAPTURE
  ↓
PERSPECTIVE CORRECTION
  ↓
IMAGE PROCESSING
  ↓
OCR
  ↓
PDF
  ↓
LOCAL STORAGE
  ↓
SHARE / OPTIONAL SYNC
```

## Ordem de implementação

1. Foundation
2. Design System
3. Home
4. Scanner real
5. Pipeline de processamento
6. Multi-page
7. PDF
8. Sharing
9. Library
10. OCR/Search
11. Cloud sync
12. Premium

## Documentos desta pasta

- `PRODUCT_SPEC.md` — produto e requisitos
- `DESIGN_SYSTEM.md` — tokens, componentes e regras visuais
- `UX_FLOWS.md` — fluxos e estados
- `TECH_ARCHITECTURE.md` — arquitetura técnica
- `SCANNER_ENGINE.md` — especificação do scanner
- `DATA_MODEL.md` — modelo de dados
- `AI_RULES.md` — regras para agentes de IA na IDE
- `ROADMAP.md` — roadmap por fases
- `AGENTS.md` — instruções operacionais para a IDE
