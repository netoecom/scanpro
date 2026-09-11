import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { ScannerStatus } from '../../types';
import { colors, spacing, radii, typography } from '../../theme';

interface ScannerOverlayProps {
  status: ScannerStatus;
  confidence?: number;
  autoCapture?: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FRAME_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 340);
const FRAME_HEIGHT = FRAME_WIDTH * 1.414; // Proporção padrão A4

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  status,
  confidence = 0,
  autoCapture = true,
}) => {
  const isDetected = status === 'DOCUMENT_DETECTED' || confidence > 0.6;
  const isCapturing = status === 'CAPTURING' || status === 'PROCESSING';

  const getStatusMessage = () => {
    switch (status) {
      case 'SCANNER_SEARCHING':
        return 'Aponte a câmera para o documento';
      case 'DOCUMENT_DETECTED':
        return autoCapture ? 'Documento detectado! Mantenha estável...' : 'Documento detectado';
      case 'CAPTURING':
        return 'Capturando...';
      case 'PROCESSING':
        return 'Processando recorte e nitidez...';
      case 'CAPTURE_ERROR':
        return 'Não consegui identificar o documento';
      default:
        return 'Aponte a câmera para o documento';
    }
  };

  const cornerColor = isDetected ? colors.success : '#FFFFFF';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Flash branco instantâneo na captura */}
      {status === 'CAPTURING' && <View style={styles.shutterFlash} />}

      {/* Área Central de Enquadramento */}
      <View style={styles.centerContainer}>
        <View
          style={[
            styles.documentFrame,
            { width: FRAME_WIDTH, height: FRAME_HEIGHT },
            isDetected && styles.documentFrameDetected,
          ]}
        >
          {/* Cantoneiras Visuais */}
          <View style={[styles.corner, styles.cornerTL, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: cornerColor }]} />
        </View>

        {/* Pílula de Instrução em Tempo Real */}
        <View style={styles.pillContainer}>
          <View style={[styles.instructionPill, isDetected && styles.instructionPillDetected]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isDetected ? colors.success : '#FFFFFF' },
              ]}
            />
            <Text style={styles.instructionText}>{getStatusMessage()}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const CORNER_SIZE = 28;
const CORNER_BORDER_WIDTH = 3.5;

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
  documentFrame: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: radii.cards,
  },
  documentFrameDetected: {
    borderColor: 'rgba(52, 199, 89, 0.45)',
    backgroundColor: 'rgba(52, 199, 89, 0.05)',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: CORNER_BORDER_WIDTH,
    borderLeftWidth: CORNER_BORDER_WIDTH,
    borderTopLeftRadius: radii.cards,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: CORNER_BORDER_WIDTH,
    borderRightWidth: CORNER_BORDER_WIDTH,
    borderTopRightRadius: radii.cards,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: CORNER_BORDER_WIDTH,
    borderLeftWidth: CORNER_BORDER_WIDTH,
    borderBottomLeftRadius: radii.cards,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: CORNER_BORDER_WIDTH,
    borderRightWidth: CORNER_BORDER_WIDTH,
    borderBottomRightRadius: radii.cards,
  },
  pillContainer: {
    marginTop: spacing.section,
    alignItems: 'center',
  },
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: spacing.small,
    paddingHorizontal: spacing.default,
    borderRadius: radii.capsule,
  },
  instructionPillDetected: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.small,
  },
  instructionText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});
