import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";
import { Download, Trash2, Settings as SettingsIcon, Save } from "lucide-react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";

// Feature settings stored in localStorage
interface FeatureSettings {
  clients: boolean;
  invoicing: boolean;
  tags: boolean;
  reports: boolean;
  team: boolean;
}

type UserMode = 'personal' | 'freelancer' | 'team';

const STORAGE_KEY = 'timetrack_feature_settings';
const MODE_KEY = 'timetrack_user_mode';

const defaultSettings: FeatureSettings = {
  clients: true,
  invoicing: true,
  tags: true,
  reports: true,
  team: false,
};

export default function SettingsPage() {
  const [features, setFeatures] = useState<FeatureSettings>(defaultSettings);
  const [userMode, setUserMode] = useState<UserMode>('freelancer');
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem(STORAGE_KEY);
    const savedMode = localStorage.getItem(MODE_KEY) as UserMode;
    
    if (saved) {
      setFeatures(JSON.parse(saved));
    }
    if (savedMode) {
      setUserMode(savedMode);
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
    localStorage.setItem(MODE_KEY, userMode);
    setHasChanges(false);
    toast.success("Settings saved! Refresh the page to see changes.");
  };

  const updateFeature = (feature: keyof FeatureSettings, value: boolean) => {
    setFeatures(prev => ({ ...prev, [feature]: value }));
    setHasChanges(true);
  };

  const applyMode = (mode: UserMode) => {
    setUserMode(mode);
    setHasChanges(true);
    
    // Set feature presets based on mode
    const presets: Record<UserMode, FeatureSettings> = {
      personal: {
        clients: false,
        invoicing: false,
        tags: true,
        reports: true,
        team: false,
      },
      freelancer: {
        clients: true,
        invoicing: true,
        tags: true,
        reports: true,
        team: false,
      },
      team: {
        clients: true,
        invoicing: true,
        tags: true,
        reports: true,
        team: true,
      },
    };
    
    setFeatures(presets[mode]);
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

  return (
    <div className="container mx-auto px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Customize your time tracking experience
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* User Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle>User Mode</CardTitle>
            <CardDescription>
              Choose a preset that matches how you work. Features are automatically configured based on your selection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  userMode === 'personal'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
                onClick={() => applyMode('personal')}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">🧘 Personal</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Just tracking your own time for productivity
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ✓ Timer • ✓ Projects • ✓ Tags • ✓ Reports
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ✗ Clients • ✗ Invoicing • ✗ Team
                    </p>
                  </div>
                  {userMode === 'personal' && (
                    <div className="text-primary text-xl">✓</div>
                  )}
                </div>
              </div>

              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  userMode === 'freelancer'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
                onClick={() => applyMode('freelancer')}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">💼 Freelancer</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Tracking billable time for clients and generating invoices
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ✓ Timer • ✓ Projects • ✓ Clients • ✓ Invoicing • ✓ Tags • ✓ Reports
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ✗ Team collaboration
                    </p>
                  </div>
                  {userMode === 'freelancer' && (
                    <div className="text-primary text-xl">✓</div>
                  )}
                </div>
              </div>

              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  userMode === 'team'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border hover:border-primary/50 hover:bg-accent/50'
                }`}
                onClick={() => applyMode('team')}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">👥 Team / Agency</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Multiple people working together on projects
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ✓ All features including team collaboration
                    </p>
                  </div>
                  {userMode === 'team' && (
                    <div className="text-primary text-xl">✓</div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Feature Toggles */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
            <CardDescription>
              Fine-tune individual features. Disabled features won't appear in the navigation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="feature-clients" className="font-medium">Clients Management</Label>
                <p className="text-sm text-muted-foreground">
                  Create and manage client information, link projects to clients
                </p>
              </div>
              <Switch
                id="feature-clients"
                checked={features.clients}
                onCheckedChange={(checked) => updateFeature('clients', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="feature-invoicing" className="font-medium">Invoicing</Label>
                <p className="text-sm text-muted-foreground">
                  Generate and manage invoices based on tracked time
                </p>
              </div>
              <Switch
                id="feature-invoicing"
                checked={features.invoicing}
                onCheckedChange={(checked) => updateFeature('invoicing', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="feature-tags" className="font-medium">Tags</Label>
                <p className="text-sm text-muted-foreground">
                  Categorize time entries with custom tags
                </p>
              </div>
              <Switch
                id="feature-tags"
                checked={features.tags}
                onCheckedChange={(checked) => updateFeature('tags', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="feature-reports" className="font-medium">Reports & Analytics</Label>
                <p className="text-sm text-muted-foreground">
                  View time breakdowns, charts, and export data
                </p>
              </div>
              <Switch
                id="feature-reports"
                checked={features.reports}
                onCheckedChange={(checked) => updateFeature('reports', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="feature-team" className="font-medium">Team Collaboration</Label>
                <p className="text-sm text-muted-foreground">
                  Manage team members, share projects, view team activity
                </p>
              </div>
              <Switch
                id="feature-team"
                checked={features.team}
                onCheckedChange={(checked) => updateFeature('team', checked)}
              />
            </div>
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
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Theme</div>
                <div className="text-sm text-muted-foreground">
                  Switch between light and dark mode
                </div>
              </div>
              <ThemeToggle />
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
            <p>TimeTrack - Brutalist Time Tracking</p>
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
