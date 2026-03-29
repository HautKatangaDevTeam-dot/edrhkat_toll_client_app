"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  ReceiptText,
  BarChart3,
  Users,
  Smartphone,
  Siren,
  PanelLeftClose,
  PanelLeftOpen,
  CarFront,
  Search,
} from "lucide-react";
import { useState } from "react";

import { AppModal } from "@/components/admin/AppModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const navItems: NavItem[] = [
  { label: "Tableau de bord", href: "/", icon: Home },
  { label: "Sociétés", href: "/companies", icon: Building2 },
  { label: "Lots de recus", href: "/receipt-batches", icon: ReceiptText },
  { label: "Recherche recu", href: "/receipt-lookup", icon: Search },
  { label: "Transactions", href: "/transactions", icon: CarFront },
  { label: "POS", href: "/pos-devices", icon: Smartphone },
  { label: "Incidents", href: "/monitoring", icon: Siren },
  { label: "Rapports", href: "/reports", icon: BarChart3 },
  { label: "Utilisateurs", href: "/users", icon: Users },
];

type Props = {
  children: React.ReactNode;
  pageTitle: string;
  pageSubtext?: string;
  userLabel?: string;
  userMeta?: string;
  onLogout?: () => void;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  contentWidth?: "default" | "full";
};

export function AppShell({
  children,
  pageTitle,
  pageSubtext,
  userLabel,
  userMeta,
  onLogout,
  breadcrumbs,
  contentWidth = "full",
}: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background text-foreground md:h-screen md:min-h-0 md:flex-row">
      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out md:relative md:translate-x-0",
          "border-r border-border/70 bg-card",
          isCollapsed ? "w-20" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4">
          <div
            className={cn(
              "flex items-center gap-2 transition-opacity",
              isCollapsed ? "opacity-0 md:hidden" : "opacity-100"
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              E
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight">
                EDRHKAT Péage
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Console
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="hidden text-muted-foreground hover:bg-muted hover:text-foreground md:flex"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={20} />
            ) : (
              <PanelLeftClose size={20} />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  isCollapsed && "justify-center px-0 py-3"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  size={20}
                  className={cn(
                    active ? "text-primary-foreground" : "text-muted-foreground"
                  )}
                />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer (User Info) */}
        <div
          className="mt-auto border-t border-border/70 p-4"
        >
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 transition-colors",
              "text-muted-foreground hover:bg-muted hover:text-foreground",
              isCollapsed && "justify-center px-0"
            )}
            onClick={() => setConfirmLogoutOpen(true)}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Déconnexion</span>}
          </Button>
            {!isCollapsed && (
              <p className="mt-4 text-center text-[11px] font-medium text-muted-foreground">
                © {new Date().getFullYear()} Console Péage EDRHKAT. Tous droits réservés.
              </p>
            )}
          </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <header
          className="sticky top-0 z-30 flex min-h-18 shrink-0 items-center justify-between border-b border-border/70 bg-background/90 px-4 py-3 text-foreground backdrop-blur-lg md:px-6"
        >
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </Button>

            <div className="min-w-0 space-y-1">
              {breadcrumbs && (
                <nav
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {breadcrumbs.map((b, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      {b.href ? (
                        <Link
                          href={b.href}
                          className="transition-colors hover:text-primary"
                        >
                          {b.label}
                        </Link>
                      ) : (
                        <span>{b.label}</span>
                      )}
                      {i < breadcrumbs.length - 1 && (
                        <ChevronRight size={10} className="text-muted-foreground/60" />
                      )}
                    </div>
                  ))}
                </nav>
              )}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold leading-tight">
                  {pageTitle}
                </h1>
                {pageSubtext ? (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {pageSubtext}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {userLabel && (
              <div
                className={cn(
                  "hidden items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 md:flex"
                )}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {userLabel.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold">{userLabel}</span>
                  {userMeta && (
                    <span className="text-xs text-muted-foreground">{userMeta}</span>
                  )}
                </div>
              </div>
            )}
            {!userLabel && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Ouvrir le menu"
              >
                <Menu size={22} />
              </Button>
            )}
          </div>
        </header>

        <main className="no-scrollbar flex-1 min-h-0 overflow-y-auto bg-muted/20 p-4 md:p-6">
          <div
            className={cn(
              "mx-auto flex min-h-full w-full flex-col",
              contentWidth === "default" ? "max-w-7xl" : "max-w-none"
            )}
          >
            {children}
          </div>
        </main>
      </div>

      <AppModal
        open={confirmLogoutOpen}
        onOpenChange={setConfirmLogoutOpen}
        size="sm"
        title="Confirmer la deconnexion"
        description="Voulez-vous vraiment vous deconnecter de la console ?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmLogoutOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmLogoutOpen(false);
                onLogout?.();
              }}
            >
              Se deconnecter
            </Button>
          </>
        }
      >
        <div className="text-sm text-muted-foreground">
          Votre session locale sera fermee sur cet appareil.
        </div>
      </AppModal>
    </div>
  );
}
