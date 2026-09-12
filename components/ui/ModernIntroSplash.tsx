/**
 * ScanPro — Modern Intro Splash
 * Animação introdutória homogênea, moderna e suave na abertura do aplicativo.
 * Substitui transições horizontais abruptas por um fade & micro-pulse cinematográfico.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, radii } from '../../theme';

interface ModernIntroSplashProps {
  onFinish?: () => void;
  duration?: number;
}

const { width } = Dimensions.get('window');

export function ModernIntroSplash({
  onFinish,
  duration = 950,
}: ModernIntroSplashProps) {
  const [visible, setVisible] = useState(true);

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const contentScale = useRef(new Animated.Value(0.92)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const beamAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrada suave e homogênea (fade-in + micro-scale)
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(beamAnim, {
        toValue: 1,
        duration: 650,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();

    // 2. Transição homogênea de saída (fade out perfeito e dissolução)
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(contentScale, {
          toValue: 1.05,
          duration: 300,
          easing: Easing.in(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start(() => {
        setVisible(false);
        if (onFinish) onFinish();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, [containerOpacity, contentScale, contentOpacity, beamAnim, duration, onFinish]);

  if (!visible) return null;

  const beamWidth = beamAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.min(width * 0.45, 180)],
  });

  return (
    <Animated.View style={[styles.overlay, { opacity: containerOpacity }]} pointerEvents="none">
      <Animated.View
        style={[
          styles.contentBox,
          {
            opacity: contentOpacity,
            transform: [{ scale: contentScale }],
          },
        ]}
      >
        {/* Ícone Estilizado da Marca */}
        <View style={styles.iconContainer}>
          <View style={styles.iconGlow} />
          <Ionicons name="scan-outline" size={44} color="#007AFF" />
        </View>

        {/* Título da Aplicação */}
        <Text style={styles.brandTitle}>ScanPro</Text>
        <Text style={styles.brandSubtitle}>Scanner de Documentos Local-First</Text>

        {/* Linha de Carregamento Homogênea */}
        <View style={styles.loadingTrack}>
          <Animated.View style={[styles.loadingBeam, { width: beamWidth }]} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0F172A',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentBox: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 122, 255, 0.25)',
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  brandSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94A3B8',
    marginBottom: 24,
  },
  loadingTrack: {
    width: 180,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  loadingBeam: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#007AFF',
  },
});
