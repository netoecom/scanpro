import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget, shadows } from '../../theme';
import { SearchField, DocumentCard, EmptyState, BottomTabBar, AppButton } from '../../components/ui';
import { useDocumentStore } from '../../store';

type FilterTab = 'all' | 'favorites';

export default function DocumentsScreen() {
  const router = useRouter();
  const {
    documents,
    folders,
    activeFolderId,
    viewMode,
    searchQuery,
    setSearchQuery,
    toggleFavorite,
    deleteDocument,
    loadDocuments,
    loadFolders,
    createFolder,
    setActiveFolderId,
    setViewMode,
  } = useDocumentStore();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isFolderModalVisible, setIsFolderModalVisible] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  useEffect(() => {
    loadDocuments();
    loadFolders();
  }, [loadDocuments, loadFolders]);

  const filteredDocuments = documents.filter((doc) => {
    if (activeTab === 'favorites') {
      return doc.isFavorite;
    }
    return true;
  });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim());
      setNewFolderName('');
      setIsFolderModalVisible(false);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível criar a pasta.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header da Tela com Título, Contador e Alternador de Lista/Grade */}
        <View style={styles.header}>
          <View>
            <Text style={styles.screenTitle}>Biblioteca</Text>
            <Text style={styles.documentCounter}>
              {filteredDocuments.length} {filteredDocuments.length === 1 ? 'documento' : 'documentos'}
            </Text>
          </View>

          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('list')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === 'list' ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeButtonActive]}
              onPress={() => setViewMode('grid')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="grid-outline"
                size={18}
                color={viewMode === 'grid' ? colors.primary : colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Campo de Busca Rápida com suporte a OCR */}
        <View style={styles.searchWrapper}>
          <SearchField
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
            placeholder="Buscar por título ou conteúdo OCR..."
          />
        </View>

        {/* Filtro de Pastas (Fase 6) */}
        <View style={styles.foldersSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.foldersScroll}
          >
            <TouchableOpacity
              style={[
                styles.folderChip,
                activeFolderId === null && styles.folderChipActive,
              ]}
              onPress={() => setActiveFolderId(null)}
            >
              <Ionicons
                name="folder-open"
                size={14}
                color={activeFolderId === null ? '#FFFFFF' : colors.primary}
              />
              <Text
                style={[
                  styles.folderChipText,
                  activeFolderId === null && styles.folderChipTextActive,
                ]}
              >
                Todas
              </Text>
            </TouchableOpacity>

            {folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={[
                  styles.folderChip,
                  activeFolderId === folder.id && styles.folderChipActive,
                ]}
                onPress={() => setActiveFolderId(folder.id)}
              >
                <Ionicons
                  name="folder"
                  size={14}
                  color={activeFolderId === folder.id ? '#FFFFFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.folderChipText,
                    activeFolderId === folder.id && styles.folderChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {folder.name}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.addFolderButton}
              onPress={() => setIsFolderModalVisible(true)}
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text style={styles.addFolderText}>Nova Pasta</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Filtros em Pílula (Todos / Favoritos) */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
              Todos os Arquivos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'favorites' && styles.tabChipActive]}
            onPress={() => setActiveTab('favorites')}
          >
            <Text
              style={[styles.tabChipText, activeTab === 'favorites' && styles.tabChipTextActive]}
            >
              Favoritos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Lista ou Grade de Documentos */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredDocuments.length === 0 ? (
            <EmptyState
              icon={activeTab === 'favorites' ? 'star-outline' : 'folder-open-outline'}
              title={
                activeTab === 'favorites'
                  ? 'Nenhum favorito encontrado'
                  : searchQuery
                  ? 'Nenhum resultado'
                  : 'Nenhum documento aqui'
              }
              description={
                activeTab === 'favorites'
                  ? 'Marque documentos com a estrela para acessá-los rapidamente aqui.'
                  : searchQuery
                  ? `Não encontramos nada para "${searchQuery}".`
                  : 'Digitalize páginas com a câmera para organizar nesta pasta.'
              }
            />
          ) : viewMode === 'grid' ? (
            <View style={styles.gridContainer}>
              {filteredDocuments.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.gridCard}
                  onPress={() => router.push(`/document/${doc.id}` as any)}
                  activeOpacity={0.75}
                >
                  <View style={styles.gridImageWrapper}>
                    {doc.thumbnailPath ? (
                      <Image source={{ uri: doc.thumbnailPath }} style={styles.gridThumbnail} />
                    ) : (
                      <View style={styles.gridPlaceholder}>
                        <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.gridFavoriteBtn}
                      onPress={() => toggleFavorite(doc.id)}
                    >
                      <Ionicons
                        name={doc.isFavorite ? 'star' : 'star-outline'}
                        size={16}
                        color={doc.isFavorite ? colors.warning : 'rgba(0, 0, 0, 0.4)'}
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.gridMeta}>
                    <Text style={styles.gridTitle} numberOfLines={1}>
                      {doc.title}
                    </Text>
                    <Text style={styles.gridSubtitle}>
                      {doc.pageCount} {doc.pageCount === 1 ? 'pág' : 'págs'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPress={() => router.push(`/document/${doc.id}` as any)}
                onToggleFavorite={() => toggleFavorite(doc.id)}
              />
            ))
          )}
        </ScrollView>
      </View>

      {/* Modal para Criação de Nova Pasta */}
      <Modal
        visible={isFolderModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsFolderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.folderCard}>
            <View style={styles.folderModalHeader}>
              <Ionicons name="folder-outline" size={24} color={colors.primary} />
              <Text style={styles.folderModalTitle}>Criar Nova Pasta</Text>
            </View>
            <TextInput
              style={styles.folderInput}
              value={newFolderName}
              onChangeText={setNewFolderName}
              placeholder="Ex: Contratos, Recibos, Impostos..."
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            <View style={styles.folderModalActions}>
              <AppButton
                title="Cancelar"
                variant="tertiary"
                onPress={() => setIsFolderModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Criar Pasta"
                variant="primary"
                onPress={handleCreateFolder}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.default,
    paddingTop: spacing.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBEBF0',
    borderRadius: radii.standard,
    padding: 2,
  },
  viewModeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.standard - 2,
  },
  viewModeButtonActive: {
    backgroundColor: '#FFFFFF',
    ...shadows.subtle,
  },
  screenTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  documentCounter: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchWrapper: {
    marginTop: spacing.small,
    marginBottom: spacing.small,
  },
  foldersSection: {
    marginBottom: spacing.small,
  },
  foldersScroll: {
    flexDirection: 'row',
    gap: spacing.small,
    alignItems: 'center',
    paddingVertical: 2,
  },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: spacing.compact,
    borderRadius: radii.standard,
    backgroundColor: '#EBEBF0',
  },
  folderChipActive: {
    backgroundColor: colors.primary,
  },
  folderChipText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  folderChipTextActive: {
    color: '#FFFFFF',
  },
  addFolderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: spacing.compact,
    borderRadius: radii.standard,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  addFolderText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.primary,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: spacing.default,
    gap: spacing.small,
  },
  tabChip: {
    paddingVertical: spacing.micro + 2,
    paddingHorizontal: spacing.default,
    borderRadius: radii.capsule,
    backgroundColor: '#EBEBF0',
    minHeight: touchTarget.minSize - 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabChipActive: {
    backgroundColor: colors.textPrimary,
  },
  tabChipText: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  scrollList: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.section,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.default,
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.subtle,
  },
  gridImageWrapper: {
    width: '100%',
    height: 140,
    backgroundColor: '#F5F5F7',
    position: 'relative',
  },
  gridThumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridFavoriteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radii.capsule,
    padding: 6,
    ...shadows.subtle,
  },
  gridMeta: {
    padding: spacing.small,
  },
  gridTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  gridSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.default,
  },
  folderCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radii.prominentCards,
    padding: spacing.default,
    ...shadows.elevated,
  },
  folderModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    marginBottom: spacing.small,
  },
  folderModalTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  folderInput: {
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
  folderModalActions: {
    flexDirection: 'row',
    gap: spacing.small,
  },
});
