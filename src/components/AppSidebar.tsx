import { NavLink } from "@/components/NavLink";
import { Timer, List, FolderKanban, Hash, Settings, BarChart3, Building2, Users, FileText } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useState, useEffect } from "react";

interface FeatureSettings {
  clients: boolean;
  invoicing: boolean;
  tags: boolean;
  reports: boolean;
  team: boolean;
}

const defaultSettings: FeatureSettings = {
  clients: true,
  invoicing: true,
  tags: true,
  reports: true,
  team: false,
};

const STORAGE_KEY = 'timetrack_feature_settings';

export function AppSidebar() {
  const [features, setFeatures] = useState<FeatureSettings>(defaultSettings);

  useEffect(() => {
    // Load feature settings from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setFeatures(JSON.parse(saved));
    }
  }, []);

  const navigation = [
    { name: "Timer", href: "/", icon: Timer, enabled: true },
    { name: "Dashboard", href: "/dashboard", icon: BarChart3, enabled: features.reports },
    { name: "Entries", href: "/entries", icon: List, enabled: true },
  ];

  const businessNav = [
    { name: "Projects", href: "/projects", icon: FolderKanban, enabled: true },
    { name: "Clients", href: "/clients", icon: Building2, enabled: features.clients },
    { name: "Invoices", href: "/invoices", icon: FileText, enabled: features.invoicing },
  ];

  const teamNav = [
    { name: "Team", href: "/team", icon: Users, enabled: features.team },
  ];

  const settingsNav = [
    { name: "Tags", href: "/tags", icon: Hash, enabled: features.tags },
    { name: "Settings", href: "/settings", icon: Settings, enabled: true },
  ];

  return (
    <Sidebar className="border-r border-border">
      <SidebarContent>
        <SidebarGroup className="pt-8">
          <div className="px-6 mb-8">
            <h1 className="text-xl font-bold tracking-tight">TimeTrack</h1>
          </div>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.filter(item => item.enabled).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                      activeClassName="bg-surface text-foreground font-semibold"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {businessNav.some(item => item.enabled) && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 text-xs font-semibold text-muted-foreground">
              Business
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {businessNav.filter(item => item.enabled).map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                        activeClassName="bg-surface text-foreground font-semibold"
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {features.team && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-6 text-xs font-semibold text-muted-foreground">
              Team
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {teamNav.filter(item => item.enabled).map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                        activeClassName="bg-surface text-foreground font-semibold"
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.name}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="px-6 text-xs font-semibold text-muted-foreground">
            More
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.filter(item => item.enabled).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                      activeClassName="bg-surface text-foreground font-semibold"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
