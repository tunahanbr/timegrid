/* eslint-disable @typescript-eslint/no-explicit-any */
// Worker to parse ICS text off the main thread
import IcalExpander from 'ical-expander';

// Message format: { ics: string, startTs: number, endTs: number, url: string }
self.onmessage = (e: MessageEvent) => {
  const { ics, startTs, endTs, url } = e.data as { ics: string; startTs: number; endTs: number; url: string };

  try {
    const expander = new IcalExpander({ ics, maxIterations: 2000 });
    const start = new Date(startTs);
    const end = new Date(endTs);
    const { events, occurrences } = expander.between(start, end);

    const safeText = (v: any): string | undefined => {
      if (v == null) return undefined;
      if (typeof v === 'string') return v;
      if (typeof v.toString === 'function') return v.toString();
      return undefined;
    };

    const out: any[] = [];

    // Non-recurring events
    for (const ev of events) {
      const s = (ev as any).startDate?.toJSDate?.() ?? new Date((ev as any).startDate);
      const t = (ev as any).endDate?.toJSDate?.() ?? new Date((ev as any).endDate);
      const uid = (ev as any).uid || safeText((ev as any).id) || `${url}#${s.toISOString()}`;
      const title = safeText((ev as any).summary) || 'Untitled';
      const description = safeText((ev as any).description);
      const location = safeText((ev as any).location);
      const status = safeText((ev as any).status);
      const allDay = !!(ev as any).startDate?.isDate;
      const href = (ev as any).component?.getFirstPropertyValue?.('url') as string | undefined;

      out.push({
        id: `ical:${uid}`,
        source: 'ical',
        sourceEventId: uid,
        title: title || 'Untitled',
        description,
        start: s.toISOString(),
        end: t.toISOString(),
        allDay,
        location,
        url: href,
        status,
        recurrenceRule: null,
      });
    }

    // Recurring occurrences
    for (const occ of occurrences) {
      const s = (occ as any).startDate?.toJSDate?.() ?? new Date((occ as any).startDate);
      const t = (occ as any).endDate?.toJSDate?.() ?? new Date((occ as any).endDate);
      const item: any = (occ as any).item;
      const uid = item?.uid || `${url}#${s.toISOString()}`;
      const title = safeText(item?.summary) || 'Untitled';
      const description = safeText(item?.description);
      const location = safeText(item?.location);
      const status = safeText(item?.status);
      const allDay = !!item?.startDate?.isDate;
      const href = item?.component?.getFirstPropertyValue?.('url') as string | undefined;

      out.push({
        id: `ical:${uid}:${s.getTime()}`,
        source: 'ical',
        sourceEventId: uid,
        title: title || 'Untitled',
        description,
        start: s.toISOString(),
        end: t.toISOString(),
        allDay,
        location,
        url: href,
        status,
        recurrenceRule: 'RRULE',
      });
    }

    (self as any).postMessage({ events: out });
  } catch (error) {
    (self as any).postMessage({ error: (error as Error).message || 'Failed to parse ICS' });
  }
};
