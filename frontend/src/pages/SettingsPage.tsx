import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";
import { Download, Trash2, Settings as SettingsIcon, Save, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import IcalConnect from "@/components/integrations/IcalConnect";
import CalendarFeeds from "@/components/integrations/CalendarFeeds";
import CalendarsManager from "@/components/integrations/CalendarsManager";

const PERSONAL_FEATURES = {
  clients: true,
  projects: true,
  tags: true,
  reports: false,
  collaboration: true,
  apiKeys: false,
  invoicing: false,
  budgets: false,
  expenses: false,
  import: false,
  integrations: false,
};

export default function SettingsPage() {
  const { settings, isLoading, updateSettings, isUpdating } = useUserSettings();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from Supabase when available
  useEffect(() => {
    if (settings) {
      const nextTheme = settings.preferences?.theme === 'light' ? 'light' : 'dark';
      setTheme(nextTheme);
      document.documentElement.classList.toggle('dark', nextTheme === 'dark');

      const format = (settings.preferences?.timeFormat as '12h' | '24h') || '12h';
      setTimeFormat(format);

      if (settings.userMode !== 'personal') {
        setHasChanges(true);
      }
    }
  }, [settings]);

  const handleSave = () => {
    try {
      // Save to Supabase
      updateSettings({
        features: {
          clients: PERSONAL_FEATURES.clients,
          invoicing: PERSONAL_FEATURES.invoicing,
          projects: true, // Always enabled
          tags: PERSONAL_FEATURES.tags,
          reports: PERSONAL_FEATURES.reports,
          collaboration: PERSONAL_FEATURES.collaboration,
          budgets: PERSONAL_FEATURES.budgets,
          expenses: PERSONAL_FEATURES.expenses,
          apiKeys: PERSONAL_FEATURES.apiKeys,
          import: PERSONAL_FEATURES.import,
          integrations: PERSONAL_FEATURES.integrations,
        },
        preferences: {
          theme: theme,
          defaultView: settings?.preferences?.defaultView || 'timer',
          weekStart: settings?.preferences?.weekStart || 'monday',
          timeFormat: timeFormat,
        },
        userMode: 'personal',
      });
      setHasChanges(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      console.error("Error saving settings:", error);
      toast.error(message);
    }
  };

  const handleExport = () => {
    storage.exportToCSV();
    toast.success("Data exported successfully");
  };

  const handleClearData = () => {
    if (confirm("Are you sure you want to delete all data? This cannot be undone.")) {
      storage.saveEntries([]);
      storage.saveProjects([]);
      storage.saveTimerState({
        isRunning: false,
        isPaused: false,
        startTime: null,
        elapsedSeconds: 0,
        currentProjectId: null,
        currentDescription: '',
      });
      toast.success("All data cleared");
      window.location.reload();
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-8 py-8 max-w-4xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Personal mode is enforced. Only appearance, data, and about remain configurable.
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* Calendars Management */}
        <Card>
          <CardHeader>
            <CardTitle>Your Calendars</CardTitle>
            <CardDescription>Create dedicated calendars to organize your time entries and generate separate ICS feeds</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarsManager />
          </CardContent>
        </Card>

        {/* Calendar Feeds (Export) */}
        <Card>
          <CardHeader>
            <CardTitle>Calendar Feeds</CardTitle>
            <CardDescription>Export your time entries as ICS feeds for Google, Apple, or Outlook calendars</CardDescription>
          </CardHeader>
          <CardContent>
            <CalendarFeeds />
          </CardContent>
        </Card>

        {/* External Calendars (Import) */}
        <Card>
          <CardHeader>
            <CardTitle>External Calendars</CardTitle>
            <CardDescription>Subscribe to iCal feeds from Apple, Google, or other calendar services to overlay them on your calendar</CardDescription>
          </CardHeader>
          <CardContent>
            <IcalConnect />
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Theme</div>
                <div className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  const newTheme = theme === 'dark' ? 'light' : 'dark';
                  setTheme(newTheme);
                  setHasChanges(true);
                  // Apply theme immediately for preview
                  document.documentElement.classList.toggle('dark', newTheme === 'dark');
                  storage.saveTheme(newTheme);
                }}
                className="h-9 w-9"
              >
                {theme === 'dark' ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Time Format</div>
                <div className="text-sm text-muted-foreground">
                  Choose between 12-hour (AM/PM) or 24-hour format
                </div>
              </div>
              <Select
                value={timeFormat}
                onValueChange={(value) => {
                  setTimeFormat(value as '12h' | '24h');
                  setHasChanges(true);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                  <SelectItem value="24h">24-hour</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Export or clear your data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Export Data</div>
                <div className="text-sm text-muted-foreground">
                  Download all time entries as CSV
                </div>
              </div>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-destructive">Clear All Data</div>
                <div className="text-sm text-muted-foreground">
                  Delete all entries, projects, and settings
                </div>
              </div>
              <Button variant="destructive" onClick={handleClearData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>TimeGrid - Modern Time Tracking</p>
            <p>Built with React, TypeScript, Tailwind CSS, and Supabase</p>
            <p className="mt-4 text-xs">
              {hasChanges && "⚠️ Don't forget to save your changes!"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
