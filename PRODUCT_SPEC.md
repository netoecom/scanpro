# ScanPro — Product Specification

## 1. Visão

ScanPro é um aplicativo mobile para transformar rapidamente documentos físicos em arquivos digitais de alta qualidade.

O produto compete principalmente por:

- velocidade;
- redução de decisões;
- qualidade automática;
- confiabilidade;
- experiência premium;
- funcionamento offline.

## 2. Público-alvo

Pessoas que precisam digitalizar documentos rapidamente:

- estudantes;
- profissionais;
- pequenos negócios;
- pessoas que precisam enviar documentos;
- usuários que digitalizam recibos, contratos, comprovantes, folhas e formulários.

## 3. Jobs To Be Done

### Principal

"Preciso transformar este papel em um PDF e enviar."

### Secundários

- digitalizar várias páginas;
- melhorar a aparência do documento;
- encontrar um documento antigo;
- extrair texto;
- compartilhar;
- organizar documentos;
- renomear;
- exportar.

## 4. Regra de ouro

O usuário quer o resultado, não o processo.

Evitar:

- excesso de configurações;
- telas intermediárias desnecessárias;
- confirmação para tudo;
- linguagem técnica;
- menus complexos.

## 5. MVP

### Obrigatório

- abrir scanner;
- permissão de câmera;
- detecção automática;
- captura;
- recorte/perspectiva;
- melhoria automática;
- adicionar página;
- remover página;
- reordenar páginas;
- gerar PDF;
- salvar localmente;
- compartilhar;
- biblioteca;
- renomear;
- excluir;
- preview.

### Segunda camada

- OCR;
- busca por conteúdo;
- pastas;
- favoritos;
- seleção múltipla;
- sincronização;
- conta;
- assinatura.

## 6. Home

Hierarquia:

1. título/saudação curta;
2. CTA principal "Escanear documento";
3. documentos recentes;
4. acesso à biblioteca;
5. navegação inferior.

O CTA de scanner deve ser visualmente dominante.

## 7. Scanner

A câmera ocupa praticamente toda a tela.

Controles prioritários:

- fechar;
- flash;
- captura;
- galeria/importar;
- modo automático/manual, se necessário.

O sistema deve tentar fazer automaticamente:

- detectar documento;
- indicar bordas;
- capturar;
- corrigir perspectiva;
- melhorar imagem.

## 8. Magic Moment

Depois da captura:

```text
captura
↓
processamento rápido
↓
documento corrigido
↓
PDF pronto
```

O resultado deve parecer imediato.

O usuário deve perceber:

> "Eu só apontei e o app fez todo o trabalho."

## 9. Multi-page

Depois de uma captura:

- Adicionar página = ação primária;
- Concluir = ação primária quando terminar;
- thumbnail das páginas;
- tocar para editar;
- pressionar/arrastar para reordenar;
- excluir com confirmação apenas quando necessário.

## 10. Exportação

Após concluir:

### Tela

"PDF pronto"

Ações:

- Compartilhar
- Salvar em Arquivos
- Abrir
- Renomear

Compartilhamento deve usar o mecanismo nativo da plataforma.

## 11. Biblioteca

Recursos:

- recentes;
- busca;
- pastas;
- favoritos;
- seleção múltipla;
- excluir;
- compartilhar;
- renomear.

A biblioteca deve privilegiar conteúdo, não controles.

## 12. OCR

OCR deve ser invisível na maior parte do tempo.

Usos:

- pesquisa;
- nome sugerido;
- reconhecimento de documentos;
- futura extração estruturada.

Nunca obrigar o usuário a configurar OCR antes de escanear.

## 13. Conta

Primeiro uso não deve exigir login.

Fluxo:

```text
abrir
↓
escanear
↓
usar normalmente
↓
quando houver benefício claro
↓
convidar para criar conta/sincronizar
```

## 14. Monetização

Modelo preparado para:

- Free;
- Premium mensal;
- Premium anual.

Não bloquear a função principal de scanner antes de o usuário experimentar o valor.

## 15. Princípios UX

- uma decisão por vez;
- defaults inteligentes;
- feedback imediato;
- erros recuperáveis;
- animações curtas;
- haptics nos momentos importantes;
- acessibilidade;
- consistência;
- velocidade percebida;
- conteúdo acima de chrome.

## 16. Não fazer

- copiar CamScanner;
- transformar scanner em editor complexo;
- gamificação artificial;
- excesso de badges;
- dashboard cheio de métricas;
- onboarding longo;
- login obrigatório antes do primeiro scan;
- depender da nuvem para escanear.
