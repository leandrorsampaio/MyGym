/**
 * Ask the browser to keep our IndexedDB data persistent (resist eviction).
 * iOS grants this once the app is added to the Home Screen. Safe to call on every load.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && navigator.storage.persisted) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  } catch {
    // Non-fatal — older browsers / private mode.
  }
}

/** True when running as an installed PWA (standalone display). */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari exposes navigator.standalone instead of display-mode.
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
