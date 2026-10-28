/**
 * ScanPro — Termos de Uso (Terms of Service)
 * Em conformidade com a Google Play Developer Policy, Código de Defesa do Consumidor e LGPD.
 * Acessível publicamente via web em https://scanpro.ecomti.com.br/terms
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget } from '../theme';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Termos de Uso</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeContainer}>
          <Ionicons name="document-text" size={20} color={colors.primary} />
          <Text style={styles.badgeText}>Termos de Serviço & Assinatura</Text>
        </View>

        <Text style={styles.lastUpdated}>Última atualização: 28 de outubro de 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
          <Text style={styles.paragraph}>
            Ao baixar, instalar ou utilizar o aplicativo <Text style={styles.bold}>ScanPro</Text>, você concorda com estes Termos de Uso e com nossa Política de Privacidade. Caso não concorde com qualquer disposição aqui estipulada, recomendamos a não utilização do aplicativo.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Descrição do Serviço & Filosofia Local-First</Text>
          <Text style={styles.paragraph}>
            O ScanPro é um aplicativo de scanner e gerenciamento de documentos físicos projetado com arquitetura <Text style={styles.bold}>Local-First</Text>. Todas as capturas, detecções de bordas, correções de perspectiva, filtros de imagem e exportações em PDF acontecem diretamente no seu dispositivo, sem dependência obrigatória de conexão com a internet.
          </Text>
          <Text style={styles.paragraph}>
            Você é o único e soberano proprietário de todos os documentos digitalizados, gerados e armazenados no seu dispositivo através do aplicativo.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Planos, Assinaturas & Cobrança (Google Play)</Text>
          <Text style={styles.paragraph}>
            O ScanPro oferece uma versão gratuita com recursos essenciais e uma assinatura premium denominada <Text style={styles.bold}>ScanPro Pro</Text> (com planos mensal e anual).
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>• Período de Teste Gratuito (Free Trial):</Text> Quando oferecido, o período de teste grátis (ex: 3 dias) concede acesso total às funcionalidades Pro. A cobrança da assinatura ocorrerá automaticamente ao término desse período, a menos que o cancelamento seja realizado pelo usuário com pelo menos 24 horas de antecedência.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>• Renovação Automática:</Text> As assinaturas contratadas via Google Play Store renovam-se automaticamente de forma contínua pelo mesmo período e valor contratado, a menos que sejam canceladas pelo usuário nas configurações de sua conta Google Play.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>• Como Cancelar:</Text> Você pode cancelar a qualquer momento diretamente pelo aplicativo Google Play no seu dispositivo Android (abra o app Google Play &gt; toque na sua foto de perfil &gt; <Text style={styles.bold}>Pagamentos e assinaturas</Text> &gt; Assinaturas &gt; ScanPro &gt; Cancelar assinatura).
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>• Reembolsos:</Text> Pagamentos processados pelo Google Play Billing seguem rigorosamente a política de reembolso oficial do Google Play.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Cupons Promocionais & Gift Cards</Text>
          <Text style={styles.paragraph}>
            O ScanPro permite a ativação de períodos promocionais ou vitalícios através de códigos promocionais e gift cards válidos. Os cupons são intransferíveis e sujeitos às condições de prazo estipuladas no momento da concessão da campanha.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Integração com Serviços de Terceiros (Dropbox)</Text>
          <Text style={styles.paragraph}>
            O ScanPro permite a sincronização opcional de backups em serviços em nuvem como o Dropbox. A utilização desses serviços está sujeita aos termos e políticas do respectivo provedor. O ScanPro não se responsabiliza por indisponibilidades técnicas originadas em plataformas de terceiros.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Responsabilidades do Usuário</Text>
          <Text style={styles.paragraph}>
            O usuário compromete-se a utilizar o aplicativo em conformidade com as leis aplicáveis, não utilizando o scanner para a reprodução de conteúdos ilícitos, falsificação de documentos ou violação de direitos autorais de terceiros.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Limitação de Responsabilidade</Text>
          <Text style={styles.paragraph}>
            Como aplicativo local-first, o usuário é responsável por manter cópias de segurança (backups) de seus documentos. O desenvolvedor não se responsabiliza por perdas de dados decorrentes de desinstalação sem backup, danos físicos ao dispositivo ou formatação do sistema operacional.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Alterações destes Termos</Text>
          <Text style={styles.paragraph}>
            Poderemos atualizar estes Termos periodicamente. Qualquer alteração relevante será comunicada através de atualização no próprio aplicativo ou em nosso site oficial.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Contato & Suporte</Text>
          <Text style={styles.paragraph}>
            Em caso de dúvidas, solicitações ou suporte relativo ao ScanPro e suas assinaturas, entre em contato através do e-mail oficial:
          </Text>
          <Text style={styles.contactEmail}>contato.netoecom@gmail.com</Text>
        </View>

        <View style={styles.footerSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.default,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  backButton: {
    width: touchTarget.minSize,
    height: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  headerSpacer: {
    width: touchTarget.minSize,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.default,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.micro + 2,
    borderRadius: radii.capsule,
    marginBottom: spacing.small,
    gap: spacing.micro,
  },
  badgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.section,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.default,
    marginBottom: spacing.compact,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  sectionTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.small,
  },
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.compact,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactEmail: {
    ...typography.headline,
    color: colors.primary,
    marginTop: spacing.micro,
  },
  footerSpacing: {
    height: spacing.hero,
  },
});
