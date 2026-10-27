/**
 * ScanPro — Premium Service
 * Gerencia status de assinaturas, pacotes e entitlements (RevenueCat-compatible).
 * Local-first com persistência e suporte a compras em web e mobile.
 */

import { PaywallPackage, PremiumEntitlement, PlanPeriod, CouponRedeemResult } from './types';

const STORAGE_KEY = 'scanpro_premium_entitlement';

export class PremiumService {
  private static packages: PaywallPackage[] = [
    {
      id: 'scanpro_pro_yearly',
      name: 'Anual (Mais Popular)',
      period: 'yearly',
      price: 'R$ 49,90/ano',
      monthlyEquivalentPrice: 'R$ 4,15/mês',
      badge: 'Melhor Custo-Benefício',
      trialDays: 3,
      description: '3 dias grátis, depois R$ 49,90 por ano. Cancele quando quiser.',
    },
    {
      id: 'scanpro_pro_monthly',
      name: 'Mensal',
      period: 'monthly',
      price: 'R$ 3,99/mês',
      description: 'Apenas R$ 3,99 por mês com flexibilidade total.',
    },
  ];

  /**
   * Obtém os pacotes de assinatura disponíveis para exibição no Paywall
   */
  static getPackages(): PaywallPackage[] {
    return this.packages;
  }

  /**
   * Carrega o entitlement atual da assinatura
   */
  static getEntitlement(): PremiumEntitlement {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          // Verifica se expirou caso haja data definida
          if (parsed.expirationDate && new Date(parsed.expirationDate) < new Date()) {
            return { tier: 'free', isActive: false };
          }
          return parsed;
        }
      } catch {
        // Fallback para free se falhar a leitura
      }
    }

    return {
      tier: 'free',
      isActive: false,
    };
  }

  /**
   * Verifica se o usuário possui acesso ativo às funcionalidades Pro
   */
  static isPro(): boolean {
    const entitlement = this.getEntitlement();
    return entitlement.isActive && entitlement.tier === 'pro';
  }

  /**
   * Realiza a compra/ativação de um pacote Pro
   */
  static async purchasePackage(packageId: string): Promise<PremiumEntitlement> {
    const pkg = this.packages.find((p) => p.id === packageId) || this.packages[0];
    const now = new Date();
    const expiration = new Date();

    if (pkg.period === 'yearly') {
      expiration.setFullYear(now.getFullYear() + 1);
    } else {
      expiration.setMonth(now.getMonth() + 1);
    }

    const entitlement: PremiumEntitlement = {
      tier: 'pro',
      isActive: true,
      plan: pkg.period,
      originalPurchaseDate: now.toISOString(),
      expirationDate: expiration.toISOString(),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlement));
    }

    return entitlement;
  }

  /**
   * Resgata um cupom ou gift card de ativação do Plano Pro
   */
  static async redeemCoupon(code: string): Promise<CouponRedeemResult> {
    const cleanCode = (code || '').trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanCode) {
      return {
        success: false,
        message: 'Por favor, digite o código do cupom ou Gift Card.',
      };
    }

    const now = new Date();
    let period: PlanPeriod = 'yearly';
    let expiration = new Date();
    let message = 'Parabéns! Seu Plano Pro foi ativado com sucesso via Gift Card! 🎉';

    // 1. Cupons Vitalícios / Ilimitados
    const lifetimeCodes = ['PRO-VITALICIO', 'SCANPRO-VITALICIO', 'LIFETIME', 'VIP-LIFETIME', 'SCANPRO-VIP-PERMANENTE'];
    // 2. Cupons Mensais
    const monthlyCodes = ['PRO-MENSAL', 'SCANPRO-1M', 'MENSAL-FREE', 'PRO-MES'];
    // 3. Cupons Anuais (Padrão 1 ano)
    const yearlyCodes = [
      'PRO2026',
      'SCANPROVIP',
      'SCANPRO-VIP',
      'PRO-1ANO',
      'SCANPRO-1Y',
      'ANUAL-FREE',
      'GIFTCARD',
      'PRO-GIFT',
      'SCANPRO-GIFT',
      'PROMO2026',
      'PRO-VIP',
    ];

    if (lifetimeCodes.includes(cleanCode)) {
      period = 'lifetime';
      expiration = new Date('2099-12-31T23:59:59.000Z');
      message = 'Sensacional! Seu cupom Vitalício foi ativado! Acesso ilimitado e permanente ao ScanPro Pro. 💎';
    } else if (monthlyCodes.includes(cleanCode)) {
      period = 'monthly';
      expiration.setMonth(now.getMonth() + 1);
      message = 'Gift Card ativado! Você ganhou 1 mês de acesso completo ao ScanPro Pro. 🎉';
    } else if (
      yearlyCodes.includes(cleanCode) ||
      cleanCode.startsWith('GIFT-') ||
      cleanCode.startsWith('PRO-') ||
      cleanCode.startsWith('VIP-') ||
      cleanCode.startsWith('SCAN-') ||
      cleanCode.startsWith('SCANPRO-')
    ) {
      period = 'yearly';
      expiration.setFullYear(now.getFullYear() + 1);
      message = 'Gift Card ativado com sucesso! Você ganhou 1 ano completo de ScanPro Pro. 🎉';
    } else {
      return {
        success: false,
        message: 'Código de cupom ou gift card inválido. Verifique se digitou corretamente.',
      };
    }

    const entitlement: PremiumEntitlement = {
      tier: 'pro',
      isActive: true,
      plan: period,
      couponCode: cleanCode,
      isGiftCard: true,
      originalPurchaseDate: now.toISOString(),
      expirationDate: expiration.toISOString(),
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlement));
    }

    return {
      success: true,
      message,
      entitlement,
    };
  }

  /**
   * Restaura compras existentes
   */
  static async restorePurchases(): Promise<PremiumEntitlement> {
    return this.getEntitlement();
  }

  /**
   * Cancela assinatura (volta ao free)
   */
  static async cancelSubscription(): Promise<PremiumEntitlement> {
    const entitlement: PremiumEntitlement = {
      tier: 'free',
      isActive: false,
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlement));
    }

    return entitlement;
  }
}
