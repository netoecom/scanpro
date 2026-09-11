import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget } from '../../theme';
import { AppButton } from '../../components/ui';
import { CaptureButton, ScannerOverlay } from '../../components/scanner';
import { useScannerEngine } from '../../features/scanner';
import { useDocumentStore } from '../../store';

export default function ScannerScreen() {
  const router = useRouter();
  const { loadDocuments } = useDocumentStore();

  const {
    cameraRef,
    status,
    hasPermission,
    requestPermission,
    flash,
    autoCapture,
    capturedUri,
    confidence,
    captureDocument,
    pickFromGallery,
    toggleFlash,
    toggleAutoCapture,
    resetScanner,
  } = useScannerEngine();

  // Tela de Permissão de Câmera
  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <View style={styles.permissionCard}>
          <View style={styles.permissionIconCircle}>
            <Ionicons name="camera-outline" size={44} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Acesso à Câmera Necessário</Text>
          <Text style={styles.permissionDescription}>
            Para digitalizar folhas, contratos e recibos com detecção automática e qualidade profissional, precisamos de autorização da câmera.
          </Text>
          <AppButton
            title="Permitir Acesso à Câmera"
            onPress={requestPermission}
            variant="primary"
            style={styles.permissionButton}
          />
          <AppButton
            title="Voltar"
            onPress={() => router.back()}
            variant="tertiary"
            style={{ marginTop: spacing.small }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleFinishScan = async () => {
    // Ao concluir, recarrega a biblioteca e retorna para a tela inicial
    await loadDocuments();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Visualizador da Câmera em Tela Inteira */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flash === 'on'}
      >
        {/* Camada de Overlay e Detecção Visual */}
        <ScannerOverlay
          status={status}
          confidence={confidence}
          autoCapture={autoCapture}
        />

        <SafeAreaView style={styles.controlsSafeArea} pointerEvents="box-none">
          {/* Barra Superior de Controles */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.topRightControls}>
              {/* Botão Auto / Manual */}
              <TouchableOpacity
                style={[styles.pillButton, autoCapture && styles.pillButtonActive]}
                onPress={toggleAutoCapture}
              >
                <Text style={styles.pillButtonText}>
                  {autoCapture ? 'AUTO' : 'MANUAL'}
                </Text>
              </TouchableOpacity>

              {/* Botão Flash */}
              <TouchableOpacity
                style={styles.circleButton}
                onPress={toggleFlash}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={flash === 'on' ? 'flash' : 'flash-off'}
                  size={22}
                  color={flash === 'on' ? colors.warning : '#FFFFFF'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Barra Inferior de Disparo */}
          <View style={styles.bottomControls}>
            {/* Atalho para importar da galeria */}
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={pickFromGallery}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="images-outline" size={28} color="#FFFFFF" />
              <Text style={styles.secondaryActionText}>Galeria</Text>
            </TouchableOpacity>

            {/* Botão Central de Disparo Dominante */}
            <View style={styles.captureButtonContainer}>
              <CaptureButton
                onPress={captureDocument}
                disabled={status === 'CAPTURING' || status === 'PROCESSING'}
                loading={status === 'CAPTURING' || status === 'PROCESSING'}
                autoCaptureActive={autoCapture}
              />
            </View>

            {/* Indicador de Páginas */}
            <View style={styles.pagesIndicatorContainer}>
              <Text style={styles.pagesIndicatorNumber}>1</Text>
              <Text style={styles.pagesIndicatorLabel}>Página</Text>
            </View>
          </View>
        </SafeAreaView>
      </CameraView>

      {/* Modal / Feedback de Magic Moment pós-captura */}
      <Modal
        visible={status === 'CAPTURE_SUCCESS'}
        animationType="slide"
        transparent={true}
        onRequestClose={resetScanner}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
              <Text style={styles.modalTitle}>Página Digitalizada!</Text>
            </View>

            <View style={styles.previewImageContainer}>
              {capturedUri && capturedUri.startsWith('http') ? (
                <Image source={{ uri: capturedUri }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderPreview}>
                  <Ionicons name="document-text" size={64} color={colors.primary} />
                  <Text style={styles.previewDocName}>Recorte automático e perspectiva aplicados</Text>
                </View>
              )}
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Adicionar Outra Página"
                variant="secondary"
                onPress={resetScanner}
                style={styles.modalButton}
                icon={<Ionicons name="add" size={20} color={colors.primary} />}
              />

              <AppButton
                title="Concluir e Gerar PDF"
                variant="primary"
                onPress={handleFinishScan}
                style={styles.modalButton}
                icon={<Ionicons name="document-outline" size={20} color="#FFFFFF" />}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  controlsSafeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.default,
    paddingTop: spacing.small,
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    paddingHorizontal: spacing.compact,
    height: 34,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  pillButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  pillButtonText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bottomControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: spacing.large,
    paddingBottom: spacing.section,
  },
  secondaryActionButton: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    ...typography.caption,
    color: '#FFFFFF',
    marginTop: 2,
  },
  captureButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagesIndicatorContainer: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagesIndicatorNumber: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  pagesIndicatorLabel: {
    ...typography.caption,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.large,
  },
  permissionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.prominentCards,
    padding: spacing.section,
    alignItems: 'center',
    maxWidth: 360,
  },
  permissionIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.default,
  },
  permissionTitle: {
    ...typography.title2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.small,
  },
  permissionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.large,
  },
  permissionButton: {
    width: '100%',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.sheets,
    borderTopRightRadius: radii.sheets,
    padding: spacing.default,
    paddingBottom: spacing.hero,
    alignItems: 'center',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.default,
    gap: spacing.small,
  },
  modalTitle: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  previewImageContainer: {
    width: 200,
    height: 260,
    backgroundColor: colors.background,
    borderRadius: radii.cards,
    overflow: 'hidden',
    marginBottom: spacing.section,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.default,
  },
  previewDocName: {
    ...typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.small,
  },
  modalActions: {
    width: '100%',
    gap: spacing.compact,
  },
  modalButton: {
    width: '100%',
  },
});
