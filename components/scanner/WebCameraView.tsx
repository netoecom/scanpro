/**
 * ScanPro — WebCameraView
 * Implementação com foco em máxima resolução fotográfica do sensor e suporte à API ImageCapture nativa.
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

export interface WebCameraViewRef {
  takePicture: () => Promise<string | null>;
}

interface WebCameraViewProps {
  facing: 'back' | 'front';
  onCameraReady?: () => void;
  onMountError?: (error: any) => void;
}

export const WebCameraView = forwardRef<WebCameraViewRef, WebCameraViewProps>(
  ({ facing, onCameraReady, onMountError }, ref) => {
    const videoRef = useRef<any>(null);
    const streamRef = useRef<any>(null);

    useEffect(() => {
      if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
        return;
      }

      let isMounted = true;

      const getBackCameraDeviceId = async (): Promise<string | undefined> => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter((d) => d.kind === 'videoinput');
          if (videoDevices.length === 0) return undefined;

          // 1. Procura câmera com label contendo palavras indicativas de câmera traseira
          const labeledBack = videoDevices.find((d) =>
            /back|rear|traseir|environment|extern/i.test(d.label)
          );
          if (labeledBack?.deviceId) return labeledBack.deviceId;

          // 2. Em dispositivos móveis (Android/iOS), a câmera traseira principal costuma ser a última
          if (videoDevices.length > 1) {
            return videoDevices[videoDevices.length - 1].deviceId;
          }

          return videoDevices[0].deviceId;
        } catch {
          return undefined;
        }
      };

      const initCamera = async () => {
        // Encerra streams anteriores para trocar de lente
        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach((t: any) => t.stop());
          } catch {}
          streamRef.current = null;
        }

        let stream: MediaStream | null = null;

        // Resoluções de alta qualidade (prioriza alta definição para OCR e nitidez de texto)
        const highResVideoConstraints = {
          width: { ideal: 4032, min: 1920 },
          height: { ideal: 3024, min: 1080 },
          frameRate: { ideal: 30, max: 60 },
        };

        if (facing === 'back') {
          const backDeviceId = await getBackCameraDeviceId();

          const backConstraintsList: MediaStreamConstraints[] = [
            ...(backDeviceId
              ? [
                  {
                    audio: false,
                    video: {
                      deviceId: { exact: backDeviceId },
                      ...highResVideoConstraints,
                    },
                  },
                ]
              : []),
            {
              audio: false,
              video: {
                facingMode: { ideal: 'environment' },
                ...highResVideoConstraints,
              },
            },
            {
              audio: false,
              video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              },
            },
          ];

          for (const c of backConstraintsList) {
            try {
              stream = await navigator.mediaDevices.getUserMedia(c);
              if (stream) break;
            } catch {
              // Continua para a próxima restrição
            }
          }
        } else {
          // Modo frontal
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                facingMode: 'user',
                ...highResVideoConstraints,
              },
            });
          } catch {
            // Continua para o fallback
          }
        }

        // Fallback resiliente
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
          } catch (finalErr) {
            console.error('Falha geral ao acessar câmera:', finalErr);
            if (isMounted) onMountError?.(finalErr);
            return;
          }
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Aplica otimizações de autofoco contínuo e exposição contínua na câmera se suportado
        try {
          const track = stream.getVideoTracks()[0];
          if (track && track.applyConstraints) {
            const caps = (track.getCapabilities?.() as any) || {};
            const adv: any = {};
            if (caps.focusMode && caps.focusMode.includes('continuous')) {
              adv.focusMode = 'continuous';
            }
            if (caps.exposureMode && caps.exposureMode.includes('continuous')) {
              adv.exposureMode = 'continuous';
            }
            if (caps.whiteBalanceMode && caps.whiteBalanceMode.includes('continuous')) {
              adv.whiteBalanceMode = 'continuous';
            }
            if (Object.keys(adv).length > 0) {
              track.applyConstraints({ advanced: [adv] }).catch(() => {});
            }
          }
        } catch {
          // Ignora caso applyConstraints não seja suportado
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        onCameraReady?.();
      };

      initCamera();

      return () => {
        isMounted = false;
        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach((t: any) => t.stop());
          } catch {}
          streamRef.current = null;
        }
      };
    }, [facing, onCameraReady, onMountError]);

    useImperativeHandle(ref, () => ({
      takePicture: async () => {
        if (!streamRef.current || Platform.OS !== 'web') {
          return null;
        }

        const track = streamRef.current.getVideoTracks()[0];

        // 1. Tenta captura fotográfica de resolução nativa total via ImageCapture API (Chromium/Android)
        if (typeof window !== 'undefined' && 'ImageCapture' in window && track && track.readyState === 'live') {
          try {
            const imageCapture = new (window as any).ImageCapture(track);
            const photoCaps = await imageCapture.getPhotoCapabilities?.().catch(() => null);
            const photoSettings: any = {};

            if (photoCaps?.imageWidth?.max) {
              photoSettings.imageWidth = photoCaps.imageWidth.max;
            }
            if (photoCaps?.imageHeight?.max) {
              photoSettings.imageHeight = photoCaps.imageHeight.max;
            }

            const blob = await imageCapture.takePhoto(photoSettings);
            return await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn('ImageCapture falhou, recorrendo ao canvas de alta resolução:', err);
          }
        }

        // 2. Fallback para Canvas usando resolução máxima disponível no vídeo (iOS Safari ou navegadores sem ImageCapture)
        if (!videoRef.current) return null;

        const video = videoRef.current;
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return null;

        // Configurações de máxima nitidez no Canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, width, height);

        // Qualidade JPEG 0.98 preserva todos os detalhes finos de texto sem artefatos de compressão
        return canvas.toDataURL('image/jpeg', 0.98);
      },
    }));

    if (Platform.OS !== 'web') {
      return null;
    }

    return (
      <View style={StyleSheet.absoluteFill}>
        {React.createElement('video', {
          ref: videoRef,
          autoPlay: true,
          playsInline: true,
          muted: true,
          style: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#000000',
          },
        })}
      </View>
    );
  }
);
