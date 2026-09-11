import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget } from '../../theme';
import { AppButton, PageStrip } from '../../components/ui';
import { CaptureButton, ScannerOverlay, WebCameraView } from '../../components/scanner';
import { useScannerEngine } from '../../features/scanner';
import { useDocumentStore } from '../../store';
import { ScanFilterMode } from '../../types';

export default function ScannerScreen() {
  const router = useRouter();
  const { addDocument } = useDocumentStore();

  const {
    cameraRef,
    webCameraRef,
    status,
    hasPermission,
    requestPermission,
    flash,
    facing,
    isCameraReady,
    cameraError,
    autoCapture,
    filterMode,
    processedResult,
    capturedPages,
    confidence,
    captureDocument,
    pickFromGallery,
    changeFilterMode,
    addCurrentPageToDocument,
    toggleFlash,
    toggleFacing,
    toggleAutoCapture,
    handleCameraReady,
    handleMountError,
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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            variant="tertiary"
            style={{ marginTop: spacing.small }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Concluir e salvar o documento no repositório local com suporte a título sugerido por OCR
  const handleFinishScan = async () => {
    const allPages = [...capturedPages];
    if (processedResult) {
      allPages.push(processedResult);
    }

    if (allPages.length > 0) {
      const now = new Date();
      const detectedTitle = allPages.find((p) => p.suggestedTitle)?.suggestedTitle;
      const title =
        detectedTitle ||
        `Scan ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;

      const newDoc = await addDocument(
        title,
        allPages.map((page) => ({
          originalPath: page.originalUri,
          processedPath: page.processedUri,
          thumbnailPath: page.thumbnailUri,
          width: page.width,
          height: page.height,
          ocrText: page.ocrText,
        }))
      );

      // Redireciona diretamente para os detalhes do documento recém-criado para revisão/PDF
      router.replace(`/document/${newDoc.id}` as any);
      return;
    }

    router.replace('/');
  };

  const totalPagesCount = capturedPages.length + (processedResult ? 1 : 0);

  return (
    <View style={styles.container}>
      {/* Visualizador da Câmera (HTML5 no Web/PWA, CameraView no Mobile Nativo) */}
      {Platform.OS === 'web' ? (
        <WebCameraView
          ref={webCameraRef}
          facing={facing}
          onCameraReady={handleCameraReady}
          onMountError={handleMountError}
        />
      ) : (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={flash === 'on'}
          onCameraReady={handleCameraReady}
          onMountError={handleMountError}
        />
      )}

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
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.topRightControls}>
            {/* Botão de Alternar Câmera (Frontal / Traseira) */}
            <TouchableOpacity
              style={styles.circleButton}
              onPress={toggleFacing}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>

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

        {/* Banner de Status ou Alerta de Câmera */}
        {cameraError && (
          <View style={styles.cameraErrorBanner}>
            <Ionicons name="information-circle-outline" size={16} color="#FFFFFF" />
            <Text style={styles.cameraErrorText}>{cameraError}</Text>
          </View>
        )}

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

          {/* Indicador de Páginas Acumuladas */}
          <View style={styles.pagesIndicatorContainer}>
            <Text style={styles.pagesIndicatorNumber}>{totalPagesCount}</Text>
            <Text style={styles.pagesIndicatorLabel}>
              {totalPagesCount === 1 ? 'Página' : 'Páginas'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Modal / Feedback de Magic Moment pós-captura com Seleção de Filtros */}
      <Modal
        visible={status === 'CAPTURE_SUCCESS' && processedResult !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={resetScanner}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {/* Header com indicador de sucesso */}
            <View style={styles.successBadge}>
              <Ionicons name="checkmark-circle" size={28} color={colors.success} />
              <Text style={styles.modalTitle}>
                Página {capturedPages.length + 1} Processada
              </Text>
            </View>

            {/* Pré-visualização da Imagem Tratada com Alta Fidelidade */}
            <View style={styles.previewImageContainer}>
              {processedResult?.processedUri ? (
                <Image
                  source={{ uri: processedResult.processedUri }}
                  style={styles.previewImage}
                />
              ) : (
                <View style={styles.placeholderPreview}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.previewDocName}>Otimizando qualidade...</Text>
                </View>
              )}
            </View>

            {/* Faixa de Páginas Acumuladas da Sessão (Multi-page) */}
            {capturedPages.length > 0 && (
              <View style={{ width: '100%', marginBottom: spacing.small }}>
                <Text style={styles.filterLabel}>
                  Páginas Deste Documento ({totalPagesCount}):
                </Text>
                <PageStrip
                  pages={[
                    ...capturedPages.map((p, idx) => ({
                      id: `prev-${idx}`,
                      uri: p.thumbnailUri || p.processedUri,
                    })),
                    ...(processedResult
                      ? [{ id: 'current', uri: processedResult.thumbnailUri || processedResult.processedUri }]
                      : []),
                  ]}
                  selectedIndex={capturedPages.length}
                  onSelectPage={() => {}}
                />
              </View>
            )}

            {/* Seletor de Modos de Realce (Fase 3) */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Modo de Realce:</Text>
              <View style={styles.filterPills}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterMode === 'auto' && styles.filterChipActive,
                  ]}
                  onPress={() => changeFilterMode('auto')}
                >
                  <Ionicons
                    name="sparkles"
                    size={14}
                    color={filterMode === 'auto' ? '#FFFFFF' : colors.primary}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      filterMode === 'auto' && styles.filterChipTextActive,
                    ]}
                  >
                    Automático
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterMode === 'black_and_white' && styles.filterChipActive,
                  ]}
                  onPress={() => changeFilterMode('black_and_white')}
                >
                  <Ionicons
                    name="contrast"
                    size={14}
                    color={filterMode === 'black_and_white' ? '#FFFFFF' : colors.textPrimary}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      filterMode === 'black_and_white' && styles.filterChipTextActive,
                    ]}
                  >
                    Preto e Branco
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    filterMode === 'original' && styles.filterChipActive,
                  ]}
                  onPress={() => changeFilterMode('original')}
                >
                  <Ionicons
                    name="image-outline"
                    size={14}
                    color={filterMode === 'original' ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.filterChipText,
                      filterMode === 'original' && styles.filterChipTextActive,
                    ]}
                  >
                    Original
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Ações de Conclusão ou Continuação */}
            <View style={styles.modalActions}>
              <AppButton
                title="Adicionar Mais Páginas"
                variant="secondary"
                onPress={addCurrentPageToDocument}
                style={styles.modalButton}
                icon={<Ionicons name="add" size={20} color={colors.primary} />}
              />

              <AppButton
                title="Concluir e Salvar Documento"
                variant="primary"
                onPress={handleFinishScan}
                style={styles.modalButton}
                icon={<Ionicons name="checkmark-done" size={20} color="#FFFFFF" />}
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
    height: '100%',
    width: '100%',
  },
  cameraErrorBanner: {
    marginHorizontal: spacing.default,
    marginTop: spacing.small,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: radii.standard,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.small,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cameraErrorText: {
    ...typography.caption,
    color: '#FFFFFF',
    flex: 1,
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
    paddingBottom: spacing.section,
    alignItems: 'center',
    maxHeight: '90%',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.compact,
    gap: spacing.small,
  },
  modalTitle: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  previewImageContainer: {
    width: 200,
    height: 250,
    backgroundColor: colors.background,
    borderRadius: radii.cards,
    overflow: 'hidden',
    marginBottom: spacing.compact,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
  filterSection: {
    width: '100%',
    marginBottom: spacing.default,
    alignItems: 'center',
  },
  filterLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.micro + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterPills: {
    flexDirection: 'row',
    gap: spacing.small,
    justifyContent: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.micro + 2,
    paddingHorizontal: spacing.compact,
    borderRadius: radii.capsule,
    backgroundColor: '#F0F0F2',
    minHeight: 34,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  modalActions: {
    width: '100%',
    gap: spacing.compact,
  },
  modalButton: {
    width: '100%',
  },
});
