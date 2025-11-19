import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Key, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAPIKeys } from "@/hooks/useAPIKeys";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { getApiUrl, setApiUrlOverride, clearApiUrlOverride } from "@/lib/init";

export default function APIPage() {
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<{ apiKey: string; keyId: string; name: string | null } | null>(null);
  const [apiOverride, setApiOverride] = useState<string>(getApiUrl());

  // Use the custom hook for all API key operations
  const { apiKeys, isLoading, createAPIKeyAsync, deleteAPIKey, toggleAPIKey } = useAPIKeys();

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }
    try {
      const result = await createAPIKeyAsync(newKeyName.trim());
      setCreatedKey({ apiKey: result.apiKey, keyId: result.keyId, name: result.name });
      setNewKeyName("");
    } catch (e) {
      // Error toast handled in hook
    }
  };

  const handleDeleteKey = (keyId: string) => {
    deleteAPIKey(keyId);
  };

  const handleToggleKey = (keyId: string, isActive: boolean) => {
    toggleAPIKey({ keyId, active: !isActive });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  const maskKey = (key: string) => {
    return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">API Access</h1>
        <p className="text-muted-foreground mt-2">
          Integrate with third-party tools using our REST API
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Base URL</CardTitle>
          <CardDescription>Set or override the API endpoint used by the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <Label htmlFor="apiBase">Current</Label>
              <Input id="apiBase" value={apiOverride} onChange={(e) => setApiOverride(e.target.value)} />
            </div>
            <Button
              variant="default"
              onClick={() => {
                const saved = setApiUrlOverride(apiOverride);
                setApiOverride(saved);
                toast({ title: 'API URL saved', description: saved });
              }}
            >Save</Button>
            <Button
              variant="outline"
              onClick={() => {
                clearApiUrlOverride();
                const base = getApiUrl();
                setApiOverride(base);
                toast({ title: 'API URL reset', description: base });
              }}
            >Reset</Button>
          </div>
          <div className="text-xs text-muted-foreground">Effective base: {getApiUrl()}</div>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          API keys provide full access to your data. Keep them secure and never share them publicly.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Why Use the API?</CardTitle>
          <CardDescription>Common use cases for API access</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">🤖 Automation & Integrations</h4>
            <p className="text-sm text-muted-foreground">
              Connect TimeGrid to other tools like Zapier, n8n, or custom scripts. Automate invoice creation, 
              sync time entries to project management tools, or build custom reporting dashboards.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">📊 Custom Reporting</h4>
            <p className="text-sm text-muted-foreground">
              Build custom analytics, export data to Excel/Google Sheets, or create specialized reports 
              that aren't available in the web interface. Perfect for CFOs and accountants who need 
              specific data formats.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">🔗 Third-Party Integrations</h4>
            <p className="text-sm text-muted-foreground">
              Integrate with accounting software (QuickBooks, Xero), payment processors (Stripe), 
              or project management tools (Jira, Asana). The API allows seamless data flow between 
              your favorite business tools.
            </p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">⚡ Bulk Operations</h4>
            <p className="text-sm text-muted-foreground">
              Import time entries from other systems, bulk update project rates, or migrate data. 
              The API makes it easy to perform operations on large datasets programmatically.
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">API Keys</TabsTrigger>
          <TabsTrigger value="docs">Documentation</TabsTrigger>
          <TabsTrigger value="examples">Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create API Key</CardTitle>
              <CardDescription>
                Generate a new API key for external integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="keyName">Key Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g., Zapier Integration"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                  />
                </div>
                <Button
                  onClick={handleCreateKey}
                  disabled={!newKeyName.trim() || isLoading}
                  className="self-end"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Key
                </Button>
              </div>
              {createdKey && (
                <div className="mt-4 p-3 border rounded bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">New API Key</div>
                      <code className="text-xs bg-muted px-2 py-1 rounded block mt-1">
                        {createdKey.apiKey}
                      </code>
                      <div className="text-xs text-muted-foreground mt-1">
                        Copy and store safely. It won’t be shown again.
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(createdKey.apiKey)}>
                      <Copy className="h-4 w-4 mr-2" /> Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your API Keys</CardTitle>
              <CardDescription>
                Manage your active API keys
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No API keys yet. Create one to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{key.name}</span>
                          <Badge variant={key.is_active ? "default" : "secondary"}>
                            {key.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {maskKey(`ak_${key.key_id}________________`)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(`ak_${key.key_id}`)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(key.created_at).toLocaleDateString()}
                          {key.last_used_at && (
                            <> • Last used: {new Date(key.last_used_at).toLocaleDateString()}</>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={key.is_active}
                          onCheckedChange={() => handleToggleKey(key.key_id, key.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the API key "${key.name}"? This action cannot be undone.`)) {
                              handleDeleteKey(key.key_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                REST API endpoints for time tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Base URL</h3>
                <code className="block bg-muted p-2 rounded text-sm">
                  {getApiUrl()}
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Include your API key in the request headers:
                </p>
                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`x-api-key: YOUR_API_KEY
Content-Type: application/json`}
                </pre>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Time Entries</h3>
                  
                  <div className="space-y-3 ml-4">
                    <div>
                      <code className="text-sm bg-green-500/10 text-green-600 px-2 py-1 rounded">POST</code>
                      <code className="ml-2 text-sm">/api/time_entries</code>
                      <p className="text-sm text-muted-foreground mt-1">Create a new time entry</p>
                    </div>

                    <div>
                      <code className="text-sm bg-blue-500/10 text-blue-600 px-2 py-1 rounded">GET</code>
                      <code className="ml-2 text-sm">/api/time_entries</code>
                      <p className="text-sm text-muted-foreground mt-1">List all time entries</p>
                    </div>

                    <div>
                      <code className="text-sm bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded">PATCH</code>
                      <code className="ml-2 text-sm">/api/time_entries/{"{id}"}</code>
                      <p className="text-sm text-muted-foreground mt-1">Update a time entry</p>
                    </div>

                    <div>
                      <code className="text-sm bg-red-500/10 text-red-600 px-2 py-1 rounded">DELETE</code>
                      <code className="ml-2 text-sm">/api/time_entries/{"{id}"}</code>
                      <p className="text-sm text-muted-foreground mt-1">Delete a time entry</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Projects</h3>
                  
                  <div className="space-y-3 ml-4">
                    <div>
                      <code className="text-sm bg-green-500/10 text-green-600 px-2 py-1 rounded">POST</code>
                      <code className="ml-2 text-sm">/api/projects</code>
                      <p className="text-sm text-muted-foreground mt-1">Create a new project</p>
                    </div>

                    <div>
                      <code className="text-sm bg-blue-500/10 text-blue-600 px-2 py-1 rounded">GET</code>
                      <code className="ml-2 text-sm">/api/projects</code>
                      <p className="text-sm text-muted-foreground mt-1">List all projects</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Code Examples</CardTitle>
              <CardDescription>
                Example API requests in different languages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">JavaScript / Node.js</h3>
                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`// Start a timer
const response = await fetch('${getApiUrl()}/api/time_entries', {
  method: 'POST',
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    project_id: 'project-uuid',
    description: 'Working on feature',
    start_time: new Date().toISOString(),
  })
});

const entry = await response.json();
console.log(entry);`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Python</h3>
                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`import requests
from datetime import datetime

url = '${getApiUrl()}/api/time_entries'
headers = {
    'x-api-key': 'YOUR_API_KEY',
    'Content-Type': 'application/json',
}

data = {
    'project_id': 'project-uuid',
    'description': 'Working on feature',
    'start_time': datetime.now().isoformat(),
}

response = requests.post(url, headers=headers, json=data)
print(response.json())`}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold mb-2">cURL</h3>
                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`curl -X POST \
  ${getApiUrl()}/api/time_entries \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "project-uuid",
    "description": "Working on feature",
    "start_time": "2025-11-11T10:00:00Z"
  }'`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
