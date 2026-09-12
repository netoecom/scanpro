import React, { useEffect, useState } from 'react';
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
import { DocumentCard, EmptyState, BottomTabBar, OnboardingInstallModal, PaywallModal } from '../components/ui';
import { useDocumentStore, usePremiumStore } from '../store';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { TelemetryService } from '../services/telemetry';

export default function HomeScreen() {
  const router = useRouter();
  const { documents, loadDocuments, toggleFavorite, deleteDocument } = useDocumentStore();
  const { isPro, isPaywallVisible, openPaywall, closePaywall } = usePremiumStore();
  const { isInstalled } = usePwaInstall();

  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

  useEffect(() => {
    TelemetryService.track('app_open');
    loadDocuments();

    // Abre o onboarding na primeira vez na web se o app não estiver instalado
    if (typeof window !== 'undefined' && !isInstalled) {
      const hasSeen = localStorage.getItem('scanpro_has_seen_onboarding');
      if (!hasSeen) {
        setIsOnboardingVisible(true);
        localStorage.setItem('scanpro_has_seen_onboarding', 'true');
      }
    }
  }, [loadDocuments, isInstalled]);

  const handleScanPress = () => {
    router.push('/scanner' as any);
  };

  const handleDocumentPress = (id: string) => {
    router.push(`/document/${id}` as any);
  };

  const handleDeleteDocument = (id: string, title: string) => {
    Alert.alert(
      'Excluir Documento',
      `Deseja realmente excluir permanentemente "${title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteDocument(id);
          },
        },
      ]
    );
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
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[styles.proBadge, isPro ? styles.proBadgeActive : styles.proBadgeCta]}
                onPress={openPaywall}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isPro ? 'star' : 'sparkles'}
                  size={14}
                  color={isPro ? '#B45309' : colors.primary}
                />
                <Text
                  style={[
                    styles.proBadgeText,
                    isPro ? styles.proBadgeTextActive : styles.proBadgeTextCta,
                  ]}
                >
                  {isPro ? 'PRO' : 'Seja PRO'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.profileButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => router.push('/profile')}
              >
                <Ionicons name="person-circle-outline" size={34} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner de Instalação Rápida com 1 Clique */}
          {!isInstalled && (
            <TouchableOpacity
              style={[styles.installBanner, shadows.subtle]}
              activeOpacity={0.88}
              onPress={() => setIsOnboardingVisible(true)}
            >
              <View style={styles.installBannerIcon}>
                <Ionicons name="sparkles" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.installBannerContent}>
                <Text style={styles.installBannerTitle}>Instalar ScanPro no Celular</Text>
                <Text style={styles.installBannerSubtitle}>
                  Ative a câmera, notificações e instale com 1 clique
                </Text>
              </View>
              <View style={styles.installBannerPill}>
                <Text style={styles.installBannerPillText}>Ativar</Text>
              </View>
            </TouchableOpacity>
          )}

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
                  onPress={() => handleDocumentPress(doc.id)}
                  onToggleFavorite={() => toggleFavorite(doc.id)}
                  onDelete={() => handleDeleteDocument(doc.id, doc.title)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Navegação Inferior (BottomTabBar) */}
      <BottomTabBar onScanPress={handleScanPress} />

      {/* Modal de Onboarding e Instalação em 1 Clique */}
      <OnboardingInstallModal
        visible={isOnboardingVisible}
        onClose={() => setIsOnboardingVisible(false)}
        onStartScanning={handleScanPress}
      />

      {/* Modal de Assinatura ScanPro Pro (Fase 9) */}
      <PaywallModal
        visible={isPaywallVisible}
        onClose={closePaywall}
      />
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    gap: 4,
  },
  proBadgeCta: {
    backgroundColor: '#EBF4FF',
    borderWidth: 1,
    borderColor: '#B9D5FF',
  },
  proBadgeActive: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  proBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  proBadgeTextCta: {
    color: colors.primary,
  },
  proBadgeTextActive: {
    color: '#92400E',
  },
  installBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radii.standard,
    padding: spacing.compact,
    marginBottom: spacing.default,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  installBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.small,
  },
  installBannerContent: {
    flex: 1,
    marginRight: spacing.micro,
  },
  installBannerTitle: {
    ...typography.subheadline,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  installBannerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  installBannerPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: 14,
  },
  installBannerPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
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
