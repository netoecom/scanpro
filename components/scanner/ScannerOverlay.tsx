import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { ScannerStatus } from '../../types';
import { colors, spacing, radii, typography } from '../../theme';

interface ScannerOverlayProps {
  status: ScannerStatus;
  confidence?: number;
  autoCapture?: boolean;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  status,
  confidence = 0,
  autoCapture = false,
}) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Área útil vertical entre controles superiores (~90px) e inferiores (~160px)
  const availableVertical = Math.max(340, screenHeight - 250);
  const maxAllowedWidth = Math.min(screenWidth * 0.90, 480);

  // Proporção clássica de folha A4 (1 : 1.414)
  let frameHeight = availableVertical * 0.90;
  let frameWidth = frameHeight / 1.414;

  if (frameWidth > maxAllowedWidth) {
    frameWidth = maxAllowedWidth;
    frameHeight = frameWidth * 1.414;
  }

  const isDetected = status === 'DOCUMENT_DETECTED' || confidence > 0.6;

  const getStatusMessage = () => {
    switch (status) {
      case 'SCANNER_SEARCHING':
        return 'Alinhe o documento no quadrante';
      case 'DOCUMENT_DETECTED':
        return autoCapture ? 'Documento detectado! Mantenha estável...' : 'Documento enquadrado. Pressione o botão para capturar';
      case 'CAPTURING':
        return 'Capturando foto...';
      case 'PROCESSING':
        return 'Otimizando nitidez e contraste...';
      case 'CAPTURE_ERROR':
        return 'Não foi possível identificar. Tente novamente';
      default:
        return 'Alinhe o documento no quadrante';
    }
  };

  const cornerColor = isDetected ? colors.success : '#FFFFFF';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Flash branco instantâneo na captura */}
      {status === 'CAPTURING' && <View style={styles.shutterFlash} />}

      {/* Pílula de Instrução Superior (abaixo dos controles de topo) */}
      <View style={styles.topInstructionContainer}>
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

      {/* Quadrante Amplo de Enquadramento */}
      <View style={styles.centerContainer}>
        <View
          style={[
            styles.documentFrame,
            { width: Math.round(frameWidth), height: Math.round(frameHeight) },
            isDetected && styles.documentFrameDetected,
          ]}
        >
          {/* Cantoneiras Visuais Reforçadas */}
          <View style={[styles.corner, styles.cornerTL, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: cornerColor }]} />
        </View>
      </View>
    </View>
  );
};

const CORNER_SIZE = 32;
const CORNER_BORDER_WIDTH = 4;

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topInstructionContainer: {
    position: 'absolute',
    top: 92,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  shutterFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
  },
  documentFrame: {
    position: 'relative',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderRadius: radii.cards,
  },
  documentFrameDetected: {
    borderColor: 'rgba(52, 199, 89, 0.65)',
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
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
  instructionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingVertical: spacing.small - 2,
    paddingHorizontal: spacing.default,
    borderRadius: radii.capsule,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  instructionPillDetected: {
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    borderColor: 'rgba(52, 199, 89, 0.3)',
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
    fontWeight: '600',
  },
});
