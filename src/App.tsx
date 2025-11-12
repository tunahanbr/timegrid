import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import TimerPage from "./pages/TimerPage";
import DashboardPage from "./pages/DashboardPage";
import ReportsPage from "./pages/ReportsPage";
import EntriesPage from "./pages/EntriesPage";
import ProjectsPage from "./pages/ProjectsPage";
import TagsPage from "./pages/TagsPage";
import BudgetsPage from "./pages/BudgetsPage";
import ExpensesPage from "./pages/ExpensesPage";
import SettingsPage from "./pages/SettingsPage";
import ClientsPage from "./pages/ClientsPage";
import TeamPage from "./pages/TeamPage";
import InvoicesPage from "./pages/InvoicesPage";
import APIPage from "./pages/APIPage";
import ImportPage from "./pages/ImportPage";
import IntegrationsPage from "./pages/IntegrationsPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import NotFound from "./pages/NotFound";
import { storage } from "@/lib/storage";
import { useEffect, useState } from "react";
import { formatDurationShort } from "@/lib/utils-time";
import { initializeApp } from "@/lib/init";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Only retry once on failure
      retryDelay: 500, // Wait 500ms before retry
      staleTime: 30000, // Data stays fresh for 30 seconds
      gcTime: 300000, // Keep unused data in cache for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      networkMode: 'offlineFirst', // Try cache first, then network
    },
  },
});

// Initialize app on load
initializeApp();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [todayTotal, setTodayTotal] = useState(0);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Global keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'p',
      meta: true,
      callback: () => navigate('/projects'),
      description: 'Go to Projects',
    },
    {
      key: 'e',
      meta: true,
      callback: () => navigate('/entries'),
      description: 'Go to Entries',
    },
    {
      key: 'h',
      meta: true,
      callback: () => navigate('/'),
      description: 'Go to Timer (Home)',
    },
    {
      key: ',',
      meta: true,
      callback: () => navigate('/settings'),
      description: 'Go to Settings',
    },
    {
      key: '?',
      shift: true,
      callback: () => setShowShortcutsDialog(true),
      description: 'Show keyboard shortcuts',
    },
  ], !!user);

  useEffect(() => {
    const updateTodayTotal = () => {
      const entries = storage.getEntries();
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = entries.filter(e => e.date === today);
      const total = todayEntries.reduce((sum, e) => sum + e.duration, 0);
      setTodayTotal(total);
    };

    updateTodayTotal();
    const interval = setInterval(updateTodayTotal, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center justify-between px-8">
            <div className="flex items-center gap-6">
              <SidebarTrigger />
              <div className="text-sm font-medium">
                Today: <span className="font-mono text-primary">{formatDurationShort(todayTotal)}</span>
              </div>
              {user && (
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {user && (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              )}
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
        <KeyboardShortcutsDialog 
          open={showShortcutsDialog} 
          onOpenChange={setShowShortcutsDialog} 
        />
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={<TimerPage />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/reports" element={<ReportsPage />} />
                      <Route path="/entries" element={<EntriesPage />} />
                      <Route path="/projects" element={<ProjectsPage />} />
                      <Route path="/clients" element={<ClientsPage />} />
                      <Route path="/invoices" element={<InvoicesPage />} />
                      <Route path="/budgets" element={<BudgetsPage />} />
                      <Route path="/expenses" element={<ExpensesPage />} />
                      <Route path="/team" element={<TeamPage />} />
                      <Route path="/tags" element={<TagsPage />} />
                      <Route path="/api" element={<APIPage />} />
                      <Route path="/import" element={<ImportPage />} />
                      <Route path="/integrations" element={<IntegrationsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
