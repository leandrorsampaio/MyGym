import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// The SW is built with skipWaiting + clientsClaim, so a new build activates as soon as
// it installs — but the page already running keeps the *old* bundle until something
// reloads it. iOS resumes an installed PWA instead of navigating, so that can persist
// for days. Reload once the new worker takes control, and re-check on every foreground.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Skip the very first registration, which claims an uncontrolled page.
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });
}

registerSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (!registration) return;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void registration.update();
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
