import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar, MessageSquare, CheckCircle, AlertCircle, ExternalLink, Zap, Github, Trello, Save, Workflow, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface IntegrationConfig {
  id: string;
  name: string;
  description: string;
  icon: any;
  docsUrl: string;
  requiresApiKey: boolean;
  keyPlaceholder?: string;
  keyLabel?: string;
}

interface IntegrationConfigWithHelp extends IntegrationConfig {
  helpText?: string;
}

const AVAILABLE_INTEGRATIONS: IntegrationConfigWithHelp[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync time entries with Google Calendar events',
    icon: Calendar,
    docsUrl: 'https://developers.google.com/calendar/api/guides/overview',
    requiresApiKey: true,
    keyPlaceholder: 'Google API Key',
    keyLabel: 'API Key',
    helpText: 'Automatically create calendar events for your time entries. Perfect for keeping your schedule synchronized and sharing availability with clients.',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send notifications to Slack channels',
    icon: MessageSquare,
    docsUrl: 'https://api.slack.com/authentication/token-types',
    requiresApiKey: true,
    keyPlaceholder: 'xoxb-your-bot-token',
    keyLabel: 'Bot Token',
    helpText: 'Get real-time notifications in Slack when timers start/stop, invoices are sent, or budgets are exceeded. Great for team visibility and keeping everyone informed.',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect with 5000+ apps via Zapier webhooks',
    icon: Zap,
    docsUrl: 'https://zapier.com/apps/webhook/integrations',
    requiresApiKey: true,
    keyPlaceholder: 'Webhook URL',
    keyLabel: 'Webhook URL',
    helpText: 'Connect TimeGrid to 5000+ apps like QuickBooks, Stripe, Notion, and more. Automate workflows like creating invoices in accounting software or logging time in project management tools.',
  },
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Self-hosted workflow automation with n8n',
    icon: Workflow,
    docsUrl: 'https://docs.n8n.io/integrations/builtin/core-nodes/http-request/',
    requiresApiKey: true,
    keyPlaceholder: 'n8n Webhook URL',
    keyLabel: 'Webhook URL',
    helpText: 'Self-hosted alternative to Zapier. Create custom automation workflows using TimeGrid API. Perfect for teams that want full control over their data and workflows without third-party services.',
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Track time on GitHub issues and pull requests',
    icon: Github,
    docsUrl: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token',
    requiresApiKey: true,
    keyPlaceholder: 'ghp_xxxxxxxxxxxx',
    keyLabel: 'Personal Access Token',
    helpText: 'Automatically track time spent on GitHub issues and PRs. Link your time entries to specific code work, making it easy to bill clients for development time and analyze productivity.',
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Add time tracking to Trello cards',
    icon: Trello,
    docsUrl: 'https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/',
    requiresApiKey: true,
    keyPlaceholder: 'Trello API Key',
    keyLabel: 'API Key',
    helpText: 'Sync time entries with Trello cards. Track how long you spend on each task and automatically update card descriptions with time spent. Ideal for agile teams using Trello for project management.',
  },
];

export default function IntegrationsPage() {
  const { toast } = useToast();
  
  const loadSettings = () => {
    const saved = localStorage.getItem('integration_settings');
    return saved ? JSON.parse(saved) : {};
  };

  const [settings, setSettings] = useState<Record<string, { enabled: boolean; apiKey?: string }>>(loadSettings());

  const saveSettings = (newSettings: typeof settings) => {
    localStorage.setItem('integration_settings', JSON.stringify(newSettings));
    setSettings(newSettings);
  };

  const handleToggle = (integrationId: string, enabled: boolean) => {
    const newSettings = {
      ...settings,
      [integrationId]: {
        ...settings[integrationId],
        enabled,
      },
    };
    saveSettings(newSettings);
    
    toast({
      title: enabled ? "Integration enabled" : "Integration disabled",
      description: `${AVAILABLE_INTEGRATIONS.find(i => i.id === integrationId)?.name} has been ${enabled ? 'enabled' : 'disabled'}`,
    });
  };

  const handleApiKeyChange = (integrationId: string, apiKey: string) => {
    const newSettings = {
      ...settings,
      [integrationId]: {
        ...settings[integrationId],
        apiKey,
        enabled: settings[integrationId]?.enabled || false,
      },
    };
    setSettings(newSettings);
  };

  const handleSaveApiKey = (integrationId: string) => {
    saveSettings(settings);
    toast({
      title: "API key saved",
      description: "Your integration settings have been saved securely.",
    });
  };

  const isEnabled = (integrationId: string) => {
    return settings[integrationId]?.enabled || false;
  };

  const getApiKey = (integrationId: string) => {
    return settings[integrationId]?.apiKey || '';
  };

  const hasApiKey = (integrationId: string) => {
    return !!settings[integrationId]?.apiKey;
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground mt-2">
          Connect your favorite tools to automate your workflow
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          API keys are stored locally in your browser. Never share your API keys publicly.
          These integrations require additional backend setup to function fully.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 md:grid-cols-2">
        {AVAILABLE_INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          const enabled = isEnabled(integration.id);
          const apiKey = getApiKey(integration.id);
          const configured = hasApiKey(integration.id);

          return (
            <Card key={integration.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <Icon className={`h-5 w-5 ${enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        {integration.helpText && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p className="text-sm">{integration.helpText}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </div>
                      <CardDescription className="text-sm mt-1">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) => handleToggle(integration.id, checked)}
                    disabled={integration.requiresApiKey && !configured}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {integration.requiresApiKey && (
                  <div className="space-y-2">
                    <Label htmlFor={`${integration.id}-key`}>
                      {integration.keyLabel}
                      {!configured && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`${integration.id}-key`}
                        type="password"
                        placeholder={integration.keyPlaceholder}
                        value={apiKey}
                        onChange={(e) => handleApiKeyChange(integration.id, e.target.value)}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSaveApiKey(integration.id)}
                        disabled={!apiKey}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  {configured ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-green-600">API key configured</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Not configured</span>
                    </>
                  )}
                </div>

                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Documentation
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How to Use Integrations</CardTitle>
          <CardDescription>Step-by-step setup guide</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">1. Get Your API Key</h4>
            <p className="text-sm text-muted-foreground">
              Click "View Documentation" for each integration to learn how to create API keys or access tokens.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">2. Enter the API Key</h4>
            <p className="text-sm text-muted-foreground">
              Paste your API key or token into the input field and click the save button.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">3. Enable the Integration</h4>
            <p className="text-sm text-muted-foreground">
              Toggle the switch to enable the integration. Your time tracking data will sync automatically.
            </p>
          </div>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Note:</strong> These integrations require additional backend setup to fully function.
              The API keys are stored locally for development purposes. In production, implement proper
              backend authentication and webhook handlers.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
