import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  PanResponder,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget, shadows } from '../../theme';
import { AppButton, PageThumbnail, ConfirmModal, PaywallModal } from '../../components/ui';
import { useDocumentStore, usePremiumStore } from '../../store';
import { DocumentPage } from '../../types';
import { PdfService } from '../../services/pdf/pdfService';
import { DropboxService } from '../../services/dropbox';

export default function DocumentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    documents,
    currentPages,
    loadDocuments,
    loadDocumentPages,
    reorderDocumentPages,
    deleteDocumentPage,
    deleteDocument,
    renameDocument,
    updateDocumentPdf,
  } = useDocumentStore();

  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [previewPan, setPreviewPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Confirmação para exclusão de projeto, página individual ou lote selecionado
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: 'document' | 'page' | 'batch';
    pageId?: string;
    pageIndex?: number;
    title?: string;
  } | null>(null);

  // Refs para controle de Gesto de Pinça (Pinch to Zoom)
  const lastTapRef = useRef<number>(0);
  const initialPinchDistRef = useRef<number | null>(null);
  const initialPinchScaleRef = useRef<number>(1);

  // Controle aprimorado de Gesto de Pinça (Pinch to Zoom), Duplo Toque e Pan no Preview
  const previewPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const touches = evt.nativeEvent.touches || [];
        const now = Date.now();
        if (touches.length <= 1) {
          if (now - lastTapRef.current < 320) {
            setPreviewZoom((z) => {
              const next = z === 1 ? 2.5 : 1;
              if (next === 1) setPreviewPan({ x: 0, y: 0 });
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
          initialPinchScaleRef.current = previewZoom;
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
            initialPinchScaleRef.current = previewZoom;
            return;
          }
          const ratio = dist / initialPinchDistRef.current;
          const newScale = Math.max(
            1,
            Math.min(4, parseFloat((initialPinchScaleRef.current * ratio).toFixed(2)))
          );
          setPreviewZoom(newScale);
          if (newScale === 1) setPreviewPan({ x: 0, y: 0 });
        } else if (touches.length <= 1 && previewZoom > 1) {
          setPreviewPan((prev) => ({
            x: Math.max(-200, Math.min(200, prev.x + gestureState.dx * 0.45)),
            y: Math.max(-280, Math.min(280, prev.y + gestureState.dy * 0.45)),
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

  const { isPro, isPaywallVisible, openPaywall, closePaywall } = usePremiumStore();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharingImages, setIsSharingImages] = useState(false);
  const [isSavingToDropbox, setIsSavingToDropbox] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  // Estados para escolha de pasta e nome ao exportar para o Dropbox
  const [dropboxState, setDropboxState] = useState(DropboxService.getState());
  const [isDropboxUploadModalVisible, setIsDropboxUploadModalVisible] = useState(false);
  const [dropboxUploadFileName, setDropboxUploadFileName] = useState('');
  const [dropboxUploadFolder, setDropboxUploadFolder] = useState('');

  useEffect(() => {
    return DropboxService.subscribe(setDropboxState);
  }, []);

  // Seleção de páginas específicas para compartilhar
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());

  const document = documents.find((doc) => doc.id === id);

  useEffect(() => {
    if (id) {
      loadDocumentPages(id);
    }
    if (documents.length === 0) {
      loadDocuments();
    }
  }, [id, loadDocumentPages, loadDocuments, documents.length]);

  // Sincroniza páginas selecionadas inicialmente com todas do documento
  useEffect(() => {
    if (currentPages.length > 0) {
      setSelectedPageIds((prev) => {
        if (prev.size === 0) {
          return new Set(currentPages.map((p) => p.id));
        }
        const next = new Set<string>();
        currentPages.forEach((p) => {
          if (prev.has(p.id)) next.add(p.id);
        });
        return next.size > 0 ? next : new Set(currentPages.map((p) => p.id));
      });
    }
  }, [currentPages]);

  if (!document) {
    return (
      <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Documento não encontrado</Text>
          <AppButton
            title="Voltar ao Início"
            onPress={() => router.replace('/')}
            variant="secondary"
            style={{ marginTop: spacing.default }}
          />
        </View>
      </View>
    );
  }

  // Alternar seleção de página individual
  const togglePageSelection = (pageId: string) => {
    setSelectedPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  };

  const selectAllPages = () => {
    setSelectedPageIds(new Set(currentPages.map((p) => p.id)));
  };

  const deselectAllPages = () => {
    setSelectedPageIds(new Set());
  };

  const handleMove = async (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= currentPages.length || !id) return;

    const newPages = [...currentPages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);

    await reorderDocumentPages(
      id,
      newPages.map((p) => p.id)
    );
  };

  const handleDeletePage = (page: DocumentPage, index: number) => {
    setDeleteConfirmTarget({
      type: 'page',
      pageId: page.id,
      pageIndex: index + 1,
    });
  };

  const handleDeleteDocument = () => {
    if (!document) return;
    setDeleteConfirmTarget({
      type: 'document',
      title: document.title,
    });
  };

  const handleDeleteSelectedBatch = () => {
    if (selectedPageIds.size === 0 || !id) return;
    setDeleteConfirmTarget({
      type: 'batch',
      title: `${selectedPageIds.size} ${selectedPageIds.size === 1 ? 'página selecionada' : 'páginas selecionadas'}`,
    });
  };

  const handleShareClick = () => {
    if (currentPages.length === 0) {
      Alert.alert('Aviso', 'O documento não possui páginas para compartilhar.');
      return;
    }
    if (selectedPageIds.size === 0) {
      Alert.alert('Nenhuma Página Selecionada', 'Por favor, selecione ao menos 1 página para compartilhar.');
      return;
    }
    setIsShareModalVisible(true);
  };

  const handleSharePdf = async () => {
    setIsShareModalVisible(false);
    const pagesToExport = currentPages
      .filter((p) => selectedPageIds.has(p.id))
      .map((p) => ({
        uri: p.processedPath || p.originalPath,
        width: p.width,
        height: p.height,
      }));

    if (pagesToExport.length === 0) return;

    try {
      setIsGeneratingPdf(true);
      const result = await PdfService.generatePdf({
        title: document.title,
        pages: pagesToExport,
      });

      if (id) {
        await updateDocumentPdf(id, result.uri);
      }

      await PdfService.sharePdf(result.uri, document.title);
    } catch (err) {
      console.error('Erro no compartilhamento de PDF:', err);
      Alert.alert('Erro', 'Não foi possível gerar o arquivo PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareImages = async () => {
    setIsShareModalVisible(false);
    const pagesToExport = currentPages
      .filter((p) => selectedPageIds.has(p.id))
      .map((p, idx) => ({
        uri: p.processedPath || p.originalPath,
        pageIndex: idx + 1,
      }));

    if (pagesToExport.length === 0) return;

    try {
      setIsSharingImages(true);
      await PdfService.shareImages(pagesToExport, document.title);
    } catch (err) {
      console.error('Erro no compartilhamento de imagens:', err);
      Alert.alert('Erro', 'Não foi possível compartilhar as imagens.');
    } finally {
      setIsSharingImages(false);
    }
  };

  const handleOpenDropboxModal = () => {
    setIsShareModalVisible(false);

    if (!isPro) {
      openPaywall();
      return;
    }

    const dropboxState = DropboxService.getState();
    if (!dropboxState.isConnected) {
      Alert.alert(
        'Dropbox Não Conectado',
        'Conecte sua conta do Dropbox na tela de Ajustes para salvar seus documentos automaticamente na nuvem.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Ir para Ajustes',
            onPress: () => router.push('/profile' as any),
          },
        ]
      );
      return;
    }

    setDropboxUploadFileName(document.title);
    setDropboxUploadFolder(dropboxState.targetFolder || '/ScanPro');
    setIsDropboxUploadModalVisible(true);
  };

  const handleSaveCurrentAsPreset = async () => {
    const clean = dropboxUploadFolder.trim();
    if (!clean) return;
    try {
      await DropboxService.addFolderPreset(clean);
      Alert.alert('Preset Salvo', `A pasta "${DropboxService.sanitizeFolderPath(clean)}" foi adicionada aos seus atalhos.`);
    } catch (err) {
      console.warn('Erro ao salvar preset:', err);
    }
  };

  const handleConfirmDropboxUpload = async () => {
    const pagesToExport = currentPages
      .filter((p) => selectedPageIds.has(p.id))
      .map((p) => ({
        uri: p.processedPath || p.originalPath,
        width: p.width,
        height: p.height,
      }));

    if (pagesToExport.length === 0) return;

    try {
      setIsSavingToDropbox(true);
      const activeTitle = dropboxUploadFileName.trim() || document.title;
      const activeFolder = dropboxUploadFolder.trim() || DropboxService.getState().targetFolder || '/ScanPro';

      const result = await PdfService.generatePdf({
        title: activeTitle,
        pages: pagesToExport,
      });

      if (id) {
        await updateDocumentPdf(id, result.uri);
      }

      const uploadResult = await DropboxService.uploadPdf(
        result.uri,
        activeTitle,
        activeFolder
      );

      setIsDropboxUploadModalVisible(false);
      Alert.alert(
        'Salvo no Dropbox! 🎉',
        `O arquivo "${uploadResult.name}" foi salvo com sucesso em ${uploadResult.pathDisplay}.`
      );
    } catch (err) {
      console.error('Erro ao salvar no Dropbox:', err);
      Alert.alert(
        'Erro no Envio',
        err instanceof Error ? err.message : 'Não foi possível salvar no Dropbox. Verifique sua conexão.'
      );
    } finally {
      setIsSavingToDropbox(false);
    }
  };

  const openRenameModal = () => {
    setEditingTitle(document.title);
    setIsRenameModalVisible(true);
  };

  const handleSaveTitle = async () => {
    if (!editingTitle.trim() || !id) return;
    await renameDocument(id, editingTitle.trim());
    setIsRenameModalVisible(false);
  };

  const handleAddPage = () => {
    router.push({
      pathname: '/scanner',
      params: { documentId: id },
    } as any);
  };

  const formattedDate = new Date(document.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const activePreviewPage = previewPageIndex !== null ? currentPages[previewPageIndex] : null;

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header com Voltar e Ações */}
      <View
        style={[
          styles.header,
          {
            paddingHorizontal: Math.max(insets.left, insets.right, 20),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.circleButton}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerTitleContainer} onPress={openRenameModal}>
          <View style={styles.titleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {document.title}
            </Text>
            <Ionicons name="pencil" size={14} color={colors.textSecondary} style={{ marginLeft: 6 }} />
          </View>
          <Text style={styles.headerSubtitle}>
            {currentPages.length} {currentPages.length === 1 ? 'página' : 'páginas'} • {formattedDate}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.circleButton}
          onPress={handleDeleteDocument}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Barra de Ações Rápidas */}
        <View style={styles.actionsBar}>
          <AppButton
            title="Adicionar Página"
            variant="secondary"
            onPress={handleAddPage}
            style={styles.actionBtn}
            icon={<Ionicons name="add" size={18} color={colors.primary} />}
          />
          <AppButton
            title={
              isGeneratingPdf
                ? 'Gerando PDF...'
                : isSharingImages
                ? 'Exportando Fotos...'
                : `Compartilhar${currentPages.length > 1 ? ` (${selectedPageIds.size})` : ''}`
            }
            variant="primary"
            onPress={handleShareClick}
            loading={isGeneratingPdf || isSharingImages}
            disabled={isGeneratingPdf || isSharingImages}
            style={styles.actionBtn}
            icon={<Ionicons name="share-social-outline" size={18} color="#FFFFFF" />}
          />
        </View>

        {/* Barra de Seleção Rápida de Páginas (quando houver mais de 1 página) */}
        {currentPages.length > 1 && (
          <View style={styles.selectionBar}>
            <View style={styles.selectionInfo}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.selectionCountText}>
                {selectedPageIds.size} de {currentPages.length} páginas selecionadas
              </Text>
            </View>
            <View style={styles.selectionActions}>
              <TouchableOpacity onPress={selectAllPages} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.selectionActionText}>Todas</Text>
              </TouchableOpacity>
              <Text style={styles.selectionDivider}>•</Text>
              <TouchableOpacity onPress={deselectAllPages} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.selectionActionText}>Nenhuma</Text>
              </TouchableOpacity>
              {selectedPageIds.size > 0 && (
                <>
                  <Text style={styles.selectionDivider}>•</Text>
                  <TouchableOpacity
                    onPress={handleDeleteSelectedBatch}
                    style={styles.deleteBatchButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="trash-outline" size={13} color="#EF4444" style={{ marginRight: 3 }} />
                    <Text style={styles.deleteBatchText}>Excluir ({selectedPageIds.size})</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}

        {/* Instrução de Reordenação */}
        {currentPages.length > 1 && (
          <View style={styles.hintContainer}>
            <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />
            <Text style={styles.hintText}>
              Toque no círculo para selecionar as páginas que deseja compartilhar. Use as setas para reorganizar.
            </Text>
          </View>
        )}

        {/* Grade de Páginas do Documento */}
        <View style={styles.pagesGrid}>
          {currentPages.map((page, index) => (
            <View key={page.id} style={styles.gridItem}>
              <PageThumbnail
                pageIndex={index}
                uri={page.processedPath || page.originalPath}
                isSelected={selectedPageIds.has(page.id)}
                onToggleSelect={() => togglePageSelection(page.id)}
                onPress={() => {
                  setPreviewPageIndex(index);
                  setShowOcrText(false);
                  setPreviewZoom(1);
                  setPreviewPan({ x: 0, y: 0 });
                }}
                onDelete={() => handleDeletePage(page, index)}
                onMoveLeft={() => handleMove(index, index - 1)}
                onMoveRight={() => handleMove(index, index + 1)}
                canMoveLeft={index > 0}
                canMoveRight={index < currentPages.length - 1}
              />
              {page.ocrText && (
                <View style={styles.ocrBadge}>
                  <Ionicons name="search" size={11} color={colors.primary} />
                  <Text style={styles.ocrBadgeText}>OCR</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal de Pré-Visualização com Imagem, Zoom e OCR */}
      <Modal
        visible={previewPageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewPageIndex(null)}
      >
        <View style={styles.previewModalBackdrop}>
          <View
            style={[
              styles.previewModalHeader,
              {
                paddingTop: Math.max(insets.top, 16),
                paddingHorizontal: Math.max(insets.left, insets.right, 20),
              },
            ]}
          >
            <View>
              <Text style={styles.previewModalTitle}>
                Página {(previewPageIndex ?? 0) + 1} de {currentPages.length}
              </Text>
              {activePreviewPage?.ocrText && (
                <Text style={styles.previewModalSubtitle}>Texto reconhecido disponível</Text>
              )}
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.small }}>
              {activePreviewPage?.ocrText && (
                <TouchableOpacity
                  style={[styles.toggleOcrButton, showOcrText && styles.toggleOcrButtonActive]}
                  onPress={() => setShowOcrText(!showOcrText)}
                >
                  <Ionicons
                    name={showOcrText ? 'image' : 'text'}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.toggleOcrText}>
                    {showOcrText ? 'Ver Imagem' : 'Ver Texto'}
                  </Text>
                </TouchableOpacity>
              )}
              {/* Botão de Excluir Página Ativa */}
              <TouchableOpacity
                style={styles.deletePreviewPageButton}
                onPress={() => {
                  if (activePreviewPage && previewPageIndex !== null) {
                    handleDeletePage(activePreviewPage, previewPageIndex);
                  }
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color="#FF6B6B" style={{ marginRight: 4 }} />
                <Text style={styles.deletePreviewPageText}>Excluir</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closePreviewButton}
                onPress={() => setPreviewPageIndex(null)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Barra Flutuante de Zoom para Inspecionar a Imagem */}
          {!showOcrText && (
            <View style={styles.previewZoomBar}>
              <TouchableOpacity
                style={styles.previewZoomBtn}
                onPress={() => setPreviewZoom((z) => Math.max(1, parseFloat((z - 0.5).toFixed(1))))}
                disabled={previewZoom <= 1}
              >
                <Ionicons name="remove" size={16} color={previewZoom <= 1 ? '#64748B' : '#FFFFFF'} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewZoomBadge}
                onPress={() => setPreviewZoom((z) => (z === 1 ? 2.5 : 1))}
              >
                <Text style={styles.previewZoomBadgeText}>{Math.round(previewZoom * 100)}%</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewZoomBtn}
                onPress={() => setPreviewZoom((z) => Math.min(3.5, parseFloat((z + 0.5).toFixed(1))))}
                disabled={previewZoom >= 3.5}
              >
                <Ionicons name="add" size={16} color={previewZoom >= 3.5 ? '#64748B' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.previewModalBody}>
            {activePreviewPage && (
              showOcrText ? (
                <ScrollView style={styles.ocrTextContainer}>
                  <Text style={styles.ocrTextContent}>
                    {activePreviewPage.ocrText || 'Nenhum texto detectado nesta página.'}
                  </Text>
                </ScrollView>
              ) : (
                <View
                  {...previewPanResponder.panHandlers}
                  {...({
                    onWheel: (e: any) => {
                      if (e.ctrlKey) {
                        e.preventDefault();
                        const delta = e.deltaY > 0 ? -0.15 : 0.15;
                        setPreviewZoom((z) => {
                          const next = Math.max(1, Math.min(4, parseFloat((z + delta).toFixed(2))));
                          if (next === 1) setPreviewPan({ x: 0, y: 0 });
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
                    cursor: previewZoom > 1 ? 'grab' : 'default',
                  } as any}
                >
                  <Image
                    source={{
                      uri: activePreviewPage.processedPath || activePreviewPage.originalPath,
                    }}
                    style={[
                      styles.fullPreviewImage,
                      {
                        transform: [
                          { scale: previewZoom },
                          { translateX: previewPan.x },
                          { translateY: previewPan.y },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                  />
                </View>
              )
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Escolha de Formato de Compartilhamento (PDF ou Imagens) */}
      <Modal
        visible={isShareModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.shareCard, shadows.card]}>
            <View style={styles.shareCardHeader}>
              <View style={styles.shareIconWrap}>
                <Ionicons name="share-social-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.shareCardTitle}>Compartilhar</Text>
                <Text style={styles.shareCardSubtitle}>
                  {selectedPageIds.size} {selectedPageIds.size === 1 ? 'página selecionada' : 'páginas selecionadas'}
                </Text>
              </View>
            </View>

            {/* Opção 1: Compartilhar como PDF */}
            <TouchableOpacity
              style={styles.shareOptionCard}
              onPress={handleSharePdf}
              activeOpacity={0.8}
            >
              <View style={[styles.shareOptionIconWrap, { backgroundColor: 'rgba(0, 102, 204, 0.12)' }]}>
                <Ionicons name="document-text" size={26} color={colors.primary} />
              </View>
              <View style={styles.shareOptionMeta}>
                <Text style={styles.shareOptionTitle}>Compartilhar como PDF</Text>
                <Text style={styles.shareOptionDesc}>
                  Compilar {selectedPageIds.size} {selectedPageIds.size === 1 ? 'página' : 'páginas'} em documento A4
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Opção 2: Compartilhar como Imagens de Alta Resolução */}
            <TouchableOpacity
              style={styles.shareOptionCard}
              onPress={handleShareImages}
              activeOpacity={0.8}
            >
              <View style={[styles.shareOptionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Ionicons name="images" size={26} color="#10B981" />
              </View>
              <View style={styles.shareOptionMeta}>
                <Text style={styles.shareOptionTitle}>Compartilhar como Imagem</Text>
                <Text style={styles.shareOptionDesc}>
                  Exportar {selectedPageIds.size} {selectedPageIds.size === 1 ? 'foto' : 'fotos'} em resolução original sem perda
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Opção 3: Salvar no Dropbox (PRO) */}
            <TouchableOpacity
              style={styles.shareOptionCard}
              onPress={handleOpenDropboxModal}
              activeOpacity={0.8}
            >
              <View style={[styles.shareOptionIconWrap, { backgroundColor: 'rgba(0, 97, 254, 0.12)' }]}>
                <Ionicons name="logo-dropbox" size={26} color="#0061FE" />
              </View>
              <View style={styles.shareOptionMeta}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.shareOptionTitle}>Salvar no Dropbox</Text>
                  <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#B45309' }}>PRO</Text>
                  </View>
                </View>
                <Text style={styles.shareOptionDesc}>
                  Escolher pasta e exportar PDF direto para sua conta na nuvem
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <AppButton
              title="Cancelar"
              variant="tertiary"
              onPress={() => setIsShareModalVisible(false)}
              style={{ marginTop: spacing.small }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de Renomear Documento (Fase 6) */}
      <Modal
        visible={isRenameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Renomear Documento</Text>
            <TextInput
              style={styles.renameInput}
              value={editingTitle}
              onChangeText={setEditingTitle}
              placeholder="Nome do documento"
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.renameActions}>
              <AppButton
                title="Cancelar"
                variant="tertiary"
                onPress={() => setIsRenameModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Salvar"
                variant="primary"
                onPress={handleSaveTitle}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmação de Exclusão (Projeto, Página ou Seleção) */}
      <ConfirmModal
        visible={deleteConfirmTarget !== null}
        title={
          deleteConfirmTarget?.type === 'document'
            ? 'Excluir Projeto'
            : deleteConfirmTarget?.type === 'batch'
            ? 'Excluir Páginas Selecionadas'
            : 'Excluir Página'
        }
        message={
          deleteConfirmTarget?.type === 'document'
            ? `Deseja realmente excluir permanentemente "${deleteConfirmTarget?.title}" e todas as suas páginas?`
            : deleteConfirmTarget?.type === 'batch'
            ? `Deseja realmente excluir permanentemente as ${selectedPageIds.size} páginas selecionadas deste documento?`
            : `Deseja realmente excluir permanentemente a Página ${deleteConfirmTarget?.pageIndex}?`
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={async () => {
          if (!deleteConfirmTarget || !id) return;
          if (deleteConfirmTarget.type === 'document') {
            setDeleteConfirmTarget(null);
            await deleteDocument(id);
            router.replace('/');
          } else if (deleteConfirmTarget.type === 'batch') {
            const pageIdsToDelete = Array.from(selectedPageIds);
            setDeleteConfirmTarget(null);
            setPreviewPageIndex(null);
            setSelectedPageIds(new Set());
            for (const pId of pageIdsToDelete) {
              await deleteDocumentPage(id, pId);
            }
            if (currentPages.length <= pageIdsToDelete.length) {
              await deleteDocument(id);
              router.replace('/');
            }
          } else if (deleteConfirmTarget.type === 'page' && deleteConfirmTarget.pageId) {
            const pageId = deleteConfirmTarget.pageId;
            setDeleteConfirmTarget(null);
            setPreviewPageIndex(null);
            await deleteDocumentPage(id, pageId);
            if (currentPages.length <= 1) {
              await deleteDocument(id);
              router.replace('/');
            }
          }
        }}
        onCancel={() => setDeleteConfirmTarget(null)}
      />

      {/* Modal de Escolha de Pasta e Nome para Salvar no Dropbox */}
      <Modal
        visible={isDropboxUploadModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isSavingToDropbox && setIsDropboxUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.dropboxUploadScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.dropboxUploadCard}>
              <View style={styles.dropboxUploadHeader}>
                <View style={styles.dropboxUploadIconCircle}>
                  <Ionicons name="logo-dropbox" size={26} color="#0061FE" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dropboxUploadTitle}>Salvar no Dropbox</Text>
                  <Text style={styles.dropboxUploadSubtitle}>
                    Personalize o nome e selecione a pasta de destino
                  </Text>
                </View>
              </View>

              <Text style={styles.uploadFieldLabel}>Nome do Arquivo PDF</Text>
              <TextInput
                style={styles.uploadInput}
                value={dropboxUploadFileName}
                onChangeText={setDropboxUploadFileName}
                placeholder="Nome do documento"
                editable={!isSavingToDropbox}
              />

              <View style={styles.folderFieldHeaderRow}>
                <Text style={styles.uploadFieldLabel}>Pasta no Dropbox</Text>
                {!dropboxState.folderPresets.includes(dropboxUploadFolder.trim()) && dropboxUploadFolder.trim() !== '' && (
                  <TouchableOpacity
                    style={styles.quickSavePresetBtn}
                    onPress={handleSaveCurrentAsPreset}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="bookmark-outline" size={12} color={colors.primary} />
                    <Text style={styles.quickSavePresetText}>Salvar como Preset</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.uploadInput}
                value={dropboxUploadFolder}
                onChangeText={setDropboxUploadFolder}
                placeholder="/ScanPro"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isSavingToDropbox}
              />

              {/* Presets Salvos */}
              {dropboxState.folderPresets && dropboxState.folderPresets.length > 0 && (
                <View style={styles.folderPresetsSection}>
                  <Text style={styles.uploadChipsTitle}>Presets Salvos (Toque para usar)</Text>
                  <View style={styles.uploadChipsContainer}>
                    {dropboxState.folderPresets.map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.uploadChip,
                          dropboxUploadFolder === preset && styles.uploadChipActive,
                        ]}
                        onPress={() => setDropboxUploadFolder(preset)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="bookmark"
                          size={11}
                          color={dropboxUploadFolder === preset ? '#FFFFFF' : colors.primary}
                        />
                        <Text
                          style={[
                            styles.uploadChipText,
                            dropboxUploadFolder === preset && styles.uploadChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Últimos Usados */}
              {dropboxState.recentFolders && dropboxState.recentFolders.length > 0 && (
                <View style={styles.folderPresetsSection}>
                  <Text style={styles.uploadChipsTitle}>Últimos Usados</Text>
                  <View style={styles.uploadChipsContainer}>
                    {dropboxState.recentFolders.map((recent) => (
                      <TouchableOpacity
                        key={recent}
                        style={[
                          styles.uploadChipRecent,
                          dropboxUploadFolder === recent && styles.uploadChipRecentActive,
                        ]}
                        onPress={() => setDropboxUploadFolder(recent)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="time-outline"
                          size={11}
                          color={dropboxUploadFolder === recent ? colors.primary : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.uploadChipRecentText,
                            dropboxUploadFolder === recent && styles.uploadChipRecentTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {recent}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.dropboxUploadActions}>
                <AppButton
                  title="Cancelar"
                  variant="tertiary"
                  onPress={() => setIsDropboxUploadModalVisible(false)}
                  disabled={isSavingToDropbox}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Salvar"
                  variant="primary"
                  onPress={handleConfirmDropboxUpload}
                  loading={isSavingToDropbox}
                  disabled={isSavingToDropbox}
                  style={{ flex: 1 }}
                  icon={<Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Loading Overlay ao Salvar no Dropbox */}
      {isSavingToDropbox && (
        <View style={styles.savingOverlay}>
          <View style={[styles.savingDialog, shadows.card]}>
            <ActivityIndicator size="large" color="#0061FE" />
            <Text style={styles.savingText}>Salvando no Dropbox...</Text>
          </View>
        </View>
      )}

      {/* Paywall para recurso PRO */}
      <PaywallModal
        visible={isPaywallVisible}
        onClose={closePaywall}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.small,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  circleButton: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    paddingHorizontal: spacing.small,
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: spacing.default,
  },
  actionsBar: {
    flexDirection: 'row',
    gap: spacing.small,
    marginBottom: spacing.default,
  },
  actionBtn: {
    flex: 1,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBEBF0',
    padding: spacing.small,
    borderRadius: radii.standard,
    marginBottom: spacing.default,
    gap: spacing.small,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.default,
  },
  gridItem: {
    marginBottom: spacing.small,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.large,
  },
  errorText: {
    ...typography.headline,
    color: colors.textSecondary,
  },
  previewModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  previewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.default,
    paddingTop: spacing.small,
  },
  previewModalTitle: {
    ...typography.headline,
    color: '#FFFFFF',
  },
  closePreviewButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewModalBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.default,
  },
  fullPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ocrBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: radii.capsule,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
    ...shadows.subtle,
  },
  ocrBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  previewModalSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  toggleOcrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
  },
  toggleOcrButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleOcrText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  ocrTextContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.cards,
    padding: spacing.default,
  },
  ocrTextContent: {
    ...typography.body,
    color: colors.textPrimary,
    lineHeight: 22,
    fontFamily: 'monospace',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.default,
  },
  renameCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radii.prominentCards,
    padding: spacing.default,
    ...shadows.elevated,
  },
  renameTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.small,
  },
  renameInput: {
    backgroundColor: colors.background,
    borderRadius: radii.standard,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.small,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.default,
  },
  renameActions: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  selectionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.small,
    borderRadius: radii.standard,
    marginBottom: spacing.small,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectionCountText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
  },
  selectionActionText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  selectionDivider: {
    color: colors.separator,
  },
  deleteBatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.small,
  },
  deleteBatchText: {
    ...typography.caption,
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 11,
  },
  deletePreviewPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.capsule,
  },
  deletePreviewPageText: {
    ...typography.caption,
    color: '#FF6B6B',
    fontWeight: '700',
  },
  previewZoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.small,
    paddingVertical: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  previewZoomBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewZoomBadge: {
    paddingHorizontal: spacing.compact,
    paddingVertical: 4,
    borderRadius: radii.capsule,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  previewZoomBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shareCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.cards,
    padding: spacing.default,
  },
  shareCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    marginBottom: spacing.default,
    paddingBottom: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  shareIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.standard,
    backgroundColor: 'rgba(0, 102, 204, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareCardTitle: {
    ...typography.headline,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shareCardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  shareOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.default,
    borderRadius: radii.standard,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: spacing.small,
  },
  shareOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.standard,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.default,
  },
  shareOptionMeta: {
    flex: 1,
  },
  shareOptionTitle: {
    ...typography.subheadline,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  shareOptionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  savingDialog: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.default * 1.5,
    paddingVertical: spacing.default * 1.2,
    borderRadius: radii.prominentCards,
    alignItems: 'center',
    gap: spacing.small,
  },
  savingText: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  dropboxUploadCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radii.prominentCards,
    padding: spacing.default,
    ...shadows.elevated,
  },
  dropboxUploadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.compact,
    marginBottom: spacing.small,
  },
  dropboxUploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropboxUploadTitle: {
    ...typography.headline,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  dropboxUploadSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  uploadFieldLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.compact,
    marginBottom: 4,
  },
  uploadInput: {
    backgroundColor: colors.background,
    borderRadius: radii.standard,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.small,
    ...typography.body,
    color: colors.textPrimary,
  },
  uploadFieldHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    marginBottom: spacing.default,
  },
  dropboxUploadScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.default * 1.5,
    paddingHorizontal: spacing.default,
  },
  folderFieldHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.compact,
    marginBottom: 4,
  },
  quickSavePresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.capsule,
    backgroundColor: '#E0EEFF',
  },
  quickSavePresetText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  folderPresetsSection: {
    marginTop: spacing.compact,
  },
  uploadChipsTitle: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  uploadChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  uploadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: radii.capsule,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  uploadChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  uploadChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 11,
  },
  uploadChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  uploadChipRecent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.background,
    borderRadius: radii.capsule,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  uploadChipRecentActive: {
    borderColor: colors.primary,
    backgroundColor: '#E0EEFF',
  },
  uploadChipRecentText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  uploadChipRecentTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dropboxUploadActions: {
    flexDirection: 'row',
    gap: spacing.small,
    marginTop: spacing.default,
  },
});
