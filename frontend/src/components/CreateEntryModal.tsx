import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { useProjects } from '../hooks/useProjects';
import { useTimeEntries } from '../hooks/useTimeEntries';
import { useUserSettings } from '../hooks/useUserSettings';
import { formatISO } from 'date-fns';
import type { Calendar } from '@/hooks/useCalendars';

interface CreateEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  startTime: Date | null;
  endTime: Date | null;
  defaultCalendarId?: string;
  calendars?: Calendar[];
}

export function CreateEntryModal({
  isOpen,
  onClose,
  startTime,
  endTime,
  defaultCalendarId,
  calendars = [],
}: CreateEntryModalProps) {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { addEntry, isAdding } = useTimeEntries();
  const { settings } = useUserSettings();
  const timeFormat = (settings?.preferences?.timeFormat as '12h' | '24h') || '12h';

  useEffect(() => {
    if (defaultCalendarId) {
      setCalendarId(defaultCalendarId);
    } else {
      setCalendarId('none');
    }
  }, [defaultCalendarId, isOpen]);

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [calendarId, setCalendarId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'weekly' | 'daily' | 'monthly'>('weekly');
  const [isSaving, setIsSaving] = useState(false);

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    if (timeFormat === '12h') {
      const hour12 = date.getHours() % 12 || 12;
      const ampm = date.getHours() < 12 ? 'am' : 'pm';
      return `${hour12}:${minutes}${ampm}`;
    }
    return `${hours}:${minutes}`;
  };

  const handleSave = async () => {
    if (!title.trim() || !startTime || !endTime) {
      return;
    }

    setIsSaving(true);
    try {
      const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      // Build recurrence rule if recurring
      let recurrenceRule = undefined;
      if (isRecurring) {
        const freq = recurrenceType === 'daily' ? 'DAILY' : recurrenceType === 'weekly' ? 'WEEKLY' : 'MONTHLY';
        recurrenceRule = `FREQ=${freq}`;
      }

      addEntry({
        projectId: projectId || undefined,
        calendarId: calendarId !== 'none' ? calendarId : undefined,
        date: formatISO(startTime),
        startTime: formatISO(startTime),
        endTime: formatISO(endTime),
        duration,
        description: title.trim() || description.trim() || undefined,
        tags: [],
        isRecurring,
        recurrenceRule,
      });

      // Reset form and close
      setTitle('');
      setProjectId('');
      setCalendarId('none');
      setDescription('');
      setIsRecurring(false);
      setRecurrenceType('weekly');
      onClose();
    } catch (error) {
      console.error('Failed to create time entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Time Entry</DialogTitle>
          {startTime && endTime && (
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {formatTime(startTime)} – {formatTime(endTime)}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Title - Required */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              placeholder="e.g., Client meeting, Code review"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSaving}
              autoFocus
            />
          </div>

          {/* Project - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Project
            </label>
            <Select value={projectId} onValueChange={setProjectId} disabled={isSaving || projectsLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project (optional)" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color || '#9CA3AF' }}
                      />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Calendar - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Calendar
            </label>
            <Select
              value={calendarId}
              onValueChange={setCalendarId}
              disabled={isSaving}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a calendar (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No calendar</SelectItem>
                {calendars.map((calendar) => (
                  <SelectItem key={calendar.id} value={calendar.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: calendar.color || '#9CA3AF' }}
                      />
                      {calendar.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description - Optional */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description
            </label>
            <Textarea
              placeholder="Add notes about this time entry (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSaving}
              rows={3}
            />
          </div>

          {/* Recurring */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is-recurring"
                checked={isRecurring}
                onCheckedChange={(checked) => setIsRecurring(checked === true)}
                disabled={isSaving}
              />
              <label htmlFor="is-recurring" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Make this recurring
              </label>
            </div>

            {isRecurring && (
              <Select value={recurrenceType} onValueChange={(value: any) => setRecurrenceType(value)} disabled={isSaving}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!title.trim() || isSaving || isAdding}
          >
            {isSaving ? 'Creating...' : 'Create Entry'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
