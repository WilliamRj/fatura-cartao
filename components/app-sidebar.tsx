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
  ChevronLeft,
  LogOut,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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

function LogoutButton() {
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
        className="h-9 w-9 text-sidebar-foreground/70 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
        size="icon"
        title="Sair"
        variant="ghost"
      >
        <LogOut className="h-4 w-4" />
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

function FaturaSelector({ collapsed, className }: { collapsed?: boolean; className?: string }) {
  const { faturas, faturaAtual, setFaturaAtual, isLoading } = useFaturaContext();

  if (isLoading || faturas.length === 0) {
    return null; // or a skeleton
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

  return (
    <div className={cn("px-3 mb-2", className)}>
      <Select
        value={faturaAtual?.id}
        onValueChange={(val) => setFaturaAtual(faturas.find((f) => f.id === val) || null)}
      >
        <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border h-9">
          <SelectValue placeholder="Selecione uma fatura">
            {faturaAtual ? faturaAtual.mesReferencia : "Selecione uma fatura"}
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
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 sticky top-0",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border mb-2">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sidebar-foreground">
              Cartão Inteligente
            </span>
          </div>
        )}
        {collapsed && (
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
            <CreditCard className="h-5 w-5 text-primary-foreground" />
          </div>
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
    <header className="lg:hidden sticky top-0 z-50 flex items-center justify-between h-14 px-4 bg-sidebar border-b border-sidebar-border">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
          <CreditCard className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sidebar-foreground hidden sm:inline-block">
          Cartão Inteligente
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <div className="w-36 sm:w-44 mr-1">
           <FaturaSelector className="px-0 mb-0" />
        </div>
        <ThemeToggle />
        <LogoutButton />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-sidebar-foreground"
              />
            }
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-64 p-0 bg-sidebar border-sidebar-border flex flex-col"
          >
            <div className="flex items-center gap-2 h-16 px-4 border-b border-sidebar-border">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sidebar-foreground">
                Cartão Inteligente
              </span>
            </div>
            <div className="pt-4">
              <FaturaSelector />
            </div>
            <nav className="p-3 space-y-1 flex-1">
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
