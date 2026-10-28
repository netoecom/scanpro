/**
 * ScanPro — RevenueCat Service
 * Ponte entre o aplicativo (Android/iOS) e a API do RevenueCat / Google Play Billing.
 * Oferece inicialização segura, fallback para Web e compatibilidade com local-first.
 */

import { Platform } from 'react-native';
import Purchases, {
  CustomerInfo,
  PurchasesPackage,
  PurchasesOfferings,
} from 'react-native-purchases';
import { REVENUECAT_CONFIG } from './revenueCatConfig';
import { PaywallPackage, PremiumEntitlement, PlanPeriod } from './types';

export class RevenueCatService {
  private static isConfigured = false;
  private static cachedPackages: PurchasesPackage[] = [];

  /**
   * Inicializa o SDK do RevenueCat em plataformas móveis nativas
   */
  static async initialize(appUserId?: string): Promise<void> {
    if (Platform.OS === 'web') {
      return;
    }

    if (this.isConfigured) {
      return;
    }

    try {
      Purchases.configure({
        apiKey: REVENUECAT_CONFIG.apiKey,
        appUserID: appUserId || null,
      });
      this.isConfigured = true;
      console.log('ScanPro: RevenueCat configurado com sucesso para Google Play Billing.');
    } catch (err) {
      console.warn('ScanPro: Falha ao inicializar RevenueCat:', err);
    }
  }

  /**
   * Verifica se o RevenueCat está ativo e configurado
   */
  static isAvailable(): boolean {
    return Platform.OS !== 'web' && this.isConfigured;
  }

  /**
   * Converte um CustomerInfo do RevenueCat para o PremiumEntitlement da aplicação
   */
  private static parseCustomerInfo(customerInfo: CustomerInfo): PremiumEntitlement {
    const entitlement = customerInfo.entitlements.active[REVENUECAT_CONFIG.entitlementId];
    if (entitlement && entitlement.isActive) {
      const period: PlanPeriod = entitlement.productIdentifier.includes('yearly')
        ? 'yearly'
        : 'monthly';

      return {
        tier: 'pro',
        isActive: true,
        plan: period,
        originalPurchaseDate: entitlement.originalPurchaseDate,
        expirationDate: entitlement.expirationDate || undefined,
      };
    }

    return {
      tier: 'free',
      isActive: false,
    };
  }

  /**
   * Obtém os pacotes de assinatura diretamente do RevenueCat / Google Play Console
   */
  static async fetchPackages(): Promise<PaywallPackage[] | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const offerings: PurchasesOfferings = await Purchases.getOfferings();
      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        return null;
      }

      this.cachedPackages = offerings.current.availablePackages;

      return offerings.current.availablePackages.map((rcPkg: PurchasesPackage) => {
        const isYearly =
          rcPkg.packageType === 'ANNUAL' ||
          rcPkg.product.identifier.includes('yearly') ||
          rcPkg.identifier.includes('yearly');

        const period: PlanPeriod = isYearly ? 'yearly' : 'monthly';

        return {
          id: rcPkg.product.identifier,
          name: isYearly ? 'Anual (Mais Popular)' : 'Mensal',
          period,
          price: rcPkg.product.priceString,
          monthlyEquivalentPrice: isYearly ? 'R$ 4,15/mês' : undefined,
          badge: isYearly ? 'Melhor Custo-Benefício' : undefined,
          trialDays: isYearly ? 3 : undefined,
          description: isYearly
            ? '3 dias grátis, depois cobrança anual. Cancele quando quiser no Google Play.'
            : `${rcPkg.product.priceString} por mês com flexibilidade total.`,
        };
      });
    } catch (err) {
      console.warn('ScanPro: Não foi possível obter offerings do RevenueCat, usando fallback local:', err);
      return null;
    }
  }

  /**
   * Realiza a compra do pacote pelo Google Play Billing
   */
  static async purchasePackage(packageId: string): Promise<PremiumEntitlement> {
    if (!this.isAvailable()) {
      throw new Error('Google Play Billing indisponível nesta plataforma.');
    }

    let targetPackage = this.cachedPackages.find(
      (p) => p.product.identifier === packageId || p.identifier === packageId
    );

    if (!targetPackage) {
      // Recarrega pacotes se não estiver em cache
      await this.fetchPackages();
      targetPackage = this.cachedPackages.find(
        (p) => p.product.identifier === packageId || p.identifier === packageId
      );
    }

    if (!targetPackage) {
      throw new Error(`Pacote ${packageId} não encontrado no Google Play.`);
    }

    const { customerInfo } = await Purchases.purchasePackage(targetPackage);
    return this.parseCustomerInfo(customerInfo);
  }

  /**
   * Restaura compras anteriores associadas à conta da Google Play
   */
  static async restorePurchases(): Promise<PremiumEntitlement> {
    if (!this.isAvailable()) {
      return { tier: 'free', isActive: false };
    }

    const customerInfo = await Purchases.restorePurchases();
    return this.parseCustomerInfo(customerInfo);
  }

  /**
   * Consulta o status atual da assinatura
   */
  static async checkStatus(): Promise<PremiumEntitlement | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return this.parseCustomerInfo(customerInfo);
    } catch (err) {
      console.warn('ScanPro: Erro ao consultar CustomerInfo no RevenueCat:', err);
      return null;
    }
  }

  /**
   * Registra listener para atualizações reativas de assinatura
   */
  static addCustomerInfoUpdateListener(
    listener: (entitlement: PremiumEntitlement) => void
  ): () => void {
    if (!this.isAvailable()) {
      return () => {};
    }

    const sub = (info: CustomerInfo) => {
      listener(this.parseCustomerInfo(info));
    };

    Purchases.addCustomerInfoUpdateListener(sub);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(sub);
    };
  }

  /**
   * Exibe o Paywall nativo do RevenueCat (RevenueCatUI.presentPaywall)
   * Permite testar o paywall nativo diretamente no Android e validar a compra com testadores de licença.
   */
  static async presentPaywall(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return false;
    }

    try {
      // Import dinâmico protegido para compatibilidade com web e testes
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const RevenueCatUI = require('react-native-purchases-ui').default;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { PAYWALL_RESULT } = require('react-native-purchases-ui');

      const result = await RevenueCatUI.presentPaywall();

      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        return true;
      }
      return false;
    } catch (err) {
      console.warn('ScanPro: Erro ao exibir RevenueCatUI.presentPaywall:', err);
      return false;
    }
  }
}

