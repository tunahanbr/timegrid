import type { TimeEntry } from '@/lib/supabase-storage';
import type { ExternalEvent, ExternalSource } from '@/lib/external-events';

export type CalendarItem =
  | {
      kind: 'local';
      id: string;
      start: string; // ISO
      end: string;   // ISO
      entry: TimeEntry;
    }
  | {
      kind: 'external';
      id: string;
      start: string; // ISO
      end: string;   // ISO
      source: ExternalSource;
      event: ExternalEvent;
    };

export function toCalendarItems(local: TimeEntry[], external: ExternalEvent[]): CalendarItem[] {
  const locals: CalendarItem[] = local.map((e) => {
    const startIso = e.startTime ?? e.date; // existing model stores either startTime or date
    const end = new Date(startIso);
    end.setSeconds(end.getSeconds() + e.duration);
    return {
      kind: 'local',
      id: `local:${e.id}`,
      start: startIso,
      end: end.toISOString(),
      entry: e,
    };
  });

  const externals: CalendarItem[] = external.map((ev) => ({
    kind: 'external',
    id: `ext:${ev.id}`,
    start: ev.start,
    end: ev.end,
    source: ev.source,
    event: ev,
  }));

  return sortCalendarItems([...locals, ...externals]);
}

export function sortCalendarItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => {
    const sa = new Date(a.start).getTime();
    const sb = new Date(b.start).getTime();
    if (sa !== sb) return sa - sb;
    // Keep local entries ahead of external when equal start to favor edit affordances
    if (a.kind !== b.kind) return a.kind === 'local' ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export function isExternal(item: CalendarItem): item is Extract<CalendarItem, { kind: 'external' }> {
  return item.kind === 'external';
}

export function isLocal(item: CalendarItem): item is Extract<CalendarItem, { kind: 'local' }> {
  return item.kind === 'local';
}

export function groupByDay(items: CalendarItem[]): Record<string, CalendarItem[]> {
  return items.reduce<Record<string, CalendarItem[]>>((acc, it) => {
    const d = new Date(it.start);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    (acc[key] ||= []).push(it);
    return acc;
  }, {});
}
