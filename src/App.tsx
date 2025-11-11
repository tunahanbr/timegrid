import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import TimerPage from "./pages/TimerPage";
import EntriesPage from "./pages/EntriesPage";
import ProjectsPage from "./pages/ProjectsPage";
import TagsPage from "./pages/TagsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";
import { storage } from "@/lib/storage";
import { useEffect, useState } from "react";
import { formatDurationShort } from "@/lib/utils-time";
import { initializeApp } from "@/lib/init";

const queryClient = new QueryClient();

// Initialize app on load
initializeApp();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [todayTotal, setTodayTotal] = useState(0);

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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center justify-between px-8">
            <div className="text-sm font-medium">
              Today: <span className="font-mono text-primary">{formatDurationShort(todayTotal)}</span>
            </div>
            <ThemeToggle />
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<TimerPage />} />
            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
