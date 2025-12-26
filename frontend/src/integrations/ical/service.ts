import type { ExternalEvent, TimeRange } from '@/lib/external-events';
import { parseIcsToExternalEvents } from './parseIcal';

export async function syncIcalFeeds(urls: string[], range: TimeRange): Promise<ExternalEvent[]> {
  const results: ExternalEvent[][] = await Promise.all(
    urls.map(async (u) => {
      try {
        return await parseIcsToExternalEvents(u, range);
      } catch (err) {
        return [];
      }
    })
  );
  return results.flat();
}
