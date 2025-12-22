import React, { createContext, useCallback, useContext, useMemo, useReducer, useEffect } from 'react';
import type { ExternalEvent, ExternalSource, TimeRange } from '@/lib/external-events';
import { syncIcalFeeds } from '@/integrations/ical/service';

const ICAL_CALENDARS_STORAGE_KEY = 'external_calendars_ical_calendars';

export interface IcalCalendar {
  id: string; // UUID for this calendar config
  url: string; // iCal feed URL
  name: string;
  color: string; // Hex color code
}

function loadStoredIcalCalendars(): IcalCalendar[] {
  try {
    const stored = localStorage.getItem(ICAL_CALENDARS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveIcalCalendars(calendars: IcalCalendar[]): void {
  try {
    localStorage.setItem(ICAL_CALENDARS_STORAGE_KEY, JSON.stringify(calendars));
  } catch {
    console.warn('Failed to save iCal calendars to localStorage');
  }
}

interface ExternalCalendarsState {
  events: ExternalEvent[];
  lastSyncBySource: Partial<Record<ExternalSource, string>>; // ISO timestamp
  connected: Partial<Record<ExternalSource, boolean>>;
  icalCalendars: IcalCalendar[]; // iCal calendars with metadata
}

type Action =
  | { type: 'SET_EVENTS_FOR_SOURCE'; source: ExternalSource; events: ExternalEvent[]; syncedAt?: string }
  | { type: 'ADD_EVENTS'; events: ExternalEvent[] }
  | { type: 'CLEAR_SOURCE'; source: ExternalSource }
  | { type: 'SET_CONNECTED'; source: ExternalSource; connected: boolean }
  | { type: 'ADD_ICAL_CALENDAR'; url: string; name: string; color: string }
  | { type: 'REMOVE_ICAL_CALENDAR'; calendarId: string }
  | { type: 'UPDATE_ICAL_CALENDAR'; calendarId: string; name: string; color: string };

const initialState: ExternalCalendarsState = {
  events: [],
  lastSyncBySource: {},
  connected: {},
  icalCalendars: loadStoredIcalCalendars(),
};

function reducer(state: ExternalCalendarsState, action: Action): ExternalCalendarsState {
  switch (action.type) {
    case 'SET_EVENTS_FOR_SOURCE': {
      const filtered = state.events.filter(e => e.source !== action.source);
      const events = [...filtered, ...action.events];
      return {
        ...state,
        events,
        lastSyncBySource: {
          ...state.lastSyncBySource,
          [action.source]: action.syncedAt ?? new Date().toISOString(),
        },
      };
    }
    case 'ADD_EVENTS': {
      // Upsert by id
      const byId = new Map(state.events.map(e => [e.id, e] as const));
      for (const ev of action.events) byId.set(ev.id, ev);
      return { ...state, events: Array.from(byId.values()) };
    }
    case 'CLEAR_SOURCE': {
      return {
        ...state,
        events: state.events.filter(e => e.source !== action.source),
      };
    }
    case 'SET_CONNECTED': {
      return {
        ...state,
        connected: { ...state.connected, [action.source]: action.connected },
      };
    }
    case 'ADD_ICAL_CALENDAR': {
      if (state.icalCalendars.some(c => c.url === action.url)) return state;
      const id = crypto.randomUUID();
      const updated = [...state.icalCalendars, { id, url: action.url, name: action.name, color: action.color }];
      saveIcalCalendars(updated);
      return { ...state, icalCalendars: updated };
    }
    case 'REMOVE_ICAL_CALENDAR': {
      const updated = state.icalCalendars.filter(c => c.id !== action.calendarId);
      saveIcalCalendars(updated);
      return { ...state, icalCalendars: updated };
    }
    case 'UPDATE_ICAL_CALENDAR': {
      const updated = state.icalCalendars.map(c =>
        c.id === action.calendarId ? { ...c, name: action.name, color: action.color } : c
      );
      saveIcalCalendars(updated);
      return { ...state, icalCalendars: updated };
    }
    default:
      return state;
  }
}

interface ExternalCalendarsContextValue extends ExternalCalendarsState {
  setEventsForSource: (source: ExternalSource, events: ExternalEvent[], syncedAt?: string) => void;
  addEvents: (events: ExternalEvent[]) => void;
  clearSource: (source: ExternalSource) => void;
  setConnected: (source: ExternalSource, connected: boolean) => void;
  addIcalCalendar: (url: string, name: string, color: string) => void;
  removeIcalCalendar: (calendarId: string) => void;
  updateIcalCalendar: (calendarId: string, name: string, color: string) => void;
  getEventsInRange: (range: TimeRange) => ExternalEvent[];
}

const ExternalCalendarsContext = createContext<ExternalCalendarsContextValue | undefined>(undefined);

export const ExternalCalendarsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Auto-sync stored iCal calendars on mount
  useEffect(() => {
    const autoSync = async () => {
      if (state.icalCalendars.length === 0) return;
      try {
        // Default range: 2 weeks back, 3 months ahead
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 14);
        const end = new Date(now);
        end.setDate(end.getDate() + 90);
        
        // Sync all calendar URLs and tag events with calendarId
        const allEvents: ExternalEvent[] = [];
        for (const calendar of state.icalCalendars) {
          try {
            const events = await syncIcalFeeds([calendar.url], { start, end });
            // Tag events with this calendar's metadata
            const taggedEvents = events.map(ev => ({
              ...ev,
              calendarId: calendar.id,
              calendarName: calendar.name,
              color: calendar.color,
            }));
            allEvents.push(...taggedEvents);
          } catch (err) {
            console.warn(`Failed to sync calendar ${calendar.name}:`, err);
          }
        }
        
        dispatch({ type: 'SET_EVENTS_FOR_SOURCE', source: 'ical', events: allEvents, syncedAt: new Date().toISOString() });
      } catch (err) {
        console.warn('Auto-sync iCal calendars failed on mount:', err);
      }
    };
    autoSync();
  }, [state.icalCalendars]);

  // Periodic sync every 5 minutes to catch deletions/updates from external calendars
  useEffect(() => {
    if (state.icalCalendars.length === 0) return;
    
    const interval = setInterval(async () => {
      try {
        const now = new Date();
        const start = new Date(now);
        start.setDate(start.getDate() - 14);
        const end = new Date(now);
        end.setDate(end.getDate() + 90);
        
        const allEvents: ExternalEvent[] = [];
        for (const calendar of state.icalCalendars) {
          try {
            const events = await syncIcalFeeds([calendar.url], { start, end });
            const taggedEvents = events.map(ev => ({
              ...ev,
              calendarId: calendar.id,
              calendarName: calendar.name,
              color: calendar.color,
            }));
            allEvents.push(...taggedEvents);
          } catch (err) {
            console.debug(`Periodic sync failed for calendar ${calendar.name}:`, err);
          }
        }
        
        dispatch({ type: 'SET_EVENTS_FOR_SOURCE', source: 'ical', events: allEvents, syncedAt: new Date().toISOString() });
      } catch (err) {
        console.debug('Periodic iCal sync failed (will retry):', err);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [state.icalCalendars]);

  const setEventsForSource = useCallback((source: ExternalSource, events: ExternalEvent[], syncedAt?: string) => {
    dispatch({ type: 'SET_EVENTS_FOR_SOURCE', source, events, syncedAt });
  }, []);
  const addEvents = useCallback((events: ExternalEvent[]) => {
    dispatch({ type: 'ADD_EVENTS', events });
  }, []);
  const clearSource = useCallback((source: ExternalSource) => {
    dispatch({ type: 'CLEAR_SOURCE', source });
  }, []);
  const setConnected = useCallback((source: ExternalSource, connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', source, connected });
  }, []);
  const addIcalCalendar = useCallback((url: string, name: string, color: string) => {
    dispatch({ type: 'ADD_ICAL_CALENDAR', url, name, color });
  }, []);
  const removeIcalCalendar = useCallback((calendarId: string) => {
    dispatch({ type: 'REMOVE_ICAL_CALENDAR', calendarId });
  }, []);
  const updateIcalCalendar = useCallback((calendarId: string, name: string, color: string) => {
    dispatch({ type: 'UPDATE_ICAL_CALENDAR', calendarId, name, color });
  }, []);

  const getEventsInRange = useCallback((range: TimeRange) => {
    const startMs = range.start.getTime();
    const endMs = range.end.getTime();
    return state.events.filter(ev => {
      const evStart = new Date(ev.start).getTime();
      const evEnd = new Date(ev.end).getTime();
      return evEnd > startMs && evStart < endMs;
    });
  }, [state.events]);

  const value = useMemo<ExternalCalendarsContextValue>(() => ({
    ...state,
    setEventsForSource,
    addEvents,
    clearSource,
    setConnected,
    addIcalCalendar,
    removeIcalCalendar,
    updateIcalCalendar,
    getEventsInRange,
  }), [state, setEventsForSource, addEvents, clearSource, setConnected, addIcalCalendar, removeIcalCalendar, updateIcalCalendar, getEventsInRange]);

  return (
    <ExternalCalendarsContext.Provider value={value}>
      {children}
    </ExternalCalendarsContext.Provider>
  );
};

export function useExternalCalendarsContext(): ExternalCalendarsContextValue {
  const ctx = useContext(ExternalCalendarsContext);
  if (!ctx) throw new Error('useExternalCalendarsContext must be used within ExternalCalendarsProvider');
  return ctx;
}
