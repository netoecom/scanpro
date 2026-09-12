import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget } from '../../theme';
import { AppButton } from './AppButton';

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Excluir',
  cancelText = 'Cancelar',
  isDestructive = true,
  icon = 'trash-outline',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogCard}>
          {/* Ícone Circular de Destaque */}
          <View
            style={[
              styles.iconCircle,
              isDestructive ? styles.iconCircleDestructive : styles.iconCirclePrimary,
            ]}
          >
            <Ionicons
              name={icon}
              size={26}
              color={isDestructive ? colors.error : colors.primary}
            />
          </View>

          {/* Título e Mensagem */}
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>

          {/* Botões de Ação */}
          <View style={styles.actionsRow}>
            <AppButton
              title={cancelText}
              variant="tertiary"
              onPress={onCancel}
              style={styles.actionBtn}
            />
            <AppButton
              title={confirmText}
              variant={isDestructive ? 'destructive' : 'primary'}
              onPress={onConfirm}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.default,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'blur(8px)',
        }
      : {}),
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: radii.prominentCards,
    padding: spacing.section,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.default,
  },
  iconCircleDestructive: {
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
  },
  iconCirclePrimary: {
    backgroundColor: 'rgba(0, 122, 255, 0.12)',
  },
  dialogTitle: {
    ...typography.title3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.small,
  },
  dialogMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.section,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.compact,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
  },
});
