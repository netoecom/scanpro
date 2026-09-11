import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget, shadows } from '../../theme';
import { AppButton, PageThumbnail } from '../../components/ui';
import { useDocumentStore } from '../../store';
import { DocumentPage } from '../../types';
import { PdfService } from '../../services/pdf/pdfService';

export default function DocumentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    documents,
    currentPages,
    loadDocumentPages,
    reorderDocumentPages,
    deleteDocumentPage,
    deleteDocument,
    renameDocument,
    updateDocumentPdf,
  } = useDocumentStore();

  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);
  const [showOcrText, setShowOcrText] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isRenameModalVisible, setIsRenameModalVisible] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  const document = documents.find((doc) => doc.id === id);

  useEffect(() => {
    if (id) {
      loadDocumentPages(id);
    }
  }, [id, loadDocumentPages]);

  if (!document) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Documento não encontrado</Text>
          <AppButton
            title="Voltar ao Início"
            onPress={() => router.replace('/')}
            variant="secondary"
            style={{ marginTop: spacing.default }}
          />
        </View>
      </SafeAreaView>
    );
  }

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
    Alert.alert(
      'Excluir Página',
      `Deseja realmente excluir a página ${index + 1}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteDocumentPage(id, page.id);
            }
          },
        },
      ]
    );
  };

  const handleDeleteDocument = () => {
    Alert.alert(
      'Excluir Documento',
      `Deseja excluir "${document.title}" permanentemente?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (id) {
              await deleteDocument(id);
              router.replace('/');
            }
          },
        },
      ]
    );
  };

  const handleExportPdf = async () => {
    if (currentPages.length === 0) {
      Alert.alert('Aviso', 'O documento não possui páginas para exportar.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const pagesToExport = currentPages.map((p) => ({
        uri: p.processedPath || p.originalPath,
        width: p.width,
        height: p.height,
      }));

      const result = await PdfService.generatePdf({
        title: document.title,
        pages: pagesToExport,
      });

      if (id) {
        await updateDocumentPdf(id, result.uri);
      }

      await PdfService.sharePdf(result.uri, document.title);
    } catch (err) {
      console.error('Erro na exportação de PDF:', err);
      Alert.alert('Erro', 'Não foi possível gerar o arquivo PDF.');
    } finally {
      setIsGeneratingPdf(false);
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
    router.push('/scanner' as any);
  };

  const formattedDate = new Date(document.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const activePreviewPage = previewPageIndex !== null ? currentPages[previewPageIndex] : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header com Voltar e Ações */}
      <View style={styles.header}>
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
            title={isGeneratingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
            variant="primary"
            onPress={handleExportPdf}
            loading={isGeneratingPdf}
            disabled={isGeneratingPdf}
            style={styles.actionBtn}
            icon={<Ionicons name="document-text-outline" size={18} color="#FFFFFF" />}
          />
        </View>

        {/* Instrução de Reordenação */}
        {currentPages.length > 1 && (
          <View style={styles.hintContainer}>
            <Ionicons name="swap-horizontal" size={16} color={colors.textSecondary} />
            <Text style={styles.hintText}>
              Use as setas abaixo de cada miniatura para reorganizar a ordem das páginas.
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
                onPress={() => {
                  setPreviewPageIndex(index);
                  setShowOcrText(false);
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

      {/* Modal de Pré-Visualização com Imagem ou Texto OCR */}
      <Modal
        visible={previewPageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewPageIndex(null)}
      >
        <View style={styles.previewModalBackdrop}>
          <SafeAreaView style={styles.previewModalHeader}>
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
                    color={showOcrText ? '#FFFFFF' : '#FFFFFF'}
                  />
                  <Text style={styles.toggleOcrText}>
                    {showOcrText ? 'Ver Imagem' : 'Ver Texto'}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.closePreviewButton}
                onPress={() => setPreviewPageIndex(null)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View style={styles.previewModalBody}>
            {activePreviewPage && (
              showOcrText ? (
                <ScrollView style={styles.ocrTextContainer}>
                  <Text style={styles.ocrTextContent}>
                    {activePreviewPage.ocrText || 'Nenhum texto detectado nesta página.'}
                  </Text>
                </ScrollView>
              ) : (
                <Image
                  source={{
                    uri: activePreviewPage.processedPath || activePreviewPage.originalPath,
                  }}
                  style={styles.fullPreviewImage}
                />
              )
            )}
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
    </SafeAreaView>
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
});
