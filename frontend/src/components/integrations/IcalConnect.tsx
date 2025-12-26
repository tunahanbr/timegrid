import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useExternalEvents } from '@/hooks/useExternalEvents';
import { syncIcalFeeds } from '@/integrations/ical/service';
import type { TimeRange } from '@/lib/external-events';
import { X, Plus, RefreshCw, Pencil, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface IcalConnectProps {
  compact?: boolean;
}

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

export function IcalConnect({ compact = false }: IcalConnectProps) {
  const { icalCalendars, addIcalCalendar, removeIcalCalendar, updateIcalCalendar, setEventsForSource } = useExternalEvents();
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  const resetForm = () => {
    setUrl('');
    setName('');
    setSelectedColor(DEFAULT_COLORS[0]);
    setError(null);
    setDialogOpen(false);
  };

  const handleAdd = async () => {
    if (!url.trim() || !name.trim()) {
      setError('Name and URL are required');
      return;
    }
    setError(null);
    const trimmed = url.trim();
    
    // Detect common Google Calendar non-ICS links (web UI cid=) and guide user
    if (trimmed.includes('calendar.google.com') && trimmed.includes('cid=') && !trimmed.endsWith('.ics')) {
      setError('This appears to be a Google Calendar web link, not an iCal (.ics) URL. In Google Calendar: Settings → your calendar → Integrate calendar → copy the "Public address in iCal format" or "Secret address in iCal format" (it ends with .ics).');
      return;
    }
    
    addIcalCalendar(trimmed, name.trim(), selectedColor);
    toast.success('External calendar added');
    resetForm();
    
    // Immediately sync including the newly added calendar
    try {
      setIsSyncing(true);
      const range = computeDefaultRange();
      const newCalendarUrls = [...icalCalendars.map(c => c.url), trimmed];
      const events = await syncIcalFeeds(newCalendarUrls, range);
      setEventsForSource('ical', events, new Date().toISOString());
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sync iCal feeds';
      toast.error(message);
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
      toast.success('Calendars synced');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to sync iCal feeds';
      toast.error(message);
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
      toast.success('Calendar updated');
    }
  };

  const CalendarForm = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="ical-name">Calendar Name</Label>
        <Input
          id="ical-name"
          placeholder="e.g., Personal, Work, Holidays"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ical-url">iCal URL</Label>
        <Input
          id="ical-url"
          placeholder="https://.../calendar.ics"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Get this from your calendar provider (Google Calendar, Apple Calendar, Outlook, etc.)
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ical-color">Color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="ical-color"
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="h-10 w-20 cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">{selectedColor}</span>
        </div>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* List of calendars */}
      {icalCalendars.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{icalCalendars.length} connected</p>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleSync} 
              disabled={isSyncing}
            >
              {isSyncing ? (
                <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Syncing</>
              ) : (
                <><RefreshCw className="h-3.5 w-3.5 mr-2" />Sync</>
              )}
            </Button>
          </div>
          <div className="space-y-2">
            {icalCalendars.map(cal => (
              <div key={cal.id} className="flex items-center gap-3 p-3 border rounded-md hover:bg-muted/40 transition-colors group">
                {editingId === cal.id ? (
                  <>
                    <Input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-8 w-16 cursor-pointer"
                    />
                    <Input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 text-sm h-8"
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
                      className="w-4 h-4 rounded-full flex-shrink-0 border-2"
                      style={{ backgroundColor: cal.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cal.name}</p>
                      <p className="text-xs text-muted-foreground truncate" title={cal.url}>
                        {new URL(cal.url).hostname}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(cal.id, cal.name, cal.color)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          removeIcalCalendar(cal.id);
                          toast.success('Calendar removed');
                        }}
                      >
                        <X className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {compact ? (
        <>
          <Button onClick={() => setDialogOpen(true)} variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add External Calendar
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add External Calendar</DialogTitle>
                <DialogDescription>
                  Subscribe to an iCal feed to display events on your calendar
                </DialogDescription>
              </DialogHeader>
              {CalendarForm}
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={!url.trim() || !name.trim()}>
                  {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : (
        <div className="space-y-3 p-3 border rounded bg-muted/20">
          <h4 className="text-sm font-semibold">Add iCal Calendar</h4>
          {CalendarForm}
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
        </div>
      )}
    </div>
  );
}

export default IcalConnect;
