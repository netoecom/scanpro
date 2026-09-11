import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, radii, touchTarget } from '../../theme';
import { SearchField, DocumentCard, EmptyState, BottomTabBar } from '../../components/ui';
import { useDocumentStore } from '../../store';

type FilterTab = 'all' | 'favorites';

export default function DocumentsScreen() {
  const { documents, searchQuery, setSearchQuery, toggleFavorite, deleteDocument, loadDocuments } =
    useDocumentStore();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const filteredDocuments = documents.filter((doc) => {
    if (activeTab === 'favorites') {
      return doc.isFavorite;
    }
    return true;
  });

  const handleDocumentOptions = (id: string, title: string) => {
    Alert.alert(
      title,
      'Selecione uma ação para o documento:',
      [
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteDocument(id),
        },
        {
          text: 'Compartilhar',
          onPress: () => Alert.alert('Compartilhar', 'Sheet nativo de compartilhamento'),
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header da Tela */}
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Documentos</Text>
          <Text style={styles.documentCounter}>
            {filteredDocuments.length} {filteredDocuments.length === 1 ? 'item' : 'itens'}
          </Text>
        </View>

        {/* Campo de Busca Rápida */}
        <View style={styles.searchWrapper}>
          <SearchField
            value={searchQuery}
            onChangeText={(text) => setSearchQuery(text)}
            placeholder="Buscar por título..."
          />
        </View>

        {/* Filtros em Pílula (Todos / Favoritos) */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'all' && styles.tabChipActive]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabChipText, activeTab === 'all' && styles.tabChipTextActive]}>
              Todos
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

        {/* Lista de Documentos */}
        <ScrollView
          style={styles.scrollList}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredDocuments.length === 0 ? (
            <EmptyState
              icon={activeTab === 'favorites' ? 'star-outline' : 'search-outline'}
              title={
                activeTab === 'favorites'
                  ? 'Nenhum favorito encontrado'
                  : searchQuery
                  ? 'Nenhum resultado'
                  : 'Sua biblioteca está vazia'
              }
              description={
                activeTab === 'favorites'
                  ? 'Marque documentos com a estrela para acessá-los rapidamente aqui.'
                  : searchQuery
                  ? `Não encontramos nada para "${searchQuery}".`
                  : 'Digitalize documentos para começar a construir sua biblioteca.'
              }
            />
          ) : (
            filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onPress={() => handleDocumentOptions(doc.id, doc.title)}
                onToggleFavorite={() => toggleFavorite(doc.id)}
              />
            ))
          )}
        </ScrollView>
      </View>

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
    alignItems: 'baseline',
    marginBottom: spacing.small,
  },
  screenTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  documentCounter: {
    ...typography.callout,
    color: colors.textSecondary,
  },
  searchWrapper: {
    marginTop: spacing.small,
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
    backgroundColor: colors.primary,
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
});
