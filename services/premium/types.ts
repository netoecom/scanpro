/**
 * ScanPro — Premium & Entitlements Types
 * Conforme especificado na Fase 9 do ROADMAP.md
 */

export type SubscriptionTier = 'free' | 'pro';

export type PlanPeriod = 'monthly' | 'yearly';

export interface PaywallPackage {
  id: string;
  name: string;
  period: PlanPeriod;
  price: string;
  monthlyEquivalentPrice?: string;
  badge?: string;
  trialDays?: number;
  description: string;
}

export interface PremiumEntitlement {
  tier: SubscriptionTier;
  isActive: boolean;
  plan?: PlanPeriod;
  expirationDate?: string;
  originalPurchaseDate?: string;
}
