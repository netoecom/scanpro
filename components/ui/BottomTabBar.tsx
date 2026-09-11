import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, touchTarget, shadows } from '../../theme';

interface BottomTabBarProps {
  onScanPress?: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ onScanPress }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isHome = pathname === '/' || pathname === '/index';
  const isDocuments = pathname.startsWith('/documents');
  const isProfile = pathname.startsWith('/profile');

  const handleScan = () => {
    if (onScanPress) {
      onScanPress();
    } else {
      router.push('/scanner' as any);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.small) }]}>
      <View style={styles.content}>
        {/* Tab Início */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/')}
          style={styles.tabItem}
        >
          <Ionicons
            name={isHome ? 'home' : 'home-outline'}
            size={22}
            color={isHome ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, isHome && styles.tabLabelActive]}>Início</Text>
        </TouchableOpacity>

        {/* Tab Central Scanner (Ação Primária / Dominante) */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleScan}
          style={styles.centerScanContainer}
        >
          <View style={[styles.centerScanButton, shadows.floating]}>
            <Ionicons name="camera" size={26} color="#FFFFFF" />
          </View>
          <Text style={styles.centerScanLabel}>Escanear</Text>
        </TouchableOpacity>

        {/* Tab Documentos / Biblioteca */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/documents')}
          style={styles.tabItem}
        >
          <Ionicons
            name={isDocuments ? 'folder' : 'folder-outline'}
            size={22}
            color={isDocuments ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, isDocuments && styles.tabLabelActive]}>Documentos</Text>
        </TouchableOpacity>

        {/* Tab Perfil / Ajustes */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => router.push('/profile')}
          style={styles.tabItem}
        >
          <Ionicons
            name={isProfile ? 'settings' : 'settings-outline'}
            size={22}
            color={isProfile ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.tabLabel, isProfile && styles.tabLabelActive]}>Ajustes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingTop: spacing.small,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 52,
  },
  tabItem: {
    flex: 1,
    minHeight: touchTarget.minSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  centerScanContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  centerScanButton: {
    width: 52,
    height: 52,
    borderRadius: radii.capsule,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerScanLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 3,
  },
});
