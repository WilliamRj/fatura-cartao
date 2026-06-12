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
  ChevronLeft,
  LogOut,
  Loader2,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/components/auth-provider";
import { useFaturaContext } from "@/components/fatura-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BrandLogo } from "@/components/brand-logo";

const menuItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faturas", label: "Faturas", icon: FileText },
  { href: "/gastos", label: "Gastos", icon: Receipt },
  { href: "/parcelamentos", label: "Parcelamentos", icon: CreditCard },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
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
      aria-current={isActive ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
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
      <Tooltip>
        <TooltipTrigger render={linkContent} />
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

function LogoutButton({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [isSigningOut, setIsSigningOut] = React.useState(false);

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      setOpen(false);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        aria-label="Sair"
        className={cn(
          "text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive",
          showLabel ? "h-9 w-full justify-start px-3" : "h-9 w-9",
          className,
        )}
        onClick={() => setOpen(true)}
        size={showLabel ? "default" : "icon"}
        title="Sair"
        variant="ghost"
      >
        <LogOut className="h-4 w-4" />
        {showLabel && <span>Sair da conta</span>}
      </Button>

      <DialogContent className="gap-5 p-5 sm:max-w-md" showCloseButton={!isSigningOut}>
        <DialogHeader className="gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <LogOut className="size-5" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-lg">Sair da sua conta?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Você precisará entrar novamente com o Google para acessar suas faturas e seus dados.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="-mx-5 -mb-5 px-5 py-4">
          <DialogClose
            disabled={isSigningOut}
            render={<Button variant="outline" />}
          >
            Cancelar
          </DialogClose>
          <Button
            disabled={isSigningOut}
            onClick={handleLogout}
            variant="destructive"
          >
            {isSigningOut ? (
              <>
                <Loader2 className="animate-spin" />
                Saindo...
              </>
            ) : (
              <>
                <LogOut />
                Sair da conta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FaturaSelector({
  collapsed,
  className,
  variant = "sidebar",
  onSelect,
}: {
  collapsed?: boolean;
  className?: string;
  variant?: "sidebar" | "header";
  onSelect?: () => void;
}) {
  const { faturas, faturaAtual, setFaturaAtual, isLoading } = useFaturaContext();

  if (isLoading || faturas.length === 0) {
    if (variant !== "header") {
      return null;
    }

    return (
      <div
        className={cn(
          "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-sidebar-border bg-sidebar-accent/40 px-2.5 text-sm text-sidebar-foreground/70",
          className,
        )}
      >
        {isLoading ? (
          <Loader2 className="size-4 shrink-0 animate-spin" />
        ) : (
          <CalendarDays className="size-4 shrink-0" />
        )}
        <span className="truncate">
          {isLoading ? "Carregando faturas" : "Nenhuma fatura"}
        </span>
      </div>
    );
  }

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground cursor-pointer mx-auto">
            {faturaAtual?.mesReferencia.substring(0, 3)}
          </div>
        } />
        <TooltipContent side="right" className="font-medium">
          Fatura: {faturaAtual?.mesReferencia}
        </TooltipContent>
      </Tooltip>
    );
  }

  const isHeader = variant === "header";

  return (
    <div
      className={cn(
        isHeader ? "min-w-0 flex-1" : "mb-2 px-3",
        className,
      )}
    >
      <Select
        value={faturaAtual?.id}
        onValueChange={(val) => {
          setFaturaAtual(faturas.find((f) => f.id === val) || null);
          onSelect?.();
        }}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-full min-w-0 border-sidebar-border bg-sidebar-accent/50",
            isHeader && "px-2.5",
          )}
          aria-label="Selecionar fatura atual"
        >
          {isHeader && (
            <CalendarDays className="size-4 shrink-0 text-primary" />
          )}
          <SelectValue
            className="min-w-0 overflow-hidden"
            placeholder="Selecione uma fatura"
          >
            <span className="truncate">
              {faturaAtual
                ? faturaAtual.mesReferencia
                : "Selecione uma fatura"}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {faturas.map((f) => (
            <SelectItem key={f.id} value={f.id}>
              {f.mesReferencia}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
      id="desktop-sidebar"
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border mb-2">
        {!collapsed && (
          <BrandLogo
            className="text-sidebar-foreground"
            markClassName="size-9"
          />
        )}
        {collapsed && (
          <BrandLogo className="mx-auto" markOnly />
        )}
      </div>

      <FaturaSelector collapsed={collapsed} />

      <nav className="flex-1 p-3 pt-0 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.href}
            {...item}
            isActive={pathname === item.href}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border flex flex-col gap-2">
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center flex-col gap-2" : "justify-between"
          )}
        >
          <div className={cn("flex items-center gap-1", collapsed && "flex-col gap-2")}>
            <ThemeToggle />
            <LogoutButton />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-9 w-9 text-sidebar-foreground/70", collapsed && "mt-2")}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
            aria-expanded={!collapsed}
            aria-controls="desktop-sidebar"
            title={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function MobileHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button
              variant="ghost"
              size="icon-lg"
              className="shrink-0 text-sidebar-foreground"
              aria-label="Abrir menu de navegação"
              aria-expanded={open}
            />
          }
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>

        <FaturaSelector variant="header" />

        <SheetContent
          side="left"
          className="w-[min(22rem,calc(100vw-2rem))] max-w-none gap-0 border-sidebar-border bg-sidebar p-0"
        >
            <SheetHeader className="border-b border-sidebar-border p-4 pr-12">
              <SheetTitle className="sr-only">Menu principal</SheetTitle>
              <BrandLogo className="text-sidebar-foreground" />
              <SheetDescription className="sr-only">
                Navegação e preferências
              </SheetDescription>
            </SheetHeader>

            <div className="border-b border-sidebar-border px-4 py-4">
              <p className="mb-2 text-xs font-medium text-sidebar-foreground/60">
                Fatura atual
              </p>
              <FaturaSelector
                className="mb-0 px-0"
                onSelect={() => setOpen(false)}
              />
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {menuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
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

            <div className="space-y-1 border-t border-sidebar-border p-3">
              <ThemeToggle
                showLabel
                className="w-full justify-start px-3 text-sidebar-foreground/70"
              />
              <LogoutButton showLabel />
            </div>
        </SheetContent>
      </Sheet>
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
