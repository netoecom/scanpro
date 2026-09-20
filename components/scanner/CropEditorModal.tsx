import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  PanResponder,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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

type CornerKey = 'topLeft' | 'topRight' | 'bottomRight' | 'bottomLeft';
const CORNER_KEYS: CornerKey[] = ['topLeft', 'topRight', 'bottomRight', 'bottomLeft'];

const HANDLE_SIZE = 32;
const TOUCH_AREA_SIZE = 56;

export const CropEditorModal: React.FC<CropEditorModalProps> = ({
  visible,
  imageUri,
  initialCorners,
  onApplyCrop,
  onCancel,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [activeHandle, setActiveHandle] = useState<CornerKey | 'center' | null>(null);

  // Cantos normalizados em porcentagem (0 a 100)
  const [cornersPercent, setCornersPercent] = useState<{
    topLeft: Point;
    topRight: Point;
    bottomRight: Point;
    bottomLeft: Point;
  }>({
    topLeft: { x: 8, y: 8 },
    topRight: { x: 92, y: 8 },
    bottomRight: { x: 92, y: 92 },
    bottomLeft: { x: 8, y: 92 },
  });

  const cornersRef = useRef(cornersPercent);
  cornersRef.current = cornersPercent;

  // Dimensões úteis do visor mantendo aspecto da imagem
  const editorAvailableHeight = Math.max(320, windowHeight - 240);
  const editorAvailableWidth = Math.max(280, windowWidth - 32);

  let displayW = editorAvailableWidth;
  let displayH = editorAvailableHeight;

  if (imageSize && imageSize.width > 0 && imageSize.height > 0) {
    const aspect = imageSize.width / imageSize.height;
    if (displayW / displayH > aspect) {
      displayW = Math.round(displayH * aspect);
    } else {
      displayH = Math.round(displayW / aspect);
    }
  }

  const triggerHaptic = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    }
  }, []);

  // Carrega dimensões naturais da foto
  useEffect(() => {
    if (!visible || !imageUri) return;

    Image.getSize(
      imageUri,
      (w, h) => {
        setImageSize({ width: w, height: h });
        if (initialCorners) {
          setCornersPercent({
            topLeft: {
              x: Math.max(0, Math.min(100, (initialCorners.topLeft.x / w) * 100)),
              y: Math.max(0, Math.min(100, (initialCorners.topLeft.y / h) * 100)),
            },
            topRight: {
              x: Math.max(0, Math.min(100, (initialCorners.topRight.x / w) * 100)),
              y: Math.max(0, Math.min(100, (initialCorners.topRight.y / h) * 100)),
            },
            bottomRight: {
              x: Math.max(0, Math.min(100, (initialCorners.bottomRight.x / w) * 100)),
              y: Math.max(0, Math.min(100, (initialCorners.bottomRight.y / h) * 100)),
            },
            bottomLeft: {
              x: Math.max(0, Math.min(100, (initialCorners.bottomLeft.x / w) * 100)),
              y: Math.max(0, Math.min(100, (initialCorners.bottomLeft.y / h) * 100)),
            },
          });
        } else {
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

  // Cria um PanResponder dedicado para um canto específico
  const createCornerPanResponder = (corner: CornerKey) => {
    const startPosRef = { current: { x: 0, y: 0 } };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startPosRef.current = { ...cornersRef.current[corner] };
        setActiveHandle(corner);
        triggerHaptic();
      },
      onPanResponderMove: (_, gestureState) => {
        if (displayW <= 0 || displayH <= 0) return;
        const deltaXPct = (gestureState.dx / displayW) * 100;
        const deltaYPct = (gestureState.dy / displayH) * 100;

        const newX = Math.max(0, Math.min(100, parseFloat((startPosRef.current.x + deltaXPct).toFixed(1))));
        const newY = Math.max(0, Math.min(100, parseFloat((startPosRef.current.y + deltaYPct).toFixed(1))));

        setCornersPercent((prev) => ({
          ...prev,
          [corner]: { x: newX, y: newY },
        }));
      },
      onPanResponderRelease: () => {
        setActiveHandle(null);
      },
      onPanResponderTerminate: () => {
        setActiveHandle(null);
      },
    });
  };

  // PanResponder individual para cada um dos 4 cantos
  const tlPan = useRef(createCornerPanResponder('topLeft')).current;
  const trPan = useRef(createCornerPanResponder('topRight')).current;
  const brPan = useRef(createCornerPanResponder('bottomRight')).current;
  const blPan = useRef(createCornerPanResponder('bottomLeft')).current;

  // PanResponder central para arrastar todo o retângulo de recorte junto
  const centerStartRef = useRef<{
    tl: Point;
    tr: Point;
    br: Point;
    bl: Point;
  }>({
    tl: { x: 0, y: 0 },
    tr: { x: 0, y: 0 },
    br: { x: 0, y: 0 },
    bl: { x: 0, y: 0 },
  });

  const centerPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const c = cornersRef.current;
        centerStartRef.current = {
          tl: { ...c.topLeft },
          tr: { ...c.topRight },
          br: { ...c.bottomRight },
          bl: { ...c.bottomLeft },
        };
        setActiveHandle('center');
        triggerHaptic();
      },
      onPanResponderMove: (_, gestureState) => {
        if (displayW <= 0 || displayH <= 0) return;
        const dxPct = (gestureState.dx / displayW) * 100;
        const dyPct = (gestureState.dy / displayH) * 100;
        const s = centerStartRef.current;

        // Limita o deslocamento para não sair das bordas da imagem
        const minX = Math.min(s.tl.x, s.bl.x);
        const maxX = Math.max(s.tr.x, s.br.x);
        const minY = Math.min(s.tl.y, s.tr.y);
        const maxY = Math.max(s.bl.y, s.br.y);

        const clampedDx = Math.max(-minX, Math.min(100 - maxX, dxPct));
        const clampedDy = Math.max(-minY, Math.min(100 - maxY, dyPct));

        setCornersPercent({
          topLeft: { x: s.tl.x + clampedDx, y: s.tl.y + clampedDy },
          topRight: { x: s.tr.x + clampedDx, y: s.tr.y + clampedDy },
          bottomRight: { x: s.br.x + clampedDx, y: s.br.y + clampedDy },
          bottomLeft: { x: s.bl.x + clampedDx, y: s.bl.y + clampedDy },
        });
      },
      onPanResponderRelease: () => {
        setActiveHandle(null);
      },
      onPanResponderTerminate: () => {
        setActiveHandle(null);
      },
    })
  ).current;

  // Ações Rápidas
  const handleAutoDetect = async () => {
    if (!imageUri || !imageSize) return;
    setIsDetecting(true);
    try {
      const detection = await EdgeDetector.detectDocumentCorners(imageUri);
      if (detection.corners && imageSize.width > 0 && imageSize.height > 0) {
        const c = detection.corners;
        setCornersPercent({
          topLeft: {
            x: Math.max(0, Math.min(100, (c.topLeft.x / imageSize.width) * 100)),
            y: Math.max(0, Math.min(100, (c.topLeft.y / imageSize.height) * 100)),
          },
          topRight: {
            x: Math.max(0, Math.min(100, (c.topRight.x / imageSize.width) * 100)),
            y: Math.max(0, Math.min(100, (c.topRight.y / imageSize.height) * 100)),
          },
          bottomRight: {
            x: Math.max(0, Math.min(100, (c.bottomRight.x / imageSize.width) * 100)),
            y: Math.max(0, Math.min(100, (c.bottomRight.y / imageSize.height) * 100)),
          },
          bottomLeft: {
            x: Math.max(0, Math.min(100, (c.bottomLeft.x / imageSize.width) * 100)),
            y: Math.max(0, Math.min(100, (c.bottomLeft.y / imageSize.height) * 100)),
          },
        });
        triggerHaptic();
      }
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSetA4 = () => {
    if (!imageSize) return;
    const def = EdgeDetector.createDefaultCorners(imageSize.width, imageSize.height);
    setCornersPercent({
      topLeft: { x: (def.topLeft.x / imageSize.width) * 100, y: (def.topLeft.y / imageSize.height) * 100 },
      topRight: { x: (def.topRight.x / imageSize.width) * 100, y: (def.topRight.y / imageSize.height) * 100 },
      bottomRight: { x: (def.bottomRight.x / imageSize.width) * 100, y: (def.bottomRight.y / imageSize.height) * 100 },
      bottomLeft: { x: (def.bottomLeft.x / imageSize.width) * 100, y: (def.bottomLeft.y / imageSize.height) * 100 },
    });
    triggerHaptic();
  };

  const handleSetFull = () => {
    setCornersPercent({
      topLeft: { x: 0, y: 0 },
      topRight: { x: 100, y: 0 },
      bottomRight: { x: 100, y: 100 },
      bottomLeft: { x: 0, y: 100 },
    });
    triggerHaptic();
  };

  const handleReset = () => {
    if (initialCorners && imageSize) {
      setCornersPercent({
        topLeft: { x: (initialCorners.topLeft.x / imageSize.width) * 100, y: (initialCorners.topLeft.y / imageSize.height) * 100 },
        topRight: { x: (initialCorners.topRight.x / imageSize.width) * 100, y: (initialCorners.topRight.y / imageSize.height) * 100 },
        bottomRight: { x: (initialCorners.bottomRight.x / imageSize.width) * 100, y: (initialCorners.bottomRight.y / imageSize.height) * 100 },
        bottomLeft: { x: (initialCorners.bottomLeft.x / imageSize.width) * 100, y: (initialCorners.bottomLeft.y / imageSize.height) * 100 },
      });
    } else {
      handleSetA4();
    }
    triggerHaptic();
  };

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

    triggerHaptic();
    onApplyCrop(corners);
  };

  if (!visible || !imageUri) {
    return null;
  }

  // Posições em pixel na tela
  const pxTL = { x: (cornersPercent.topLeft.x / 100) * displayW, y: (cornersPercent.topLeft.y / 100) * displayH };
  const pxTR = { x: (cornersPercent.topRight.x / 100) * displayW, y: (cornersPercent.topRight.y / 100) * displayH };
  const pxBR = { x: (cornersPercent.bottomRight.x / 100) * displayW, y: (cornersPercent.bottomRight.y / 100) * displayH };
  const pxBL = { x: (cornersPercent.bottomLeft.x / 100) * displayW, y: (cornersPercent.bottomLeft.y / 100) * displayH };

  // Retângulo delimitador para a máscara de recorte
  const boxLeft = Math.min(pxTL.x, pxBL.x);
  const boxRight = Math.max(pxTR.x, pxBR.x);
  const boxTop = Math.min(pxTL.y, pxTR.y);
  const boxBottom = Math.max(pxBL.y, pxBR.y);
  const boxW = Math.max(20, boxRight - boxLeft);
  const boxH = Math.max(20, boxBottom - boxTop);

  const activeColor = '#00E5FF';
  const normalColor = '#0088FF';
  const borderColor = activeHandle ? activeColor : normalColor;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View
        style={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            paddingLeft: Math.max(insets.left, 16),
            paddingRight: Math.max(insets.right, 16),
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.titleWrap}>
            <Text style={styles.title}>Ajustar Recorte</Text>
            <Text style={styles.subtitle}>Toque e arraste os cantos com precisão</Text>
          </View>
          <TouchableOpacity style={styles.confirmSmallBtn} onPress={handleConfirm}>
            <Text style={styles.confirmSmallText}>Pronto</Text>
          </TouchableOpacity>
        </View>

        {/* Barra de Ações Rápidas */}
        <View style={styles.presetsRow}>
          <TouchableOpacity style={styles.presetChip} onPress={handleAutoDetect} disabled={isDetecting}>
            {isDetecting ? (
              <ActivityIndicator size="small" color="#00E5FF" />
            ) : (
              <Ionicons name="sparkles" size={15} color="#00E5FF" />
            )}
            <Text style={[styles.presetChipText, { color: '#00E5FF', fontWeight: '700' }]}>Auto Detectar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleSetA4}>
            <Ionicons name="document-text-outline" size={15} color="#94A3B8" />
            <Text style={styles.presetChipText}>A4 Padrão</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleSetFull}>
            <Ionicons name="expand-outline" size={15} color="#94A3B8" />
            <Text style={styles.presetChipText}>Foto Inteira</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.presetChip} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={15} color="#94A3B8" />
            <Text style={styles.presetChipText}>Resetar</Text>
          </TouchableOpacity>
        </View>

        {/* Área Central Interativa de Recorte */}
        <View style={styles.editorArea}>
          <View style={[styles.canvasWrapper, { width: displayW, height: displayH }]}>
            {/* Foto base capturada */}
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, { width: displayW, height: displayH }]}
              resizeMode="contain"
            />

            {/* Máscara de 4 lados para criar um recorte 100% nítido no documento */}
            {/* Topo */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: boxTop,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
              }}
            />
            {/* Base */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: boxBottom,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
              }}
            />
            {/* Esquerda */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: boxTop,
                left: 0,
                width: boxLeft,
                height: boxH,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
              }}
            />
            {/* Direita */}
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: boxTop,
                left: boxRight,
                right: 0,
                height: boxH,
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
              }}
            />

            {/* Área interna do recorte com PanResponder para arrasto do bloco todo */}
            <View
              {...centerPan.panHandlers}
              style={{
                position: 'absolute',
                left: boxLeft,
                top: boxTop,
                width: boxW,
                height: boxH,
                borderWidth: 2,
                borderColor: borderColor,
                backgroundColor: 'transparent',
              }}
            >
              {/* Grade de terços para alinhamento profissional */}
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '33.3%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: '66.6%', height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: '33.3%', width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: '66.6%', width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>

            {/* Handle Canto Superior Esquerdo (TopLeft) */}
            <View
              {...tlPan.panHandlers}
              style={[
                styles.handleTouchArea,
                {
                  left: pxTL.x - TOUCH_AREA_SIZE / 2,
                  top: pxTL.y - TOUCH_AREA_SIZE / 2,
                },
              ]}
            >
              <View style={[styles.cornerHandle, activeHandle === 'topLeft' && styles.cornerHandleActive]}>
                <View style={styles.handleInnerDot} />
              </View>
            </View>

            {/* Handle Canto Superior Direito (TopRight) */}
            <View
              {...trPan.panHandlers}
              style={[
                styles.handleTouchArea,
                {
                  left: pxTR.x - TOUCH_AREA_SIZE / 2,
                  top: pxTR.y - TOUCH_AREA_SIZE / 2,
                },
              ]}
            >
              <View style={[styles.cornerHandle, activeHandle === 'topRight' && styles.cornerHandleActive]}>
                <View style={styles.handleInnerDot} />
              </View>
            </View>

            {/* Handle Canto Inferior Direito (BottomRight) */}
            <View
              {...brPan.panHandlers}
              style={[
                styles.handleTouchArea,
                {
                  left: pxBR.x - TOUCH_AREA_SIZE / 2,
                  top: pxBR.y - TOUCH_AREA_SIZE / 2,
                },
              ]}
            >
              <View style={[styles.cornerHandle, activeHandle === 'bottomRight' && styles.cornerHandleActive]}>
                <View style={styles.handleInnerDot} />
              </View>
            </View>

            {/* Handle Canto Inferior Esquerdo (BottomLeft) */}
            <View
              {...blPan.panHandlers}
              style={[
                styles.handleTouchArea,
                {
                  left: pxBL.x - TOUCH_AREA_SIZE / 2,
                  top: pxBL.y - TOUCH_AREA_SIZE / 2,
                },
              ]}
            >
              <View style={[styles.cornerHandle, activeHandle === 'bottomLeft' && styles.cornerHandleActive]}>
                <View style={styles.handleInnerDot} />
              </View>
            </View>
          </View>
        </View>

        {/* Rodapé de Confirmação */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelFooterBtn} onPress={onCancel}>
            <Text style={styles.cancelFooterText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.confirmFooterBtn} onPress={handleConfirm}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.confirmFooterText}>Aplicar Recorte</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    flexWrap: 'wrap',
    gap: spacing.small,
    paddingVertical: spacing.compact,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    gap: 5,
  },
  presetChipText: {
    ...typography.caption,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  editorArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#05080F',
    padding: spacing.small,
  },
  canvasWrapper: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  image: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  handleTouchArea: {
    position: 'absolute',
    width: TOUCH_AREA_SIZE,
    height: TOUCH_AREA_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  cornerHandle: {
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: '#0088FF',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  cornerHandleActive: {
    width: HANDLE_SIZE + 8,
    height: HANDLE_SIZE + 8,
    borderRadius: (HANDLE_SIZE + 8) / 2,
    backgroundColor: '#00E5FF',
    borderColor: '#FFFFFF',
    borderWidth: 4,
    elevation: 12,
  },
  handleInnerDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.default,
    backgroundColor: '#0A0F1D',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: spacing.default,
  },
  cancelFooterBtn: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.prominentCards,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  cancelFooterText: {
    ...typography.body,
    color: '#94A3B8',
    fontWeight: '600',
  },
  confirmFooterBtn: {
    flex: 1.6,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.prominentCards,
    backgroundColor: colors.primary,
  },
  confirmFooterText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
