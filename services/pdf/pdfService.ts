import { PDFDocument } from 'pdf-lib';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

export interface GeneratePdfOptions {
  title: string;
  pages: Array<{
    uri: string;
    width?: number;
    height?: number;
  }>;
}

export interface GeneratedPdfResult {
  uri: string;
  base64?: string;
  sizeBytes: number;
}

export class PdfService {
  /**
   * Converte uma imagem (URI, data-url ou base64) para Uint8Array
   */
  private static async imageUriToUint8Array(uri: string): Promise<Uint8Array> {
    if (uri.startsWith('data:')) {
      const base64Data = uri.split(',')[1];
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }

    if (Platform.OS === 'web') {
      const response = await fetch(uri);
      const buffer = await response.arrayBuffer();
      return new Uint8Array(buffer);
    } else {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes;
    }
  }

  /**
   * Gera um PDF padrão A4 compilando todas as páginas processadas
   */
  static async generatePdf(options: GeneratePdfOptions): Promise<GeneratedPdfResult> {
    const pdfDoc = await PDFDocument.create();

    // Metadados do documento
    pdfDoc.setTitle(options.title);
    pdfDoc.setAuthor('ScanPro');
    pdfDoc.setProducer('ScanPro Local-First Engine');
    pdfDoc.setCreationDate(new Date());

    // Dimensões A4 em pontos (72 dpi)
    const A4_WIDTH = 595.28;
    const A4_HEIGHT = 841.89;

    for (const pageItem of options.pages) {
      if (!pageItem.uri) continue;

      try {
        const imageBytes = await this.imageUriToUint8Array(pageItem.uri);

        // Identifica se a imagem é PNG ou JPEG
        let embeddedImage;
        const isPng = pageItem.uri.toLowerCase().includes('.png') || pageItem.uri.startsWith('data:image/png');
        if (isPng) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }

        const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);

        // Ajuste proporcional com margens de 20pt
        const margin = 20;
        const availableWidth = A4_WIDTH - margin * 2;
        const availableHeight = A4_HEIGHT - margin * 2;

        const imgWidth = embeddedImage.width;
        const imgHeight = embeddedImage.height;
        const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;

        const x = (A4_WIDTH - scaledWidth) / 2;
        const y = (A4_HEIGHT - scaledHeight) / 2;

        page.drawImage(embeddedImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      } catch (err) {
        console.warn('Não foi possível embutir a imagem no PDF, adicionando página vazia:', err);
        pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
      }
    }

    const pdfBytes = await pdfDoc.save();
    const sizeBytes = pdfBytes.byteLength;

    if (Platform.OS === 'web') {
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const uri = URL.createObjectURL(blob);
      return { uri, sizeBytes };
    } else {
      const filename = `scanpro_${Date.now()}.pdf`;
      const fileUri = `${FileSystem.documentDirectory || ''}${filename}`;
      
      // Converte bytes para string base64 para gravação nativa
      let binary = '';
      const len = pdfBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(pdfBytes[i]);
      }
      const base64 = btoa(binary);

      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { uri: fileUri, sizeBytes, base64 };
    }
  }

  /**
   * Compartilha o PDF via Share Sheet nativo ou download no navegador
   */
  static async sharePdf(pdfUri: string, title = 'ScanPro Document'): Promise<void> {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          const response = await fetch(pdfUri);
          const blob = await response.blob();
          const file = new File([blob], `${title.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title,
            });
            return;
          }
        } catch {
          // Fallback para download padrão
        }
      }

      // Fallback de download em navegador
      const a = document.createElement('a');
      a.href = pdfUri;
      a.download = `${title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Compartilhar ${title}`,
          UTI: 'com.adobe.pdf',
        });
      }
    }
  }
}
