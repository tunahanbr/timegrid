import { NavLink } from "@/components/NavLink";
import { Timer, List, FolderKanban, Hash, Settings, BarChart3, Building2, Users, FileText, Key, Upload, Plug, DollarSign, Receipt, TrendingUp } from "lucide-react";
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
import { useUserSettings } from "@/hooks/useUserSettings";

export function AppSidebar() {
  const { settings } = useUserSettings();
  
  // Map UserSettings to feature flags
  const features = {
    clients: settings?.features?.clients ?? true,
    invoicing: settings?.features?.invoicing ?? true,
    tags: settings?.features?.tags ?? true,
    reports: settings?.features?.reports ?? true,
    team: settings?.features?.collaboration ?? false,
    budgets: settings?.features?.budgets ?? true,
    expenses: settings?.features?.expenses ?? true,
    apiKeys: settings?.features?.apiKeys ?? false,
    import: settings?.features?.import ?? false,
    integrations: settings?.features?.integrations ?? false,
  };

  const navigation = [
    { name: "Timer", href: "/", icon: Timer, enabled: true },
    { name: "Dashboard", href: "/dashboard", icon: BarChart3, enabled: features.reports },
    { name: "Reports", href: "/reports", icon: TrendingUp, enabled: features.reports },
    { name: "Entries", href: "/entries", icon: List, enabled: true },
  ];

  const businessNav = [
    { name: "Projects", href: "/projects", icon: FolderKanban, enabled: true },
    { name: "Clients", href: "/clients", icon: Building2, enabled: features.clients },
    { name: "Invoices", href: "/invoices", icon: FileText, enabled: features.invoicing },
    { name: "Budgets", href: "/budgets", icon: DollarSign, enabled: features.budgets },
    { name: "Expenses", href: "/expenses", icon: Receipt, enabled: features.expenses },
  ];

  const teamNav = [
    { name: "Team", href: "/team", icon: Users, enabled: features.team },
  ];

  const settingsNav = [
    { name: "Tags", href: "/tags", icon: Hash, enabled: features.tags },
    { name: "API", href: "/api", icon: Key, enabled: features.apiKeys },
    { name: "Import", href: "/import", icon: Upload, enabled: features.import },
    { name: "Integrations", href: "/integrations", icon: Plug, enabled: features.integrations },
    { name: "Settings", href: "/settings", icon: Settings, enabled: true },
  ];

  return (
    <Sidebar className="border-r border-border" aria-label="Main navigation">
      <SidebarContent>
        <SidebarGroup className="pt-8">
          <div className="px-6 mb-8">
            <h1 className="text-xl font-bold tracking-tight" role="heading" aria-level={1}>TimeGrid</h1>
          </div>
          
          <SidebarGroupContent>
            <SidebarMenu role="navigation" aria-label="Primary navigation">
              {navigation.filter(item => item.enabled).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      end={item.href === "/"}
                      className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                      activeClassName="bg-surface text-foreground font-semibold"
                      aria-label={`Navigate to ${item.name}`}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
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
              <SidebarMenu role="navigation" aria-label="Business features">
                {businessNav.filter(item => item.enabled).map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                        activeClassName="bg-surface text-foreground font-semibold"
                        aria-label={`Navigate to ${item.name}`}
                      >
                        <item.icon className="h-5 w-5" aria-hidden="true" />
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
              <SidebarMenu role="navigation" aria-label="Team features">
                {teamNav.filter(item => item.enabled).map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.href}
                        className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                        activeClassName="bg-surface text-foreground font-semibold"
                        aria-label={`Navigate to ${item.name}`}
                      >
                        <item.icon className="h-5 w-5" aria-hidden="true" />
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
            <SidebarMenu role="navigation" aria-label="Additional features and settings">
              {settingsNav.filter(item => item.enabled).map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.href}
                      className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                      activeClassName="bg-surface text-foreground font-semibold"
                      aria-label={`Navigate to ${item.name}`}
                    >
                      <item.icon className="h-5 w-5" aria-hidden="true" />
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
