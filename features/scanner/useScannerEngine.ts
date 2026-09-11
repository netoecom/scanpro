import { useState, useEffect, useRef, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { ScannerStatus, DocumentDetection } from '../../types';

export interface ScannerEngineState {
  status: ScannerStatus;
  hasPermission: boolean | null;
  flash: 'off' | 'on';
  autoCapture: boolean;
  capturedUri: string | null;
  confidence: number;
  detection: DocumentDetection;
}

export function useScannerEngine() {
  const [permission, requestPermission] = useCameraPermissions();
  const [status, setStatus] = useState<ScannerStatus>('SCANNER_SEARCHING');
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [autoCapture, setAutoCapture] = useState<boolean>(true);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number>(0.85);

  const cameraRef = useRef<CameraView | null>(null);
  const autoCaptureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trigger feedback tátil
  const triggerHaptic = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch {
        // Haptic não suportado no ambiente atual
      }
    }
  }, []);

  // Solicitar permissão ao inicializar
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Simulação inteligente de detecção contínua de documento com cooldown
  useEffect(() => {
    if (status === 'CAPTURING' || status === 'PROCESSING' || status === 'CAPTURE_SUCCESS') {
      return;
    }

    const timer = setTimeout(() => {
      setStatus('DOCUMENT_DETECTED');
      setConfidence(0.92);
    }, 1200);

    return () => clearTimeout(timer);
  }, [status]);

  // Captura manual ou disparada pelo motor
  const captureDocument = useCallback(async (): Promise<string | null> => {
    if (status === 'CAPTURING' || status === 'PROCESSING') {
      return null;
    }

    try {
      setStatus('CAPTURING');
      triggerHaptic();

      let photoUri: string | null = null;

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          shutterSound: true,
        });
        photoUri = photo?.uri ?? null;
      }

      // Se executando em ambiente de teste ou web sem câmera física direta:
      if (!photoUri) {
        photoUri = `mock-captured-${Date.now()}.jpg`;
      }

      setStatus('PROCESSING');

      // Simulação rápida do pipeline de perspectiva (Fase 3)
      await new Promise((resolve) => setTimeout(resolve, 600));

      setCapturedUri(photoUri);
      setStatus('CAPTURE_SUCCESS');
      triggerHaptic();

      return photoUri;
    } catch (err) {
      console.error('Erro na captura do documento:', err);
      setStatus('CAPTURE_ERROR');
      return null;
    }
  }, [status, triggerHaptic]);

  // Disparo automático quando o documento está estabilizado
  useEffect(() => {
    if (autoCapture && status === 'DOCUMENT_DETECTED') {
      autoCaptureTimerRef.current = setTimeout(() => {
        captureDocument();
      }, 1500);
    }

    return () => {
      if (autoCaptureTimerRef.current) {
        clearTimeout(autoCaptureTimerRef.current);
      }
    };
  }, [autoCapture, status, captureDocument]);

  // Importar imagem da galeria
  const pickFromGallery = useCallback(async (): Promise<string | null> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setStatus('PROCESSING');
        await new Promise((resolve) => setTimeout(resolve, 500));
        setCapturedUri(uri);
        setStatus('CAPTURE_SUCCESS');
        triggerHaptic();
        return uri;
      }
      return null;
    } catch (err) {
      console.error('Erro ao selecionar imagem da galeria:', err);
      return null;
    }
  }, [triggerHaptic]);

  const toggleFlash = useCallback(() => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  }, []);

  const toggleAutoCapture = useCallback(() => {
    setAutoCapture((prev) => !prev);
  }, []);

  const resetScanner = useCallback(() => {
    setStatus('SCANNER_SEARCHING');
    setCapturedUri(null);
    setConfidence(0);
  }, []);

  return {
    cameraRef,
    status,
    hasPermission: permission?.granted ?? false,
    canAskAgain: permission?.canAskAgain ?? true,
    requestPermission,
    flash,
    autoCapture,
    capturedUri,
    confidence,
    captureDocument,
    pickFromGallery,
    toggleFlash,
    toggleAutoCapture,
    resetScanner,
  };
}
