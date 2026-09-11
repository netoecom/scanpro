import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget, shadows } from '../../theme';

interface PageThumbnailProps {
  pageIndex: number;
  uri: string;
  isSelected?: boolean;
  onPress: () => void;
  onDelete?: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  canMoveLeft?: boolean;
  canMoveRight?: boolean;
}

export const PageThumbnail: React.FC<PageThumbnailProps> = ({
  pageIndex,
  uri,
  isSelected = false,
  onPress,
  onDelete,
  onMoveLeft,
  onMoveRight,
  canMoveLeft = false,
  canMoveRight = false,
}) => {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={[
          styles.container,
          shadows.card,
          isSelected && styles.containerSelected,
        ]}
      >
        {/* Imagem da Página */}
        {uri && (uri.startsWith('http') || uri.startsWith('data:') || uri.startsWith('file:')) ? (
          <Image source={{ uri }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Ionicons name="document-text-outline" size={28} color={colors.primary} />
          </View>
        )}

        {/* Badge Numérico da Página */}
        <View style={styles.pageBadge}>
          <Text style={styles.pageBadgeText}>{pageIndex + 1}</Text>
        </View>

        {/* Botão de Excluir Página */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onDelete}
          >
            <Ionicons name="close" size={12} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Controles de Reordenação Rápida (Mover para Esquerda / Direita) */}
      {(onMoveLeft || onMoveRight) && (
        <View style={styles.reorderBar}>
          <TouchableOpacity
            disabled={!canMoveLeft}
            onPress={onMoveLeft}
            style={[styles.reorderButton, !canMoveLeft && styles.reorderButtonDisabled]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name="chevron-back"
              size={14}
              color={canMoveLeft ? colors.textPrimary : colors.separator}
            />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={!canMoveRight}
            onPress={onMoveRight}
            style={[styles.reorderButton, !canMoveRight && styles.reorderButtonDisabled]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name="chevron-forward"
              size={14}
              color={canMoveRight ? colors.textPrimary : colors.separator}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginRight: spacing.compact,
  },
  container: {
    width: 80,
    height: 110,
    backgroundColor: colors.surface,
    borderRadius: radii.standard,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  containerSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  pageBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.small,
  },
  pageBadgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderBar: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 4,
  },
  reorderButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EBEBF0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonDisabled: {
    opacity: 0.35,
  },
});
