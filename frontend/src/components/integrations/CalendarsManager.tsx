import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCalendars, Calendar } from '@/hooks/useCalendars';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationDialog } from '@/components/DeleteConfirmationDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CalendarsManagerProps {
  compact?: boolean;
}

export default function CalendarsManager({ compact = false }: CalendarsManagerProps) {
  const { calendars, isLoading, addCalendarAsync, updateCalendarAsync, deleteCalendarAsync, isAdding, isUpdating, isDeleting } = useCalendars();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#2563eb');
  const [editing, setEditing] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const busy = isAdding || isUpdating || isDeleting;
  const modeLabel = editing ? 'Edit Calendar' : 'Add Calendar';

  const sortedCalendars = useMemo(() => {
    return [...(calendars || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [calendars]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setColor('#2563eb');
    setDialogOpen(false);
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
    setColor(cal.color || '#2563eb');
    setDialogOpen(true);
  };

  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
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

  const CalendarForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="calendar-name">Name</Label>
        <Input
          id="calendar-name"
          placeholder="e.g., Work, Personal, Marketing"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={busy}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="calendar-color">Color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="calendar-color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            disabled={busy}
            className="h-10 w-20 cursor-pointer"
          />
          <span className="text-sm text-muted-foreground">{color}</span>
        </div>
      </div>
      {!compact && (
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editing ? 'Save changes' : 'Add calendar'}
          </Button>
          {editing && (
            <Button type="button" variant="ghost" onClick={resetForm} disabled={busy}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {isLoading && <div className="text-sm text-muted-foreground">Loading calendars…</div>}
        {!isLoading && !sortedCalendars.length && (
          <div className="text-sm text-muted-foreground">No calendars yet. Add one to start organizing your time entries.</div>
        )}
        {!isLoading && sortedCalendars.length > 0 && (
          <div className="grid gap-2">
            {sortedCalendars.map((cal) => (
              <div key={cal.id} className="border rounded-md p-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ backgroundColor: cal.color || '#6b7280' }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate" title={cal.name}>{cal.name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(cal)} disabled={busy}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteId(cal.id)} disabled={busy}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {compact ? (
        <Button onClick={handleAdd} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Calendar
        </Button>
      ) : (
        CalendarForm
      )}

      {compact && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{modeLabel}</DialogTitle>
              <DialogDescription>
                {editing ? 'Update your calendar name and color' : 'Create a new calendar to organize your time entries'}
              </DialogDescription>
            </DialogHeader>
            {CalendarForm}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetForm} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? 'Save' : 'Add'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
