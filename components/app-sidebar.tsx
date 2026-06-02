"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  CreditCard,
  BarChart3,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  ChevronLeft,
} from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faturas", label: "Faturas", icon: FileText },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/parcelamentos", label: "Parcelamentos", icon: CreditCard },
  { href: "/relatorios", label: "Relatorios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configuracoes", icon: Settings },
];

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed: boolean;
}) {
  const linkContent = (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

function DesktopSidebar({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">
              Cartao Inteligente
            </span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <CreditCard className="h-5 w-5 text-primary-foreground" />
          </div>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            isActive={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed && <ThemeToggle />}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-sidebar-foreground/70"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
          {collapsed && <ThemeToggle />}
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sidebar-foreground">
          Cartao Inteligente
        </span>
      </div>

      <div className="flex items-center gap-1">
        <ThemeToggle />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-sidebar-foreground"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0 bg-sidebar border-sidebar-border"
          >
            <div className="flex items-center gap-2 h-16 px-4 border-b border-sidebar-border">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">
                Cartao Inteligente
              </span>
            </div>
            <nav className="p-3 space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    pathname === item.href
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      pathname === item.href && "text-primary"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div className="flex min-h-screen">
      <DesktopSidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
