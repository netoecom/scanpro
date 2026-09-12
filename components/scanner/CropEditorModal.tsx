/**
 * ScanPro — CropEditorModal
 * Editor visual interativo para ajuste fino dos 4 cantos e recorte de documento.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  SafeAreaView,
  TouchableOpacity,
  Image,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CornerPoints, Point } from '../../types';
import { EdgeDetector } from '../../services/processing/edgeDetection';
import { colors, spacing, radii, typography, touchTarget } from '../../theme';

interface CropEditorModalProps {
  visible: boolean;
  imageUri: string | null;
  initialCorners?: CornerPoints | null;
  onApplyCrop: (corners: CornerPoints) => void;
  onCancel: () => void;
}

export const CropEditorModal: React.FC<CropEditorModalProps> = ({
  visible,
  imageUri,
  initialCorners,
  onApplyCrop,
  onCancel,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Dimensões originais da imagem
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);

  // Cantos normalizados em porcentagem (0 a 100) para facilidade de escala
  const [cornersPercent, setCornersPercent] = useState<{
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  }>({
    topLeft: { x: 5, y: 5 },
    topRight: { x: 95, y: 5 },
    bottomRight: { x: 95, y: 95 },
    bottomLeft: { x: 5, y: 95 },
  });

  // Área útil do visor de recorte
  const editorAvailableHeight = Math.max(300, windowHeight - 190);
  const editorAvailableWidth = Math.max(280, windowWidth - 32);

  // Calcula tamanho de exibição da imagem mantendo aspecto
  let displayW = editorAvailableWidth;
  let displayH = editorAvailableHeight;

  if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
    const aspect = imageSize.width / imageSize.height;
    if (displayW / displayH > aspect) {
      displayW = displayH * aspect;
    } else {
      displayH = displayW / aspect;
    }
  }

  // Carrega tamanho natural da imagem
  useEffect(() => {
    if (!visible || !imageUri) return;

    Image.getSize(
      imageUri,
      (w, h) => {
        setImageSize({ width: w, height: h });
        if (initialCorners) {
          setCornersPercent({
            topLeft: { x: (initialCorners.topLeft.x / w) * 100, y: (initialCorners.topLeft.y / h) * 100 },
            topRight: { x: (initialCorners.topRight.x / w) * 100, y: (initialCorners.topRight.y / h) * 100 },
            bottomRight: { x: (initialCorners.bottomRight.x / w) * 100, y: (initialCorners.bottomRight.y / h) * 100 },
            bottomLeft: { x: (initialCorners.bottomLeft.x / w) * 100, y: (initialCorners.bottomLeft.y / h) * 100 },
          });
        } else {
          // Usa cantos padrão A4
          const def = EdgeDetector.createDefaultCorners(w, h);
          setCornersPercent({
            topLeft: { x: (def.topLeft.x / w) * 100, y: (def.topLeft.y / h) * 100 },
            topRight: { x: (def.topRight.x / w) * 100, y: (def.topRight.y / h) * 100 },
            bottomRight: { x: (def.bottomRight.x / w) * 100, y: (def.bottomRight.y / h) * 100 },
            bottomLeft: { x: (def.bottomLeft.x / w) * 100, y: (def.bottomLeft.y / h) * 100 },
          });
        }
      },
      () => {
        setImageSize({ width: 1200, height: 1600 });
      }
    );
  }, [visible, imageUri, initialCorners]);

  // Redetectar bordas automaticamente
  const handleAutoDetect = async () => {
    if (!imageUri || !imageSize) return;
    setIsDetecting(true);
    try {
      const detection = await EdgeDetector.detectDocumentCorners(imageUri);
      if (detection.corners) {
        const c = detection.corners;
        setCornersPercent({
          topLeft: { x: (c.topLeft.x / imageSize.width) * 100, y: (c.topLeft.y / imageSize.height) * 100 },
          topRight: { x: (c.topRight.x / imageSize.width) * 100, y: (c.topRight.y / imageSize.height) * 100 },
          bottomRight: { x: (c.bottomRight.x / imageSize.width) * 100, y: (c.bottomRight.y / imageSize.height) * 100 },
          bottomLeft: { x: (c.bottomLeft.x / imageSize.width) * 100, y: (c.bottomLeft.y / imageSize.height) * 100 },
        });
      }
    } finally {
      setIsDetecting(false);
    }
  };

  // Enquadrar A4 proporcional
  const handleSetA4 = () => {
    if (!imageSize) return;
    const def = EdgeDetector.createDefaultCorners(imageSize.width, imageSize.height);
    setCornersPercent({
      topLeft: { x: (def.topLeft.x / imageSize.width) * 100, y: (def.topLeft.y / imageSize.height) * 100 },
      topRight: { x: (def.topRight.x / imageSize.width) * 100, y: (def.topRight.y / imageSize.height) * 100 },
      bottomRight: { x: (def.bottomRight.x / imageSize.width) * 100, y: (def.bottomRight.y / imageSize.height) * 100 },
      bottomLeft: { x: (def.bottomLeft.x / imageSize.width) * 100, y: (def.bottomLeft.y / imageSize.height) * 100 },
    });
  };

  // Foto completa (sem corte)
  const handleSetFull = () => {
    setCornersPercent({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 100, y: 0 },
      bottomRight: { x: 100, y: 100 },
      bottomLeft: { x: 0, y: 100 },
    });
  };

  // Aplica o recorte convertendo porcentagens de volta para pixels reais da imagem
  const handleConfirm = () => {
    if (!imageSize) return;
    const origW = imageSize.width;
    const origH = imageSize.height;

    const corners: CornerPoints = {
      topLeft: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.topLeft.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.topLeft.y)) / 100) * origH),
      },
      topRight: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.topRight.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.topRight.y)) / 100) * origH),
      },
      bottomRight: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomRight.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomRight.y)) / 100) * origH),
      },
      bottomLeft: {
        x: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomLeft.x)) / 100) * origW),
        y: Math.round((Math.max(0, Math.min(100, cornersPercent.bottomLeft.y)) / 100) * origH),
      },
    };

    onApplyCrop(corners);
  };

  // Helper para criar PanResponder para cada alça de canto
  const createCornerResponder = (cornerKey: 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft') => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (displayW <= 0 || displayH <= 0) return;

        const deltaPercentX = (gestureState.dx / displayW) * 100;
        const deltaPercentY = (gestureState.dy / displayH) * 100;

        setCornersPercent((prev) => {
          const current = prev[cornerKey];
          const newX = Math.max(0, Math.min(100, current.x + deltaPercentX * 0.25));
          const newY = Math.max(0, Math.min(100, current.y + deltaPercentY * 0.25));

          return {
            ...prev,
            [cornerKey]: { x: newX, y: newY },
          };
        });
      },
    });
  };

  const tlResponder = useRef(createCornerResponder('topLeft')).current;
  const trResponder = useRef(createCornerResponder('topRight')).current;
  const brResponder = useRef(createCornerResponder('bottomRight')).current;
  const blResponder = useRef(createCornerResponder('bottomLeft')).current;

  if (!visible || !imageUri) {
    return null;
  }

  // Coordenadas calculadas na tela de visualização (em pixels)
  const pxTL = { x: (cornersPercent.topLeft.x / 100) * displayW, y: (cornersPercent.topLeft.y / 100) * displayH };
  const pxTR = { x: (cornersPercent.topRight.x / 100) * displayW, y: (cornersPercent.topRight.y / 100) * displayH };
  const pxBR = { x: (cornersPercent.bottomRight.x / 100) * displayW, y: (cornersPercent.bottomRight.y / 100) * displayH };
  const pxBL = { x: (cornersPercent.bottomLeft.x / 100) * displayW, y: (cornersPercent.bottomLeft.y / 100) * displayH };

  const minCropX = Math.min(pxTL.x, pxBL.x);
  const maxCropX = Math.max(pxTR.x, pxBR.x);
  const minCropY = Math.min(pxTL.y, pxTR.y);
  const maxCropY = Math.max(pxBL.y, pxBR.y);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Header com Cancelar e Título */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Ajustar Recorte</Text>
            <Text style={styles.subtitle}>Arraste os cantos para enquadrar o papel</Text>
          </View>
          <TouchableOpacity style={styles.confirmSmallBtn} onPress={handleConfirm}>
            <Text style={styles.confirmSmallText}>Pronto</Text>
          </TouchableOpacity>
        </View>

        {/* Paleta Superior de Ações Rápidas */}
        <View style={styles.presetsRow}>
          <TouchableOpacity style={styles.presetChip} onPress={handleAutoDetect} disabled={isDetecting}>
            {isDetecting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="sparkles" size={14} color={colors.primary} />
            )}
            <Text style={styles.presetChipText}>Auto Detectar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleSetA4}>
            <Ionicons name="document-text-outline" size={14} color="#94A3B8" />
            <Text style={styles.presetChipText}>A4 Padrão</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleSetFull}>
            <Ionicons name="expand-outline" size={14} color="#94A3B8" />
            <Text style={styles.presetChipText}>Foto Inteira</Text>
          </TouchableOpacity>
        </View>

        {/* Área Central Interativa de Recorte */}
        <View style={styles.editorArea}>
          <View style={[styles.canvasWrapper, { width: displayW, height: displayH }]}>
            <Image source={{ uri: imageUri }} style={[styles.image, { width: displayW, height: displayH }]} resizeMode="contain" />

            {/* Máscara de Borda e Retângulo de Recorte */}
            <View
              pointerEvents="none"
              style={[
                styles.cropBoundingBox,
                {
                  left: minCropX,
                  top: minCropY,
                  width: Math.max(10, maxCropX - minCropX),
                  height: Math.max(10, maxCropY - minCropY),
                },
              ]}
            />

            {/* Alça Canto Superior Esquerdo */}
            <View
              {...tlResponder.panHandlers}
              style={[
                styles.handle,
                {
                  left: pxTL.x - 22,
                  top: pxTL.y - 22,
                },
              ]}
            >
              <View style={[styles.handleInner, { backgroundColor: colors.primary }]} />
            </View>

            {/* Alça Canto Superior Direito */}
            <View
              {...trResponder.panHandlers}
              style={[
                styles.handle,
                {
                  left: pxTR.x - 22,
                  top: pxTR.y - 22,
                },
              ]}
            >
              <View style={[styles.handleInner, { backgroundColor: colors.primary }]} />
            </View>

            {/* Alça Canto Inferior Direito */}
            <View
              {...brResponder.panHandlers}
              style={[
                styles.handle,
                {
                  left: pxBR.x - 22,
                  top: pxBR.y - 22,
                },
              ]}
            >
              <View style={[styles.handleInner, { backgroundColor: colors.primary }]} />
            </View>

            {/* Alça Canto Inferior Esquerdo */}
            <View
              {...blResponder.panHandlers}
              style={[
                styles.handle,
                {
                  left: pxBL.x - 22,
                  top: pxBL.y - 22,
                },
              ]}
            >
              <View style={[styles.handleInner, { backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>

        {/* Rodapé de Confirmação */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelFooterBtn} onPress={onCancel}>
            <Text style={styles.cancelFooterText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmFooterBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            <Text style={styles.confirmFooterText}>Aplicar Recorte</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelBtn: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    alignItems: 'center',
  },
  title: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  confirmSmallBtn: {
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    backgroundColor: colors.primary,
  },
  confirmSmallText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.small,
    paddingVertical: spacing.compact,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  presetChipText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  editorArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.default,
  },
  canvasWrapper: {
    position: 'relative',
    backgroundColor: '#000000',
    borderRadius: radii.standard,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cropBoundingBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 204, 0.15)',
  },
  handle: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  handleInner: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.default,
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.default,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#0F172A',
  },
  cancelFooterBtn: {
    flex: 1,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.standard,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  cancelFooterText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  confirmFooterBtn: {
    flex: 1.5,
    flexDirection: 'row',
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.small,
    borderRadius: radii.standard,
    backgroundColor: colors.primary,
  },
  confirmFooterText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
