import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget, shadows } from '../../theme';
import { usePremiumStore } from '../../store';
import { AppButton } from './AppButton';
import { TelemetryService } from '../../services/telemetry';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { packages, isPro, purchasePackage, restorePurchases, isLoading } = usePremiumStore();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('scanpro_pro_yearly');

  React.useEffect(() => {
    if (visible) {
      TelemetryService.track('paywall_viewed', { selectedPlan: selectedPlanId });
    }
  }, [visible, selectedPlanId]);

  const handlePurchase = async () => {
    try {
      const success = await purchasePackage(selectedPlanId);
      if (success) {
        TelemetryService.track('subscription_purchased', { planId: selectedPlanId });
        Alert.alert(
          'Bem-vindo ao ScanPro Pro! 🎉',
          'Sua assinatura Pro está ativa. Agora você tem acesso a digitalizações e OCR ilimitados em todos os seus aparelhos.'
        );
        onClose();
      } else {
        Alert.alert('Não foi possível concluir', 'Houve um erro temporário ao processar sua assinatura. Tente novamente.');
      }
    } catch (err) {
      Alert.alert('Erro na Compra', 'Ocorreu um erro ao comunicar com a plataforma de pagamentos.');
    }
  };

  const handleRestore = async () => {
    try {
      const restored = await restorePurchases();
      if (restored) {
        Alert.alert('Assinatura Restaurada', 'Seu plano Pro foi reconhecido e reativado com sucesso!');
        onClose();
      } else {
        Alert.alert('Nenhuma Assinatura Encontrada', 'Não identificamos nenhuma assinatura Pro ativa vinculada a este perfil.');
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível consultar suas compras no momento.');
    }
  };

  const benefits = [
    {
      icon: 'infinite-outline',
      title: 'Documentos & Páginas Ilimitados',
      desc: 'Digitalize quantos contratos, recibos e apostilas precisar sem limite de 5 arquivos.',
    },
    {
      icon: 'text-outline',
      title: 'OCR Inteligente & Busca em Texto',
      desc: 'Reconhecimento ótico instantâneo para copiar textos e buscar palavras-chave.',
    },
    {
      icon: 'sparkles-outline',
      title: 'Exportação Ultra HD & Cores Vivas',
      desc: 'Filtros avançados de limpeza, contraste e PDFs com clareza cristalina sem marca d’água.',
    },
    {
      icon: 'cloud-done-outline',
      title: 'Sincronização Cloud Multi-Dispositivo',
      desc: 'Acesse e organize sua biblioteca inteira tanto no celular quanto no navegador.',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Header de Fechar */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.restoreHeaderButton}
              onPress={handleRestore}
              disabled={isLoading}
            >
              <Text style={styles.restoreHeaderText}>Restaurar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Ícone e Título de Destaque */}
            <View style={styles.heroSection}>
              <View style={[styles.crownBadge, shadows.floating]}>
                <Ionicons name="sparkles" size={28} color="#FF9500" />
              </View>
              <Text style={styles.heroTitle}>ScanPro Pro</Text>
              <Text style={styles.heroSubtitle}>
                Desbloqueie o máximo de poder, velocidade e recursos sem restrições.
              </Text>
            </View>

            {/* Lista de Vantagens Pro */}
            <View style={styles.benefitsList}>
              {benefits.map((item, index) => (
                <View key={index} style={styles.benefitRow}>
                  <View style={styles.benefitIconWrap}>
                    <Ionicons name={item.icon as any} size={22} color={colors.primary} />
                  </View>
                  <View style={styles.benefitTextWrap}>
                    <Text style={styles.benefitTitle}>{item.title}</Text>
                    <Text style={styles.benefitDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Seletor de Planos */}
            <View style={styles.plansContainer}>
              {packages.map((pkg) => {
                const isSelected = selectedPlanId === pkg.id;
                return (
                  <TouchableOpacity
                    key={pkg.id}
                    style={[
                      styles.planCard,
                      shadows.card,
                      isSelected && styles.planCardSelected,
                    ]}
                    activeOpacity={0.88}
                    onPress={() => setSelectedPlanId(pkg.id)}
                  >
                    {pkg.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{pkg.badge.toUpperCase()}</Text>
                      </View>
                    )}

                    <View style={styles.planHeaderRow}>
                      <View style={styles.radioCircle}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{pkg.name}</Text>
                        <Text style={styles.planDescription}>{pkg.description}</Text>
                      </View>
                    </View>

                    <View style={styles.planPriceRow}>
                      <Text style={styles.planPrice}>{pkg.price}</Text>
                      {pkg.monthlyEquivalentPrice && (
                        <Text style={styles.planMonthlyEquivalent}>
                          ({pkg.monthlyEquivalentPrice})
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Botão de Ação CTA */}
            <View style={styles.ctaContainer}>
              <AppButton
                title={
                  selectedPlanId === 'scanpro_pro_yearly'
                    ? 'Experimentar 3 Dias Grátis'
                    : 'Assinar ScanPro Pro'
                }
                variant="primary"
                loading={isLoading}
                disabled={isLoading}
                onPress={handlePurchase}
                style={styles.ctaButton}
              />
              <Text style={styles.guaranteeText}>
                {selectedPlanId === 'scanpro_pro_yearly'
                  ? '3 dias grátis, depois R$ 99,90 por ano. Cancele quando quiser antes do fim do teste.'
                  : 'Cobrança mensal recorrente. Sem fidelidade.'}
              </Text>
            </View>

            {/* Rodapé e Legal */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Pagamentos seguros processados com segurança. Seus dados e documentos permanecem sempre salvos localmente e protegidos.
              </Text>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.small,
  },
  closeButton: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.capsule,
    backgroundColor: '#F2F2F7',
  },
  restoreHeaderButton: {
    paddingHorizontal: spacing.small,
    paddingVertical: spacing.micro,
  },
  restoreHeaderText: {
    ...typography.subheadline,
    color: colors.primary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: spacing.section,
    paddingBottom: spacing.major,
  },
  heroSection: {
    alignItems: 'center',
    marginTop: spacing.small,
    marginBottom: spacing.section,
  },
  crownBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF9E6',
    borderWidth: 2,
    borderColor: '#FFE082',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.default,
  },
  heroTitle: {
    ...typography.title1,
    color: colors.textPrimary,
    fontWeight: '800',
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.subheadline,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.micro,
    paddingHorizontal: spacing.default,
    lineHeight: 20,
  },
  benefitsList: {
    marginBottom: spacing.section,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.default,
  },
  benefitIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radii.standard,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.default,
  },
  benefitTextWrap: {
    flex: 1,
  },
  benefitTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  benefitDesc: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  plansContainer: {
    gap: spacing.default,
    marginBottom: spacing.section,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.prominentCards,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    padding: spacing.default,
    position: 'relative',
  },
  planCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F8FAFF',
  },
  planBadge: {
    position: 'absolute',
    top: -12,
    right: 16,
    backgroundColor: '#FF9500',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.capsule,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.small,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
    marginTop: 2,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  planName: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  planDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingLeft: 34,
  },
  planPrice: {
    ...typography.title3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  planMonthlyEquivalent: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginLeft: spacing.small,
  },
  ctaContainer: {
    alignItems: 'center',
    marginBottom: spacing.section,
  },
  ctaButton: {
    width: '100%',
    height: 52,
    borderRadius: radii.standard,
  },
  guaranteeText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.small,
    paddingHorizontal: spacing.default,
  },
  footer: {
    paddingTop: spacing.small,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  footerText: {
    ...typography.caption,
    color: '#A1A1A6',
    textAlign: 'center',
    lineHeight: 16,
  },
});
