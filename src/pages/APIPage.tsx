import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Eye, EyeOff, Key, Plus, Trash2, AlertCircle, CheckCircle, Power } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAPIKeys } from "@/hooks/useAPIKeys";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

export default function APIPage() {
  const { toast } = useToast();
  const [newKeyName, setNewKeyName] = useState("");
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Use the custom hook for all API key operations
  const { apiKeys, isLoading, createAPIKey, deleteAPIKey, toggleAPIKey } = useAPIKeys();

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your API key",
        variant: "destructive",
      });
      return;
    }

    createAPIKey(newKeyName.trim());
    setNewKeyName("");
  };

  const handleDeleteKey = (id: string) => {
    deleteAPIKey(id);
  };

  const handleToggleKey = (id: string, isActive: boolean) => {
    toggleAPIKey({ id, is_active: !isActive });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
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

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          API keys provide full access to your data. Keep them secure and never share them publicly.
        </AlertDescription>
      </Alert>

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
                            {showKeys[key.id] ? key.key : maskKey(key.key)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleShowKey(key.id)}
                          >
                            {showKeys[key.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(key.key)}
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
                          onCheckedChange={() => handleToggleKey(key.id, key.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteKey(key.id)}
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
                  https://wxpgvoftrhhsojwamlsa.supabase.co/rest/v1
                </code>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Include your API key in the request headers:
                </p>
                <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
{`Authorization: Bearer YOUR_API_KEY
apikey: YOUR_API_KEY
Content-Type: application/json`}
                </pre>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Time Entries</h3>
                  
                  <div className="space-y-3 ml-4">
                    <div>
                      <code className="text-sm bg-green-500/10 text-green-600 px-2 py-1 rounded">POST</code>
                      <code className="ml-2 text-sm">/time_entries</code>
                      <p className="text-sm text-muted-foreground mt-1">Create a new time entry</p>
                    </div>

                    <div>
                      <code className="text-sm bg-blue-500/10 text-blue-600 px-2 py-1 rounded">GET</code>
                      <code className="ml-2 text-sm">/time_entries</code>
                      <p className="text-sm text-muted-foreground mt-1">List all time entries</p>
                    </div>

                    <div>
                      <code className="text-sm bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded">PATCH</code>
                      <code className="ml-2 text-sm">/time_entries?id=eq.{"{id}"}</code>
                      <p className="text-sm text-muted-foreground mt-1">Update a time entry</p>
                    </div>

                    <div>
                      <code className="text-sm bg-red-500/10 text-red-600 px-2 py-1 rounded">DELETE</code>
                      <code className="ml-2 text-sm">/time_entries?id=eq.{"{id}"}</code>
                      <p className="text-sm text-muted-foreground mt-1">Delete a time entry</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Projects</h3>
                  
                  <div className="space-y-3 ml-4">
                    <div>
                      <code className="text-sm bg-green-500/10 text-green-600 px-2 py-1 rounded">POST</code>
                      <code className="ml-2 text-sm">/projects</code>
                      <p className="text-sm text-muted-foreground mt-1">Create a new project</p>
                    </div>

                    <div>
                      <code className="text-sm bg-blue-500/10 text-blue-600 px-2 py-1 rounded">GET</code>
                      <code className="ml-2 text-sm">/projects</code>
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
const response = await fetch('https://wxpgvoftrhhsojwamlsa.supabase.co/rest/v1/time_entries', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'apikey': 'YOUR_API_KEY',
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

url = 'https://wxpgvoftrhhsojwamlsa.supabase.co/rest/v1/time_entries'
headers = {
    'Authorization': 'Bearer YOUR_API_KEY',
    'apikey': 'YOUR_API_KEY',
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
{`curl -X POST \\
  https://wxpgvoftrhhsojwamlsa.supabase.co/rest/v1/time_entries \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "apikey: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
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
