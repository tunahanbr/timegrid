import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";
import { Download, Trash2, Settings as SettingsIcon, Save, Loader2, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useUserSettings } from "@/hooks/useUserSettings";

// Feature settings interface
interface FeatureSettings {
  clients: boolean;
  invoicing: boolean;
  tags: boolean;
  reports: boolean;
  team: boolean;
  budgets: boolean;
  expenses: boolean;
  apiKeys: boolean;
  import: boolean;
  integrations: boolean;
}

type UserMode = 'personal' | 'freelancer' | 'team';

const defaultFeatures: FeatureSettings = {
  clients: true,
  invoicing: true,
  tags: true,
  reports: true,
  team: false,
  budgets: true,
  expenses: true,
  apiKeys: false,
  import: false,
  integrations: false,
};

export default function SettingsPage() {
  const { settings, isLoading, updateSettings, isUpdating } = useUserSettings();
  const [features, setFeatures] = useState<FeatureSettings>(defaultFeatures);
  const [userMode, setUserMode] = useState<UserMode>('freelancer');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from Supabase when available
  useEffect(() => {
    if (settings) {
      // Map settings.features to our FeatureSettings interface
      const mappedFeatures: FeatureSettings = {
        clients: settings.features?.clients ?? true,
        invoicing: settings.features?.invoicing ?? true,
        tags: settings.features?.tags ?? true,
        reports: settings.features?.reports ?? true,
        team: settings.features?.collaboration ?? false,
        budgets: settings.features?.budgets ?? true,
        expenses: settings.features?.expenses ?? true,
        apiKeys: settings.features?.apiKeys ?? false,
        import: settings.features?.import ?? false,
        integrations: settings.features?.integrations ?? false,
      };
      setFeatures(mappedFeatures);
      setUserMode(settings.userMode || 'freelancer');
      setTheme(settings.preferences?.theme === 'light' ? 'light' : 'dark');
    }
  }, [settings]);

  const handleSave = () => {
    try {
      // Save to Supabase
      updateSettings({
        features: {
          clients: features.clients,
          invoicing: features.invoicing,
          projects: true, // Always enabled
          tags: features.tags,
          reports: features.reports,
          collaboration: features.team,
          budgets: features.budgets,
          expenses: features.expenses,
          apiKeys: features.apiKeys,
          import: features.import,
          integrations: features.integrations,
        },
        preferences: {
          theme: theme,
          defaultView: settings?.preferences?.defaultView || 'timer',
          weekStart: settings?.preferences?.weekStart || 'monday',
        },
        userMode,
      });
      setHasChanges(false);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Failed to save settings");
    }
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
        reports: false,
        team: false,
        budgets: false,
        expenses: false,
        apiKeys: false,
        import: false,
        integrations: false,
      },
      freelancer: {
        clients: true,
        invoicing: true,
        tags: true,
        reports: true,
        team: false,
        budgets: true,
        expenses: true,
        apiKeys: true,
        import: true,
        integrations: true,
      },
      team: {
        clients: true,
        invoicing: true,
        tags: true,
        reports: true,
        team: true,
        budgets: true,
        expenses: true,
        apiKeys: true,
        import: true,
        integrations: true,
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
            Customize your time tracking experience
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
                className={`border-2 rounded-lg p-4 cursor-not-allowed transition-all opacity-50 ${
                  userMode === 'freelancer'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">💼 Freelancer</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Tracking billable time for clients and generating invoices
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ✓ Timer • ✓ Projects • ✓ Clients • ✓ Invoicing • ✓ Budgets • ✓ Expenses • ✓ Tags • ✓ Reports
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
                className={`border-2 rounded-lg p-4 cursor-not-allowed transition-all opacity-50 ${
                  userMode === 'team'
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">👥 Team / Agency</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Multiple people working together on projects
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ✓ All features including team collaboration, budgets, and expenses
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Clients Management */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-clients"
                  checked={features.clients}
                  onCheckedChange={(checked) => updateFeature('clients', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-clients" className="font-medium cursor-pointer">Clients Management</Label>
                  <p className="text-sm text-muted-foreground">
                    Create and manage client information, link projects to clients
                  </p>
                </div>
              </div>

              {/* Invoicing */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-invoicing"
                  checked={features.invoicing}
                  onCheckedChange={(checked) => updateFeature('invoicing', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-invoicing" className="font-medium cursor-pointer">Invoicing</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate and manage invoices based on tracked time
                  </p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-tags"
                  checked={features.tags}
                  onCheckedChange={(checked) => updateFeature('tags', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-tags" className="font-medium cursor-pointer">Tags</Label>
                  <p className="text-sm text-muted-foreground">
                    Categorize time entries with custom tags
                  </p>
                </div>
              </div>

              {/* Reports & Analytics */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-reports"
                  checked={features.reports}
                  onCheckedChange={(checked) => updateFeature('reports', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-reports" className="font-medium cursor-pointer">Reports & Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    View time breakdowns, charts, and export data
                  </p>
                </div>
              </div>

              {/* Budget Tracking */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-budgets"
                  checked={features.budgets}
                  onCheckedChange={(checked) => updateFeature('budgets', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-budgets" className="font-medium cursor-pointer">Budget Tracking</Label>
                  <p className="text-sm text-muted-foreground">
                    Set project budgets, track spending, and receive alerts
                  </p>
                </div>
              </div>

              {/* Expense Management */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-expenses"
                  checked={features.expenses}
                  onCheckedChange={(checked) => updateFeature('expenses', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-expenses" className="font-medium cursor-pointer">Expense Management</Label>
                  <p className="text-sm text-muted-foreground">
                    Track project expenses, attach receipts, and manage billable costs
                  </p>
                </div>
              </div>

              {/* Team Collaboration */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-team"
                  checked={features.team}
                  onCheckedChange={(checked) => updateFeature('team', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-team" className="font-medium cursor-pointer">Team Collaboration</Label>
                  <p className="text-sm text-muted-foreground">
                    Manage team members, share projects, view team activity
                  </p>
                </div>
              </div>

              {/* API Keys */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-api-keys"
                  checked={features.apiKeys}
                  onCheckedChange={(checked) => updateFeature('apiKeys', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-api-keys" className="font-medium cursor-pointer">API Keys</Label>
                  <p className="text-sm text-muted-foreground">
                    Generate API keys for external integrations and automation
                  </p>
                </div>
              </div>

              {/* Data Import */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-import"
                  checked={features.import}
                  onCheckedChange={(checked) => updateFeature('import', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-import" className="font-medium cursor-pointer">Data Import</Label>
                  <p className="text-sm text-muted-foreground">
                    Import time entries and projects from CSV or other time tracking tools
                  </p>
                </div>
              </div>

              {/* Integrations */}
              <div className="flex items-start space-x-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Switch
                  id="feature-integrations"
                  checked={features.integrations}
                  onCheckedChange={(checked) => updateFeature('integrations', checked)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-1">
                  <Label htmlFor="feature-integrations" className="font-medium cursor-pointer">Integrations</Label>
                  <p className="text-sm text-muted-foreground">
                    Connect with external services like Slack, Zapier, and webhooks
                  </p>
                </div>
              </div>
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
