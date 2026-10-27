/**
 * ScanPro — RevenueCat Configuration
 * Configuração de chaves públicas do SDK e identificadores de Entitlements.
 * 
 * NOTA DE SEGURANÇA:
 * Apenas a Public SDK API Key deve ser usada no aplicativo cliente.
 * A Secret API Key (sk_...) deve ser mantida exclusivamente em servidores/dashboards privados.
 */

export const REVENUECAT_CONFIG = {
  // Public SDK Key para inicialização do client
  apiKey: 'test_JpWoBDOfRdjAkTxnjPtjCaQSeNI',

  // Identificador do Entitlement que desbloqueia os recursos no app
  entitlementId: 'pro',

  // IDs dos pacotes/produtos no Google Play e RevenueCat
  packages: {
    yearly: 'scanpro_pro_yearly',
    monthly: 'scanpro_pro_monthly',
  },

  // URL padrão de gerenciamento de assinaturas da Google Play
  playStoreSubscriptionsUrl: 'https://play.google.com/store/account/subscriptions',
} as const;
