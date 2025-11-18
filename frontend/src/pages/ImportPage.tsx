import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/db/client";
import { useQueryClient } from "@tanstack/react-query";

interface ImportResult {
  projects: number;
  entries: number;
  tags: number;
  errors: string[];
}

export default function ImportPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Check file size (max 5MB)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Check file type
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'json') {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV or JSON file",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      setResult(null);
      
      toast({
        title: "File selected",
        description: `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`,
      });
    }
  };

  const parseTogglCSV = (text: string): any[] => {
    // Toggl CSV format: User,Email,Client,Project,Task,Description,Billable,Start date,Start time,End date,End time,Duration,Tags,Amount ()
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    if (!headers.includes('Project') && !headers.includes('project')) {
      throw new Error('CSV must contain a "Project" column');
    }
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',');
      const entry: any = {};
      headers.forEach((header, i) => {
        entry[header] = values[i]?.trim() || '';
      });
      entry._lineNumber = index + 2; // For error reporting
      return entry;
    });
  };

  const parseClockifyCSV = (text: string): any[] => {
    // Clockify CSV format: Project,Client,Description,Task,User,Group,Email,Tags,Billable,Start Date,Start Time,End Date,End Time,Duration (h),Duration (decimal),Billable Rate (USD),Billable Amount (USD)
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1).map((line, index) => {
      const values = line.split(',');
      const entry: any = {};
      headers.forEach((header, i) => {
        entry[header] = values[i]?.trim() || '';
      });
      entry._lineNumber = index + 2; // For error reporting
      return entry;
    });
  };

  const importData = async () => {
    if (!file) return;

    setIsImporting(true);
    const errors: string[] = [];
    let projectsImported = 0;
    let entriesImported = 0;
    let tagsImported = 0;

    try {
      const text = await file.text();
      let data: any[] = [];

      // Parse based on file type and content
      const ext = file.name.split('.').pop()?.toLowerCase();
      const fileName = file.name.toLowerCase();

      if (ext === 'json') {
        data = JSON.parse(text);
      } else if (fileName.includes('toggl')) {
        data = parseTogglCSV(text);
      } else if (fileName.includes('clockify') || fileName.includes('harvest')) {
        data = parseClockifyCSV(text);
      } else {
        // Try to auto-detect format
        data = parseTogglCSV(text);
      }

      // Extract unique projects
      const projects = new Map<string, any>();
      const tags = new Set<string>();

      data.forEach(entry => {
        const projectName = entry.Project || entry.project || 'Imported Project';
        const clientName = entry.Client || entry.client || null;
        const tagList = entry.Tags || entry.tags || '';
        
        if (!projects.has(projectName)) {
          projects.set(projectName, {
            name: projectName,
            client: clientName,
            color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
          });
        }

        // Extract tags
        if (tagList) {
          tagList.split(',').forEach((tag: string) => {
            const trimmed = tag.trim();
            if (trimmed) tags.add(trimmed);
          });
        }
      });

      // Import projects
      for (const [name, project] of projects) {
        try {
          const { error } = await supabase
            .from('projects')
            .insert({
              name: project.name,
              color: project.color,
              is_active: true,
            });

          if (error) {
            errors.push(`Failed to import project "${name}": ${error.message}`);
          } else {
            projectsImported++;
          }
        } catch (err: any) {
          errors.push(`Failed to import project "${name}": ${err.message}`);
        }
      }

      // Import tags
      for (const tagName of tags) {
        try {
          const { error } = await supabase
            .from('tags')
            .insert({ name: tagName, color: `#${Math.floor(Math.random()*16777215).toString(16)}` });

          if (error && !error.message.includes('duplicate')) {
            errors.push(`Failed to import tag "${tagName}": ${error.message}`);
          } else if (!error) {
            tagsImported++;
          }
        } catch (err: any) {
          errors.push(`Failed to import tag "${tagName}": ${err.message}`);
        }
      }

      // Fetch imported projects to get IDs
      const projectsResponse = await supabase
        .from('projects')
        .select('id, name')
        .execute();

      const projectMap = new Map(
        projectsResponse.data?.map((p: any) => [p.name, p.id]) || []
      );

      // Import time entries
      for (const entry of data) {
        try {
          const projectName = entry.Project || entry.project || 'Imported Project';
          const projectId = projectMap.get(projectName);

          if (!projectId) {
            errors.push(`Project not found for entry: ${entry.Description || 'Unnamed'}`);
            continue;
          }

          // Parse dates and duration
          const startDate = entry['Start Date'] || entry['Start date'] || '';
          const startTime = entry['Start Time'] || entry['Start time'] || '';
          const duration = entry['Duration (h)'] || entry.Duration || '';

          if (!startDate || !duration) {
            errors.push(`Missing date or duration for entry: ${entry.Description || 'Unnamed'}`);
            continue;
          }

          // Convert duration to seconds
          const durationParts = duration.split(':');
          let durationSeconds = 0;
          if (durationParts.length >= 2) {
            durationSeconds = parseInt(durationParts[0]) * 3600 + parseInt(durationParts[1]) * 60;
            if (durationParts[2]) durationSeconds += parseInt(durationParts[2]);
          } else {
            durationSeconds = parseFloat(duration) * 3600; // Assume hours
          }

          const startDateTime = new Date(`${startDate} ${startTime}`);
          const endDateTime = new Date(startDateTime.getTime() + durationSeconds * 1000);

          const { error } = await supabase
            .from('time_entries')
            .insert({
              project_id: projectId,
              description: entry.Description || entry.description || '',
              start_time: startDateTime.toISOString(),
              end_time: endDateTime.toISOString(),
              duration: durationSeconds,
            });

          if (error) {
            errors.push(`Failed to import entry: ${error.message}`);
          } else {
            entriesImported++;
          }
        } catch (err: any) {
          errors.push(`Failed to import entry: ${err.message}`);
        }
      }

      setResult({
        projects: projectsImported,
        entries: entriesImported,
        tags: tagsImported,
        errors,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });

      toast({
        title: "Import complete!",
        description: `Imported ${projectsImported} projects, ${entriesImported} entries, and ${tagsImported} tags`,
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
      errors.push(`Fatal error: ${error.message}`);
      setResult({ projects: 0, entries: 0, tags: 0, errors });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Import Data</h1>
        <p className="text-muted-foreground mt-2">
          Import your time tracking data from Toggl, Harvest, or Clockify
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Supported formats:</strong> CSV or JSON exports from Toggl, Harvest, and Clockify.
          Make sure to export your complete data before importing.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            Select a CSV or JSON file to import
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 hover:border-primary/50 transition-colors">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                {file ? file.name : 'Choose a file or drag it here'}
              </p>
              <p className="text-xs text-muted-foreground">
                CSV or JSON files only
              </p>
            </div>
            <input
              type="file"
              accept=".csv,.json"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {file && (
            <Button
              onClick={importData}
              disabled={isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>Processing...</>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Import Data
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{result.projects}</div>
                <div className="text-sm text-muted-foreground">Projects</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{result.entries}</div>
                <div className="text-sm text-muted-foreground">Time Entries</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{result.tags}</div>
                <div className="text-sm text-muted-foreground">Tags</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">
                    {result.errors.length} errors occurred during import:
                  </p>
                  <ul className="text-xs space-y-1 max-h-40 overflow-y-auto">
                    {result.errors.slice(0, 10).map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                    {result.errors.length > 10 && (
                      <li>... and {result.errors.length - 10} more</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Export Instructions</CardTitle>
          <CardDescription>
            How to export your data from other time tracking tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Toggl Track
            </h3>
            <ol className="text-sm space-y-1 ml-6 list-decimal text-muted-foreground">
              <li>Go to Reports → Detailed Report</li>
              <li>Select the time range you want to export</li>
              <li>Click "Export" → "CSV"</li>
              <li>Upload the downloaded file here</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Clockify
            </h3>
            <ol className="text-sm space-y-1 ml-6 list-decimal text-muted-foreground">
              <li>Go to Reports → Detailed Report</li>
              <li>Select "All time" or your desired range</li>
              <li>Click "Export" → "CSV"</li>
              <li>Upload the downloaded file here</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Download className="h-4 w-4" />
              Harvest
            </h3>
            <ol className="text-sm space-y-1 ml-6 list-decimal text-muted-foreground">
              <li>Go to Reports → Time</li>
              <li>Select your date range</li>
              <li>Click "Export" → "CSV"</li>
              <li>Upload the downloaded file here</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
