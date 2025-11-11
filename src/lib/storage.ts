export interface TimeEntry {
  id: string;
  projectId: string;
  description: string;
  tags: string[];
  duration: number; // in seconds
  date: string; // ISO date
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface TimerState {
  isRunning: boolean;
  isPaused: boolean;
  startTime: number | null;
  elapsedSeconds: number;
  currentProjectId: string | null;
  currentDescription: string;
}

const STORAGE_KEYS = {
  ENTRIES: 'timetrack_entries',
  PROJECTS: 'timetrack_projects',
  TIMER: 'timetrack_timer',
  THEME: 'timetrack_theme',
} as const;

export const storage = {
  // Time Entries
  getEntries: (): TimeEntry[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  },
  
  saveEntries: (entries: TimeEntry[]) => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  },

  addEntry: (entry: Omit<TimeEntry, 'id' | 'createdAt'>) => {
    const entries = storage.getEntries();
    const newEntry: TimeEntry = {
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    entries.unshift(newEntry);
    storage.saveEntries(entries);
    return newEntry;
  },

  updateEntry: (id: string, updates: Partial<TimeEntry>) => {
    const entries = storage.getEntries();
    const index = entries.findIndex(e => e.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...updates };
      storage.saveEntries(entries);
    }
  },

  deleteEntry: (id: string) => {
    const entries = storage.getEntries().filter(e => e.id !== id);
    storage.saveEntries(entries);
  },

  // Projects
  getProjects: (): Project[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  },

  saveProjects: (projects: Project[]) => {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },

  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => {
    const projects = storage.getProjects();
    const newProject: Project = {
      ...project,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    projects.push(newProject);
    storage.saveProjects(projects);
    return newProject;
  },

  updateProject: (id: string, updates: Partial<Project>) => {
    const projects = storage.getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
      projects[index] = { ...projects[index], ...updates };
      storage.saveProjects(projects);
    }
  },

  deleteProject: (id: string) => {
    const projects = storage.getProjects().filter(p => p.id !== id);
    storage.saveProjects(projects);
  },

  // Timer State
  getTimerState: (): TimerState => {
    const data = localStorage.getItem(STORAGE_KEYS.TIMER);
    return data ? JSON.parse(data) : {
      isRunning: false,
      isPaused: false,
      startTime: null,
      elapsedSeconds: 0,
      currentProjectId: null,
      currentDescription: '',
    };
  },

  saveTimerState: (state: TimerState) => {
    localStorage.setItem(STORAGE_KEYS.TIMER, JSON.stringify(state));
  },

  // Theme
  getTheme: (): 'dark' | 'light' => {
    const theme = localStorage.getItem(STORAGE_KEYS.THEME);
    return (theme as 'dark' | 'light') || 'dark';
  },

  saveTheme: (theme: 'dark' | 'light') => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
  },

  // Export to CSV
  exportToCSV: () => {
    const entries = storage.getEntries();
    const projects = storage.getProjects();
    
    const projectMap = new Map(projects.map(p => [p.id, p.name]));
    
    const csvHeader = 'Date,Project,Description,Tags,Duration (hours)\n';
    const csvRows = entries.map(entry => {
      const projectName = projectMap.get(entry.projectId) || 'Unknown';
      const hours = (entry.duration / 3600).toFixed(2);
      const tags = entry.tags.join('; ');
      return `${entry.date},"${projectName}","${entry.description}","${tags}",${hours}`;
    }).join('\n');
    
    const csv = csvHeader + csvRows;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetrack_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
