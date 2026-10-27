/**
 * ScanPro — Premium & Entitlements Types
 * Conforme especificado na Fase 9 do ROADMAP.md
 */

export type SubscriptionTier = 'free' | 'pro';

export type PlanPeriod = 'monthly' | 'yearly' | 'lifetime';

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
  couponCode?: string;
  isGiftCard?: boolean;
}

export interface CouponRedeemResult {
  success: boolean;
  message: string;
  entitlement?: PremiumEntitlement;
}
