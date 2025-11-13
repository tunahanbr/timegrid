// Timer sync system to keep all windows in sync
import { TimerState } from './storage';

// Custom event for timer state changes
const TIMER_SYNC_EVENT = 'timer-state-changed';

// Broadcast timer state change to all windows
export function broadcastTimerState(state: TimerState) {
  // Use localStorage to trigger storage events in other windows
  localStorage.setItem('timetrack_timer', JSON.stringify(state));
  
  // Also dispatch custom event in current window
  window.dispatchEvent(new CustomEvent(TIMER_SYNC_EVENT, { detail: state }));
}

// Listen for timer state changes (from other windows or current window)
export function onTimerStateChange(callback: (state: TimerState) => void) {
  // Listen for custom events (same window)
  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent<TimerState>;
    callback(customEvent.detail);
  };
  
  // Listen for storage events (other windows)
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'timetrack_timer' && e.newValue) {
      try {
        const state = JSON.parse(e.newValue) as TimerState;
        callback(state);
      } catch (error) {
        console.error('Failed to parse timer state:', error);
      }
    }
  };
  
  window.addEventListener(TIMER_SYNC_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  
  // Return cleanup function
  return () => {
    window.removeEventListener(TIMER_SYNC_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
