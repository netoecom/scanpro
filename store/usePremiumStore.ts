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

  loadEntitlement: () => void;
  openPaywall: () => void;
  closePaywall: () => void;
  purchasePackage: (packageId: string) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  cancelSubscription: () => Promise<void>;
}

export const usePremiumStore = create<PremiumState>((set, get) => ({
  entitlement: PremiumService.getEntitlement(),
  isPro: PremiumService.isPro(),
  packages: PremiumService.getPackages(),
  isPaywallVisible: false,
  isLoading: false,

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
