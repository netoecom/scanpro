# ScanPro — Design System

## 1. Direção

Referência de qualidade:

- Apple: simplicidade, craft, familiaridade;
- Duolingo: clareza, feedback e redução de fricção;
- Strava: hierarquia, consistência e produto orientado à ação.

Não copiar identidade visual dessas marcas.

## 2. Visual

Sensação:

- premium;
- rápido;
- confiável;
- limpo;
- tecnológico sem parecer técnico.

Evitar aparência genérica de dashboard SaaS.

## 3. Cores

```ts
export const colors = {
  primary: '#007AFF',
  background: '#F5F5F7',
  surface: '#FFFFFF',
  textPrimary: '#1D1D1F',
  textSecondary: '#86868B',
  success: '#34C759',
  warning: '#FF9F0A',
  error: '#FF3B30',
  separator: '#D2D2D7',
  scannerOverlay: '#000000',
};
```

Não inventar novas cores em telas sem atualizar o design system.

## 4. Tipografia

Prioridade:

- SF Pro no iOS;
- equivalente nativo no Android;
- fallback system sans.

Escala inicial:

```text
Display      32
Title 1      28
Title 2      22
Title 3      20
Headline     17
Body         17
Callout      16
Subheadline  15
Footnote     13
Caption      12
```

## 5. Espaçamento

Base 8pt.

```text
4   micro
8   small
12  compact
16  default
24  section
32  large
40  hero
48  major
```

## 6. Raios

```text
4   small
8   standard
12  cards
16  prominent cards
20  sheets
999 capsule
```

## 7. Touch targets

Controles interativos devem ter área confortável, idealmente pelo menos 44x44 pt.

## 8. Botões

### Primary

Usado para:

- Escanear documento;
- Concluir;
- ação principal.

### Secondary

Usado para:

- ações complementares.

### Tertiary

Usado para:

- ações contextuais.

### Destructive

Usado para:

- excluir.

Nunca usar vermelho para ações normais.

## 9. Cards

Cards devem existir quando ajudam agrupamento.

Não criar card para cada informação.

## 10. Ícones

Usar ícones simples e familiares.

Preferir SF Symbols no iOS e equivalentes nativos no Android.

Não misturar famílias de ícones.

## 11. Scanner UI

A interface do scanner deve ser diferente do restante do app:

- fundo da câmera;
- controles mínimos;
- overlay discreto;
- bordas de documento claras;
- botão de captura dominante.

## 12. Bottom sheets

Usar para:

- filtros;
- opções de exportação;
- ações secundárias;
- edição.

Não usar bottom sheet para tudo.

## 13. Feedback

Estados:

```text
idle
loading
processing
success
warning
error
empty
offline
```

Todo processo demorado deve possuir feedback visual.

## 14. Motion

Animações:

- curtas;
- funcionais;
- não decorativas.

Momentos especiais:

- documento detectado;
- captura;
- processamento concluído;
- PDF criado;
- compartilhamento.

## 15. Haptics

Usar com moderação:

- captura;
- documento detectado;
- conclusão;
- erro relevante.

## 16. Acessibilidade

- contraste adequado;
- labels para leitores de tela;
- tamanho de toque adequado;
- Dynamic Type quando suportado;
- não depender apenas de cor;
- estados comunicados por texto/ícone quando necessário.

## 17. Componentes

Biblioteca inicial:

```text
AppButton
IconButton
TextButton
ScreenHeader
BottomTabBar
DocumentCard
DocumentThumbnail
DocumentGrid
ScannerOverlay
CaptureButton
ProcessingIndicator
PageThumbnail
PageStrip
BottomSheet
Toast
EmptyState
ErrorState
LoadingState
SearchField
FolderRow
PremiumCard
```

## 18. Regra de componentes

Antes de criar componente novo:

1. procurar componente existente;
2. verificar se pode ser configurado;
3. só criar novo se houver diferença estrutural real.
