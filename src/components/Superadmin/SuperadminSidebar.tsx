"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  ScrollText,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

const NAV_ITEMS = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/clients", label: "Clientes", icon: Users },
  { href: "/superadmin/businesses", label: "Negocios", icon: Building2 },
  { href: "/superadmin/plans", label: "Planes", icon: Package },
  { href: "/superadmin/logs", label: "Logs", icon: ScrollText },
] as const;

interface SuperadminSidebarProps {
  clientCount: number;
  businessCount: number;
}

function NavLink({
  href,
  label,
  icon: Icon,
  badge,
  active,
  onClick,
  collapsible,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: number | null;
  active: boolean;
  onClick?: () => void;
  collapsible?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-lg px-3 py-2.5 transition-colors",
        collapsible &&
          "justify-center md:justify-center lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-3",
        active &&
          "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
        !active &&
          "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800",
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span
        className={cn(
          "ml-3 whitespace-nowrap",
          collapsible && "hidden lg:group-hover/sidebar:inline",
        )}
      >
        {label}
      </span>
      {badge !== null && (
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
            collapsible && "hidden lg:group-hover/sidebar:inline-block",
            active
              ? "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              : "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
          )}
        >
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function SuperadminSidebar({
  clientCount,
  businessCount,
}: SuperadminSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const getBadge = (href: string): number | null => {
    if (href === "/superadmin/clients") return clientCount;
    if (href === "/superadmin/businesses") return businessCount;
    return null;
  };

  const isActive = (href: string): boolean => pathname.startsWith(href);

  const closeMobile = () => setMobileOpen(false);

  const renderNavItems = (onClick?: () => void, collapsible = false) =>
    NAV_ITEMS.map(({ href, label, icon }) => (
      <NavLink
        key={href}
        href={href}
        label={label}
        icon={icon}
        badge={getBadge(href)}
        active={isActive(href)}
        onClick={onClick}
        collapsible={collapsible}
      />
    ));

  return (
    <>
      {/* ════════════════════════════════════════ */}
      {/* MOBILE TOP BAR                           */}
      {/* ════════════════════════════════════════ */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center border-b bg-white px-4 dark:border-slate-800 dark:bg-slate-900 md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-slate-800"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ════════════════════════════════════════ */}
      {/* MOBILE OVERLAY                           */}
      {/* ════════════════════════════════════════ */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden
        />
      )}

      {/* ════════════════════════════════════════ */}
      {/* MOBILE SIDEBAR (drawer)                  */}
      {/* ════════════════════════════════════════ */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r bg-white transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Navigation — always expanded */}
        <nav className="flex-1 space-y-1 px-3 pt-20">
          {renderNavItems(closeMobile, false)}
        </nav>

        {/* Footer — theme arriba, logout abajo */}
        <div className="flex shrink-0 flex-col gap-1 border-t border-gray-200 px-4 py-3 dark:border-slate-800">
          <ThemeToggle />
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════ */}
      {/* DESKTOP SIDEBAR                          */}
      {/* ════════════════════════════════════════ */}
      <aside className="group/sidebar relative hidden h-screen flex-col border-r bg-white transition-all duration-300 dark:border-slate-800 dark:bg-slate-900 md:flex md:w-16 lg:hover:w-60">
        {/* Navigation — collapsible */}
        <nav className="flex-1 space-y-1 px-2 py-4">
          {renderNavItems(undefined, true)}
        </nav>

        {/* Footer — theme + logout stacked */}
        <div className="flex shrink-0 flex-col border-t border-gray-200 dark:border-slate-800">
          {/* Theme row */}
          <div className="flex items-center justify-center py-3 md:justify-center lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-4">
            <ThemeToggle />
            <span className="ml-3 hidden whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 lg:group-hover/sidebar:inline">
              Tema
            </span>
          </div>
          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-slate-800" />
          {/* Logout row */}
          <button
            onClick={() => signOut()}
            className="flex items-center justify-center py-3 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 md:justify-center lg:group-hover/sidebar:justify-start lg:group-hover/sidebar:px-4"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="ml-3 hidden whitespace-nowrap text-sm font-medium lg:group-hover/sidebar:inline">
              Cerrar sesión
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
