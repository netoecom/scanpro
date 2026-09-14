import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  Alert,
  TextInput,
  PanResponder,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget, shadows } from '../../theme';
import { AppButton, PageStrip, PaywallModal } from '../../components/ui';
import { CaptureButton, ScannerOverlay, WebCameraView, CropEditorModal, CameraErrorBoundary } from '../../components/scanner';
import { useScannerEngine } from '../../features/scanner';
import { useDocumentStore, usePremiumStore } from '../../store';
import { TelemetryService } from '../../services/telemetry';
import { ScanFilterMode } from '../../types';

export default function ScannerScreen() {
  const router = useRouter();
  const { documentId } = useLocalSearchParams<{ documentId?: string }>();
  const { addDocument, addPagesToDocument, documents } = useDocumentStore();
  const targetDoc = documentId ? documents.find((d) => d.id === documentId) : null;
  const { isPro, isPaywallVisible, openPaywall, closePaywall } = usePremiumStore();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const previewImageHeight = Math.max(300, windowHeight - 210);

  const [isCropModalVisible, setIsCropModalVisible] = useState(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [panPosition, setPanPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Modal para personalização do nome do documento ao salvar
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');

  // Refs para controle de gesto de pinça (Pinch-to-Zoom)
  const lastTapRef = useRef<number>(0);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);

  useEffect(() => {
    TelemetryService.track('scanner_opened');
    TelemetryService.startScanTrace();
  }, []);

  const {
    cameraRef,
    webCameraRef,
    status,
    isPermissionLoading,
    hasPermission,
    requestPermission,
    flash,
    facing,
    isCameraReady,
    cameraError,
    autoCapture,
    filterMode,
    rawCapturedUri,
    processedResult,
    capturedPages,
    confidence,
    activeCorners,
    captureDocument,
    launchNativeCamera,
    pickFromGallery,
    changeFilterMode,
    applyCustomCrop,
    addCurrentPageToDocument,
    toggleFlash,
    toggleFacing,
    toggleAutoCapture,
    handleCameraReady,
    handleMountError,
    retakeCurrentPage,
    resetScanner,
    // Novos controles de modo
    cameraMode,
    enableEmbeddedCamera,
    switchToNativeCamera,
    hasAutoLaunchedRef,
  } = useScannerEngine();

  // Auto-launch da câmera nativa ao abrir a tela do scanner (apenas uma vez por sessão)
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (hasAutoLaunchedRef.current) return;
    if (status !== 'SCANNER_SEARCHING') return;
    if (processedResult !== null) return;
    if (capturedPages.length > 0) return;

    hasAutoLaunchedRef.current = true;

    // Pequeno delay para garantir que a tela está montada no Android
    const timer = setTimeout(() => {
      launchNativeCamera();
    }, 150);

    return () => clearTimeout(timer);
  }, [status, processedResult, capturedPages.length, launchNativeCamera, hasAutoLaunchedRef]);

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

    // No modo nativo, captureDocument redireciona automaticamente para launchNativeCamera
    await captureDocument();
  };

  // Controle de Gesto de Pinça (Pinch to Zoom) e Pan tátil
  const pinchPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches || [];
        const now = Date.now();
        if (touches.length <= 1) {
          if (now - lastTapRef.current < 320) {
            // Double tap para alternar zoom 1x <-> 2.5x
            setZoomScale((z) => {
              const next = z === 1 ? 2.5 : 1;
              if (next === 1) setPanPosition({ x: 0, y: 0 });
              return next;
            });
          }
          lastTapRef.current = now;
        } else if (touches.length >= 2) {
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          initialPinchDistRef.current = dist > 0 ? dist : null;
          initialPinchScaleRef.current = zoomScale;
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches || [];
        if (touches.length >= 2) {
          const dist = Math.hypot(
            touches[0].pageX - touches[1].pageX,
            touches[0].pageY - touches[1].pageY
          );
          if (!initialPinchDistRef.current || initialPinchDistRef.current === 0) {
            initialPinchDistRef.current = dist;
            initialPinchScaleRef.current = zoomScale;
            return;
          }
          const ratio = dist / initialPinchDistRef.current;
          const newScale = Math.max(
            1,
            Math.min(4, parseFloat((initialPinchScaleRef.current * ratio).toFixed(2)))
          );
          setZoomScale(newScale);
          if (newScale === 1) setPanPosition({ x: 0, y: 0 });
        } else if (touches.length <= 1 && zoomScale > 1) {
          setPanPosition((prev) => ({
            x: Math.max(-180, Math.min(180, prev.x + gestureState.dx * 0.45)),
            y: Math.max(-240, Math.min(240, prev.y + gestureState.dy * 0.45)),
          }));
        }
      },
      onPanResponderRelease: () => {
        initialPinchDistRef.current = null;
      },
      onPanResponderTerminate: () => {
        initialPinchDistRef.current = null;
      },
    })
  ).current;

  // Finalizar escaneamento e salvar (em projeto existente ou criando novo)
  const handleFinishScan = async () => {
    const allPages = [...capturedPages];
    if (processedResult) {
      allPages.push(processedResult);
    }

    if (allPages.length === 0) {
      router.replace(documentId ? (`/document/${documentId}` as any) : '/');
      return;
    }

    // Se estamos adicionando a um documento existente, anexa diretamente sem criar nova pasta!
    if (documentId) {
      await addPagesToDocument(
        documentId,
        allPages.map((page) => ({
          originalPath: page.originalUri,
          processedPath: page.processedUri,
          thumbnailPath: page.thumbnailUri,
          width: page.width,
          height: page.height,
          ocrText: page.ocrText,
        }))
      );
      router.replace(`/document/${documentId}` as any);
      return;
    }

    // Validação de Limite do Plano Gratuito para NOVOS documentos
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

    // Título padrão é sempre "Geral" conforme solicitado pelo usuário
    setDocumentTitle('Geral');
    setIsSaveModalVisible(true);
  };

  // Efetivação do salvamento após confirmação do título (para novo projeto)
  const executeSaveDocument = async () => {
    const allPages = [...capturedPages];
    if (processedResult) {
      allPages.push(processedResult);
    }

    if (allPages.length === 0) return;

    const finalTitle = documentTitle.trim() || 'Geral';

    setIsSaveModalVisible(false);

    const newDoc = await addDocument(
      finalTitle,
      allPages.map((page) => ({
        originalPath: page.originalUri,
        processedPath: page.processedUri,
        thumbnailPath: page.thumbnailUri,
        width: page.width,
        height: page.height,
        ocrText: page.ocrText,
      }))
    );

    // Redireciona diretamente para a pasta do documento com as páginas
    router.replace(`/document/${newDoc.id}` as any);
  };

  const totalPagesCount = capturedPages.length + (processedResult ? 1 : 0);

  // =====================================================================
  // TELA PRINCIPAL DO SCANNER (Camera-Native-First)
  // =====================================================================

  // Se estamos no modo NATIVO (padrão), mostramos uma tela de "ponto de partida"
  // com os botões de ação principais. A câmera nativa do sistema abre automaticamente.
  const renderNativeModeScreen = () => (
    <View style={styles.container}>
      <View style={styles.nativeModeBackground}>
        {/* Ícone/Visual central */}
        <View style={styles.nativeModeIconCircle}>
          <Ionicons name="scan-outline" size={56} color={colors.primary} />
        </View>

        <Text style={styles.nativeModeTitle}>ScanPro</Text>
        <Text style={styles.nativeModeSubtitle}>
          Digitalize documentos com qualidade profissional
        </Text>

        {/* Contador de páginas capturadas */}
        {totalPagesCount > 0 && (
          <View style={styles.nativeModePagesChip}>
            <Ionicons name="documents" size={16} color={colors.primary} />
            <Text style={styles.nativeModePagesText}>
              {totalPagesCount} {totalPagesCount === 1 ? 'página capturada' : 'páginas capturadas'}
            </Text>
          </View>
        )}

        {/* Banner de Destino: Adicionando a projeto existente */}
        {targetDoc && (
          <View style={styles.nativeModeTargetBanner}>
            <Ionicons name="folder-open" size={16} color="#00E5FF" />
            <Text style={styles.nativeModeTargetText} numberOfLines={1}>
              Adicionando ao projeto: <Text style={{ fontWeight: '700' }}>{targetDoc.title}</Text>
            </Text>
          </View>
        )}

        {/* Ações Principais */}
        <View style={styles.nativeModeActions}>
          {/* Botão Principal: Escanear com Câmera */}
          <TouchableOpacity
            style={styles.nativeModePrimaryButton}
            onPress={handleCapturePress}
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={24} color="#FFFFFF" />
            <Text style={styles.nativeModePrimaryText}>Escanear Documento</Text>
          </TouchableOpacity>

          {/* Botão Secundário: Importar da Galeria */}
          <TouchableOpacity
            style={styles.nativeModeSecondaryButton}
            onPress={pickFromGallery}
            activeOpacity={0.85}
          >
            <Ionicons name="images-outline" size={22} color={colors.primary} />
            <Text style={styles.nativeModeSecondaryText}>Importar da Galeria</Text>
          </TouchableOpacity>

          {/* Botão Terciário: Câmera Embutida (Avançado) */}
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.nativeModeTertiaryButton}
              onPress={enableEmbeddedCamera}
              activeOpacity={0.85}
            >
              <Ionicons name="videocam-outline" size={18} color="#94A3B8" />
              <Text style={styles.nativeModeTertiaryText}>Câmera Avançada (Embutida)</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Botão Concluir (se já tiver páginas) */}
        {totalPagesCount > 0 && (
          <TouchableOpacity
            style={styles.nativeModeFinishButton}
            onPress={handleFinishScan}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
            <Text style={styles.nativeModeFinishText}>
              Concluir ({totalPagesCount} {totalPagesCount === 1 ? 'Página' : 'Páginas'})
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Botão de Voltar */}
      <SafeAreaView style={styles.nativeModeBackSafe} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.nativeModeBackButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );

  // =====================================================================
  // TELA DA CÂMERA EMBUTIDA (modo avançado, sob demanda)
  // =====================================================================

  const renderEmbeddedModeScreen = () => (
    <View style={styles.container}>
      {/* Visualizador da Câmera Embutida com Error Boundary */}
      <CameraErrorBoundary
        onRetry={resetScanner}
        onLaunchNativeCamera={() => {
          switchToNativeCamera();
          launchNativeCamera();
        }}
        onPickFromGallery={pickFromGallery}
        onGoBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      >
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
            mode="picture"
            mute={true}
            ratio="4:3"
            autofocus="on"
            animateShutter={false}
            enableTorch={flash === 'on'}
            onCameraReady={handleCameraReady}
            onMountError={(err) => {
              console.warn('Erro de montagem da câmera embutida:', err);
              handleMountError(err);
            }}
          />
        )}
      </CameraErrorBoundary>

      {/* Camada de Overlay e Detecção Visual */}
      <ScannerOverlay
        status={status}
        confidence={confidence}
        autoCapture={autoCapture}
        capturedImageUri={rawCapturedUri}
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
            {/* Botão para voltar ao modo nativo (estável) */}
            <TouchableOpacity
              style={styles.circleButton}
              onPress={() => {
                switchToNativeCamera();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Voltar para Câmera Nativa"
            >
              <Ionicons name="phone-portrait-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>

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

        {/* Banner de erro da câmera embutida */}
        {cameraError && (
          <View style={styles.cameraErrorBanner}>
            <Ionicons name="warning-outline" size={20} color="#FBBF24" style={{ marginRight: 8 }} />
            <Text style={styles.cameraErrorBannerText} numberOfLines={2}>
              {cameraError}
            </Text>
            <TouchableOpacity
              style={styles.cameraErrorBannerBtn}
              onPress={() => {
                switchToNativeCamera();
                launchNativeCamera();
              }}
            >
              <Text style={styles.cameraErrorBannerBtnText}>Câmera Nativa</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Banner de Destino: Adicionando a projeto existente */}
        {targetDoc && (
          <View style={styles.targetProjectBanner}>
            <Ionicons name="folder-open" size={16} color="#00E5FF" />
            <Text style={styles.targetProjectText} numberOfLines={1}>
              Adicionando ao projeto: <Text style={{ fontWeight: '700' }}>{targetDoc.title}</Text>
            </Text>
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
    </View>
  );

  // =====================================================================
  // RENDER PRINCIPAL — Escolhe entre modo nativo e embutido
  // =====================================================================

  // Se estiver no estado de "captura bem sucedida" com preview, mostramos o modal de preview
  // independente do modo de câmera
  const isInPreviewMode = status === 'CAPTURE_SUCCESS' && processedResult !== null;

  return (
    <View style={{ flex: 1 }}>
      {/* Tela base: modo nativo (padrão) ou embutido (avançado) */}
      {cameraMode === 'embedded' ? renderEmbeddedModeScreen() : renderNativeModeScreen()}

      {/* Modal / Tela Cheia de Prévia pós-captura com visualização expandida e seleção de filtros */}
      <Modal
        visible={isInPreviewMode}
        animationType="fade"
        transparent={false}
        onRequestClose={retakeCurrentPage}
      >
        <SafeAreaView style={styles.fullPreviewContainer}>
          {/* Header Superior da Prévia em Tela Cheia */}
          <View style={styles.fullPreviewHeader}>
            <TouchableOpacity
              style={styles.fullPreviewBackButton}
              onPress={() => {
                setZoomScale(1);
                retakeCurrentPage();
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.fullPreviewTitleWrap}>
              <Text style={styles.fullPreviewTitle}>
                Página {capturedPages.length + 1} de {totalPagesCount}
              </Text>
              <Text style={styles.fullPreviewSubtitle}>
                {targetDoc ? `Adicionando a: ${targetDoc.title}` : 'Revisão em Alta Definição'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.small }}>
              {/* Botão de Ajustar Recorte e Bordas */}
              <TouchableOpacity
                style={styles.fullPreviewCropButton}
                onPress={() => setIsCropModalVisible(true)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="crop" size={16} color="#FFFFFF" />
                <Text style={styles.fullPreviewCropText}>Recortar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullPreviewDoneSmallButton}
                onPress={() => {
                  setZoomScale(1);
                  handleFinishScan();
                }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.fullPreviewDoneText}>
                  {targetDoc ? 'Adicionar' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Área Central Expandida da Imagem com Zoom e Pan */}
          <View style={[styles.fullPreviewImageWrapper, { height: previewImageHeight }]}>
            {/* Controles Flutuantes de Zoom */}
            <View style={styles.zoomControlBar}>
              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setZoomScale((z) => Math.max(1, parseFloat((z - 0.5).toFixed(1))))}
                disabled={zoomScale <= 1}
              >
                <Ionicons name="remove" size={16} color={zoomScale <= 1 ? '#64748B' : '#FFFFFF'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomLevelBadge}
                onPress={() => setZoomScale((z) => (z === 1 ? 2 : 1))}
              >
                <Text style={styles.zoomLevelText}>{Math.round(zoomScale * 100)}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomBtn}
                onPress={() => setZoomScale((z) => Math.min(3, parseFloat((z + 0.5).toFixed(1))))}
                disabled={zoomScale >= 3}
              >
                <Ionicons name="add" size={16} color={zoomScale >= 3 ? '#64748B' : '#FFFFFF'} />
              </TouchableOpacity>

              {zoomScale > 1 && (
                <TouchableOpacity
                  style={styles.zoomResetBtn}
                  onPress={() => setZoomScale(1)}
                >
                  <Text style={styles.zoomResetText}>1x</Text>
                </TouchableOpacity>
              )}
            </View>

            {processedResult?.processedUri ? (
              <View
                {...pinchPanResponder.panHandlers}
                {...({
                  onWheel: (e: any) => {
                    if (e.ctrlKey) {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.15 : 0.15;
                      setZoomScale((z) => {
                        const next = Math.max(1, Math.min(4, parseFloat((z + delta).toFixed(2))));
                        if (next === 1) setPanPosition({ x: 0, y: 0 });
                        return next;
                      });
                    }
                  },
                } as any)}
                style={{
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  touchAction: 'none',
                  cursor: zoomScale > 1 ? 'grab' : 'default',
                } as any}
              >
                <Image
                  source={{ uri: processedResult.processedUri }}
                  style={[
                    styles.fullPreviewImage,
                    {
                      transform: [
                        { scale: zoomScale },
                        { translateX: panPosition.x },
                        { translateY: panPosition.y },
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
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

            {/* 5 Presets de Filtros com Rolagem Horizontal Suave */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
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
                  Mágico (Auto)
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
                  P&B Nítido
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChipDark,
                  filterMode === 'grayscale' && styles.filterChipDarkActive,
                ]}
                onPress={() => changeFilterMode('grayscale')}
              >
                <Ionicons
                  name="color-filter-outline"
                  size={14}
                  color={filterMode === 'grayscale' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.filterChipDarkText,
                    filterMode === 'grayscale' && styles.filterChipDarkTextActive,
                  ]}
                >
                  Escala de Cinza
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChipDark,
                  filterMode === 'color_boost' && styles.filterChipDarkActive,
                ]}
                onPress={() => changeFilterMode('color_boost')}
              >
                <Ionicons
                  name="color-palette-outline"
                  size={14}
                  color={filterMode === 'color_boost' ? '#FFFFFF' : '#94A3B8'}
                />
                <Text
                  style={[
                    styles.filterChipDarkText,
                    filterMode === 'color_boost' && styles.filterChipDarkTextActive,
                  ]}
                >
                  Cores Vivas
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
            </ScrollView>

            {/* Ações Inferiores: Refazer, + Página, Concluir */}
            <View style={styles.fullPreviewActionsRow}>
              <TouchableOpacity
                style={styles.fullPreviewActionButton}
                onPress={() => {
                  setZoomScale(1);
                  retakeCurrentPage();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                <Text style={styles.fullPreviewActionText}>Refazer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.fullPreviewActionButton}
                onPress={() => {
                  setZoomScale(1);
                  addCurrentPageToDocument();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.fullPreviewActionText}>+ Página</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fullPreviewActionButton, styles.fullPreviewSaveButton]}
                onPress={() => {
                  setZoomScale(1);
                  handleFinishScan();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                <Text style={styles.fullPreviewSaveButtonText}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Modal Interativo de Recorte e Ajuste Fino dos Cantos */}
      <CropEditorModal
        visible={isCropModalVisible}
        imageUri={rawCapturedUri}
        initialCorners={processedResult?.detectedCorners || activeCorners}
        onApplyCrop={async (newCorners) => {
          setIsCropModalVisible(false);
          await applyCustomCrop(newCorners);
        }}
        onCancel={() => setIsCropModalVisible(false)}
      />

      {/* Modal de Assinatura Pro */}
      <PaywallModal
        visible={isPaywallVisible}
        onClose={closePaywall}
      />

      {/* Modal para Nome Personalizado ao Salvar Documento / Projeto */}
      <Modal
        visible={isSaveModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSaveModalVisible(false)}
      >
        <View style={styles.saveModalOverlay}>
          <View style={[styles.saveModalCard, shadows.card]}>
            <View style={styles.saveModalHeader}>
              <View style={styles.saveModalIconWrap}>
                <Ionicons name="folder-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.saveModalTitle}>Salvar Documento</Text>
                <Text style={styles.saveModalSubtitle}>Personalize o nome do projeto ou escolha uma categoria</Text>
              </View>
            </View>

            {/* Input de Texto do Nome do Documento */}
            <View style={styles.saveInputWrapper}>
              <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.saveInput}
                value={documentTitle}
                onChangeText={setDocumentTitle}
                placeholder="Ex: Nota Fiscal 123, Contrato..."
                placeholderTextColor={colors.textSecondary}
                autoFocus
                selectTextOnFocus
              />
              {documentTitle.length > 0 && (
                <TouchableOpacity onPress={() => setDocumentTitle('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Chips Rápidos de Categorias */}
            <View style={styles.categoryChipsRow}>
              {['Nota Fiscal', 'Contrato', 'Recibo', 'Identidade', 'Comprovante', 'Geral'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    documentTitle.toLowerCase().includes(cat.toLowerCase()) && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    const today = new Date().toLocaleDateString('pt-BR');
                    setDocumentTitle(`${cat} - ${today}`);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      documentTitle.toLowerCase().includes(cat.toLowerCase()) && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Botões de Ação */}
            <View style={styles.saveModalActions}>
              <AppButton
                title="Cancelar"
                variant="tertiary"
                onPress={() => setIsSaveModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Salvar Projeto"
                variant="primary"
                onPress={executeSaveDocument}
                style={{ flex: 1.4 }}
                icon={<Ionicons name="checkmark" size={18} color="#FFFFFF" />}
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

  // ========================
  // Estilos do Modo Nativo (Tela de Ponto de Partida)
  // ========================
  nativeModeBackground: {
    flex: 1,
    backgroundColor: '#0B1324',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.large,
  },
  nativeModeIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(0, 122, 255, 0.30)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.large,
  },
  nativeModeTitle: {
    ...typography.title1,
    color: '#FFFFFF',
    fontWeight: '800',
    marginBottom: spacing.compact,
    textAlign: 'center',
  },
  nativeModeSubtitle: {
    ...typography.body,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.large,
    maxWidth: 300,
  },
  nativeModePagesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.compact,
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
    borderRadius: radii.capsule,
    paddingHorizontal: spacing.default,
    paddingVertical: 8,
    marginBottom: spacing.default,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.25)',
  },
  nativeModePagesText: {
    ...typography.subheadline,
    color: colors.primary,
    fontWeight: '600',
  },
  nativeModeTargetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    backgroundColor: 'rgba(11, 19, 36, 0.90)',
    borderRadius: radii.capsule,
    paddingHorizontal: spacing.default,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.45)',
    marginBottom: spacing.large,
  },
  nativeModeTargetText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 12,
  },
  nativeModeActions: {
    width: '100%',
    maxWidth: 340,
    gap: spacing.small,
  },
  nativeModePrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.compact,
    backgroundColor: colors.primary,
    height: 56,
    borderRadius: radii.standard,
    ...shadows.card,
  },
  nativeModePrimaryText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 17,
  },
  nativeModeSecondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.compact,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    height: 52,
    borderRadius: radii.standard,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  nativeModeSecondaryText: {
    ...typography.headline,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 16,
  },
  nativeModeTertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.compact,
    height: 44,
    borderRadius: radii.standard,
    marginTop: spacing.compact,
  },
  nativeModeTertiaryText: {
    ...typography.caption,
    color: '#64748B',
    fontWeight: '500',
    fontSize: 13,
  },
  nativeModeFinishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.compact,
    backgroundColor: colors.success,
    height: 52,
    borderRadius: radii.standard,
    marginTop: spacing.large,
    width: '100%',
    maxWidth: 340,
    ...shadows.card,
  },
  nativeModeFinishText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  nativeModeBackSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  nativeModeBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.default,
    marginTop: spacing.small,
  },

  // ========================
  // Estilos da Câmera Embutida (herdados da versão anterior)
  // ========================
  targetProjectBanner: {
    marginHorizontal: spacing.default,
    marginTop: spacing.small,
    backgroundColor: 'rgba(11, 19, 36, 0.90)',
    borderRadius: radii.capsule,
    paddingHorizontal: spacing.default,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.45)',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 10px rgba(0, 229, 255, 0.25)',
        }
      : {}),
  },
  targetProjectText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
  },
  cameraErrorBanner: {
    marginHorizontal: spacing.default,
    marginTop: spacing.small,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: radii.standard,
    padding: spacing.compact,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    zIndex: 20,
  },
  cameraErrorBannerText: {
    ...typography.caption,
    color: '#F8FAFC',
    flex: 1,
    fontSize: 13,
  },
  cameraErrorBannerBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    marginLeft: 8,
  },
  cameraErrorBannerBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
  fullPreviewCropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.compact,
    paddingVertical: 7,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullPreviewCropText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  zoomControlBar: {
    position: 'absolute',
    top: spacing.compact,
    right: spacing.compact,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    zIndex: 25,
  },
  zoomBtn: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  zoomLevelBadge: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  zoomLevelText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11,
  },
  zoomResetBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.capsule,
    backgroundColor: colors.primary,
  },
  zoomResetText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 10,
  },
  fullPreviewImageWrapper: {
    flex: 1,
    width: '100%',
    padding: spacing.compact,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
  filterPillsScroll: {
    flexDirection: 'row',
    gap: spacing.small,
    paddingHorizontal: spacing.small,
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
  saveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.default,
  },
  saveModalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#0F172A',
    borderRadius: radii.cards,
    padding: spacing.large,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    marginBottom: spacing.default,
  },
  saveModalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.standard,
    backgroundColor: 'rgba(0, 102, 204, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveModalTitle: {
    ...typography.headline,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  saveModalSubtitle: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
  saveInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: radii.standard,
    paddingHorizontal: spacing.default,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: spacing.default,
  },
  saveInput: {
    flex: 1,
    ...typography.body,
    color: '#FFFFFF',
    paddingVertical: 6,
  },
  categoryChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.compact,
    marginBottom: spacing.large,
  },
  categoryChip: {
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: '#94A3B8',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  saveModalActions: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  cameraPlaceholder: {
    backgroundColor: '#020617',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  cameraPlaceholderText: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: spacing.default,
    fontWeight: '600',
  },
});
