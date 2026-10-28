import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { packages, isPro, purchasePackage, restorePurchases, redeemCoupon, isLoading } = usePremiumStore();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('scanpro_pro_yearly');

  // Estados do Modal de Checkout Seguro e Faturamento
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'google_play' | 'pix' | 'credit_card'>('google_play');
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // Estados do Cupom de Desconto / Gift Card
  const [isCouponModalVisible, setIsCouponModalVisible] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [isRedeemingCoupon, setIsRedeemingCoupon] = useState(false);

  const selectedPkg = packages.find((p) => p.id === selectedPlanId) || packages[0];

  React.useEffect(() => {
    if (visible) {
      TelemetryService.track('paywall_viewed', { selectedPlan: selectedPlanId });
    }
  }, [visible, selectedPlanId]);

  // No CTA inicial: no Android dispara o Google Play Billing oficial diretamente; no Web abre checkout
  const handleOpenCheckout = async () => {
    if (Platform.OS === 'android') {
      setIsProcessingCheckout(true);
      try {
        const success = await purchasePackage(selectedPlanId);
        if (success) {
          TelemetryService.track('subscription_purchased', {
            planId: selectedPlanId,
            platform: 'google_play',
          });
          Alert.alert(
            'Bem-vindo ao ScanPro Pro! 🎉',
            `Sua assinatura (${selectedPkg.name}) foi confirmada e ativada com sucesso!`
          );
          onClose();
        }
      } catch (err: any) {
        if (err?.userCancelled) {
          return;
        }
        Alert.alert(
          'Google Play Billing',
          err instanceof Error ? err.message : 'Não foi possível processar a assinatura no momento.'
        );
      } finally {
        setIsProcessingCheckout(false);
      }
      return;
    }

    setIsCheckoutVisible(true);
  };

  // Processa a confirmação expressa do pagamento e ativação da assinatura
  const handleConfirmCheckout = async () => {
    setIsProcessingCheckout(true);
    try {
      // Simulação / chamada de verificação da operadora de pagamento / Google Play
      await new Promise((resolve) => setTimeout(resolve, 1400));
      const success = await purchasePackage(selectedPlanId);
      if (success) {
        TelemetryService.track('subscription_purchased', {
          planId: selectedPlanId,
          paymentMethod: selectedPaymentMethod,
        });
        setIsCheckoutVisible(false);
        Alert.alert(
          'Bem-vindo ao ScanPro Pro! 🎉',
          `Sua assinatura (${selectedPkg.name}) foi confirmada e ativada com sucesso! Agora você tem digitalizações e OCR sem limites.`
        );
        onClose();
      } else {
        Alert.alert('Erro no Pagamento', 'Não foi possível processar a assinatura. Tente novamente.');
      }
    } catch (err) {
      Alert.alert('Erro na Compra', 'Ocorreu um erro ao comunicar com a plataforma de pagamentos.');
    } finally {
      setIsProcessingCheckout(false);
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

  const handleRedeemCoupon = async (codeToUse?: string) => {
    const code = (codeToUse || couponCodeInput).trim();
    if (!code) {
      Alert.alert('Aviso', 'Digite o código do cupom ou Gift Card para ativar.');
      return;
    }

    setIsRedeemingCoupon(true);
    try {
      const res = await redeemCoupon(code);
      if (res.success) {
        TelemetryService.track('coupon_redeemed', { code: code.toUpperCase() });
        setIsCouponModalVisible(false);
        setCouponCodeInput('');
        Alert.alert('Parabéns! 🎉', res.message);
        onClose();
      } else {
        Alert.alert('Cupom Inválido', res.message);
      }
    } catch {
      Alert.alert('Erro', 'Ocorreu um erro ao processar o código.');
    } finally {
      setIsRedeemingCoupon(false);
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
    {
      icon: 'logo-dropbox',
      title: 'Backup Automático no Dropbox',
      desc: 'Envie seus PDFs direto para sua pasta no Dropbox sem precisar exportar manualmente.',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.safeArea,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: Math.max(insets.left, insets.right, 16),
          },
        ]}
      >
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

            {/* Banner de Cupom ou Gift Card de Desconto/Ativação */}
            <TouchableOpacity
              style={[styles.giftCardBanner, shadows.card]}
              onPress={() => setIsCouponModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.giftCardIconCircle}>
                <Ionicons name="gift" size={20} color="#FF9500" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.giftCardTitle}>Possui um Cupom ou Gift Card?</Text>
                  <View style={styles.giftBadge}>
                    <Text style={styles.giftBadgeText}>RESGATAR</Text>
                  </View>
                </View>
                <Text style={styles.giftCardSubtitle}>
                  Ative o Plano Pro diretamente com seu código
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

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
                onPress={handleOpenCheckout}
                style={styles.ctaButton}
              />
              <Text style={styles.guaranteeText}>
                {selectedPlanId === 'scanpro_pro_yearly'
                  ? '3 dias grátis, depois R$ 49,90 por ano. Cancele quando quiser antes do fim do teste.'
                  : 'Apenas R$ 3,99 por mês. Sem fidelidade, cancele a qualquer momento.'}
              </Text>
            </View>

            {/* Rodapé e Legal com conformidade Google Play Store */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {Platform.OS === 'android'
                  ? 'A assinatura será cobrada na sua conta Google Play após a confirmação. A renovação é automática a menos que seja cancelada até 24h antes do fim do período de teste ou atual nas configurações do Google Play.'
                  : 'Pagamentos protegidos e seguros. Seus dados e documentos permanecem sempre salvos localmente no seu dispositivo.'}
              </Text>
              <View style={styles.legalLinksRow}>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    router.push('/privacy');
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.legalLinkText}>Política de Privacidade</Text>
                </TouchableOpacity>
                <Text style={styles.legalSeparator}>•</Text>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    router.push('/terms' as any);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.legalLinkText}>Termos de Uso</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Modal de Faturamento e Checkout Seguro */}
      <Modal
        visible={isCheckoutVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCheckoutVisible(false)}
      >
        <View style={styles.checkoutOverlay}>
          <View style={[styles.checkoutCard, shadows.elevated]}>
            {/* Header do Checkout */}
            <View style={styles.checkoutHeader}>
              <View style={styles.checkoutHeaderTitleWrap}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.checkoutTitle}>Faturamento & Assinatura</Text>
              </View>
              <TouchableOpacity
                style={styles.checkoutCloseBtn}
                onPress={() => setIsCheckoutVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Resumo do Pedido */}
              <View style={styles.orderSummaryCard}>
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Plano:</Text>
                  <Text style={styles.orderValue}>{selectedPkg?.name}</Text>
                </View>
                <View style={styles.orderRow}>
                  <Text style={styles.orderLabel}>Valor da Cobrança:</Text>
                  <Text style={styles.orderPriceHighlight}>{selectedPkg?.price}</Text>
                </View>
                {selectedPkg?.trialDays ? (
                  <View style={styles.trialNoticeRow}>
                    <Ionicons name="sparkles" size={14} color="#D97706" style={{ marginRight: 6 }} />
                    <Text style={styles.trialNoticeText}>
                      Primeiros 3 dias são 100% gratuitos. Cancele antes para não ser cobrado.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.trialNoticeRow}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginRight: 6 }} />
                    <Text style={styles.trialNoticeText}>Cobrança recorrente mensal com cancelamento a qualquer momento.</Text>
                  </View>
                )}
              </View>

              {/* Escolha do Método de Cobrança */}
              <Text style={styles.paymentMethodTitle}>Forma de Pagamento</Text>

              {/* Opção 1: Google Play Billing */}
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  selectedPaymentMethod === 'google_play' && styles.paymentOptionCardSelected,
                ]}
                onPress={() => setSelectedPaymentMethod('google_play')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentOptionRadio}>
                  {selectedPaymentMethod === 'google_play' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.paymentOptionIconWrap}>
                  <Ionicons name="logo-google-playstore" size={22} color="#007AFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionName}>Google Play Faturamento</Text>
                  <Text style={styles.paymentOptionDesc}>Cobrança via conta Google cadastrada no aparelho</Text>
                </View>
              </TouchableOpacity>

              {/* Opção 2: Pix Instantâneo */}
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  selectedPaymentMethod === 'pix' && styles.paymentOptionCardSelected,
                ]}
                onPress={() => setSelectedPaymentMethod('pix')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentOptionRadio}>
                  {selectedPaymentMethod === 'pix' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.paymentOptionIconWrap}>
                  <Ionicons name="flash" size={22} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionName}>Pix Instantâneo</Text>
                  <Text style={styles.paymentOptionDesc}>Liberação imediata via chave Pix Copia e Cola</Text>
                </View>
              </TouchableOpacity>

              {/* Opção 3: Cartão de Crédito */}
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  selectedPaymentMethod === 'credit_card' && styles.paymentOptionCardSelected,
                ]}
                onPress={() => setSelectedPaymentMethod('credit_card')}
                activeOpacity={0.8}
              >
                <View style={styles.paymentOptionRadio}>
                  {selectedPaymentMethod === 'credit_card' && <View style={styles.radioInner} />}
                </View>
                <View style={styles.paymentOptionIconWrap}>
                  <Ionicons name="card" size={22} color="#6366F1" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionName}>Cartão de Crédito</Text>
                  <Text style={styles.paymentOptionDesc}>Visa, Mastercard, Elo e Hipercard</Text>
                </View>
              </TouchableOpacity>

              {/* Bloco Dinâmico do Pix */}
              {selectedPaymentMethod === 'pix' && (
                <View style={styles.pixBox}>
                  <Text style={styles.pixBoxTitle}>Chave Pix Copia e Cola:</Text>
                  <View style={styles.pixKeyWrapper}>
                    <Text style={styles.pixKeyText} numberOfLines={2} selectable>
                      00020126580014br.gov.bcb.pix0136scanpro-pagamentos@ecomti.com.br5204000053039865802BR
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pixCopyBtn, pixCopied && styles.pixCopyBtnDone]}
                    onPress={() => {
                      setPixCopied(true);
                      Alert.alert('Chave Pix Copiada!', 'Abra o app do seu banco e cole a chave Pix para concluir a assinatura de ' + selectedPkg.price);
                    }}
                  >
                    <Ionicons name={pixCopied ? 'checkmark-circle' : 'copy-outline'} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.pixCopyBtnText}>{pixCopied ? 'Chave Copiada ✔️' : 'Copiar Chave Pix'}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Aviso Legal de Assinatura */}
              <Text style={styles.checkoutDisclaimer}>
                {selectedPaymentMethod === 'google_play'
                  ? 'A cobrança será processada com segurança pelo faturamento do Google Play. Você pode gerenciar ou cancelar a assinatura a qualquer momento em Google Play > Pagamentos e Assinaturas.'
                  : 'Cobrança segura com criptografia ponta a ponta. Cancele quando quiser diretamente pelo app.'}
              </Text>

              {/* Botões de Confirmação */}
              <View style={styles.checkoutActions}>
                <AppButton
                  title={
                    isProcessingCheckout
                      ? 'Processando cobrança...'
                      : selectedPaymentMethod === 'google_play'
                      ? `Confirmar Assinatura (${selectedPkg.price})`
                      : selectedPaymentMethod === 'pix'
                      ? 'Confirmar Pagamento Pix Realizado'
                      : `Confirmar e Pagar (${selectedPkg.price})`
                  }
                  variant="primary"
                  loading={isProcessingCheckout}
                  disabled={isProcessingCheckout}
                  onPress={handleConfirmCheckout}
                  style={styles.checkoutConfirmBtn}
                />
                <TouchableOpacity
                  style={styles.checkoutCancelBtn}
                  onPress={() => setIsCheckoutVisible(false)}
                  disabled={isProcessingCheckout}
                >
                  <Text style={styles.checkoutCancelText}>Cancelar e Voltar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Resgate de Cupom / Gift Card Pro */}
      <Modal
        visible={isCouponModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isRedeemingCoupon && setIsCouponModalVisible(false)}
      >
        <View style={styles.couponModalOverlay}>
          <ScrollView
            contentContainerStyle={styles.couponModalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.couponModalCard, shadows.elevated]}>
              <View style={styles.couponModalHeader}>
                <View style={styles.couponIconCircle}>
                  <Ionicons name="gift" size={26} color="#FF9500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.couponModalTitle}>Resgatar Gift Card / Cupom</Text>
                  <Text style={styles.couponModalSubtitle}>
                    Ative o Plano Pro completo com seu código promocional
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.couponCloseBtn}
                  onPress={() => setIsCouponModalVisible(false)}
                  disabled={isRedeemingCoupon}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.couponInputLabel}>Código de Ativação</Text>
              <TextInput
                style={styles.couponInput}
                value={couponCodeInput}
                onChangeText={(text) => setCouponCodeInput(text.toUpperCase())}
                placeholder="Ex: PRO2026 ou SCANPRO-VIP"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!isRedeemingCoupon}
              />

              {/* Sugestões de Códigos Rápidos para Testes e Demonstração */}
              <Text style={styles.couponQuickTitle}>Códigos de Demonstração:</Text>
              <View style={styles.couponQuickRow}>
                {[
                  { label: 'PRO2026 (1 Ano)', code: 'PRO2026' },
                  { label: 'SCANPRO-VIP (1 Ano)', code: 'SCANPRO-VIP' },
                  { label: 'PRO-VITALICIO (Ilimitado)', code: 'PRO-VITALICIO' },
                  { label: 'PRO-MENSAL (1 Mês)', code: 'PRO-MENSAL' },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.code}
                    style={styles.couponQuickChip}
                    onPress={() => setCouponCodeInput(item.code)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sparkles" size={11} color="#FF9500" />
                    <Text style={styles.couponQuickChipText}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.couponActionsRow}>
                <AppButton
                  title="Cancelar"
                  variant="tertiary"
                  onPress={() => setIsCouponModalVisible(false)}
                  disabled={isRedeemingCoupon}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title={isRedeemingCoupon ? 'Validando...' : 'Ativar Plano Pro'}
                  variant="primary"
                  onPress={() => handleRedeemCoupon()}
                  loading={isRedeemingCoupon}
                  disabled={isRedeemingCoupon || !couponCodeInput.trim()}
                  style={{ flex: 1 }}
                  icon={<Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  checkoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  checkoutCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.prominentCards,
    borderTopRightRadius: radii.prominentCards,
    paddingHorizontal: spacing.default,
    paddingTop: spacing.default,
    paddingBottom: spacing.section,
    maxHeight: '85%',
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    marginBottom: spacing.small,
  },
  checkoutHeaderTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkoutTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  checkoutCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderSummaryCard: {
    backgroundColor: colors.background,
    borderRadius: radii.standard,
    padding: spacing.default,
    marginBottom: spacing.default,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderLabel: {
    ...typography.subheadline,
    color: colors.textSecondary,
  },
  orderValue: {
    ...typography.subheadline,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderPriceHighlight: {
    ...typography.title3,
    fontWeight: '800',
    color: colors.primary,
  },
  trialNoticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.small,
    paddingVertical: 6,
    borderRadius: radii.small,
    marginTop: 6,
  },
  trialNoticeText: {
    ...typography.caption,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
    fontSize: 11,
  },
  paymentMethodTitle: {
    ...typography.subheadline,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.small,
    marginTop: spacing.compact,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: radii.standard,
    padding: spacing.small,
    marginBottom: spacing.small,
  },
  paymentOptionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 102, 204, 0.04)',
  },
  paymentOptionRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  paymentOptionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentOptionName: {
    ...typography.subheadline,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  paymentOptionDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  pixBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: radii.standard,
    padding: spacing.small,
    marginBottom: spacing.default,
  },
  pixBoxTitle: {
    ...typography.caption,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 4,
  },
  pixKeyWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.small,
    padding: 8,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: 8,
  },
  pixKeyText: {
    ...typography.caption,
    fontSize: 10,
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  pixCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 8,
    borderRadius: radii.small,
  },
  pixCopyBtnDone: {
    backgroundColor: '#15803D',
  },
  pixCopyBtnText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  checkoutDisclaimer: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginVertical: spacing.small,
    paddingHorizontal: spacing.compact,
  },
  checkoutActions: {
    marginTop: spacing.small,
    gap: spacing.small,
  },
  checkoutConfirmBtn: {
    width: '100%',
    height: 50,
  },
  checkoutCancelBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  checkoutCancelText: {
    ...typography.subheadline,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  giftCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radii.cards,
    padding: spacing.default,
    marginTop: spacing.small,
    marginBottom: spacing.default,
    gap: spacing.compact,
  },
  giftCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftCardTitle: {
    ...typography.headline,
    fontSize: 14,
    color: '#92400E',
    fontWeight: '700',
  },
  giftCardSubtitle: {
    ...typography.caption,
    color: '#B45309',
    marginTop: 2,
    fontSize: 12,
  },
  giftBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radii.small,
  },
  giftBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  couponModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  couponModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.default,
  },
  couponModalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.default,
  },
  couponModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.compact,
    marginBottom: spacing.small,
  },
  couponIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  couponModalTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  couponModalSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  couponCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  couponInputLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.compact,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  couponInput: {
    height: 48,
    backgroundColor: colors.background,
    borderRadius: radii.standard,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    paddingHorizontal: spacing.default,
    ...typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: '#B45309',
    letterSpacing: 1.2,
    marginBottom: spacing.small,
  },
  couponQuickTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  couponQuickRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.default,
  },
  couponQuickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: radii.capsule,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  couponQuickChipText: {
    ...typography.caption,
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  couponActionsRow: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  legalLinksRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.compact,
    gap: spacing.compact,
  },
  legalLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
