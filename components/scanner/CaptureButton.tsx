import React from 'react';
import { TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, touchTarget } from '../../theme';

interface CaptureButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  autoCaptureActive?: boolean;
}

export const CaptureButton: React.FC<CaptureButtonProps> = ({
  onPress,
  disabled = false,
  loading = false,
  autoCaptureActive = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={styles.outerRing}
    >
      <View
        style={[
          styles.innerCircle,
          autoCaptureActive && styles.innerCircleAuto,
          disabled && styles.innerCircleDisabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <View
            style={[
              styles.centerDot,
              autoCaptureActive && { backgroundColor: colors.success },
            ]}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  outerRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: touchTarget.minSize,
    minHeight: touchTarget.minSize,
  },
  innerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerCircleAuto: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.success,
  },
  innerCircleDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  centerDot: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'transparent',
  },
});
