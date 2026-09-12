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

## Fase 9 — Premium (Concluída ✅)

- [x] RevenueCat-ready architecture & entitlement model (`services/premium/types.ts`);
- [x] Entitlement & tier manager com persistência offline (`services/premium/premiumService.ts`);
- [x] Store reativa Zustand (`store/usePremiumStore.ts`);
- [x] Modal de Paywall de alta conversão (`components/ui/PaywallModal.tsx`);
- [x] Pacotes Anual (R$ 99,90/ano, 44% OFF, 3 dias grátis) e Mensal (R$ 14,90/mês);
- [x] Limite de 5 documentos para usuários Free com gatilhos amigáveis;
- [x] Restaurar compras e cancelamento de assinatura integrados;
- [x] Badges Pro e pontos de entrada na Home (`app/index.tsx`), Scanner (`app/scanner/index.tsx`) e Ajustes (`app/profile/index.tsx`).

## Fase 10 — Production & Release Readiness (Concluída ✅)

- [x] Telemetria local-first anônima (`services/telemetry/telemetryService.ts`);
- [x] Rastreamento do funil North Star (`app_open` → `scanner_opened` → `capture` → `successful_processing` → `pdf_generated` → `pdf_shared` → `paywall_viewed` → `subscription_purchased`);
- [x] Performance monitoring e cálculo de tempo entre abrir scanner e PDF pronto;
- [x] Crash monitoring anônimo com persistência local e diagnóstico para suporte;
- [x] Privacy e Local-First compliance com opção de reset de métricas;
- [x] PWA 100% instalável em 1 clique (`app/+html.tsx`, `public/sw.js`, `public/manifest.json`);
- [x] Suporte a câmera traseira com alta resolução e autofoco.

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
