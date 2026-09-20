/**
 * ScanPro — Base64 / Uint8Array Utility
 * Implementação pura em TypeScript de codificação e decodificação Base64.
 * 100% compatível com o motor Hermes no Android e iOS (elimina dependência de atob/btoa globais).
 */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = new Uint8Array(256);

for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

/**
 * Decodifica uma string Base64 diretamente para Uint8Array sem usar atob()
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  // Remove espaços em branco ou quebras de linha se houver
  const cleanBase64 = base64.replace(/[\r\n\s]/g, '');
  const len = cleanBase64.length;

  if (len === 0) {
    return new Uint8Array(0);
  }

  let bufferLength = Math.floor(len * 0.75);
  if (cleanBase64[len - 1] === '=') {
    bufferLength--;
    if (cleanBase64[len - 2] === '=') {
      bufferLength--;
    }
  }

  const bytes = new Uint8Array(bufferLength);
  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const enc1 = B64_LOOKUP[cleanBase64.charCodeAt(i)];
    const enc2 = B64_LOOKUP[cleanBase64.charCodeAt(i + 1)];
    const enc3 = cleanBase64.charCodeAt(i + 2) !== 61 ? B64_LOOKUP[cleanBase64.charCodeAt(i + 2)] : 64;
    const enc4 = cleanBase64.charCodeAt(i + 3) !== 61 ? B64_LOOKUP[cleanBase64.charCodeAt(i + 3)] : 64;

    bytes[p++] = (enc1 << 2) | (enc2 >> 4);

    if (enc3 !== 64 && p < bufferLength) {
      bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    }
    if (enc4 !== 64 && p < bufferLength) {
      bytes[p++] = ((enc3 & 3) << 6) | enc4;
    }
  }

  return bytes;
}

/**
 * Codifica um Uint8Array diretamente para string Base64 sem usar btoa() ou String.fromCharCode.apply
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const len = bytes.length;
  if (len === 0) return '';

  let base64 = '';
  const extraBytes = len % 3;
  const mainLength = len - extraBytes;

  // Processamento em blocos com string concatenada
  for (let i = 0; i < mainLength; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];

    base64 += B64_CHARS[b0 >> 2];
    base64 += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)];
    base64 += B64_CHARS[b2 & 63];
  }

  // Tratamento do padding final
  if (extraBytes === 1) {
    const b0 = bytes[mainLength];
    base64 += B64_CHARS[b0 >> 2];
    base64 += B64_CHARS[(b0 & 3) << 4];
    base64 += '==';
  } else if (extraBytes === 2) {
    const b0 = bytes[mainLength];
    const b1 = bytes[mainLength + 1];
    base64 += B64_CHARS[b0 >> 2];
    base64 += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    base64 += B64_CHARS[(b1 & 15) << 2];
    base64 += '=';
  }

  return base64;
}
