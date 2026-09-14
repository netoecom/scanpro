import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget, shadows } from '../theme';
import { DocumentCard, EmptyState, BottomTabBar, OnboardingInstallModal, PaywallModal, ConfirmModal, ModernIntroSplash } from '../components/ui';
import { useDocumentStore, usePremiumStore } from '../store';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { TelemetryService } from '../services/telemetry';

// Controle em memória de sessão nativa e web para evitar reexibição do splash de boas-vindas
let hasShownSessionIntro = false;

export default function HomeScreen() {
  const router = useRouter();
  const { documents, loadDocuments, toggleFavorite, deleteDocument } = useDocumentStore();
  const { isPro, isPaywallVisible, openPaywall, closePaywall } = usePremiumStore();
  const { isInstalled } = usePwaInstall();

  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<{ id: string; title: string } | null>(null);

  // Splash de Introdução Homogêneo e Moderno na inicialização da sessão (exibido apenas 1x no cold-start)
  const [showIntroSplash, setShowIntroSplash] = useState(() => {
    if (hasShownSessionIntro) return false;
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      const shown = sessionStorage.getItem('scanpro_session_intro_shown');
      if (shown) {
        hasShownSessionIntro = true;
        return false;
      }
    }
    return true;
  });

  // Animação de entrada suave e moderna na inicialização do app
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    TelemetryService.track('app_open');
    loadDocuments();
  }, [loadDocuments]);

  const handleIntroFinish = () => {
    hasShownSessionIntro = true;
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('scanpro_session_intro_shown', 'true');
    }
    setShowIntroSplash(false);
  };

  const handleScanPress = () => {
    router.push('/scanner' as any);
  };

  const handleDocumentPress = (id: string) => {
    router.push(`/document/${id}` as any);
  };

  const handleDeleteDocument = (id: string, title: string) => {
    setConfirmDeleteDoc({ id, title });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
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
                    {isPro ? 'ScanPro Pro' : 'Conhecer Pro'}
                  </Text>
                </TouchableOpacity>

                {/* Atalho para Onboarding / Guia de Instalação */}
                <TouchableOpacity
                  style={styles.helpButton}
                  onPress={() => setIsOnboardingVisible(true)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="help-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Banner de Digitalização Rápida */}
            <TouchableOpacity
              style={styles.heroCtaButton}
              onPress={handleScanPress}
              activeOpacity={0.9}
            >
              <View style={styles.heroIconWrapper}>
                <Ionicons name="scan" size={32} color="#FFFFFF" />
              </View>
              <View style={styles.heroTextWrapper}>
                <Text style={styles.heroCtaTitle}>Escanear Documento</Text>
                <Text style={styles.heroCtaSubtitle}>
                  Detecção automática de bordas, OCR e PDF instantâneo
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Seção de Documentos Recentes */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Documentos Recentes</Text>
              {documents.length > 0 && (
                <TouchableOpacity
                  onPress={() => router.push('/documents')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.seeAllText}>Ver todos ({documents.length})</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Lista ou Estado Vazio */}
            {documents.length === 0 ? (
              <EmptyState
                icon="document-text-outline"
                title="Nenhum documento ainda"
                description="Toque no botão abaixo ou no banner acima para digitalizar seu primeiro recibo, contrato ou nota fiscal."
                actionTitle="Escanear Agora"
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
      </Animated.View>

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

      {/* Confirmação de Exclusão de Documento */}
      <ConfirmModal
        visible={confirmDeleteDoc !== null}
        title="Excluir Documento"
        message={`Deseja realmente excluir permanentemente "${confirmDeleteDoc?.title}" e todas as suas páginas?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={async () => {
          if (!confirmDeleteDoc) return;
          const { id } = confirmDeleteDoc;
          setConfirmDeleteDoc(null);
          await deleteDocument(id);
        }}
        onCancel={() => setConfirmDeleteDoc(null)}
      />

      {/* Animação Introdutória Homogênea e Moderna ao Abrir o App */}
      {showIntroSplash && <ModernIntroSplash onFinish={handleIntroFinish} />}
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
  helpButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
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
