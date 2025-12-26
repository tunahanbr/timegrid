import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalendars, Calendar } from '@/hooks/useCalendars';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';

export default function CalendarsManager() {
  const { calendars, isLoading, addCalendarAsync, updateCalendarAsync, deleteCalendarAsync, isAdding, isUpdating, isDeleting } = useCalendars();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const busy = isAdding || isUpdating || isDeleting;
  const modeLabel = editing ? 'Update calendar' : 'Add calendar';

  const sortedCalendars = useMemo(() => {
    return [...(calendars || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [calendars]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setColor('#2563eb');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      if (editing) {
        await updateCalendarAsync({ id: editing, name: name.trim(), color });
        toast.success('Calendar updated');
      } else {
        await addCalendarAsync({ name: name.trim(), color });
        toast.success('Calendar created');
      }
      resetForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save calendar';
      toast.error(message);
    }
  };

  const handleEdit = (cal: Calendar) => {
    setEditing(cal.id);
    setName(cal.name);
    setColor(cal.color || COLOR_SWATCHES[0]);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteCalendarAsync(deleteId);
      toast.success('Calendar deleted');
      if (editing === deleteId) resetForm();
      setDeleteId(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to delete calendar';
      toast.error(message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">Loading calendars…</div>}
        {!isLoading && !sortedCalendars.length && (
          <div className="text-sm text-muted-foreground">No calendars yet. Add one to start organizing feeds.</div>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {sortedCalendars.map((cal) => (
            <div key={cal.id} className="border rounded-md p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cal.color || '#6b7280' }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" title={cal.name}>{cal.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{cal.id}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => handleEdit(cal)} disabled={busy}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(cal.id)} disabled={busy}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-medium">{modeLabel}</div>
          {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <div className="space-y-2">
            <Label htmlFor="calendar-name">Name</Label>
            <Input
              id="calendar-name"
              placeholder="Marketing calendar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          </div>
          <div className="space-y-2">
            <Label>Color</Label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={busy}
              className="h-10 w-20"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            <Plus className="h-4 w-4 mr-2" /> {editing ? 'Save changes' : 'Add calendar'}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={resetForm} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      <DeleteConfirmationDialog
        open={deleteId !== null}
        title="Delete calendar"
        description="Existing entries assigned to this calendar will be uncategorized in exports. This action cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
}
