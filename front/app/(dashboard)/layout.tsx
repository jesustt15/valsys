import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { getUnreadCount } from "@/lib/services/notification";
import { DashboardLayoutClient } from "./layout-client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/");
  }

  const initialUnreadCount = await getUnreadCount(session.sub);

  return (
    <DashboardLayoutClient
      fullName={session.fullName}
      role={session.role}
      initialUnreadCount={initialUnreadCount}
    >
      {children}
    </DashboardLayoutClient>
  );
}
