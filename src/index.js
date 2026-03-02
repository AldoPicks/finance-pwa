import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ============================================================
// Registro del Service Worker (PWA)
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado:', registration.scope);

        // Detectar actualización disponible
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (
                installingWorker.state === 'installed' &&
                navigator.serviceWorker.controller
              ) {
                console.log('[PWA] Nueva versión disponible. Recarga la página.');
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            };
          }
        };
      })
      .catch((err) => console.error('[PWA] Error al registrar SW:', err));
  });
}
