import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useCalendars } from '@/hooks/useCalendars';
import { getApiUrl } from '@/lib/init';
import { Copy } from 'lucide-react';

function copy(text: string) {
  try {
    navigator.clipboard.writeText(text);
  } catch (err) {
    // Silent fail
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Unknown error';
  }
}

export default function CalendarFeeds() {
  const { user, getAuthHeaders } = useAuth();
  const { projects } = useProjects();
  const { calendars, isLoading: calendarsLoading, error: calendarsError } = useCalendars();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = getApiUrl();
  const baseUrl = useMemo(() => token ? `${api}/api/export/ics?token=${encodeURIComponent(token)}` : null, [api, token]);

  // Load existing token from user settings if present
  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setError(null);
        const res = await fetch(`${api}/api/users?columns=settings&id=${encodeURIComponent(user.id)}`, {
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          credentials: 'include',
        });
        if (!res.ok) return;
        const data = await res.json();
        const settings = data?.data?.[0]?.settings;
        if (settings?.exportIcsToken) setToken(settings.exportIcsToken);
      } catch (e: unknown) {
        setError(getErrorMessage(e) || 'Failed to load calendar feed settings');
      }
    };
    load();
  }, [api, user, getAuthHeaders]);

  const generate = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${api}/api/export/ics/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate token');
      setToken(data.token);
    } catch (e: unknown) {
      setError(getErrorMessage(e) || 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" onClick={generate} disabled={loading}>
          {loading ? 'Generating…' : token ? 'Rotate Secret Token' : 'Generate ICS Token'}
        </Button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>

      {baseUrl && (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium mb-1">All Entries Feed</div>
            <div className="flex gap-2">
              <Input readOnly value={baseUrl} className="text-xs" />
              <Button size="sm" variant="outline" onClick={() => copy(baseUrl)}>
                <Copy className="w-4 h-4 mr-1" /> Copy
              </Button>
            </div>
          </div>

          {!!projects?.length && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Per-Project Feeds</div>
              <div className="space-y-1">
                {projects.map((p) => {
                  const url = `${baseUrl}&projectId=${encodeURIComponent(p.id)}`;
                  return (
                    <div key={p.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded" style={{ backgroundColor: p.color || '#999' }} />
                      <div className="text-sm min-w-28 truncate" title={p.name}>{p.name}</div>
                      <Input readOnly value={url} className="text-xs" />
                      <Button size="sm" variant="outline" onClick={() => copy(url)}>
                        <Copy className="w-4 h-4 mr-1" /> Copy
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-sm font-medium">Per-Calendar Feeds</div>
            {calendarsError && <div className="text-xs text-red-600">{calendarsError.message}</div>}
            {calendarsLoading && <div className="text-xs text-muted-foreground">Loading calendars…</div>}
            {!!calendars?.length && (
              <div className="space-y-1">
                {calendars.map((cal) => {
                  const url = `${baseUrl}&calendarId=${encodeURIComponent(cal.id)}`;
                  return (
                    <div key={cal.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded" style={{ backgroundColor: cal.color || '#999' }} />
                      <div className="text-sm min-w-28 truncate" title={cal.name}>{cal.name}</div>
                      <Input readOnly value={url} className="text-xs" />
                      <Button size="sm" variant="outline" onClick={() => copy(url)}>
                        <Copy className="w-4 h-4 mr-1" /> Copy
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
            {!calendarsLoading && !calendarsError && (!calendars || calendars.length === 0) && (
              <div className="text-xs text-muted-foreground">Create calendars below to get scoped feeds.</div>
            )}
          </div>
        </div>
      )}

      {!baseUrl && (
        <p className="text-xs text-muted-foreground">Generate a token to get your subscribeable ICS links.</p>)
      }
    </div>
  );
}
