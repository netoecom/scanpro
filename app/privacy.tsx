/**
 * ScanPro — Política de Privacidade
 * Em conformidade com a Google Play User Data Policy e LGPD.
 * Acessível publicamente via web em https://scanpro.ecomti.com.br/privacy
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

export default function PrivacyScreen() {
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
        <Text style={styles.headerTitle}>Política de Privacidade</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.badgeContainer}>
          <Ionicons name="shield-checkmark" size={20} color={colors.success} />
          <Text style={styles.badgeText}>Privacidade Local-First Garantida</Text>
        </View>

        <Text style={styles.lastUpdated}>Última atualização: 12 de setembro de 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Nosso Compromisso com sua Privacidade</Text>
          <Text style={styles.paragraph}>
            O <Text style={styles.bold}>ScanPro</Text> foi concebido sob a filosofia <Text style={styles.bold}>Local-First</Text> (Privacidade por Design). Isso significa que seu dispositivo é o proprietário soberano dos seus dados. Seus documentos, recibos, fotos e contratos pertencem exclusivamente a você e não são compartilhados com terceiros.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Uso da Câmera e Imagens</Text>
          <Text style={styles.paragraph}>
            O ScanPro solicita permissão de acesso à <Text style={styles.bold}>Câmera</Text> e à <Text style={styles.bold}>Galeria de Fotos</Text> exclusivamente para permitir que você digitalize e recorte documentos físicos.
          </Text>
          <Text style={styles.paragraph}>
            • Todo o processamento de imagem (detecção de bordas, correção de perspectiva, filtros preto e branco e geração de PDF) ocorre <Text style={styles.bold}>100% no processador do seu aparelho</Text>, sem necessidade de conexão com a internet.
          </Text>
          <Text style={styles.paragraph}>
            • Nenhuma foto é enviada para servidores de inteligência artificial ou armazenamento em nuvem sem a sua ação explícita de compartilhamento.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Reconhecimento de Texto (OCR)</Text>
          <Text style={styles.paragraph}>
            O reconhecimento óptico de caracteres (OCR) é executado localmente on-device. Os textos extraídos de faturas ou recibos são salvos apenas no banco de dados local do aplicativo para viabilizar a busca rápida e a sugestão automática de títulos.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Telemetria e Diagnósticos Anônimos</Text>
          <Text style={styles.paragraph}>
            Para garantir que o scanner funcione rapidamente e sem falhas em múltiplos modelos de smartphones, coletamos apenas métricas técnicas agregadas e anônimas (como tempo de abertura da câmera e falhas de memória). Essas métricas <Text style={styles.bold}>não contêm</Text> dados pessoais, nomes de documentos ou fotos. Você pode desativar ou redefinir essas estatísticas a qualquer momento nas configurações do aplicativo.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Armazenamento e Exclusão de Dados</Text>
          <Text style={styles.paragraph}>
            Todos os documentos e pastas criados ficam salvos na memória do seu smartphone. Ao clicar em <Text style={styles.bold}>"Excluir"</Text>, o arquivo e todas as suas páginas são permanentemente removidos do seu dispositivo. Ao desinstalar o aplicativo, todos os dados locais são completamente eliminados pelo sistema operacional.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Em Conformidade com a LGPD e Google Play</Text>
          <Text style={styles.paragraph}>
            O ScanPro atende integralmente aos requisitos da Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e às diretrizes da Google Play Developer Policy. Não comercializamos dados de usuários e não veiculamos anúncios direcionados invasivos.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Contato e Suporte</Text>
          <Text style={styles.paragraph}>
            Se você tiver dúvidas, solicitações ou sugestões a respeito desta Política de Privacidade, entre em contato com nossa equipe de engenharia através do e-mail:
          </Text>
          <Text style={styles.contactEmail}>suporte@ecomti.com.br</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>ScanPro — Scanner de Documentos Local-First</Text>
          <Text style={styles.footerSubtext}>Desenvolvido com excelência técnica e foco em privacidade.</Text>
        </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.default,
    paddingVertical: spacing.small,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  headerSpacer: {
    width: touchTarget.minSize,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.default,
    paddingBottom: spacing.hero,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: spacing.compact,
    paddingVertical: 8,
    borderRadius: radii.standard,
    gap: 8,
    marginBottom: spacing.small,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#065F46',
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.default,
  },
  section: {
    marginBottom: spacing.default,
    backgroundColor: '#FFFFFF',
    padding: spacing.default,
    borderRadius: radii.standard,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    ...typography.title3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.small,
  },
  paragraph: {
    ...typography.body,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 8,
  },
  bold: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contactEmail: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 4,
  },
  footer: {
    alignItems: 'center',
    marginTop: spacing.default,
    paddingVertical: spacing.default,
  },
  footerText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  footerSubtext: {
    ...typography.caption,
    color: '#94A3B8',
    marginTop: 2,
  },
});
