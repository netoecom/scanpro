import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Gera um thumbnail leve (largura máxima 240px) para acelerar listas e economizar memória
 */
export async function generateThumbnail(uri: string): Promise<string> {
  try {
    const result = await manipulateAsync(
      uri,
      [
        {
          resize: { width: 240 },
        },
      ],
      {
        compress: 0.75,
        format: SaveFormat.JPEG,
      }
    );
    return result.uri;
  } catch (err) {
    console.warn('Falha na geração de thumbnail, usando original como fallback:', err);
    return uri;
  }
}
