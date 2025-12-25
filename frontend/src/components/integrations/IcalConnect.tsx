import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useExternalEvents } from '@/hooks/useExternalEvents';
import { syncIcalFeeds } from '@/integrations/ical/service';
import type { TimeRange } from '@/lib/external-events';
import { X } from 'lucide-react';

function computeDefaultRange(): TimeRange {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 14); // two weeks back
  const end = new Date(now);
  end.setDate(end.getDate() + 90); // three months ahead
  return { start, end };
}

const DEFAULT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
  '#DDA15E', '#BC6C25', '#B4A7D6', '#9B59B6', '#3498DB',
  '#E74C3C', '#27AE60', '#2980B9', '#F39C12', '#C0392B',
];

export function IcalConnect() {
  const { icalCalendars, addIcalCalendar, removeIcalCalendar, updateIcalCalendar, setEventsForSource } = useExternalEvents();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleAdd = async () => {
    if (!url.trim() || !name.trim()) return;
    setError(null);
    const trimmed = url.trim();
    
    // Detect common Google Calendar non-ICS links (web UI cid=) and guide user
    if (trimmed.includes('calendar.google.com') && trimmed.includes('cid=') && !trimmed.endsWith('.ics')) {
      setError('This appears to be a Google Calendar web link, not an iCal (.ics) URL. In Google Calendar: Settings → your calendar → Integrate calendar → copy the "Public address in iCal format" or "Secret address in iCal format" (it ends with .ics).');
      return;
    }
    
    addIcalCalendar(trimmed, name.trim(), selectedColor);
    setUrl('');
    setName('');
    setSelectedColor(DEFAULT_COLORS[0]);
    
    // Immediately sync including the newly added calendar
    try {
      setIsSyncing(true);
      const range = computeDefaultRange();
      const newCalendarUrls = [...icalCalendars.map(c => c.url), trimmed];
      const events = await syncIcalFeeds(newCalendarUrls, range);
      setEventsForSource('ical', events, new Date().toISOString());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sync iCal feeds';
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const range = computeDefaultRange();
      const urls = icalCalendars.map(c => c.url);
      const events = await syncIcalFeeds(urls, range);
      setEventsForSource('ical', events, new Date().toISOString());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sync iCal feeds';
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const startEdit = (id: string, currentName: string, currentColor: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditColor(currentColor);
  };

  const handleSaveEdit = (id: string) => {
    if (editName.trim()) {
      updateIcalCalendar(id, editName.trim(), editColor);
      setEditingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add new calendar */}
      <div className="space-y-3 p-3 border rounded bg-muted/20">
        <h4 className="text-sm font-semibold">Add iCal Calendar</h4>
        <Input
          placeholder="Calendar name (e.g., Personal, Work)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Input
          placeholder="https://.../calendar.ics"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Color</label>
          <Input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="h-10 w-20"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleAdd} 
            disabled={isSyncing || !url.trim() || !name.trim()}
            size="sm"
          >
            Add Calendar
          </Button>
          <Button 
            variant="outline" 
            onClick={handleSync} 
            disabled={isSyncing || icalCalendars.length === 0}
            size="sm"
          >
            {isSyncing ? 'Syncing…' : 'Sync Now'}
          </Button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>

      {/* List of calendars */}
      {icalCalendars.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{icalCalendars.length} Connected Calendar{icalCalendars.length > 1 ? 's' : ''}</h4>
          <div className="space-y-2">
            {icalCalendars.map(cal => (
              <div key={cal.id} className="flex items-center gap-2 p-2 border rounded hover:bg-muted/50 group">
                {editingId === cal.id ? (
                  <>
                    <div
                      className="w-4 h-4 rounded flex-shrink-0 border cursor-pointer"
                      style={{ backgroundColor: editColor }}
                      onClick={() => setEditColor(editColor === '#ffffff' ? '#000000' : editColor === '#000000' ? DEFAULT_COLORS[0] : '#ffffff')}
                      title="Click to change color"
                    />
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 text-sm px-2 py-1 border rounded bg-background"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(cal.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSaveEdit(cal.id)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-4 h-4 rounded flex-shrink-0 border"
                      style={{ backgroundColor: cal.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p 
                        className="text-sm font-medium truncate cursor-pointer hover:underline"
                        onClick={() => startEdit(cal.id, cal.name, cal.color)}
                      >
                        {cal.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={cal.url}>
                        {new URL(cal.url).hostname}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(cal.id, cal.name, cal.color)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeIcalCalendar(cal.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default IcalConnect;
