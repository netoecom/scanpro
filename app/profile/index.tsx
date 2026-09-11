import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget, shadows } from '../../theme';
import { BottomTabBar, AppButton } from '../../components/ui';
import { useDocumentStore } from '../../store';

export default function ProfileScreen() {
  const { documents } = useDocumentStore();

  const totalPages = documents.reduce((acc, doc) => acc + doc.pageCount, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Ajustes</Text>

        {/* Card de Estatísticas Locais */}
        <View style={[styles.statsCard, shadows.card]}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{documents.length}</Text>
            <Text style={styles.statLabel}>Documentos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalPages}</Text>
            <Text style={styles.statLabel}>Páginas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="shield-checkmark" size={24} color={colors.success} />
            <Text style={styles.statLabel}>100% Local</Text>
          </View>
        </View>

        {/* Card Informativo Local-First */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Privacidade e Armazenamento</Text>
          <View style={styles.menuCard}>
            <View style={styles.menuItem}>
              <View style={styles.iconSquare}>
                <Ionicons name="cloud-offline" size={20} color={colors.primary} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>Modo Local-First</Text>
                <Text style={styles.menuItemSubtitle}>
                  Seus documentos nunca saem deste aparelho sem sua autorização expressa.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Card Premium / Nuvem (Preparado para Fase 8 e 9) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Recursos Futuros</Text>
          <View style={[styles.premiumCard, shadows.card]}>
            <View style={styles.premiumHeader}>
              <Ionicons name="sparkles" size={22} color={colors.warning} />
              <Text style={styles.premiumTitle}>ScanPro Cloud & OCR</Text>
            </View>
            <Text style={styles.premiumDescription}>
              Backup criptografado, sincronização multi-dispositivo e busca OCR no texto do documento.
            </Text>
            <AppButton
              title="Saiba Mais"
              onPress={() => Alert.alert('Em Breve', 'Sincronização Cloud e OCR chegam nas próximas fases.')}
              variant="secondary"
              style={styles.premiumButton}
            />
          </View>
        </View>

        {/* Sobre o Aplicativo */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sobre</Text>
          <View style={styles.menuCard}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Versão</Text>
              <Text style={styles.aboutValue}>1.0.0 (Fase 1 - Foundation & UI)</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Motor de Renderização</Text>
              <Text style={styles.aboutValue}>Expo / React Native</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.default,
    paddingTop: spacing.default,
    paddingBottom: spacing.section,
  },
  screenTitle: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.default,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.default,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: spacing.section,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    ...typography.title2,
    color: colors.primary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.micro,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.separator,
  },
  section: {
    marginBottom: spacing.section,
  },
  sectionHeader: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.small,
    paddingLeft: spacing.micro,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.default,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconSquare: {
    width: 36,
    height: 36,
    borderRadius: radii.standard,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  menuItemSubtitle: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.micro,
    lineHeight: 18,
  },
  premiumCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.default,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  premiumTitle: {
    ...typography.headline,
    color: colors.textPrimary,
    marginLeft: spacing.small,
  },
  premiumDescription: {
    ...typography.footnote,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.default,
  },
  premiumButton: {
    minHeight: touchTarget.minSize,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.small,
  },
  aboutLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  aboutValue: {
    ...typography.body,
    color: colors.textSecondary,
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
});
