import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget, shadows } from '../../theme';
import { BottomTabBar, AppButton, OnboardingInstallModal, PaywallModal } from '../../components/ui';
import { useDocumentStore, usePremiumStore } from '../../store';
import { AuthService } from '../../services/auth';
import { SyncService, SyncOverview } from '../../services/sync';
import { BackupService } from '../../services/backup';
import { TelemetryService } from '../../services/telemetry';

export default function ProfileScreen() {
  const router = useRouter();
  const { documents, loadDocuments, loadFolders } = useDocumentStore();
  const {
    isPro,
    entitlement,
    isPaywallVisible,
    openPaywall,
    closePaywall,
    cancelSubscription,
    restorePurchases,
  } = usePremiumStore();

  const [session, setSession] = useState(AuthService.getSession());
  const [syncOverview, setSyncOverview] = useState<SyncOverview>(SyncService.getOverview());
  const [funnelSummary, setFunnelSummary] = useState(TelemetryService.getFunnelSummary());
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const [isLoginModalVisible, setIsLoginModalVisible] = useState(false);
  const [isRestoreModalVisible, setIsRestoreModalVisible] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [backupJsonInput, setBackupJsonInput] = useState('');
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

  const totalPages = documents.reduce((acc, doc) => acc + doc.pageCount, 0);

  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      const res = await SyncService.triggerSync();
      setSyncOverview(SyncService.getOverview());
      Alert.alert(
        'Sincronização Concluída',
        `Nuvem atualizada com sucesso (${res.processed} alterações sincronizadas).`
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível completar a sincronização.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsExportingBackup(true);
      await BackupService.exportBackup();
    } catch (err) {
      console.error('Erro ao exportar backup:', err);
      Alert.alert('Erro', 'Falha ao gerar o arquivo de backup.');
    } finally {
      setIsExportingBackup(false);
    }
  };

  const handleLogin = async () => {
    try {
      const newSession = await AuthService.loginWithEmail(loginEmail);
      setSession(newSession);
      setIsLoginModalVisible(false);
      setLoginEmail('');
      Alert.alert('Conectado', `Bem-vindo, ${newSession.user.email}!`);
    } catch (err) {
      Alert.alert('Falha no Login', err instanceof Error ? err.message : 'Verifique os dados.');
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sair da Conta', 'Deseja desconectar sua conta da nuvem e voltar ao modo anônimo local?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: async () => {
          await AuthService.logout();
          setSession(AuthService.getSession());
        },
      },
    ]);
  };

  const handleRestoreBackup = async () => {
    if (!backupJsonInput.trim()) {
      Alert.alert('Aviso', 'Cole o conteúdo JSON do backup para restaurar.');
      return;
    }

    try {
      const result = await BackupService.restoreFromJson(backupJsonInput);
      await loadDocuments();
      await loadFolders();
      setIsRestoreModalVisible(false);
      setBackupJsonInput('');
      Alert.alert(
        'Restauração Concluída',
        `Foram restaurados ${result.restoredDocs} documentos e ${result.restoredFolders} pastas.`
      );
    } catch {
      Alert.alert('Erro', 'O JSON informado não é um backup válido do ScanPro.');
    }
  };

  const handleCancelSubscription = () => {
    Alert.alert(
      'Cancelar Assinatura Pro',
      'Deseja retornar ao plano gratuito? Seus documentos locais continuarão preservados.',
      [
        { text: 'Manter Pro', style: 'cancel' },
        {
          text: 'Cancelar Plano',
          style: 'destructive',
          onPress: async () => {
            await cancelSubscription();
            Alert.alert('Plano Atualizado', 'Sua assinatura foi cancelada com sucesso.');
          },
        },
      ]
    );
  };

  const handleClearTelemetry = () => {
    Alert.alert(
      'Redefinir Métricas',
      'Deseja limpar os dados locais de telemetria e diagnósticos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: () => {
            TelemetryService.clearAll();
            setFunnelSummary(TelemetryService.getFunnelSummary());
            Alert.alert('Sucesso', 'Telemetria local reiniciada.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.screenTitle}>Ajustes & Nuvem</Text>

        {/* Card do Usuário & Autenticação (Fase 8) */}
        <View style={[styles.userCard, shadows.card]}>
          <View style={styles.userAvatarCircle}>
            <Ionicons
              name={session.isAnonymous ? 'person-outline' : 'person'}
              size={24}
              color={colors.primary}
            />
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {session.user.email || 'Conta Convidado'}
            </Text>
            <Text style={styles.userBadge}>
              {session.isAnonymous ? 'Modo Local / Anônimo' : 'Conta Sincronizada'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.authActionButton}
            onPress={session.isAnonymous ? () => setIsLoginModalVisible(true) : handleLogout}
          >
            <Text style={styles.authActionText}>
              {session.isAnonymous ? 'Entrar' : 'Sair'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Assinatura & Plano Pro (Fase 9) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Plano & Benefícios</Text>
          <View style={[styles.menuCard, shadows.card, isPro && styles.proActiveCard]}>
            <View style={styles.proHeaderRow}>
              <View
                style={[
                  styles.proIconCircle,
                  isPro ? styles.proIconCircleActive : styles.proIconCircleFree,
                ]}
              >
                <Ionicons
                  name={isPro ? 'sparkles' : 'ribbon-outline'}
                  size={24}
                  color={isPro ? '#B45309' : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.proTitleBadgeRow}>
                  <Text style={styles.menuItemTitle}>
                    {isPro ? 'ScanPro Pro' : 'ScanPro Gratuito'}
                  </Text>
                  {isPro ? (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>ATIVO</Text>
                    </View>
                  ) : (
                    <View style={styles.freePill}>
                      <Text style={styles.freePillText}>BÁSICO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuItemSubtitle}>
                  {isPro
                    ? `Plano ${entitlement.plan === 'yearly' ? 'Anual' : 'Mensal'} • Válido até ${entitlement.expirationDate ? new Date(entitlement.expirationDate).toLocaleDateString('pt-BR') : 'ilimitado'}`
                    : 'Limite de até 5 documentos salvos. Faça upgrade para ter OCR, PDFs HD e digitalizações sem limites.'}
                </Text>
              </View>
            </View>

            <View style={styles.proActionButtons}>
              {!isPro ? (
                <AppButton
                  title="Fazer Upgrade para o Pro"
                  variant="primary"
                  onPress={openPaywall}
                  icon={<Ionicons name="sparkles" size={16} color="#FFFFFF" />}
                  style={{ flex: 1 }}
                />
              ) : (
                <AppButton
                  title="Cancelar Assinatura"
                  variant="tertiary"
                  onPress={handleCancelSubscription}
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </View>
        </View>

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
            <Text style={styles.statLabel}>Local-First</Text>
          </View>
        </View>

        {/* Seção de Sincronização em Nuvem (Cloud Sync) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sincronização Cloud (Supabase)</Text>
          <View style={[styles.menuCard, shadows.card]}>
            <View style={styles.syncStatusRow}>
              <View style={styles.syncIconCircle}>
                <Ionicons
                  name={syncOverview.state === 'synced' ? 'cloud-done' : 'cloud-upload'}
                  size={22}
                  color={syncOverview.state === 'synced' ? colors.success : colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemTitle}>
                  {syncOverview.state === 'synced'
                    ? 'Tudo Sincronizado'
                    : syncOverview.state === 'syncing'
                    ? 'Sincronizando...'
                    : 'Alterações Pendentes'}
                </Text>
                <Text style={styles.menuItemSubtitle}>
                  {syncOverview.lastSyncTime
                    ? `Última sincronização: ${new Date(syncOverview.lastSyncTime).toLocaleTimeString('pt-BR')}`
                    : 'Todos os seus dados estão seguros no dispositivo.'}
                </Text>
              </View>
            </View>

            <AppButton
              title={isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
              variant="secondary"
              onPress={handleTriggerSync}
              loading={isSyncing}
              disabled={isSyncing}
              style={{ marginTop: spacing.small }}
              icon={<Ionicons name="sync" size={16} color={colors.primary} />}
            />
          </View>
        </View>

        {/* Seção de Backup & Restauração Local */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Backup & Restauração</Text>
          <View style={[styles.menuCard, shadows.card]}>
            <Text style={styles.backupDescription}>
              Exporte todos os seus documentos, páginas e pastas em um arquivo JSON legível para manter uma cópia offline ou migrar de dispositivo.
            </Text>

            <View style={styles.backupActions}>
              <AppButton
                title={isExportingBackup ? 'Exportando...' : 'Exportar Backup'}
                variant="primary"
                onPress={handleExportBackup}
                loading={isExportingBackup}
                disabled={isExportingBackup}
                style={{ flex: 1 }}
                icon={<Ionicons name="download-outline" size={16} color="#FFFFFF" />}
              />
              <AppButton
                title="Restaurar"
                variant="tertiary"
                onPress={() => setIsRestoreModalVisible(true)}
                style={{ flex: 1 }}
                icon={<Ionicons name="refresh-outline" size={16} color={colors.primary} />}
              />
            </View>
          </View>
        </View>

        {/* Instalação do App & Permissões */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Experiência no Celular</Text>
          <View style={[styles.menuCard, shadows.card]}>
            <TouchableOpacity
              style={styles.onboardingMenuItem}
              onPress={() => setIsOnboardingVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.onboardingIconWrap}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.onboardingMenuTitle}>Instalar App & Permissões</Text>
                <Text style={styles.onboardingMenuSubtitle}>
                  Ativar em 1 clique: PWA, câmera e notificações
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção de Telemetria & Monitoramento de Performance (Fase 10) */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Performance & Telemetria Local</Text>
          <View style={[styles.menuCard, shadows.card]}>
            <Text style={styles.telemetryDescription}>
              Métricas e diagnósticos locais anônimos da métrica North Star e funil de conversão.
            </Text>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryStatItem}>
                <Text style={styles.telemetryStatValue}>{funnelSummary.scannerOpens}</Text>
                <Text style={styles.telemetryStatLabel}>Scanners Abertos</Text>
              </View>
              <View style={styles.telemetryStatItem}>
                <Text style={styles.telemetryStatValue}>{funnelSummary.pdfGenerated}</Text>
                <Text style={styles.telemetryStatLabel}>PDFs Gerados</Text>
              </View>
              <View style={styles.telemetryStatItem}>
                <Text style={styles.telemetryStatValue}>
                  {funnelSummary.averageScanToPdfMs
                    ? `${(funnelSummary.averageScanToPdfMs / 1000).toFixed(1)}s`
                    : '—'}
                </Text>
                <Text style={styles.telemetryStatLabel}>Média Scan → PDF</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.clearTelemetryButton} onPress={handleClearTelemetry}>
              <Text style={styles.clearTelemetryText}>Redefinir Métricas Locais</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sobre o Aplicativo */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sobre o ScanPro</Text>
          <View style={styles.menuCard}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Versão do App</Text>
              <Text style={styles.aboutValue}>1.0.0 (Fases 9 & 10 - Pro & Production)</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Segurança & RLS</Text>
              <Text style={styles.aboutValue}>Habilitado (Row Level Security)</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Modo Operacional</Text>
              <Text style={styles.aboutValue}>100% Offline-Resilient</Text>
            </View>
            <View style={styles.rowDivider} />
            <TouchableOpacity
              style={styles.aboutRow}
              onPress={() => router.push('/privacy' as any)}
              activeOpacity={0.7}
            >
              <Text style={[styles.aboutLabel, { color: colors.primary, fontWeight: '600' }]}>
                Política de Privacidade
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Modal de Login por Email */}
      <Modal
        visible={isLoginModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLoginModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.dialogHeader}>
              <Ionicons name="cloud-outline" size={24} color={colors.primary} />
              <Text style={styles.dialogTitle}>Entrar no ScanPro Cloud</Text>
            </View>
            <Text style={styles.dialogSubtitle}>
              Sincronize seus documentos entre seus celulares e computadores com backup contínuo.
            </Text>
            <TextInput
              style={styles.dialogInput}
              value={loginEmail}
              onChangeText={setLoginEmail}
              placeholder="seuemail@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.dialogActions}>
              <AppButton
                title="Cancelar"
                variant="tertiary"
                onPress={() => setIsLoginModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Entrar"
                variant="primary"
                onPress={handleLogin}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Restauração de Backup JSON */}
      <Modal
        visible={isRestoreModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsRestoreModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.dialogHeader}>
              <Ionicons name="folder-open-outline" size={24} color={colors.primary} />
              <Text style={styles.dialogTitle}>Restaurar Dados</Text>
            </View>
            <Text style={styles.dialogSubtitle}>
              Cole abaixo o conteúdo JSON do seu backup exportado para restaurar os documentos.
            </Text>
            <TextInput
              style={[styles.dialogInput, { height: 120, textAlignVertical: 'top' }]}
              value={backupJsonInput}
              onChangeText={setBackupJsonInput}
              placeholder='Cole aqui o JSON gerado no "Exportar Backup"...'
              multiline
            />
            <View style={styles.dialogActions}>
              <AppButton
                title="Cancelar"
                variant="tertiary"
                onPress={() => setIsRestoreModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Restaurar"
                variant="primary"
                onPress={handleRestoreBackup}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      <BottomTabBar />

      <OnboardingInstallModal
        visible={isOnboardingVisible}
        onClose={() => setIsOnboardingVisible(false)}
      />

      {/* Modal de Assinatura ScanPro Pro (Fase 9) */}
      <PaywallModal
        visible={isPaywallVisible}
        onClose={closePaywall}
      />
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
  userCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.default,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.default,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  userAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EBF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
  },
  userMeta: {
    flex: 1,
  },
  userEmail: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  userBadge: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  authActionButton: {
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
    backgroundColor: '#EBEBF0',
  },
  authActionText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  syncIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
  },
  backupDescription: {
    ...typography.footnote,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: spacing.default,
  },
  backupActions: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.default,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radii.prominentCards,
    padding: spacing.default,
    ...shadows.elevated,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    marginBottom: spacing.micro + 2,
  },
  dialogTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  dialogSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.default,
  },
  dialogInput: {
    backgroundColor: colors.background,
    borderRadius: radii.standard,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.compact,
    paddingVertical: spacing.small,
    ...typography.body,
    color: colors.textPrimary,
    marginBottom: spacing.default,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  proActiveCard: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFEFA',
  },
  proHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.default,
  },
  proIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
  },
  proIconCircleFree: {
    backgroundColor: '#EBF4FF',
  },
  proIconCircleActive: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  proTitleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
  },
  freePill: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  proActionButtons: {
    flexDirection: 'row',
    gap: spacing.small,
    marginTop: spacing.micro,
  },
  telemetryDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.compact,
    lineHeight: 16,
  },
  telemetryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: radii.standard,
    padding: spacing.compact,
    marginBottom: spacing.compact,
  },
  telemetryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  telemetryStatValue: {
    ...typography.headline,
    color: colors.primary,
    fontWeight: '700',
  },
  telemetryStatLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  clearTelemetryButton: {
    alignSelf: 'center',
    paddingVertical: spacing.micro,
  },
  clearTelemetryText: {
    ...typography.caption,
    color: colors.error,
    fontWeight: '600',
  },
  onboardingMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.micro,
  },
  onboardingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.small,
  },
  onboardingMenuTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  onboardingMenuSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
