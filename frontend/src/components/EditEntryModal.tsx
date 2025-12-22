import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { useProjects } from '@/hooks/useProjects';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import type { TimeEntry } from '@/lib/supabase-storage';

interface EditEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimeEntry | null;
}

export function EditEntryModal({ isOpen, onClose, entry }: EditEntryModalProps) {
  const { projects } = useProjects();
  const { updateEntry, isUpdating } = useTimeEntries();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');

  useEffect(() => {
    if (entry) {
      setTitle(entry.description || '');
      setProjectId(entry.projectId || '');
    }
  }, [entry]);

  const handleSave = () => {
    if (!entry) return;
    updateEntry({
      id: entry.id,
      updates: {
        description: title.trim() || 'Untitled',
        projectId: projectId || undefined,
      },
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Time Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isUpdating} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Project</label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || '#9CA3AF' }} />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isUpdating}>Cancel</Button>
          <Button onClick={handleSave} disabled={isUpdating}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
