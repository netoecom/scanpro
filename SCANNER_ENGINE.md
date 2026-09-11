# ScanPro — Scanner Engine

## 1. Objetivo

Transformar uma foto comum em uma página de documento com aparência profissional.

## 2. Pipeline

```text
Camera frame
 ↓
Document detection
 ↓
Corner detection
 ↓
Capture
 ↓
Perspective transform
 ↓
Crop
 ↓
Image enhancement
 ↓
Optional OCR
 ↓
Save page
```

## 3. Document Detection

Detectar:

- quadrilátero;
- bordas;
- perspectiva;
- confiança.

Modelo conceitual:

```ts
type DocumentDetection = {
  detected: boolean;
  confidence: number;
  corners: {
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  } | null;
};
```

## 4. Auto capture

Condições sugeridas:

```text
documentDetected
AND
confidence > threshold
AND
deviceStable
AND
documentSizeAcceptable
AND
cooldownElapsed
```

Não capturar repetidamente.

## 5. Captura

Após captura:

1. congelar feedback visual;
2. salvar imagem temporária;
3. processar;
4. apresentar resultado.

## 6. Perspective Correction

Aplicar transformação de perspectiva usando os quatro cantos.

Resultado deve preservar:

- legibilidade;
- proporção;
- margens naturais.

## 7. Enhancement

Modos iniciais:

- Original
- Automático
- Preto e branco

Futuro:

- documento;
- recibo;
- foto;
- quadro branco.

O modo automático deve ser o default.

## 8. Qualidade

Evitar processamento destrutivo desnecessário.

Manter:

```text
original asset
processed asset
thumbnail
```

quando o custo de armazenamento permitir.

## 9. OCR

OCR deve rodar em background após o documento estar utilizável.

Nunca atrasar o PDF apenas para esperar OCR, salvo quando o usuário explicitamente solicitar uma função que dependa dele.

## 10. PDF

Gerar PDF a partir das páginas processadas.

Metadados:

- título;
- criação;
- páginas;
- tamanho.

## 11. Memória

Imagens de câmera podem ser grandes.

Regras:

- evitar múltiplas cópias em memória;
- liberar buffers;
- usar thumbnails para listas;
- processar página por página.

## 12. Falhas

### Sem documento

Mensagem:

"Não consegui identificar o documento."

### Baixa confiança

Não capturar automaticamente.

### Processamento falhou

Permitir:

- tentar novamente;
- usar imagem original.

## 13. Testes

Testar:

- documento reto;
- documento inclinado;
- pouca luz;
- sombra;
- múltiplas folhas;
- fundo semelhante ao documento;
- documento parcialmente fora da câmera;
- recibos;
- folhas coloridas;
- texto pequeno.
