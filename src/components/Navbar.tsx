import { Link, useLocation } from "react-router-dom";
import { Droplet, Send, ScanLine, LayoutDashboard, MessageSquare, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const links = [
    { to: "/send", label: "Send", icon: Send },
    { to: "/scan", label: "Scan", icon: ScanLine },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/feedback", label: "Feedback", icon: MessageSquare },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
            <Droplet className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="hidden sm:inline">CrossDrop</span>
        </Link>

        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                location.pathname === to
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => setDark(!dark)}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
