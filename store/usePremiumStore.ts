/**
 * ScanPro — Premium Store (Zustand)
 * Gerencia o estado reativo da assinatura Pro e o controle de exibição do Paywall.
 */

import { create } from 'zustand';
import { PremiumService, PremiumEntitlement, PaywallPackage } from '../services/premium';

interface PremiumState {
  entitlement: PremiumEntitlement;
  isPro: boolean;
  packages: PaywallPackage[];
  isPaywallVisible: boolean;
  isLoading: boolean;

  initialize: (userId?: string) => Promise<void>;
  loadEntitlement: () => void;
  openPaywall: () => void;
  closePaywall: () => void;
  purchasePackage: (packageId: string) => Promise<boolean>;
  redeemCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  restorePurchases: () => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  entitlement: PremiumService.getEntitlement(),
  isPro: PremiumService.isPro(),
  packages: PremiumService.getPackages(),
  isPaywallVisible: false,
  isLoading: false,

  initialize: async (userId?: string) => {
    try {
      await PremiumService.initialize(userId);
      const livePackages = await PremiumService.loadPackages();
      const ent = PremiumService.getEntitlement();
      set({
        packages: livePackages,
        entitlement: ent,
        isPro: ent.isActive && ent.tier === 'pro',
      });
    } catch (err) {
      console.warn('ScanPro: Erro ao inicializar store de assinatura:', err);
    }
  },

  loadEntitlement: () => {
    const ent = PremiumService.getEntitlement();
    set({
      entitlement: ent,
      isPro: ent.isActive && ent.tier === 'pro',
    });
  },

  openPaywall: () => {
    set({ isPaywallVisible: true });
  },

  closePaywall: () => {
    set({ isPaywallVisible: false });
  },

  purchasePackage: async (packageId: string) => {
    set({ isLoading: true });
    try {
      const updated = await PremiumService.purchasePackage(packageId);
      set({
        entitlement: updated,
        isPro: true,
        isPaywallVisible: false,
        isLoading: false,
      });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  redeemCoupon: async (code: string) => {
    set({ isLoading: true });
    try {
      const res = await PremiumService.redeemCoupon(code);
      if (res.success && res.entitlement) {
        set({
          entitlement: res.entitlement,
          isPro: true,
          isPaywallVisible: false,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
      return {
        success: res.success,
        message: res.message,
      };
    } catch (err) {
      set({ isLoading: false });
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Falha ao processar o cupom.',
      };
    }
  },

  restorePurchases: async () => {
    set({ isLoading: true });
    try {
      const updated = await PremiumService.restorePurchases();
      const isNowPro = updated.isActive && updated.tier === 'pro';
      set({
        entitlement: updated,
        isPro: isNowPro,
        isLoading: false,
      });
      return isNowPro;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  cancelSubscription: async () => {
    set({ isLoading: true });
    try {
      const updated = await PremiumService.cancelSubscription();
      set({
        entitlement: updated,
        isPro: false,
        isLoading: false,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
