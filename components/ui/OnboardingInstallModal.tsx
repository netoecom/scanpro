/**
 * ScanPro — Onboarding & 1-Click Install Modal
 * Experiência rica e fluida para instalação do app, permissões de câmera e notificações.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget, shadows } from '../../theme';
import { AppButton } from './AppButton';
import { usePwaInstall } from '../../hooks/usePwaInstall';

interface OnboardingInstallModalProps {
  visible: boolean;
  onClose: () => void;
  onStartScanning?: () => void;
}

export function OnboardingInstallModal({
  visible,
  onClose,
  onStartScanning,
}: OnboardingInstallModalProps) {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    hasCameraPermission,
    hasNotificationPermission,
    promptInstall,
    requestCameraPermission,
    requestNotificationPermission,
    setupAllInOneClick,
  } = usePwaInstall();

  const handleMasterAction = async () => {
    await setupAllInOneClick();
    if (onStartScanning) {
      onClose();
      onStartScanning();
    } else {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.cardContainer}>
          {/* Botão de Fechar */}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Header com Ícone e Título */}
            <View style={styles.header}>
              <View style={styles.appIconBadge}>
                <Ionicons name="document-text" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Bem-vindo ao ScanPro</Text>
              <Text style={styles.subtitle}>
                Configure o aplicativo em segundos para obter máxima qualidade e performance.
              </Text>
            </View>

            {/* Checklist de Permissões e Instalação */}
            <View style={styles.checklist}>
              {/* Item 1: Instalação PWA */}
              <View style={styles.checkItem}>
                <View
                  style={[
                    styles.itemIconCircle,
                    isInstalled ? styles.itemIconSuccess : styles.itemIconPending,
                  ]}
                >
                  <Ionicons
                    name={isInstalled ? 'checkmark-circle' : 'phone-portrait-outline'}
                    size={20}
                    color={isInstalled ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>Instalar Aplicativo</Text>
                  <Text style={styles.itemSubtitle}>
                    {isInstalled
                      ? 'ScanPro já instalado no dispositivo'
                      : 'Abra em tela cheia com acesso instantâneo'}
                  </Text>
                </View>
                {!isInstalled && isInstallable && (
                  <TouchableOpacity style={styles.actionPill} onPress={promptInstall}>
                    <Text style={styles.actionPillText}>Instalar</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Dica para iOS Safari */}
              {!isInstalled && isIOS && (
                <View style={styles.iosTipBox}>
                  <Ionicons name="information-circle" size={18} color={colors.primary} />
                  <Text style={styles.iosTipText}>
                    No iPhone/iPad: toque em <Text style={{ fontWeight: '700' }}>Compartilhar</Text>{' '}
                    (ícone com seta) e escolha{' '}
                    <Text style={{ fontWeight: '700' }}>"Adicionar à Tela de Início"</Text>.
                  </Text>
                </View>
              )}

              {/* Item 2: Câmera */}
              <View style={styles.checkItem}>
                <View
                  style={[
                    styles.itemIconCircle,
                    hasCameraPermission ? styles.itemIconSuccess : styles.itemIconPending,
                  ]}
                >
                  <Ionicons
                    name={hasCameraPermission ? 'checkmark-circle' : 'camera-outline'}
                    size={20}
                    color={hasCameraPermission ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>Acesso à Câmera</Text>
                  <Text style={styles.itemSubtitle}>
                    {hasCameraPermission
                      ? 'Câmera autorizada para escaneamento'
                      : 'Detecção automática e corte de páginas'}
                  </Text>
                </View>
                {!hasCameraPermission && (
                  <TouchableOpacity style={styles.actionPill} onPress={requestCameraPermission}>
                    <Text style={styles.actionPillText}>Permitir</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Item 3: Notificações */}
              <View style={styles.checkItem}>
                <View
                  style={[
                    styles.itemIconCircle,
                    hasNotificationPermission ? styles.itemIconSuccess : styles.itemIconPending,
                  ]}
                >
                  <Ionicons
                    name={hasNotificationPermission ? 'checkmark-circle' : 'notifications-outline'}
                    size={20}
                    color={hasNotificationPermission ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>Notificações</Text>
                  <Text style={styles.itemSubtitle}>
                    {hasNotificationPermission
                      ? 'Alertas e avisos ativados'
                      : 'Avisos de backup e sincronização'}
                  </Text>
                </View>
                {!hasNotificationPermission && (
                  <TouchableOpacity
                    style={styles.actionPill}
                    onPress={requestNotificationPermission}
                  >
                    <Text style={styles.actionPillText}>Ativar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Ações Inferiores */}
            <View style={styles.footerActions}>
              <AppButton
                title="Configurar Tudo com 1 Clique"
                variant="primary"
                onPress={handleMasterAction}
                icon={<Ionicons name="sparkles" size={18} color="#FFFFFF" />}
              />
              <AppButton
                title="Agora Não, Continuar para o App"
                variant="tertiary"
                onPress={onClose}
                style={{ marginTop: spacing.micro }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.default,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: colors.surface,
    borderRadius: radii.sheets,
    overflow: 'hidden',
    position: 'relative',
    ...shadows.elevated,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.default,
    right: spacing.default,
    zIndex: 10,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F2',
    borderRadius: 18,
  },
  content: {
    padding: spacing.large,
    paddingTop: spacing.section,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.default,
  },
  appIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.small,
    ...shadows.floating,
  },
  title: {
    ...typography.title2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.micro + 2,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  checklist: {
    backgroundColor: '#F8F9FA',
    borderRadius: radii.prominentCards,
    padding: spacing.default,
    marginBottom: spacing.default,
    gap: spacing.compact,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
  },
  itemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconPending: {
    backgroundColor: '#EBF4FF',
  },
  itemIconSuccess: {
    backgroundColor: '#E8F8EE',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    ...typography.headline,
    color: colors.textPrimary,
  },
  itemSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  actionPill: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.compact,
    paddingVertical: 6,
    borderRadius: radii.capsule,
  },
  actionPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  iosTipBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.small,
    backgroundColor: '#EBF4FF',
    padding: spacing.small,
    borderRadius: radii.standard,
    marginTop: 2,
  },
  iosTipText: {
    ...typography.caption,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  footerActions: {
    gap: spacing.micro,
  },
});
