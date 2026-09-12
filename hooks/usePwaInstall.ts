/**
 * ScanPro — PWA Install & Permissions Hook
 * Garante captura resiliente de beforeinstallprompt e instalação direta em 1 clique.
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // Identifica se é dispositivo iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isAppleMobile = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isAppleMobile);

    // Identifica se já está rodando instalado como App Standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // 1. Recupera evento antes capturado no head do HTML caso já tenha disparado
    const globalPrompt = (window as any).__SCANPRO_BEFORE_INSTALL_PROMPT__;
    if (globalPrompt) {
      setDeferredPrompt(globalPrompt);
      setIsInstallable(true);
    }

    // 2. Escuta tanto o evento nativo quanto o evento customizado
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      (window as any).__SCANPRO_BEFORE_INSTALL_PROMPT__ = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleCustomInstallable = () => {
      const p = (window as any).__SCANPRO_BEFORE_INSTALL_PROMPT__;
      if (p) {
        setDeferredPrompt(p);
        setIsInstallable(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      (window as any).__SCANPRO_BEFORE_INSTALL_PROMPT__ = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('scanpro:installable', handleCustomInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Checa permissão de notificação existente
    if ('Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('scanpro:installable', handleCustomInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Solicitar instalação do App
  const promptInstall = useCallback(async (): Promise<boolean> => {
    const promptEvent =
      deferredPrompt ||
      (typeof window !== 'undefined'
        ? (window as any).__SCANPRO_BEFORE_INSTALL_PROMPT__
        : null);

    if (!promptEvent) {
      return false;
    }

    try {
      await promptEvent.prompt();
      const choiceResult = await promptEvent.userChoice;
      if (choiceResult && choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        if (typeof window !== 'undefined') {
          (window as any).__SCANPRO_BEFORE_INSTALL_PROMPT__ = null;
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Erro ao disparar prompt de instalação:', err);
      return false;
    }
  }, [deferredPrompt]);

  // Solicitar permissão de câmera
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasCameraPermission(true);
      return true;
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        fallbackStream.getTracks().forEach((track) => track.stop());
        setHasCameraPermission(true);
        return true;
      } catch (err) {
        console.warn('Permissão de câmera não concedida:', err);
        setHasCameraPermission(false);
        return false;
      }
    }
  }, []);

  // Solicitar permissão de notificações
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasNotificationPermission(granted);
      return granted;
    } catch (err) {
      console.warn('Erro ao solicitar permissão de notificações:', err);
      return false;
    }
  }, []);

  // Ação mestre "Configurar Tudo com 1 Clique"
  const setupAllInOneClick = useCallback(async () => {
    await requestCameraPermission();
    await requestNotificationPermission();
    await promptInstall();
  }, [requestCameraPermission, requestNotificationPermission, promptInstall]);

  return {
    isInstallable,
    isInstalled,
    isIOS,
    hasCameraPermission,
    hasNotificationPermission,
    promptInstall,
    requestCameraPermission,
    requestNotificationPermission,
    setupAllInOneClick,
  };
}
