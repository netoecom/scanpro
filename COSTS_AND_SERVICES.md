# ScanPro — Costs & Services

Este documento registra as premissas de infraestrutura para o projeto.

## Estratégia inicial

Começar com o mínimo possível:

- Expo/EAS Free;
- Supabase Free;
- RevenueCat Free;
- processamento local;
- armazenamento local;
- Google Play Console para publicação Android.

A arquitetura deve permitir subir de plano sem reescrever o produto.

## Referências oficiais consultadas

Os preços e limites são mutáveis. Verificar novamente no momento do lançamento.

- Expo Application Services — pricing
- Supabase — pricing
- RevenueCat — pricing
- Google Play Console — developer registration

## Regra de custo

Não adicionar serviço pago apenas porque ele simplifica uma implementação.

Perguntar:

1. Isso é realmente necessário?
2. Pode rodar no dispositivo?
3. Pode usar a infraestrutura já existente?
4. O custo escala com usuários?
5. Existe lock-in?
6. A complexidade removida vale o custo?

## Scanner

Prioridade para:

- câmera nativa;
- processamento local;
- OCR local;
- PDF local.

Evitar inicialmente:

- OCR pago por API;
- processamento de imagem em cloud;
- PDF API;
- CDN de documentos;
- VPS dedicado;
- Kubernetes.

## Backend

Supabase entra principalmente para:

- autenticação;
- sincronização;
- backup;
- metadados;
- storage remoto quando necessário.

## Billing

RevenueCat abstrai a camada de assinaturas.

Entitlements devem ser definidos no domínio, por exemplo:

```text
free
premium
```

A UI não deve depender diretamente do status bruto retornado pela loja.

## Publicação

A conta do Google Play Console possui taxa de inscrição conforme regras atuais do Google.

Requisitos de conta, testes e publicação devem ser verificados no momento da submissão.
