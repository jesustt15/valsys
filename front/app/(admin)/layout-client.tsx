"use client";

import { useState, useCallback } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { LogoutButton } from "@/components/logout-button";

interface AdminLayoutClientProps {
  fullName: string;
  role: string;
  initialUnreadCount: number;
  children: React.ReactNode;
}

export function AdminLayoutClient({
  fullName,
  role,
  initialUnreadCount,
  children,
}: AdminLayoutClientProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  // Close mobile drawer when resizing to desktop
  if (isDesktop && isMobileOpen) {
    setIsMobileOpen(false);
  }

  const handleMenuToggle = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        role={role}
        isMobileOpen={isMobileOpen}
        onMobileClose={handleMobileClose}
      />

      <div className="flex flex-col flex-1 ml-0 lg:ml-2">
        <Topbar
          fullName={fullName}
          role={role}
          logoutButton={<LogoutButton />}
          initialUnreadCount={initialUnreadCount}
          onMenuToggle={handleMenuToggle}
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
