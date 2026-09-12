/**
 * ScanPro — Premium Service
 * Gerencia status de assinaturas, pacotes e entitlements (RevenueCat-compatible).
 * Local-first com persistência e suporte a compras em web e mobile.
 */

import { PaywallPackage, PremiumEntitlement, PlanPeriod } from './types';

const STORAGE_KEY = 'scanpro_premium_entitlement';

export class PremiumService {
  private static packages: PaywallPackage[] = [
    {
      id: 'scanpro_pro_yearly',
      name: 'Anual (Recomendado)',
      period: 'yearly',
      price: 'R$ 99,90/ano',
      monthlyEquivalentPrice: 'R$ 8,32/mês',
      badge: 'Economize 44%',
      trialDays: 3,
      description: '3 dias grátis, depois R$ 99,90 por ano. Cancele quando quiser.',
    },
    {
      id: 'scanpro_pro_monthly',
      name: 'Mensal',
      period: 'monthly',
      price: 'R$ 14,90/mês',
      description: 'Cobrança mensal recorrente. Flexibilidade total.',
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
