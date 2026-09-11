/**
 * ScanPro — PWA Install & Permissions Hook
 * Permite instalar o aplicativo com 1 clique e solicitar permissões de forma amigável no Onboarding.
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

    // Captura o evento nativo de instalação do navegador
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Checa permissão de notificação existente
    if ('Notification' in window) {
      setHasNotificationPermission(Notification.permission === 'granted');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Solicitar instalação do App
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Erro ao disparar prompt de instalação:', err);
      return false;
    }
  }, [deferredPrompt]);

  // Solicitar permissão de câmera e aquecer o stream
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.mediaDevices) {
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      stream.getTracks().forEach((track) => track.stop());
      setHasCameraPermission(true);
      return true;
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
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
    // 1. Câmera
    await requestCameraPermission();

    // 2. Notificações
    await requestNotificationPermission();

    // 3. Prompt de Instalação do App
    if (deferredPrompt) {
      await promptInstall();
    }
  }, [requestCameraPermission, requestNotificationPermission, promptInstall, deferredPrompt]);

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
