import { useEffect } from 'react';

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const useTauriEvents = (onToggleTimer?: () => void) => {
  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        // Dynamically import Tauri API only when running in Tauri
        const { event } = await import('@tauri-apps/api');
        
        unlisten = await event.listen('toggle-timer', () => {
          console.log('Toggle timer event received from system tray');
          onToggleTimer?.();
        });
      } catch (error) {
        console.error('Failed to setup Tauri event listener:', error);
      }
    };

    setupListener();

    return () => {
      unlisten?.();
    };
  }, [onToggleTimer]);

  return { isTauri: isTauri() };
};
