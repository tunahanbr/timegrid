import type { ElementType } from "react";
import { NavLink } from "@/components/NavLink";
import { Timer, List, FolderKanban, Hash, Settings, BarChart3, Calendar, ExternalLink } from "lucide-react";
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

export function AppSidebar() {
  const primaryNav = [
    { name: "Timer", href: "/", icon: Timer },
    { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
    { name: "Entries", href: "/entries", icon: List },
  ];

  const workNav = [
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Tags", href: "/tags", icon: Hash },
  ];

  const settingsNav = [
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const renderItems = (items: { name: string; href: string; icon: ElementType }[], includeEnd?: boolean) => (
    items.map((item) => (
      <SidebarMenuItem key={item.name}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.href}
            end={includeEnd ? item.href === "/" : false}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
            activeClassName="bg-surface text-foreground font-semibold"
            aria-label={`Navigate to ${item.name}`}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.name}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    ))
  );

  return (
    <Sidebar className="border-r border-border" aria-label="Main navigation">
      <SidebarContent>
        <SidebarGroup className="pt-8">
          <div className="px-6 mb-8">
            <h1 className="text-xl font-bold tracking-tight" role="heading" aria-level={1}>TimeGrid</h1>
          </div>
          
          <SidebarGroupContent>
            <SidebarMenu role="navigation" aria-label="Primary navigation">
              <SidebarGroupLabel className="px-6 text-xs font-semibold text-muted-foreground">
                Personal
              </SidebarGroupLabel>
              {renderItems(primaryNav, true)}
              
              {/* Calendar - External Link */}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href="/calendar/expanded"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors hover:bg-surface"
                    aria-label="Open Calendar in new tab"
                  >
                    <Calendar className="h-5 w-5" aria-hidden="true" />
                    <span>Calendar</span>
                    <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" aria-hidden="true" />
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu role="navigation" aria-label="Work navigation">
              {renderItems(workNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu role="navigation" aria-label="Settings navigation">
              {renderItems(settingsNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
