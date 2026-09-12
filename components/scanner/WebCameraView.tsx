/**
 * ScanPro — WebCameraView
 * Câmera HTML5 com prioridade estrita para a câmera traseira, alta resolução e suporte à ImageCapture API.
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
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
      if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
        return;
      }

      let isMounted = true;

      const initCamera = async () => {
        // Encerra streams anteriores para liberar o hardware da câmera
        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach((t) => t.stop());
          } catch {}
          streamRef.current = null;
        }

        let stream: MediaStream | null = null;

        // Lista de restrições em ordem decrescente de prioridade para a câmera traseira
        const constraintsAttempts: MediaStreamConstraints[] = [];

        if (facing === 'back') {
          // 1. Tenta identificar se já existe dispositivo explicitamente rotulado como traseiro
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const backDevice = devices.find(
              (d) => d.kind === 'videoinput' && /back|rear|traseir|environment/i.test(d.label)
            );
            if (backDevice?.deviceId) {
              constraintsAttempts.push({
                audio: false,
                video: {
                  deviceId: { exact: backDevice.deviceId },
                  width: { ideal: 2560 },
                  height: { ideal: 1440 },
                },
              });
            }
          } catch {}

          // 2. facingMode exact environment (exige traseira sem ambiguidade)
          constraintsAttempts.push({
            audio: false,
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 2560 },
              height: { ideal: 1440 },
            },
          });

          // 3. facingMode ideal environment com alta resolução flexível
          constraintsAttempts.push({
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1440 },
            },
          });

          // 4. facingMode environment simples
          constraintsAttempts.push({
            audio: false,
            video: {
              facingMode: 'environment',
            },
          });
        } else {
          // Câmera frontal solicitada expressamente pelo usuário
          constraintsAttempts.push({
            audio: false,
            video: {
              facingMode: 'user',
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          });
        }

        // Tenta cada uma das restrições prioritárias
        for (const c of constraintsAttempts) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(c);
            if (stream) break;
          } catch {
            // Continua para a próxima tentativa
          }
        }

        // Se ainda não obteve stream, tenta fallback mas mantendo a preferência de traseira se facing === 'back'
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: facing === 'back' ? { facingMode: { ideal: 'environment' } } : true,
            });
          } catch (err) {
            console.error('Falha geral ao abrir câmera:', err);
            if (isMounted) onMountError?.(err);
            return;
          }
        }

        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        // Ativa autofoco contínuo e autoexposição nas faixas de vídeo se disponível
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
            if (Object.keys(adv).length > 0) {
              track.applyConstraints({ advanced: [adv] }).catch(() => {});
            }
          }
        } catch {}

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
            streamRef.current.getTracks().forEach((t) => t.stop());
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

        // 1. Tenta captura fotográfica de resolução total do sensor via ImageCapture API
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
            console.warn('ImageCapture fallback para canvas:', err);
          }
        }

        // 2. Fallback para Canvas usando resolução do elemento video
        if (!videoRef.current) return null;

        const video = videoRef.current;
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, width, height);

        return canvas.toDataURL('image/jpeg', 0.98);
      },
    }));

    if (Platform.OS !== 'web') {
      return null;
    }

    return (
      <View style={styles.videoFill}>
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

const styles = StyleSheet.create({
  videoFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
});
