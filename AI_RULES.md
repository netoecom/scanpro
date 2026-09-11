# ScanPro — AI Coding Rules

Estas regras devem ser lidas por qualquer agente de IA antes de alterar o projeto.

## 1. Regra máxima

Não altere a arquitetura sem justificar a mudança.

## 2. Antes de codar

Sempre:

1. ler `README.md`;
2. ler `PRODUCT_SPEC.md`;
3. ler `DESIGN_SYSTEM.md`;
4. identificar o feature relevante;
5. procurar componentes existentes;
6. procurar serviços/repositories existentes.

## 3. Não duplicar

Antes de criar:

- componente;
- hook;
- util;
- service;
- repository;

procurar se já existe algo equivalente.

## 4. Design System

Nunca inventar:

- cor;
- espaçamento;
- raio;
- tipografia;
- padrão de botão.

Usar tokens existentes.

Se faltar token:

1. verificar se o valor realmente é necessário;
2. adicionar ao design system;
3. usar o novo token.

## 5. Separação

Não colocar:

- regra de negócio em componente visual;
- acesso direto ao Supabase em tela;
- lógica de scanner espalhada por componentes.

## 6. Scanner

Scanner deve ser local-first.

Não criar dependência obrigatória de:

- API externa;
- servidor;
- internet;
- IA cloud.

para capturar ou gerar PDF.

## 7. Performance

Sempre considerar:

- tamanho de imagem;
- memória;
- renderização;
- scroll;
- thumbnails.

## 8. Estados

Toda operação assíncrona importante deve possuir:

```text
idle
loading
success
error
```

Quando aplicável:

```text
cancelled
offline
retry
```

## 9. UX

Se uma implementação exige mais passos do que o fluxo definido em `UX_FLOWS.md`, parar e avaliar antes de implementar.

## 10. Erros

Nunca mostrar erro técnico ao usuário.

Ruim:

"ERR_IMAGE_PIPELINE_402"

Bom:

"Não consegui processar esta página."

## 11. Destrutivo

Sempre que possível:

- permitir undo;
- ou pedir confirmação quando a perda for relevante.

## 12. Segurança

Nunca:

- commitar secrets;
- colocar service-role key no app;
- confiar no cliente para autorização;
- desativar RLS para facilitar desenvolvimento.

## 13. Dependências

Antes de adicionar uma biblioteca:

- verificar se Expo/RN já resolve;
- verificar se existe dependência equivalente;
- avaliar tamanho;
- manutenção;
- compatibilidade;
- impacto nativo.

## 14. Backend

Supabase deve ser usado onde gera valor.

Não mover processamento local para Edge Function apenas por conveniência.

## 15. Código

Preferir:

- TypeScript estrito;
- funções pequenas;
- nomes explícitos;
- componentes previsíveis;
- tipos compartilhados;
- tratamento de erro.

Evitar:

- `any`;
- arquivos gigantes;
- funções com múltiplas responsabilidades;
- abstração prematura.

## 16. Testes

Toda feature crítica deve ter teste ou estratégia verificável.

Prioridade:

1. scanner;
2. persistência;
3. PDF;
4. reorder;
5. sync;
6. billing.

## 17. Regra para alterações

Antes:

```text
Entender → planejar → implementar → testar
```

Não:

```text
Gerar código → descobrir arquitetura depois
```

## 18. Critério de pronto

Uma feature só está pronta quando:

- funciona;
- possui loading;
- possui erro;
- possui empty state quando aplicável;
- respeita design system;
- não quebra offline quando deveria funcionar offline;
- não gera warnings evitáveis;
- não cria duplicação.
