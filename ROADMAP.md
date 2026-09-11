# ScanPro — Roadmap

## Fase 0 — Foundation

Objetivo: projeto executável e arquitetura limpa.

- Expo
- React Native
- TypeScript
- Expo Router
- Theme
- tokens
- navigation
- Zustand
- repository interfaces
- lint
- formatting
- environment

Definition of Done:

- app abre;
- navegação funciona;
- design tokens existem;
- arquitetura inicial documentada.

## Fase 1 — Home

- Home
- CTA scanner
- recent documents
- empty state
- bottom navigation

DoD:

- fluxo visual completo;
- sem dados reais ainda.

## Fase 2 — Scanner

- câmera;
- permissões;
- overlay;
- document detection;
- auto capture;
- manual capture.

DoD:

- captura real em dispositivo físico;
- funcionamento sem internet.

## Fase 3 — Processing

- perspective correction;
- crop;
- enhancement;
- thumbnails;
- armazenamento local.

DoD:

- documento fotografado vira página processada.

## Fase 4 — Multi-page

- adicionar página;
- remover;
- reorder;
- preview.

DoD:

- documento com várias páginas persiste corretamente.

## Fase 5 — PDF

- gerar PDF;
- salvar;
- abrir;
- compartilhar.

DoD:

- PDF válido em dispositivos reais.

## Fase 6 — Library

- documentos;
- grid/list;
- search por título;
- folders;
- favorite;
- rename;
- delete.

## Fase 7 — OCR

- OCR local;
- persistência;
- busca por conteúdo;
- nome sugerido.

## Fase 8 — Cloud

- auth;
- sync;
- backup;
- restore;
- RLS.

## Fase 9 — Premium

- RevenueCat;
- entitlement;
- paywall;
- restore purchases;
- subscription states.

## Fase 10 — Production

- crash monitoring;
- analytics de produto;
- performance monitoring;
- privacy;
- store assets;
- release pipeline.

## Métricas principais

### North Star

Tempo entre:

```text
abrir scanner
→
PDF pronto
```

### Funil

- app open;
- scanner opened;
- capture;
- successful processing;
- PDF generated;
- share;
- second scan;
- return within 7 days.

## Performance targets

Objetivos iniciais:

- abrir scanner rapidamente;
- captura sem travamentos;
- processamento perceptivelmente rápido;
- scroll da biblioteca fluido;
- nenhuma tela crítica bloqueada por rede.
