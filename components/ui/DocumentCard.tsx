import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Document } from '../../types';
import { colors, spacing, radii, typography, shadows, touchTarget } from '../../theme';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
  onToggleFavorite?: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onPress,
  onToggleFavorite,
}) => {
  const formattedDate = new Date(document.updatedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.container, shadows.card]}
    >
      <View style={styles.thumbnailPlaceholder}>
        <Ionicons name="document-text-outline" size={28} color={colors.primary} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {document.title}
        </Text>
        <Text style={styles.metadata}>
          {document.pageCount} {document.pageCount === 1 ? 'página' : 'páginas'} • {formattedDate}
        </Text>
      </View>

      {onToggleFavorite && (
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onToggleFavorite}
          style={styles.favoriteButton}
        >
          <Ionicons
            name={document.isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={document.isFavorite ? colors.warning : colors.textSecondary}
          />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.cards,
    padding: spacing.compact,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.compact,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  thumbnailPlaceholder: {
    width: 48,
    height: 58,
    borderRadius: radii.standard,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.default,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    marginBottom: spacing.micro,
  },
  metadata: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  favoriteButton: {
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
