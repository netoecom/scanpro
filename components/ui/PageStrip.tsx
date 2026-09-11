import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PageThumbnail } from './PageThumbnail';
import { colors, spacing, radii, typography, touchTarget } from '../../theme';

export interface StripPageItem {
  id: string;
  uri: string;
}

interface PageStripProps {
  pages: StripPageItem[];
  selectedIndex?: number;
  onSelectPage: (index: number) => void;
  onDeletePage?: (index: number) => void;
  onReorderPages?: (newOrder: StripPageItem[]) => void;
  onAddPage?: () => void;
}

export const PageStrip: React.FC<PageStripProps> = ({
  pages,
  selectedIndex = 0,
  onSelectPage,
  onDeletePage,
  onReorderPages,
  onAddPage,
}) => {
  const handleMove = (fromIndex: number, toIndex: number) => {
    if (!onReorderPages) return;
    if (toIndex < 0 || toIndex >= pages.length) return;

    const newPages = [...pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    onReorderPages(newPages);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pages.map((page, index) => (
          <PageThumbnail
            key={page.id}
            pageIndex={index}
            uri={page.uri}
            isSelected={index === selectedIndex}
            onPress={() => onSelectPage(index)}
            onDelete={onDeletePage ? () => onDeletePage(index) : undefined}
            onMoveLeft={() => handleMove(index, index - 1)}
            onMoveRight={() => handleMove(index, index + 1)}
            canMoveLeft={index > 0}
            canMoveRight={index < pages.length - 1}
          />
        ))}

        {/* Botão de Adicionar Mais Página */}
        {onAddPage && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onAddPage}
            style={styles.addPageButton}
          >
            <Ionicons name="add-circle-outline" size={32} color={colors.primary} />
            <Text style={styles.addPageText}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.small,
  },
  scrollContent: {
    paddingHorizontal: spacing.default,
    alignItems: 'flex-start',
  },
  addPageButton: {
    width: 80,
    height: 110,
    borderRadius: radii.standard,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    backgroundColor: '#F0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: touchTarget.minSize,
  },
  addPageText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.micro,
  },
});
