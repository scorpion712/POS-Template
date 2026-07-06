import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Building,
  Users,
} from "lucide-react";
import { getBusinessUsers } from "@/actions/superadmin";
import { UsersTable } from "@/components/Superadmin/UsersTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UsersPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BusinessUsersPage({ params }: UsersPageProps) {
  const session = await auth();

  if (!session || session.user?.role !== UserRole.SUPER_ADMIN) {
    redirect("/auth/login");
  }

  const { id } = await params;

  const business = await db.business.findUnique({
    where: { id },
    select: { name: true, slug: true },
  });

  if (!business) {
    redirect("/superadmin/businesses");
  }

  const result = await getBusinessUsers(id);

  if ("error" in result) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600 dark:text-red-400">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-8 p-6 max-w-7xl animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
        <Link
          href="/superadmin/dashboard"
          className="hover:text-primary transition-colors duration-200"
        >
          Superadmin
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <Link
          href="/superadmin/businesses"
          className="hover:text-primary transition-colors duration-200"
        >
          Negocios
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-semibold">{business.name}</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">Usuarios</span>
      </nav>

      {/* Header Card */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-16 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />

        <CardHeader className="relative z-10 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                Usuarios Internos
              </div>
              <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-gray-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-slate-300 dark:bg-clip-text dark:text-transparent">
                {business.name}
              </CardTitle>
              <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                {result.users.length === 1
                  ? "1 usuario registrado en este negocio"
                  : `${result.users.length} usuarios registrados en este negocio`}
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <Link
                href={`/superadmin/businesses/${encodeURIComponent(id)}/features`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-transparent px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <Building className="w-4 h-4" />
                Features & Planes
              </Link>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <UsersTable users={result.users} />
    </div>
  );
}
