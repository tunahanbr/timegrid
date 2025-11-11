import { NavLink } from "@/components/NavLink";
import { Timer, List, FolderKanban, Hash, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navigation = [
  { name: "Timer", href: "/", icon: Timer },
  { name: "Entries", href: "/entries", icon: List },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Tags", href: "/tags", icon: Hash },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-border">
      <SidebarContent>
        <SidebarGroup className="pt-8">
          <div className="px-6 mb-8">
            <h1 className="text-xl font-bold tracking-tight">TimeTrack</h1>
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
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
      </SidebarContent>
    </Sidebar>
  );
}
