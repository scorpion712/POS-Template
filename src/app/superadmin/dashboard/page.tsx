import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle,
  CreditCard,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Shield,
  Calendar,
} from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SuperadminMetricCard } from "@/components/Superadmin/SuperadminMetricCard";
import { getSuperadminMetrics } from "@/actions/superadmin";

interface DashboardBusiness {
  id: string;
  name: string;
  slug: string;
  accountStatus: string;
  createdAt: string | Date;
  userId: string | null;
}

interface DashboardMetrics {
  totalBusinesses: number;
  activeBusinesses: number;
  morosoBusinesses: number;
  desactivadoBusinesses: number;
  totalClients: number;
  planDistribution: Record<string, number>;
  recentBusinesses: DashboardBusiness[];
  recentClients: DashboardBusiness[];
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "ACTIVO":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20";
    case "MOROSO":
      return "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20";
    case "DESACTIVADO":
      return "bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20";
    default:
      return "";
  }
};

export default async function SuperAdminDashboardPage() {
  const result = await getSuperadminMetrics();

  if ("error" in result) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-400">{result.error}</p>
      </div>
    );
  }

  const metrics = result.success as DashboardMetrics;

  return (
    <div className="container mx-auto space-y-8 p-6 max-w-7xl animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
        <span className="text-gray-900 font-semibold">Superadmin</span>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">Dashboard</span>
      </nav>

      {/* Header Card */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-16 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />

        <CardHeader className="relative z-10 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Superadmin Dashboard
              </div>
              <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-gray-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-slate-300 dark:bg-clip-text dark:text-transparent">
                Panel de Control
              </CardTitle>
              <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                Visión general del estado de todos los clientes y negocios del sistema.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300 transition-all duration-200"
              >
                <Link href="/superadmin/businesses">
                  Ver Negocios
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Metadata row */}
        <CardContent className="relative z-10 border-t border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-950/40 p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  Planes
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {Object.entries(metrics.planDistribution)
                    .map(([plan, count]) => `${plan}: ${count}`)
                    .join(" · ") || "Sin datos"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  Clientes con dueño
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {metrics.totalClients} de {metrics.totalBusinesses}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300">
                <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  Tasa de actividad
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {metrics.totalBusinesses > 0
                    ? `${Math.round(
                        (metrics.activeBusinesses / metrics.totalBusinesses) * 100
                      )}%`
                    : "N/A"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-400 dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
                  Clientes morosos
                </span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {metrics.morosoBusinesses}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SuperadminMetricCard
          title="Total Negocios"
          value={metrics.totalBusinesses}
          description="Negocios registrados en el sistema"
          icon={Building2}
        />
        <SuperadminMetricCard
          title="Activos"
          value={metrics.activeBusinesses}
          description="Negocios con estado ACTIVO"
          icon={CheckCircle}
          trend={{
            value: `${metrics.totalBusinesses > 0 ? Math.round((metrics.activeBusinesses / metrics.totalBusinesses) * 100) : 0}% del total`,
            positive: true,
          }}
        />
        <SuperadminMetricCard
          title="Morosos"
          value={metrics.morosoBusinesses}
          description="Negocios con pagos vencidos"
          icon={AlertTriangle}
          trend={{
            value: `${metrics.totalBusinesses > 0 ? Math.round((metrics.morosoBusinesses / metrics.totalBusinesses) * 100) : 0}% del total`,
            positive: false,
          }}
        />
        <SuperadminMetricCard
          title="Clientes (Dueños)"
          value={metrics.totalClients}
          description="Negocios con dueño asignado"
          icon={Users}
        />
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Businesses */}
        <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">
                Últimos Negocios
              </CardTitle>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
              >
                <Link href="/superadmin/businesses">
                  Ver todos
                  <ArrowRight className="ml-1 w-3.5 h-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-0">
            {metrics.recentBusinesses.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay negocios registrados</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Negocio
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Estado
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">
                      Dueño
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                      Creado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentBusinesses.map((business: DashboardBusiness) => (
                    <TableRow
                      key={business.id}
                      className="border-gray-200 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800/50 cursor-pointer"
                    >
                      <TableCell>
                        <Link
                          href={`/superadmin/businesses/${business.id}/features`}
                          className="block"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">{business.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                            {business.slug}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusBadgeClass(business.accountStatus)} text-xs`}
                        >
                          {business.accountStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          {business.userId ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Asignado
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">Sin dueño</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(business.createdAt).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients (Business Owners) */}
        <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">
                Últimos Clientes
              </CardTitle>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400">
                {metrics.totalClients} total
              </span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-0">
            {metrics.recentClients.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay clientes con dueño asignado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Cliente
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Estado
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">
                      Negocio
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                      Desde
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.recentClients.map((client: DashboardBusiness) => (
                    <TableRow
                      key={client.id}
                      className="border-gray-200 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell>
                        <Link
                          href={`/superadmin/businesses/${client.id}/features`}
                          className="block"
                        >
                          <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                            {client.slug}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${statusBadgeClass(client.accountStatus)} text-xs`}
                        >
                          {client.accountStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          {client.userId ? (
                            <span className="inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Con dueño
                            </span>
                          ) : (
                            <span className="text-gray-300 dark:text-slate-600">Sin asignar</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm text-gray-500 dark:text-slate-400">
                          {new Date(client.createdAt).toLocaleDateString("es-AR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
