import { Link, useLocation } from "react-router-dom";
import { Timer, List, FolderKanban, Settings, BarChart3, Hash } from "lucide-react";

export function MobileTabBar() {
  const location = useLocation();
  const tabs = [
    { to: "/", label: "Timer", icon: Timer },
    { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { to: "/entries", label: "Entries", icon: List },
    { to: "/projects", label: "Projects", icon: FolderKanban },
    { to: "/tags", label: "Tags", icon: Hash },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)" }}
    >
      <ul className="grid grid-cols-6 gap-0 px-2 py-2">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to;
          return (
            <li key={to} className="list-none">
              <Link
                to={to}
                aria-label={label}
                className={
                  "flex flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs " +
                  (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
                }
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
                <span className="leading-tight">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}