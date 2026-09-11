/**
 * ScanPro — WebCameraView
 * Implementação de câmera HTML5 para navegadores web e PWA com prioridade estrita à câmera traseira.
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

          // 2. Em dispositivos móveis (Android/iOS), a câmera traseira costuma ser a última listada
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

        // Tentativa 1: Busca específica com facingMode
        if (facing === 'back') {
          // Tenta identificar o deviceId traseiro caso permissão já esteja concedida
          const backDeviceId = await getBackCameraDeviceId();

          const backConstraintsList: MediaStreamConstraints[] = [
            ...(backDeviceId
              ? [
                  {
                    audio: false,
                    video: {
                      deviceId: { exact: backDeviceId },
                      width: { ideal: 1920 },
                      height: { ideal: 1440 },
                    },
                  },
                ]
              : []),
            {
              audio: false,
              video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1440 },
              },
            },
            {
              audio: false,
              video: {
                facingMode: 'environment',
              },
            },
          ];

          for (const c of backConstraintsList) {
            try {
              stream = await navigator.mediaDevices.getUserMedia(c);
              if (stream) break;
            } catch (e) {
              // Continua para a próxima constraint
            }
          }
        } else {
          // Modo frontal
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                facingMode: 'user',
                width: { ideal: 1920 },
                height: { ideal: 1440 },
              },
            });
          } catch {
            // Continua para o fallback genérico
          }
        }

        // Fallback resiliente se nenhuma das opções anteriores funcionou
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
        if (!videoRef.current || Platform.OS !== 'web') {
          return null;
        }

        const video = videoRef.current;
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1440;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, width, height);
        return canvas.toDataURL('image/jpeg', 0.92);
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
