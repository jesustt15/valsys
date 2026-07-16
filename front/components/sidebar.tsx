"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Truck,
  ClipboardCheck,
  UserCog,
  ChevronLeft,
  ChevronRight,
  X,
  FileBadge,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";

interface SidebarProps {
  role: string;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ role, isMobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const menuItems = [
    { label: "Inspecciones", href: "/inspections", icon: ClipboardCheck },
    { label: "UTP", href: "/utp", icon: FileBadge },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Dueños", href: "/owners", icon: Users },
    { label: "Vehículos", href: "/vehicles", icon: Truck },
  ];

  const adminItems = [
    { label: "Usuarios", href: "/admin/users", icon: UserCog },
  ];

  const isActive = (href: string) => pathname === href;
  const isAdmin = role === "admin";

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isDesktop) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && isMobileOpen) {
          onMobileClose?.();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isDesktop, isMobileOpen, onMobileClose]);

  /** Shared nav content — reused by both desktop and mobile modes */
  const navContent = (
    <>
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border flex items-center justify-between">
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 bg-sidebar-primary rounded-xl flex items-center justify-center shadow-sm overflow-hidden">
                <Image
                  src="/logo/logoagrogas2.png"
                  alt="logochiqui"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>
              <Image
                src="/logo/logoagrogas.png"
                alt="logo"
                width={120}
                height={36}
                className="object-contain drop-shadow-[0_0_0.1px_rgba(255,255,255,0.5)]"
              />
            </motion.div>
          ) : (
            <motion.div
              key="logo-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
              className="w-9 h-9.5 bg-sidebar-primary rounded-xl flex items-center justify-center mx-auto shadow-md overflow-hidden"
            >
              <Image
                src="/logo/logoagrogas2.png"
                alt="logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Close button — only visible on mobile drawer */}
        {!isDesktop && (
          <button
            onClick={onMobileClose}
            className="p-2 rounded-lg hover:bg-sidebar-accent/20 transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={!isDesktop ? onMobileClose : undefined}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 relative overflow-hidden ${
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
              }`}
              title={!isOpen ? item.label : undefined}
            >
              {active && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/30 rounded-r-full"
                  transition={{ duration: 0.2 }}
                />
              )}
              <Icon className="w-5 h-5 flex-shrink-0" />
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="font-medium whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}

        {/* Admin Section */}
        {isAdmin && (
          <>
            <div className="my-3 border-t border-sidebar-border/50" />
            {isOpen && (
              <p className="px-3.5 py-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider">
                Administración
              </p>
            )}
            {adminItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={!isDesktop ? onMobileClose : undefined}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 ${
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground"
                  }`}
                  title={!isOpen ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <AnimatePresence>
                    {isOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="font-medium whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Toggle Button — desktop only */}
      {isDesktop && (
        <div className="p-4 border-t border-sidebar-border/50">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-center p-2.5 rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground transition-all duration-200"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      )}
    </>
  );

  // ── Desktop mode: existing sidebar behavior ───────────────────────────
  if (isDesktop) {
    return (
      <motion.aside
        animate={{ width: isOpen ? 256 : 80 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 flex flex-col flex-shrink-0"
      >
        {navContent}
      </motion.aside>
    );
  }

  // ── Mobile mode: off-canvas drawer ────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <motion.aside
        animate={{ x: isMobileOpen ? 0 : -288 }}
        initial={{ x: -288 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed top-0 left-0 z-50 w-72 h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col shadow-2xl"
      >
        {navContent}
      </motion.aside>
    </>
  );
}
