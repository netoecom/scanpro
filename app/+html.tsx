import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * ScanPro — Root HTML Document
 * Configura metatags de PWA, manifesto, Service Worker e captura antecipada de beforeinstallprompt.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover, user-scalable=no"
        />

        <title>ScanPro — Scanner de Documentos</title>
        <meta
          name="description"
          content="Digitalize contratos, recibos e notas fiscais com qualidade profissional, OCR e PDF instantâneo."
        />

        {/* PWA Manifest e Identidade Visual */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#007AFF" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ScanPro" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />

        {/* Captura antecipada e infalível de beforeinstallprompt para instalação em 1 clique */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__SCANPRO_BEFORE_INSTALL_PROMPT__ = null;
              window.addEventListener('beforeinstallprompt', function(e) {
                e.preventDefault();
                window.__SCANPRO_BEFORE_INSTALL_PROMPT__ = e;
                window.dispatchEvent(new CustomEvent('scanpro:installable'));
              });

              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js?v=1.0.2').then(function(reg) {
                    console.log('ScanPro ServiceWorker registrado com sucesso:', reg.scope);
                  }).catch(function(err) {
                    console.warn('Falha no registro do ServiceWorker:', err);
                  });
                });
              }
            `,
          }}
        />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
