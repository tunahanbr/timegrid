import IcalExpander from 'ical-expander';
import type { ExternalEvent, TimeRange } from '@/lib/external-events';
import { getApiUrl } from '@/lib/init';

function safeText(v: any): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  if (typeof v.toString === 'function') return v.toString();
  return undefined;
}

export async function fetchIcsText(url: string): Promise<string> {
  // Always use backend proxy (avoids CORS errors, enables caching, improves security)
  const api = getApiUrl();
  const proxied = `${api}/api/proxy/ical?url=${encodeURIComponent(url)}`;
  const headers: Record<string, string> = {};
  try {
    const token = localStorage.getItem('auth_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch {}
  const res = await fetch(proxied, { headers, credentials: 'include' as RequestCredentials });
  if (!res.ok) throw new Error(`Proxy failed (${res.status})`);
  return await res.text();
}

export async function parseIcsToExternalEvents(url: string, range: TimeRange): Promise<ExternalEvent[]> {
  const ics = await fetchIcsText(url);
  const expander = new IcalExpander({ ics, maxIterations: 2000 });

  const { events, occurrences } = expander.between(range.start, range.end);
  const out: ExternalEvent[] = [];

  // Non-recurring events
  for (const ev of events) {
    const start = ev.startDate?.toJSDate?.() ?? new Date(ev.startDate);
    const end = ev.endDate?.toJSDate?.() ?? new Date(ev.endDate);
    const uid = (ev as any).uid || safeText((ev as any).id) || `${url}#${start.toISOString()}`;
    const title = safeText((ev as any).summary) || 'Untitled';
    const description = safeText((ev as any).description);
    const location = safeText((ev as any).location);
    const status = safeText((ev as any).status) as ExternalEvent['status'];
    const allDay = !!(ev as any).startDate?.isDate;
    const href = (ev as any).component?.getFirstPropertyValue?.('url') as string | undefined;

    out.push({
      id: `ical:${uid}`,
      source: 'ical',
      sourceEventId: uid,
      title: title || 'Untitled',
      description,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      location,
      url: href,
      status,
      recurrenceRule: null,
    });
  }

  // Recurring event instances expanded in range
  for (const occ of occurrences) {
    const start = occ.startDate?.toJSDate?.() ?? new Date(occ.startDate);
    const end = occ.endDate?.toJSDate?.() ?? new Date(occ.endDate);
    const item: any = occ.item;
    const uid = item?.uid || `${url}#${start.toISOString()}`;
    const title = safeText(item?.summary) || 'Untitled';
    const description = safeText(item?.description);
    const location = safeText(item?.location);
    const status = safeText(item?.status) as ExternalEvent['status'];
    const allDay = !!item?.startDate?.isDate;
    const href = item?.component?.getFirstPropertyValue?.('url') as string | undefined;

    out.push({
      id: `ical:${uid}:${start.getTime()}`,
      source: 'ical',
      sourceEventId: uid,
      title: title || 'Untitled',
      description,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      location,
      url: href,
      status,
      recurrenceRule: 'RRULE',
    });
  }

  return out;
}
