// Service Worker Update Manager - آداة إدارة تحديثات Service Worker
interface UpdateCallback {
  onUpdateFound?: () => void;
  onUpdateReady?: () => void;
  onUpdateActivated?: () => void;
  onError?: (error: Error) => void;
}

export class SWUpdateManager {
  private callbacks: UpdateCallback = {};
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor(callbacks: UpdateCallback = {}) {
    this.callbacks = callbacks;
    this.setupListeners();
  }

  private setupListeners() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[SWUpdateManager] Service Worker not supported');
      return;
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SWUpdateManager] Controller changed - update activated');
      this.callbacks.onUpdateActivated?.();
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SW_ACTIVATED') {
        console.log('[SWUpdateManager] SW activation message received');
        this.callbacks.onUpdateActivated?.();
      }
    });
  }

  async registerUpdateListener(registration: ServiceWorkerRegistration) {
    this.swRegistration = registration;

    registration.addEventListener('updatefound', () => {
      console.log('[SWUpdateManager] Update found');
      this.callbacks.onUpdateFound?.();

      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SWUpdateManager] Update ready for install');
          this.callbacks.onUpdateReady?.();
        }
      });
    });
  }

  async checkForUpdates(): Promise<boolean> {
    if (!this.swRegistration) {
      console.warn('[SWUpdateManager] No registration available');
      return false;
    }

    try {
      console.log('[SWUpdateManager] Checking for updates...');
      await this.swRegistration.update();
      console.log('[SWUpdateManager] Update check completed');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[SWUpdateManager] Error checking updates:', err);
      this.callbacks.onError?.(err);
      return false;
    }
  }

  async skipWaiting() {
    if (!this.swRegistration?.waiting) {
      console.warn('[SWUpdateManager] No waiting worker found');
      return;
    }

    console.log('[SWUpdateManager] Telling waiting worker to skip waiting');
    this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }

  getUpdateStatus() {
    if (!this.swRegistration) {
      return { hasUpdate: false, isWaiting: false, isInstalling: false };
    }

    return {
      hasUpdate: !!this.swRegistration.waiting || !!this.swRegistration.installing,
      isWaiting: !!this.swRegistration.waiting,
      isInstalling: !!this.swRegistration.installing,
    };
  }
}

// Helper function to get or create update manager
let updateManagerInstance: SWUpdateManager | null = null;

export function getSWUpdateManager(callbacks?: UpdateCallback): SWUpdateManager {
  if (!updateManagerInstance) {
    updateManagerInstance = new SWUpdateManager(callbacks);
  }
  return updateManagerInstance;
}

export function createSWUpdateManager(callbacks?: UpdateCallback): SWUpdateManager {
  return new SWUpdateManager(callbacks);
}
