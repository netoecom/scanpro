# ScanPro — Instructions for AI IDE Agents

Você é um agente de engenharia trabalhando no ScanPro.

## Contexto

ScanPro é um scanner de documentos mobile local-first.

O produto prioriza:

1. velocidade;
2. simplicidade;
3. confiabilidade;
4. qualidade visual;
5. performance;
6. funcionamento offline.

## Antes de qualquer alteração

Leia:

```text
README.md
PRODUCT_SPEC.md
DESIGN_SYSTEM.md
UX_FLOWS.md
TECH_ARCHITECTURE.md
AI_RULES.md
```

Leia `SCANNER_ENGINE.md` para qualquer tarefa relacionada ao scanner.

Leia `DATA_MODEL.md` para qualquer tarefa envolvendo persistência/sync.

## Regra de execução

Nunca implemente uma feature grande em uma única mudança sem primeiro decompor em etapas.

Formato esperado:

```text
1. Entendimento
2. Plano
3. Arquivos afetados
4. Implementação
5. Testes
6. Resultado
```

## Prioridade

Se houver conflito:

```text
produto > UX > arquitetura > abstração
```

Mas segurança e integridade de dados são obrigatórias.

## Proibições

Não:

- duplicar componentes;
- inventar design;
- colocar secrets no código;
- depender da internet para scanner;
- acessar Supabase diretamente de qualquer componente sem camada apropriada;
- desativar RLS;
- usar `any` sem justificativa;
- criar arquivos gigantes;
- instalar biblioteca sem necessidade.

## Ao criar UI

Verificar:

- tokens;
- componentes existentes;
- touch target;
- estados;
- loading;
- error;
- empty;
- accessibility.

## Ao criar backend

Verificar:

- ownership;
- RLS;
- validação;
- tratamento de erro;
- migration;
- rollback.

## Ao criar scanner

Verificar:

- memória;
- lifecycle da câmera;
- permissões;
- processamento;
- cancelamento;
- offline;
- dispositivos físicos.

## Testes mínimos

Antes de considerar concluído:

```text
typecheck
lint
tests relevantes
build/check do target
```

Quando a mudança envolver câmera, PDF ou recursos nativos, testar em dispositivo físico.

## Filosofia

Não faça o app parecer sofisticado.

Faça o app parecer inevitavelmente simples.

O melhor fluxo é aquele em que o usuário quase não percebe quantas coisas o sistema fez por ele.
