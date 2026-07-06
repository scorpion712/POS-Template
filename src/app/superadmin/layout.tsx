import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import SuperadminSidebar from "@/components/Superadmin/SuperadminSidebar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (session?.user?.role !== UserRole.SUPER_ADMIN) {
    return redirect("/");
  }

  const [clientCount, businessCount] = await Promise.all([
    db.business.count({ where: { userId: { not: null } } }),
    db.business.count(),
  ]);

  return (
    <div className="superadmin-layout flex h-screen bg-gray-100 dark:bg-gray-900">
      <SuperadminSidebar
        clientCount={clientCount}
        businessCount={businessCount}
      />
      <main className="flex-1 overflow-auto px-8 pb-8 pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}
