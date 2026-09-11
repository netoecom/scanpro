import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget, shadows } from '../theme';
import { DocumentCard, EmptyState, BottomTabBar } from '../components/ui';
import { useDocumentStore } from '../store';

export default function HomeScreen() {
  const router = useRouter();
  const { documents, loadDocuments, toggleFavorite } = useDocumentStore();

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleScanPress = () => {
    router.push('/scanner' as any);
  };

  const handleDocumentPress = (title: string) => {
    Alert.alert('Visualizar Documento', title);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header com saudação e título */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.appTitle}>ScanPro</Text>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => router.push('/profile')}
            >
              <Ionicons name="person-circle-outline" size={34} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* CTA Principal de Scanner (Visualmente Dominante) */}
          <View style={styles.heroCtaContainer}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleScanPress}
              style={[styles.heroCtaButton, shadows.floating]}
            >
              <View style={styles.heroIconWrapper}>
                <Ionicons name="camera" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.heroTextWrapper}>
                <Text style={styles.heroCtaTitle}>Escanear documento</Text>
                <Text style={styles.heroCtaSubtitle}>
                  Aponte, capture e gere seu PDF instantaneamente
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Seção de Documentos Recentes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recentes</Text>
            {documents.length > 0 && (
              <TouchableOpacity
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => router.push('/documents')}
              >
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Lista de Recentes ou Estado Vazio */}
          {documents.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="Nenhum documento ainda"
              description="Seus documentos digitalizados com qualidade profissional aparecerão aqui."
              actionTitle="Escanear primeiro documento"
              onActionPress={handleScanPress}
            />
          ) : (
            <View style={styles.documentsList}>
              {documents.slice(0, 5).map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onPress={() => handleDocumentPress(doc.title)}
                  onToggleFavorite={() => toggleFavorite(doc.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Navegação Inferior (BottomTabBar) */}
      <BottomTabBar onScanPress={handleScanPress} />
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
  },
  scrollContent: {
    paddingHorizontal: spacing.default,
    paddingTop: spacing.section,
    paddingBottom: spacing.section,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.section,
  },
  greeting: {
    ...typography.subheadline,
    color: colors.textSecondary,
    marginBottom: spacing.micro,
  },
  appTitle: {
    ...typography.display,
    color: colors.textPrimary,
  },
  profileButton: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaContainer: {
    marginBottom: spacing.large,
  },
  heroCtaButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.prominentCards,
    padding: spacing.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: radii.standard + 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
  },
  heroTextWrapper: {
    flex: 1,
    paddingRight: spacing.small,
  },
  heroCtaTitle: {
    ...typography.title3,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroCtaSubtitle: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: spacing.micro,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.compact,
  },
  sectionTitle: {
    ...typography.title3,
    color: colors.textPrimary,
  },
  seeAllText: {
    ...typography.callout,
    color: colors.primary,
    fontWeight: '600',
  },
  documentsList: {
    marginTop: spacing.micro,
  },
});
