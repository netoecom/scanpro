import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography, radii, touchTarget, shadows } from '../../theme';
import { BottomTabBar, AppButton, OnboardingInstallModal, PaywallModal } from '../../components/ui';
import { useDocumentStore, usePremiumStore } from '../../store';
import { AuthService } from '../../services/auth';
import { SyncService, SyncOverview } from '../../services/sync';
import { BackupService } from '../../services/backup';
import { TelemetryService } from '../../services/telemetry';
import { DropboxService, DropboxAuthState } from '../../services/dropbox';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { code } = useLocalSearchParams<{ code?: string }>();
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
  const [dropboxState, setDropboxState] = useState<DropboxAuthState>(DropboxService.getState());
  const [isDropboxModalVisible, setIsDropboxModalVisible] = useState(false);
  const [dropboxTokenInput, setDropboxTokenInput] = useState('');
  const [isConnectingDropbox, setIsConnectingDropbox] = useState(false);
  const [isOnboardingVisible, setIsOnboardingVisible] = useState(false);

  useEffect(() => {
    return DropboxService.subscribe(setDropboxState);
  }, []);

  // Processa retorno do OAuth do Dropbox com ?code=XYZ após autorização no navegador
  useEffect(() => {
    if (code && !dropboxState.isConnected && !isConnectingDropbox) {
      (async () => {
        try {
          setIsConnectingDropbox(true);
          await DropboxService.exchangeCodeForToken(code);
          Alert.alert('Dropbox Conectado!', 'Sua conta foi integrada com sucesso.');
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (err) {
          Alert.alert('Falha na Conexão', err instanceof Error ? err.message : 'Não foi possível completar a autorização.');
        } finally {
          setIsConnectingDropbox(false);
        }
      })();
    }
  }, [code, dropboxState.isConnected]);

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

  const handleConnectDropbox = () => {
    if (!isPro) {
      openPaywall();
      return;
    }
    setIsDropboxModalVisible(true);
  };

  const handleStartPkceAuth = async () => {
    try {
      const { url } = await DropboxService.getAuthorizationUrl();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = url;
      } else {
        await Linking.openURL(url);
      }
    } catch (err) {
      Alert.alert(
        'Aviso',
        'Não foi possível abrir o navegador diretamente. Você pode utilizar o token de acesso pessoal gerado no App Console do Dropbox.'
      );
    }
  };

  const handleConfirmDropboxToken = async () => {
    if (!dropboxTokenInput.trim()) {
      Alert.alert('Aviso', 'Por favor, insira o token de acesso ou código de autorização.');
      return;
    }

    try {
      setIsConnectingDropbox(true);
      await DropboxService.connectWithAccessToken(dropboxTokenInput.trim());
      setIsDropboxModalVisible(false);
      setDropboxTokenInput('');
      Alert.alert('Dropbox Conectado!', 'Sua conta foi integrada com sucesso. Novos scans poderão ser salvos automaticamente.');
    } catch (err) {
      Alert.alert('Falha na Conexão', err instanceof Error ? err.message : 'Verifique os dados informados.');
    } finally {
      setIsConnectingDropbox(false);
    }
  };

  const handleToggleDropboxAutoUpload = async () => {
    if (!isPro) {
      openPaywall();
      return;
    }
    await DropboxService.setAutoUpload(!dropboxState.autoUploadEnabled);
  };

  const handleDisconnectDropbox = () => {
    Alert.alert(
      'Desconectar Dropbox',
      'Deseja desconectar sua conta do Dropbox? O aplicativo continuará funcionando normalmente em modo local.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            await DropboxService.disconnect();
            Alert.alert('Desconectado', 'Sua conta do Dropbox foi desconectada.');
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.safeArea, { paddingTop: Math.max(insets.top, 16) }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: Math.max(insets.left, insets.right, 20),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.screenTitle}>Ajustes</Text>

        {/* Card do Usuário & Autenticação */}
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
              {session.isAnonymous ? 'Modo Local (Offline)' : 'Conta Sincronizada'}
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

        {/* Seção de Assinatura & Plano Pro */}
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

        {/* Seção de Sincronização em Nuvem */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sincronização em Nuvem</Text>
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

        {/* Seção de Integração com o Dropbox (PRO) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeader}>Nuvem & Integrações</Text>
            <View style={styles.proSmallBadge}>
              <Ionicons name="sparkles" size={10} color="#B45309" />
              <Text style={styles.proSmallBadgeText}>PRO</Text>
            </View>
          </View>

          <View style={[styles.menuCard, shadows.card]}>
            <View style={styles.dropboxHeaderRow}>
              <View style={styles.dropboxIconCircle}>
                <Ionicons name="logo-dropbox" size={24} color="#0061FE" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.dropboxTitleRow}>
                  <Text style={styles.menuItemTitle}>
                    {dropboxState.isConnected ? dropboxState.account?.displayName || 'Dropbox Conectado' : 'Dropbox'}
                  </Text>
                  {dropboxState.isConnected ? (
                    <View style={styles.dropboxActivePill}>
                      <Text style={styles.dropboxActivePillText}>CONECTADO</Text>
                    </View>
                  ) : (
                    <View style={styles.dropboxInactivePill}>
                      <Text style={styles.dropboxInactivePillText}>NÃO CONECTADO</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.menuItemSubtitle}>
                  {dropboxState.isConnected
                    ? `${dropboxState.account?.email || ''} • Pasta: ${dropboxState.targetFolder}`
                    : 'Salve e sincronize automaticamente seus PDFs na sua pasta do Dropbox.'}
                </Text>
              </View>
            </View>

            {dropboxState.isConnected ? (
              <View style={styles.dropboxConnectedControls}>
                {/* Toggle de Auto-Upload */}
                <TouchableOpacity
                  style={styles.dropboxToggleRow}
                  onPress={handleToggleDropboxAutoUpload}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={styles.dropboxToggleLabel}>Salvar novos scans automaticamente</Text>
                    <Text style={styles.dropboxToggleSub}>Envia para o Dropbox em segundo plano sem travar o app</Text>
                  </View>
                  <View style={[styles.togglePill, dropboxState.autoUploadEnabled ? styles.togglePillActive : styles.togglePillInactive]}>
                    <Text style={[styles.togglePillText, dropboxState.autoUploadEnabled ? styles.togglePillTextActive : styles.togglePillTextInactive]}>
                      {dropboxState.autoUploadEnabled ? 'LIGADO' : 'DESLIGADO'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.dropboxActionsRow}>
                  <AppButton
                    title="Desconectar Conta"
                    variant="tertiary"
                    onPress={handleDisconnectDropbox}
                    style={{ flex: 1 }}
                    icon={<Ionicons name="log-out-outline" size={16} color={colors.textSecondary} />}
                  />
                </View>
              </View>
            ) : (
              <View style={{ marginTop: spacing.small }}>
                <AppButton
                  title={isPro ? 'Conectar ao Dropbox' : 'Conectar ao Dropbox (Recurso Pro 💎)'}
                  variant={isPro ? 'primary' : 'secondary'}
                  onPress={handleConnectDropbox}
                  icon={<Ionicons name="logo-dropbox" size={16} color={isPro ? '#FFFFFF' : '#0061FE'} />}
                />
              </View>
            )}
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
          <Text style={styles.sectionHeader}>Experiência & Dicas</Text>
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
                <Text style={styles.onboardingMenuTitle}>Guia de Instalação & Atalhos</Text>
                <Text style={styles.onboardingMenuSubtitle}>
                  Dicas de uso, digitalização offline e atalhos na tela de início
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Estatísticas de Uso & Produtividade */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Estatísticas de Produtividade</Text>
          <View style={[styles.menuCard, shadows.card]}>
            <Text style={styles.telemetryDescription}>
              Métricas de performance e velocidade do scanner no seu smartphone.
            </Text>
            <View style={styles.telemetryGrid}>
              <View style={styles.telemetryStatItem}>
                <Text style={styles.telemetryStatValue}>{funnelSummary.scannerOpens}</Text>
                <Text style={styles.telemetryStatLabel}>Digitalizações</Text>
              </View>
              <View style={styles.telemetryStatItem}>
                <Text style={styles.telemetryStatValue}>{funnelSummary.pdfGenerated}</Text>
                <Text style={styles.telemetryStatLabel}>PDFs Gerados</Text>
              </View>
              <View style={styles.telemetryStatItem}>
                <Text style={styles.telemetryStatValue}>
                  {funnelSummary.averageScanToPdfMs
                    ? `${(funnelSummary.averageScanToPdfMs / 1000).toFixed(1)}s`
                    : '0.8s'}
                </Text>
                <Text style={styles.telemetryStatLabel}>Velocidade Média</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.clearTelemetryButton} onPress={handleClearTelemetry}>
              <Text style={styles.clearTelemetryText}>Limpar Estatísticas</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sobre o Aplicativo */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Sobre o ScanPro</Text>
          <View style={styles.menuCard}>
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Versão</Text>
              <Text style={[styles.aboutValue, { flexShrink: 1 }]}>
                {Constants.expoConfig?.version ?? '1.0.4'} (Build {Constants.expoConfig?.android?.versionCode ?? 6})
              </Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Seus Documentos</Text>
              <Text style={[styles.aboutValue, { flexShrink: 1, textAlign: 'right' }]}>Ficam salvos no seu celular</Text>
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Privacidade</Text>
              <Text style={[styles.aboutValue, { flexShrink: 1, textAlign: 'right' }]}>Sem anúncios e sem rastreamento</Text>
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
            <View style={styles.rowDivider} />
            <View style={styles.aboutRow}>
              <Text style={styles.aboutLabel}>Suporte</Text>
              <Text style={[styles.aboutValue, { flexShrink: 1, color: colors.primary, fontWeight: '600' }]}>
                contato@ecomti.com.br
              </Text>
            </View>
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

      {/* Modal de Conexão com o Dropbox */}
      <Modal
        visible={isDropboxModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDropboxModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalDialog}>
            <View style={styles.dialogHeader}>
              <Ionicons name="logo-dropbox" size={26} color="#0061FE" />
              <Text style={styles.dialogTitle}>Conectar ao Dropbox</Text>
            </View>
            <Text style={styles.dialogSubtitle}>
              Ao conectar sua conta, seus scans poderão ser sincronizados automaticamente para a pasta /ScanPro no seu Dropbox.
            </Text>

            <TouchableOpacity
              style={styles.oauthButton}
              onPress={handleStartPkceAuth}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={18} color="#FFFFFF" />
              <Text style={styles.oauthButtonText}>Autorizar pelo Navegador (OAuth 2.0)</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: spacing.small }}>
              <Ionicons name="key-outline" size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                App Key: <Text style={{ fontWeight: '700', color: colors.primary }}>{DropboxService.getClientId()}</Text>
              </Text>
            </View>

            <View style={styles.dialogDividerRow}>
              <View style={styles.dialogDividerLine} />
              <Text style={styles.dialogDividerText}>OU TOKEN DE TESTE</Text>
              <View style={styles.dialogDividerLine} />
            </View>

            <TextInput
              style={styles.dialogInput}
              value={dropboxTokenInput}
              onChangeText={setDropboxTokenInput}
              placeholder="Cole o Access Token ou código aqui..."
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.dialogActions}>
              <AppButton
                title="Cancelar"
                variant="tertiary"
                onPress={() => setIsDropboxModalVisible(false)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Conectar"
                variant="primary"
                onPress={handleConfirmDropboxToken}
                loading={isConnectingDropbox}
                disabled={isConnectingDropbox}
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
    </View>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.micro,
  },
  proSmallBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.standard,
    gap: 4,
  },
  proSmallBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
  },
  dropboxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.small,
  },
  dropboxIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.compact,
  },
  dropboxTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
  },
  dropboxActivePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.standard,
  },
  dropboxActivePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  dropboxInactivePill: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.standard,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  dropboxInactivePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dropboxConnectedControls: {
    marginTop: spacing.small,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingTop: spacing.small,
  },
  dropboxToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.small,
    backgroundColor: colors.background,
    borderRadius: radii.standard,
    paddingHorizontal: spacing.compact,
    marginBottom: spacing.small,
  },
  dropboxToggleLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  dropboxToggleSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  togglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.capsule,
  },
  togglePillActive: {
    backgroundColor: colors.primary,
  },
  togglePillInactive: {
    backgroundColor: colors.separator,
  },
  togglePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  togglePillTextActive: {
    color: '#FFFFFF',
  },
  togglePillTextInactive: {
    color: colors.textSecondary,
  },
  dropboxActionsRow: {
    flexDirection: 'row',
    gap: spacing.small,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0061FE',
    borderRadius: radii.standard,
    paddingVertical: spacing.small + 2,
    gap: spacing.compact,
    marginBottom: spacing.small,
  },
  oauthButtonText: {
    ...typography.headline,
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dialogDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.small,
    gap: spacing.compact,
  },
  dialogDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
  },
  dialogDividerText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
