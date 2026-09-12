import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScannerStatus } from '../../types';
import { colors, spacing, radii, typography } from '../../theme';

interface ScannerOverlayProps {
  status: ScannerStatus;
  confidence?: number;
  autoCapture?: boolean;
  capturedImageUri?: string | null;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  status,
  confidence = 0,
  autoCapture = false,
  capturedImageUri = null,
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

  const isScanning = status === 'CAPTURING' || status === 'PROCESSING';
  const isDetected = status === 'DOCUMENT_DETECTED' || confidence > 0.6;

  // Animações:
  // 1. Shutter flash ultrarrápido (substitui a tela branca estática)
  const shutterAnim = useRef(new Animated.Value(0)).current;
  // 2. Feixe de laser de varredura vertical
  const scanAnim = useRef(new Animated.Value(0)).current;
  // 3. Pulsação holográfica dos cantos
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  // 4. Barra de progresso contínua do HUD
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Disparo do Shutter Flash no momento exato do clique de captura
  useEffect(() => {
    if (status === 'CAPTURING') {
      shutterAnim.setValue(0.75);
      Animated.timing(shutterAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }).start();
    }
  }, [status, shutterAnim]);

  // Controle da animação do feixe de laser de varredura durante CAPTURING ou PROCESSING
  useEffect(() => {
    let scanLoop: Animated.CompositeAnimation | null = null;
    let pulseLoop: Animated.CompositeAnimation | null = null;
    let progressLoop: Animated.CompositeAnimation | null = null;

    if (isScanning) {
      // Varredura contínua do feixe laser (topo -> base -> topo)
      scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 1100,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      scanLoop.start();

      // Pulso luminoso nos vértices
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.35,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      pulseLoop.start();

      // Progresso contínuo no HUD
      progressLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(progressAnim, {
            toValue: 1,
            duration: 1400,
            easing: Easing.linear,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(progressAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ])
      );
      progressLoop.start();
    } else {
      scanAnim.stopAnimation();
      scanAnim.setValue(0);
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0.4);
      progressAnim.stopAnimation();
      progressAnim.setValue(0);
    }

    return () => {
      if (scanLoop) scanLoop.stop();
      if (pulseLoop) pulseLoop.stop();
      if (progressLoop) progressLoop.stop();
    };
  }, [isScanning, scanAnim, pulseAnim, progressAnim]);

  const getStatusMessage = () => {
    switch (status) {
      case 'SCANNER_SEARCHING':
        return 'Alinhe o documento no quadrante';
      case 'DOCUMENT_DETECTED':
        return autoCapture
          ? 'Documento detectado! Mantenha estável...'
          : 'Documento enquadrado. Pressione o botão para capturar';
      case 'CAPTURING':
        return 'Fotografando em alta definição...';
      case 'PROCESSING':
        return 'Digitalizando e otimizando nitidez...';
      case 'CAPTURE_ERROR':
        return 'Não foi possível identificar. Tente novamente';
      default:
        return 'Alinhe o documento no quadrante';
    }
  };

  const cornerColor = isScanning
    ? '#00E5FF'
    : isDetected
      ? colors.success
      : '#FFFFFF';

  // Deslocamento vertical do laser dentro da altura útil da moldura
  const laserTranslateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.max(0, frameHeight - 6)],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 1. Flash Cinematográfico Suave de Obturador (fades out in 180ms, ZERO tela branca congelada) */}
      <Animated.View
        style={[
          styles.shutterFlash,
          {
            opacity: shutterAnim,
          },
        ]}
        pointerEvents="none"
      />

      {/* 2. Pílula de Instrução Superior */}
      {!isScanning && (
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
      )}

      {/* 3. Quadrante de Enquadramento e Efeito Laser Transitório */}
      <View style={styles.centerContainer}>
        <View
          style={[
            styles.documentFrame,
            { width: Math.round(frameWidth), height: Math.round(frameHeight) },
            isDetected && !isScanning && styles.documentFrameDetected,
            isScanning && styles.documentFrameScanning,
          ]}
        >
          {/* Fundo da Foto Capturada (se já disponível em memória durante o OCR/processamento) */}
          {isScanning && capturedImageUri && (
            <Image
              source={{ uri: capturedImageUri }}
              style={styles.capturedImageBackdrop}
              resizeMode="cover"
            />
          )}

          {/* Máscara Translúcida Escura de Foco durante Escaneamento */}
          {isScanning && <View style={styles.scanningDarkTint} />}

          {/* Grade Holográfica de Varredura */}
          {isScanning && (
            <View style={styles.holographicScanGrid}>
              <View style={styles.gridLineH1} />
              <View style={styles.gridLineH2} />
              <View style={styles.gridLineV1} />
            </View>
          )}

          {/* Feixe Laser Neon de Varredura Vertical */}
          {isScanning && (
            <Animated.View
              style={[
                styles.laserContainer,
                {
                  transform: [{ translateY: laserTranslateY }],
                },
              ]}
            >
              {/* Rastro Luminoso do Laser */}
              <View style={styles.laserAuraTrail} />

              {/* Barra do Feixe Laser com Núcleo e Pontos */}
              <View style={styles.laserBeamBar}>
                <View style={styles.laserEndDot} />
                <View style={styles.laserBeamCore} />
                <View style={styles.laserEndDot} />
              </View>
            </Animated.View>
          )}

          {/* Cantoneiras Reforçadas */}
          <View style={[styles.corner, styles.cornerTL, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: cornerColor }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: cornerColor }]} />

          {/* Pulso de Cantoneira durante Escaneamento */}
          {isScanning && (
            <Animated.View
              style={[
                styles.cornerPulseRing,
                {
                  opacity: pulseAnim,
                },
              ]}
            />
          )}

          {/* HUD Badge Central com Feedback de Escaneamento em Tempo Real */}
          {isScanning && (
            <View style={styles.scanningHudContainer}>
              <View style={styles.scanningHudBadge}>
                <View style={styles.hudIconWrap}>
                  <Ionicons name="scan" size={20} color="#00E5FF" />
                </View>

                <View style={styles.hudTextWrap}>
                  <Text style={styles.hudTitle}>
                    {status === 'CAPTURING' ? 'Capturando imagem...' : 'Digitalizando documento...'}
                  </Text>
                  <Text style={styles.hudSubtitle}>
                    {status === 'CAPTURING'
                      ? 'Estabilizando sensor fotográfico'
                      : 'Otimizando bordas, perspectiva e contraste'}
                  </Text>
                </View>

                {/* Barra de Progresso Futurista Contínua */}
                <View style={styles.hudProgressTrack}>
                  <Animated.View
                    style={[
                      styles.hudProgressBar,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const CORNER_SIZE = 34;
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
    overflow: 'hidden',
  },
  documentFrameDetected: {
    borderColor: 'rgba(52, 199, 89, 0.65)',
    backgroundColor: 'rgba(52, 199, 89, 0.06)',
  },
  documentFrameScanning: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.03)',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 0 25px rgba(0, 229, 255, 0.35), inset 0 0 25px rgba(0, 229, 255, 0.15)',
        }
      : {}),
  },
  capturedImageBackdrop: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.92,
  },
  scanningDarkTint: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(10, 15, 29, 0.45)',
  },
  holographicScanGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.15,
  },
  gridLineH1: {
    position: 'absolute',
    top: '33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#00E5FF',
  },
  gridLineH2: {
    position: 'absolute',
    top: '66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#00E5FF',
  },
  gridLineV1: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#00E5FF',
  },
  laserContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    zIndex: 30,
    pointerEvents: 'none',
  },
  laserAuraTrail: {
    height: 48,
    width: '100%',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 229, 255, 0.4)',
    ...(Platform.OS === 'web'
      ? {
          background: 'linear-gradient(to top, rgba(0, 229, 255, 0.32), rgba(0, 229, 255, 0.0))',
        }
      : {}),
  },
  laserBeamBar: {
    height: 3,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00E5FF',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 8,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 0 14px #00E5FF, 0 0 28px rgba(0, 229, 255, 0.85)',
        }
      : {}),
  },
  laserBeamCore: {
    flex: 1,
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  laserEndDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    zIndex: 35,
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
  cornerPulseRing: {
    ...StyleSheet.absoluteFill,
    borderWidth: 2,
    borderColor: '#00E5FF',
    borderRadius: radii.cards,
  },
  scanningHudContainer: {
    position: 'absolute',
    bottom: spacing.section,
    left: spacing.default,
    right: spacing.default,
    alignItems: 'center',
    zIndex: 40,
  },
  scanningHudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 19, 36, 0.90)',
    borderRadius: radii.prominentCards,
    paddingVertical: spacing.compact,
    paddingHorizontal: spacing.default,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.45)',
    maxWidth: 380,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), 0 0 16px rgba(0, 229, 255, 0.25)',
        }
      : {}),
  },
  hudIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.4)',
  },
  hudTextWrap: {
    flex: 1,
  },
  hudTitle: {
    ...typography.caption,
    color: '#00E5FF',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  hudSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    marginTop: 2,
  },
  hudProgressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  hudProgressBar: {
    height: '100%',
    backgroundColor: '#00E5FF',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 0 8px #00E5FF',
        }
      : {}),
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
