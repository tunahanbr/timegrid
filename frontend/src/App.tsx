import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncIndicator } from "@/components/SyncIndicator";
import { OfflineGate } from "@/components/OfflineGate";
import { StorageNotifications } from "@/components/StorageNotifications";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Suspense, lazy } from "react";
import { storage } from "@/lib/storage";
import { useEffect, useState } from "react";
import { formatDurationShort } from "@/lib/utils-time";
import { initializeApp } from "@/lib/init";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2, X } from "lucide-react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileTabBar } from "@/components/MobileTabBar";

// Lazy load pages for code splitting
const TimerPage = lazy(() => import("./pages/TimerPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ReportsPage = lazy(() => import("./pages/ReportsPage"));
const EntriesPage = lazy(() => import("./pages/EntriesPage"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage"));
const TagsPage = lazy(() => import("./pages/TagsPage"));
const BudgetsPage = lazy(() => import("./pages/BudgetsPage"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ClientsPage = lazy(() => import("./pages/ClientsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const InvoicesPage = lazy(() => import("./pages/InvoicesPage"));
const APIPage = lazy(() => import("./pages/APIPage"));
const ImportPage = lazy(() => import("./pages/ImportPage"));
const IntegrationsPage = lazy(() => import("./pages/IntegrationsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const TimerWidgetPage = lazy(() => import("./pages/TimerWidgetPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

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
    mutations: {
      networkMode: 'always', // CRITICAL: Allow mutations to run even when offline
    },
  },
});

// Initialize app on load (async, but we don't need to wait)
initializeApp().catch(error => {
  console.error('[App] Failed to initialize app:', error);
});

const AppRoutes = ({ children }: { children: React.ReactNode }) => {
  const [todayTotal, setTodayTotal] = useState(0);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Global keyboard shortcuts (disabled on mobile)
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
  ], !!user && !isMobile);

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
      <div className="fixed inset-0 flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header 
            className={(isMobile ? "h-12 px-4" : "h-14 px-8") + " sticky top-0 z-40 bg-background flex items-center justify-between " + (isMobile ? "" : "border-b border-border")}
            data-tauri-drag-region
            role="banner"
            aria-label="Application header"
            style={{ paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0px' }}
          >
            <div className={isMobile ? "flex items-center gap-3" : "flex items-center gap-6"}>
              {/* Space for native macOS traffic lights */}
              {typeof window !== 'undefined' && (window as any).__TAURI__ && (
                <div className="w-20 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} />
              )}
              <SidebarTrigger aria-label="Toggle navigation menu" />
              <div className={isMobile ? "text-xs font-medium" : "text-sm font-medium"} role="status" aria-live="polite" aria-label="Today's total time">
                Today: <span className="font-mono text-primary">{formatDurationShort(todayTotal)}</span>
              </div>
              {user && !isMobile && (
                <div className="text-sm text-muted-foreground" aria-label="Current user email">
                  {user.email}
                </div>
              )}
            </div>
            <div className={isMobile ? "flex items-center gap-1" : "flex items-center gap-2"} role="toolbar" aria-label="Header actions">
              <SyncIndicator />
              <ThemeToggle />
              {user && !isMobile && (
                <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out of account">
                  <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                  Sign Out
                </Button>
              )}
            </div>
          </header>
          <main 
            className={"flex-1 overflow-auto " + (isMobile ? "pb-16" : "")} 
            role="main" 
            aria-label="Main content"
            style={{ 
              paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 56px)' : undefined,
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {children}
          </main>
          {isMobile && <MobileTabBar />}
        </div>
        {!isMobile && (
          <KeyboardShortcutsDialog 
            open={showShortcutsDialog} 
            onOpenChange={setShowShortcutsDialog} 
          />
        )}
      </div>
    </SidebarProvider>
  );
};

const AppContent = () => {
  const isWidgetRoute = window.location.pathname === '/timer-widget';
  
  // Listen for offline sync completion to refetch queries
  useEffect(() => {
    const handleSyncComplete = () => {
      console.log('[App] Offline sync completed, invalidating and refetching queries...');
      
      // Invalidate all queries to force a refetch from the server
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['time-entries'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      
      // Also refetch them immediately
      queryClient.refetchQueries({ queryKey: ['projects'] });
      queryClient.refetchQueries({ queryKey: ['time-entries'] });
      queryClient.refetchQueries({ queryKey: ['clients'] });
      
      console.log('[App] All queries invalidated and refetching');
    };
    
    window.addEventListener('offline-sync-complete', handleSyncComplete);
    
    return () => {
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
    };
  }, []);
  
  return (
    <>
      {!isWidgetRoute && <Toaster />}
      {!isWidgetRoute && <Sonner />}
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
          <Route path="/signup" element={<Suspense fallback={<PageLoader />}><SignUpPage /></Suspense>} />
          <Route 
            path="/timer-widget" 
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}>
                  <TimerWidgetPage />
                </Suspense>
              </ProtectedRoute>
            } 
          />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppRoutes>
                <Suspense fallback={<PageLoader />}>
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
                </Suspense>
              </AppRoutes>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
    </>
  );
}

// Main App component with providers
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <StorageNotifications />
          <OfflineGateWrapper />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

// Wrapper component to handle offline gate
function OfflineGateWrapper() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gateDismissed, setGateDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setGateDismissed(false); // Reset when coming back online
      
      // Notify user and trigger sync
      window.dispatchEvent(new CustomEvent('storage-notification', {
        detail: { message: 'Back online! Syncing your changes...', type: 'success' }
      }));
      
      // Trigger offline sync
      window.dispatchEvent(new Event('sync-now'));
    };

    const handleOffline = () => {
      setIsOnline(false);
      
      // Notify user they're offline
      window.dispatchEvent(new CustomEvent('storage-notification', {
        detail: { message: 'You\'re offline. Changes will sync when you reconnect.', type: 'warning' }
      }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Only show gate if offline AND not dismissed
  const showGate = !isOnline && !gateDismissed;

  return (
    <>
      {showGate && (
        <OfflineGate 
          onlineStatus={isOnline}
          onContinueOffline={() => setGateDismissed(true)}
        />
      )}
      <AppContent />
    </>
  );
}

export default App;
