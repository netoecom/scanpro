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
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget } from '../../theme';
import { AppButton, PageStrip, PaywallModal } from '../../components/ui';
import { CaptureButton, ScannerOverlay, WebCameraView } from '../../components/scanner';
import { useScannerEngine } from '../../features/scanner';
import { useDocumentStore, usePremiumStore } from '../../store';
import { TelemetryService } from '../../services/telemetry';
import { ScanFilterMode } from '../../types';

export default function ScannerScreen() {
  const router = useRouter();
  const { addDocument, documents } = useDocumentStore();
  const { isPro, isPaywallVisible, openPaywall, closePaywall } = usePremiumStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const previewImageHeight = Math.max(300, windowHeight - 210);

  React.useEffect(() => {
    TelemetryService.track('scanner_opened');
    TelemetryService.startScanTrace();
  }, []);

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
    retakeCurrentPage,
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

  // Valida o limite do plano gratuito antes de disparar a captura
  const handleCapturePress = async () => {
    if (!isPro && documents.length >= 5) {
      Alert.alert(
        'Limite do Plano Gratuito',
        'Você atingiu o limite de 5 documentos salvos do plano gratuito. Faça upgrade para o ScanPro Pro para digitalizar sem limites!',
        [
          { text: 'Agora Não', style: 'cancel' },
          {
            text: 'Conhecer o Pro 💎',
            onPress: openPaywall,
          },
        ]
      );
      return;
    }
    await captureDocument();
  };

  // Concluir e salvar o documento no repositório local com suporte a título sugerido por OCR
  const handleFinishScan = async () => {
    // Validação de Limite do Plano Gratuito (Fase 9)
    if (!isPro && documents.length >= 5) {
      Alert.alert(
        'Limite do Plano Gratuito',
        'Você atingiu o limite de 5 documentos salvos do plano gratuito. Faça upgrade para o ScanPro Pro para salvar novos documentos sem restrições!',
        [
          { text: 'Mais Tarde', style: 'cancel' },
          {
            text: 'Conhecer o Pro 💎',
            onPress: openPaywall,
          },
        ]
      );
      return;
    }

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
        {!isCameraReady && cameraError && (
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
              onPress={handleCapturePress}
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

      {/* Modal / Tela Cheia de Prévia pós-captura com visualização expandida e seleção de filtros */}
      <Modal
        visible={status === 'CAPTURE_SUCCESS' && processedResult !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={retakeCurrentPage}
      >
        <SafeAreaView style={styles.fullPreviewContainer}>
          {/* Header Superior da Prévia em Tela Cheia */}
          <View style={styles.fullPreviewHeader}>
            <TouchableOpacity
              style={styles.fullPreviewBackButton}
              onPress={retakeCurrentPage}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.fullPreviewTitleWrap}>
              <Text style={styles.fullPreviewTitle}>
                Página {capturedPages.length + 1} de {totalPagesCount}
              </Text>
              <Text style={styles.fullPreviewSubtitle}>Revisão em Alta Definição</Text>
            </View>

            <TouchableOpacity
              style={styles.fullPreviewDoneSmallButton}
              onPress={handleFinishScan}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Text style={styles.fullPreviewDoneText}>Salvar</Text>
            </TouchableOpacity>
          </View>

          {/* Área Central Expandida da Imagem (Preenche a tela inteira com altura dinâmica) */}
          <View style={[styles.fullPreviewImageWrapper, { height: previewImageHeight }]}>
            {processedResult?.processedUri ? (
              <Image
                source={{ uri: processedResult.processedUri }}
                style={styles.fullPreviewImage}
              />
            ) : (
              <View style={styles.placeholderPreview}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.previewDocName}>Otimizando nitidez do documento...</Text>
              </View>
            )}
          </View>

          {/* Faixa Inferior de Controles e Filtros */}
          <View style={styles.fullPreviewBottomBar}>
            {/* Faixa de Miniaturas (se houver múltiplas páginas) */}
            {capturedPages.length > 0 && (
              <View style={{ width: '100%', marginBottom: spacing.compact }}>
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

            {/* Seletor de Filtros com Estilo Escuro */}
            <View style={styles.filterPills}>
              <TouchableOpacity
                style={[
                  styles.filterChipDark,
                  filterMode === 'auto' && styles.filterChipDarkActive,
                ]}
                onPress={() => changeFilterMode('auto')}
              >
                <Ionicons
                  name="sparkles"
                  size={14}
                  color={filterMode === 'auto' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.filterChipDarkText,
                    filterMode === 'auto' && styles.filterChipDarkTextActive,
                  ]}
                >
                  Automático
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChipDark,
                  filterMode === 'black_and_white' && styles.filterChipDarkActive,
                ]}
                onPress={() => changeFilterMode('black_and_white')}
              >
                <Ionicons
                  name="contrast"
                  size={14}
                  color={filterMode === 'black_and_white' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.filterChipDarkText,
                    filterMode === 'black_and_white' && styles.filterChipDarkTextActive,
                  ]}
                >
                  Preto e Branco
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChipDark,
                  filterMode === 'original' && styles.filterChipDarkActive,
                ]}
                onPress={() => changeFilterMode('original')}
              >
                <Ionicons
                  name="image-outline"
                  size={14}
                  color={filterMode === 'original' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.filterChipDarkText,
                    filterMode === 'original' && styles.filterChipDarkTextActive,
                  ]}
                >
                  Original
                </Text>
              </TouchableOpacity>
            </View>

            {/* Ações Inferiores: Refazer, + Página, Concluir */}
            <View style={styles.fullPreviewActionsRow}>
              <TouchableOpacity
                style={styles.fullPreviewActionButton}
                onPress={retakeCurrentPage}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fullPreviewActionText}>Refazer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullPreviewActionButton}
                onPress={addCurrentPageToDocument}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.fullPreviewActionText}>+ Página</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fullPreviewActionButton, styles.fullPreviewSaveButton]}
                onPress={handleFinishScan}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.fullPreviewSaveButtonText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal de Assinatura Pro (Fase 9) */}
      <PaywallModal
        visible={isPaywallVisible}
        onClose={closePaywall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    height: '100%',
    width: '100%',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          overflow: 'hidden' as any,
        }
      : {}),
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
  fullPreviewContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    justifyContent: 'space-between',
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web'
      ? {
          position: 'fixed' as any,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          height: '100%',
          overflow: 'hidden' as any,
        }
      : {}),
  },
  fullPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  fullPreviewBackButton: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: touchTarget.minSize / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  fullPreviewTitleWrap: {
    alignItems: 'center',
  },
  fullPreviewTitle: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fullPreviewSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
  },
  fullPreviewDoneSmallButton: {
    paddingHorizontal: spacing.default,
    paddingVertical: 8,
    borderRadius: radii.capsule,
    backgroundColor: colors.primary,
  },
  fullPreviewDoneText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  fullPreviewImageWrapper: {
    flex: 1,
    width: '100%',
    padding: spacing.compact,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPreviewImage: {
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
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginTop: spacing.small,
  },
  fullPreviewBottomBar: {
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.default,
    paddingTop: spacing.compact,
    paddingBottom: spacing.large,
  },
  filterPills: {
    flexDirection: 'row',
    gap: spacing.small,
    justifyContent: 'center',
    marginBottom: spacing.default,
  },
  filterChipDark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.default,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterChipDarkActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipDarkText: {
    ...typography.caption,
    fontWeight: '600',
    color: '#94A3B8',
  },
  filterChipDarkTextActive: {
    color: '#FFFFFF',
  },
  fullPreviewActionsRow: {
    flexDirection: 'row',
    gap: spacing.small,
    alignItems: 'center',
  },
  fullPreviewActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: radii.standard,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    minHeight: touchTarget.minSize,
  },
  fullPreviewActionText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  fullPreviewSaveButton: {
    flex: 1.3,
    backgroundColor: colors.primary,
  },
  fullPreviewSaveButtonText: {
    ...typography.subheadline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
