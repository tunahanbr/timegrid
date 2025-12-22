import { useMemo } from 'react';
import type { TimeRange, ExternalEvent, ExternalSource } from '@/lib/external-events';
import { useExternalCalendarsContext, type IcalCalendar } from '@/contexts/ExternalCalendarsContext';

export function useExternalEvents() {
  const ctx = useExternalCalendarsContext();

  const bySource = useMemo(() => {
    const map = new Map<ExternalSource, ExternalEvent[]>();
    for (const ev of ctx.events) {
      const list = map.get(ev.source) ?? [];
      list.push(ev);
      map.set(ev.source as ExternalSource, list);
    }
    return map;
  }, [ctx.events]);

  const getBySource = (source: ExternalSource) => bySource.get(source) ?? [];

  const getInRange = (range: TimeRange) => ctx.getEventsInRange(range);

  return {
    events: ctx.events,
    connected: ctx.connected,
    icalCalendars: ctx.icalCalendars,
    lastSyncBySource: ctx.lastSyncBySource,

    setEventsForSource: ctx.setEventsForSource,
    addEvents: ctx.addEvents,
    clearSource: ctx.clearSource,
    setConnected: ctx.setConnected,
    addIcalCalendar: ctx.addIcalCalendar,
    removeIcalCalendar: ctx.removeIcalCalendar,
    updateIcalCalendar: ctx.updateIcalCalendar,

    getInRange,
    getBySource,
  };
}
