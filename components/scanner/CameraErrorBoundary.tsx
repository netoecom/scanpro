import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, typography, shadows } from '../../theme';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  onPickFromGallery?: () => void;
  onLaunchNativeCamera?: () => void;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CameraErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message || 'Falha na inicialização do sensor de câmera.',
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('CameraErrorBoundary capturou uma falha na câmera:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorMessage: '' });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="camera-outline" size={40} color={colors.warning} />
            </View>
            <Text style={styles.title}>Câmera do Dispositivo</Text>
            <Text style={styles.description}>
              O sensor integrado não pôde ser iniciado diretamente. Você pode digitalizar normalmente usando a câmera nativa do seu celular ou selecionar uma imagem da galeria.
            </Text>

            <View style={styles.actions}>
              {this.props.onLaunchNativeCamera && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, shadows.card, { backgroundColor: colors.primary }]}
                  onPress={this.props.onLaunchNativeCamera}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryButtonText}>Abrir Câmera do Celular</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={this.handleRetry}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>

              {this.props.onPickFromGallery && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={this.props.onPickFromGallery}
                  activeOpacity={0.8}
                >
                  <Ionicons name="images-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={styles.secondaryButtonText}>Escolher da Galeria</Text>
                </TouchableOpacity>
              )}

              {this.props.onGoBack && (
                <TouchableOpacity
                  style={[styles.button, styles.tertiaryButton]}
                  onPress={this.props.onGoBack}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tertiaryButtonText}>Voltar ao Início</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.default,
    zIndex: 10,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.prominentCards,
    padding: spacing.large,
    alignItems: 'center',
    maxWidth: 380,
    width: '100%',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.default,
  },
  title: {
    ...typography.headline,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.small,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.large,
  },
  actions: {
    width: '100%',
    gap: spacing.small,
  },
  button: {
    flexDirection: 'row',
    height: 48,
    borderRadius: radii.standard,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    ...typography.headline,
    color: '#FFFFFF',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.headline,
    color: colors.primary,
    fontSize: 15,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 15,
  },
});
