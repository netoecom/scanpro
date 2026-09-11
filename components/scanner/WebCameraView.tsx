/**
 * ScanPro — WebCameraView
 * Implementação direta e infalível de câmera HTML5 para navegadores web e PWA.
 * Resolve incompatibilidades e telas pretas do expo-camera na Web.
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

      const initCamera = async () => {
        // Encerra streams anteriores para trocar de lente
        if (streamRef.current) {
          try {
            streamRef.current.getTracks().forEach((t: any) => t.stop());
          } catch {}
          streamRef.current = null;
        }

        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: facing === 'back' ? { ideal: 'environment' } : 'user',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        };

        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
        } catch (err) {
          console.warn('Tentativa com facingMode falhou, tentando fallback genérico:', err);
          // Fallback para qualquer câmera disponível
          try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: true,
            });
            if (!isMounted) {
              fallbackStream.getTracks().forEach((t) => t.stop());
              return;
            }

            streamRef.current = fallbackStream;
            if (videoRef.current) {
              videoRef.current.srcObject = fallbackStream;
              videoRef.current.play().catch(() => {});
            }
            onCameraReady?.();
          } catch (finalError) {
            console.error('Falha geral ao acessar câmera:', finalError);
            onMountError?.(finalError);
          }
        }
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
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

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
