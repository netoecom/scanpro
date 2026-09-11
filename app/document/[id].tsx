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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget, shadows } from '../../theme';
import { AppButton, PageThumbnail } from '../../components/ui';
import { useDocumentStore } from '../../store';
import { DocumentPage } from '../../types';

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
  } = useDocumentStore();

  const [previewPageIndex, setPreviewPageIndex] = useState<number | null>(null);

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

  const handleAddPage = () => {
    router.push('/scanner' as any);
  };

  const formattedDate = new Date(document.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

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

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {document.title}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentPages.length} {currentPages.length === 1 ? 'página' : 'páginas'} • {formattedDate}
          </Text>
        </View>

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
            title="Exportar PDF"
            variant="primary"
            onPress={() => Alert.alert('Exportar PDF', 'O motor de PDF nativo será habilitado na Fase 5.')}
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
                onPress={() => setPreviewPageIndex(index)}
                onDelete={() => handleDeletePage(page, index)}
                onMoveLeft={() => handleMove(index, index - 1)}
                onMoveRight={() => handleMove(index, index + 1)}
                canMoveLeft={index > 0}
                canMoveRight={index < currentPages.length - 1}
              />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Modal de Pré-Visualização em Tela Cheia da Página */}
      <Modal
        visible={previewPageIndex !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewPageIndex(null)}
      >
        <View style={styles.previewModalBackdrop}>
          <SafeAreaView style={styles.previewModalHeader}>
            <Text style={styles.previewModalTitle}>
              Página {(previewPageIndex ?? 0) + 1} de {currentPages.length}
            </Text>
            <TouchableOpacity
              style={styles.closePreviewButton}
              onPress={() => setPreviewPageIndex(null)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.previewModalBody}>
            {previewPageIndex !== null && currentPages[previewPageIndex] && (
              <Image
                source={{
                  uri:
                    currentPages[previewPageIndex].processedPath ||
                    currentPages[previewPageIndex].originalPath,
                }}
                style={styles.fullPreviewImage}
              />
            )}
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
});
