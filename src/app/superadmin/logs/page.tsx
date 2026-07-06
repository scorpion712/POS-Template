"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Activity,
  Eye,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getAuditLogs } from "@/actions/superadmin";

/* ------------------------------------------------------------------ */
/*  LogEntry type (mirrors Prisma SuperadminAuditLog)                  */
/* ------------------------------------------------------------------ */
interface LogEntry {
  id: string;
  adminId: string;
  action: string;
  details: unknown;
  targetId?: string | null;
  targetType?: string | null;
  createdAt: Date;
}

interface PaginatedResult {
  logs: LogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

/* ------------------------------------------------------------------ */
/*  Action helpers                                                     */
/* ------------------------------------------------------------------ */
const ACTION_OPTIONS = [
  "create_client",
  "update_client",
  "delete_client",
  "create_business",
  "update_business",
  "delete_business",
  "register_payment",
  "change_client_plan",
  "create_plan",
  "update_plan",
  "delete_plan",
  "update_features",
] as const;

const actionLabel = (action: string): string => {
  const map: Record<string, string> = {
    create_client: "Crear Cliente",
    update_client: "Actualizar Cliente",
    delete_client: "Eliminar Cliente",
    create_business: "Crear Negocio",
    update_business: "Actualizar Negocio",
    delete_business: "Eliminar Negocio",
    register_payment: "Registrar Pago",
    change_client_plan: "Cambiar Plan",
    create_plan: "Crear Plan",
    update_plan: "Actualizar Plan",
    delete_plan: "Eliminar Plan",
    update_features: "Actualizar Features",
  };
  return map[action] ?? action.replace(/_/g, " ");
};

const actionBadgeClass = (action: string): string => {
  if (
    action.startsWith("create_") ||
    action.startsWith("register_")
  ) {
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  }
  if (
    action.startsWith("update_") ||
    action.startsWith("change_")
  ) {
    return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  }
  if (action.startsWith("delete_")) {
    return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
  }
  return "bg-slate-500/10 text-gray-500 dark:text-slate-400 border-slate-500/20";
};

/* ------------------------------------------------------------------ */
/*  Date helpers                                                       */
/* ------------------------------------------------------------------ */
const formatDateTime = (date: Date | string): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */
export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* -- fetch logs -------------------------------------------------- */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: { page: number; action?: string; from?: string; to?: string } = {
      page,
    };
    if (action) params.action = action;
    if (from) params.from = from;
    if (to) params.to = to;

    const result = await getAuditLogs(params);

    if ("error" in result) {
      setError(result.error as string);
      setData(null);
    } else {
      setData(result.success as PaginatedResult);
    }

    setLoading(false);
  }, [page, action, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  /* -- filter handlers --------------------------------------------- */
  const clearFilters = () => {
    setAction("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const hasActiveFilters = action || from || to;

  /* ---------------------------------------------------------------- */
  /*  Render                                                          */
  /* ---------------------------------------------------------------- */
  return (
    <div className="container mx-auto space-y-8 p-6 max-w-7xl animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
        <Link href="/superadmin/dashboard" className="hover:text-primary transition-colors">
          Superadmin
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">Logs</span>
      </nav>

      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <CardHeader className="relative z-10 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Superadmin
              </div>
              <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-gray-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-slate-300 dark:bg-clip-text dark:text-transparent">
                Logs de Auditoría
              </CardTitle>
              <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                Registro de todas las acciones realizadas por superadmins.
              </p>
            </div>
          </div>
        </CardHeader>

        {/* Filters */}
        <CardContent className="relative z-10 border-t border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-950/40 p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Action filter */}
            <div className="w-full sm:w-52">
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                Acción
              </label>
              <Select
                value={action || "all"}
                onValueChange={(v) => {
                  setAction(v === "all" ? "" : v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <Filter className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectItem value="all">Todas</SelectItem>
                  {ACTION_OPTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {actionLabel(a)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date from */}
            <div className="w-full sm:w-44">
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                Desde
              </label>
              <input
                type="date"
                value={from}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            {/* Date to */}
            <div className="w-full sm:w-44">
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1.5">
                Hasta
              </label>
              <input
                type="date"
                value={to}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10"
              >
                <XCircle className="w-4 h-4 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {error && (
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100/50 text-red-700 dark:from-red-900/40 dark:via-red-800/20 dark:to-slate-900 dark:text-red-400">
          <CardContent className="p-6">
            <p className="text-center">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-gray-500 dark:text-slate-400 text-sm">Cargando logs...</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && data && (
        <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Auditoría
              </CardTitle>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {data.total} registro{data.total !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-0">
            {data.logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron logs</p>
              </div>
            ) : (
              <>
                <Table className="[&_th]:px-4 [&_td]:px-4">
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        Fecha/Hora
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">
                        Admin ID
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        Acción
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">
                        Target
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                        Detalles
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.logs.map((log: LogEntry) => (
                      <TableRow
                        key={log.id}
                        className="border-gray-200 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800/50"
                      >
                        <TableCell>
                          <span className="text-sm text-gray-700 dark:text-slate-300 whitespace-nowrap font-mono">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-gray-600 dark:text-slate-400 font-mono truncate max-w-[140px] block">
                            {log.adminId}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${actionBadgeClass(log.action)} text-xs`}
                          >
                            {actionLabel(log.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {log.targetType || log.targetId ? (
                            <div className="text-sm text-gray-600 dark:text-slate-400">
                              {log.targetType && (
                                <span className="text-xs uppercase tracking-wider text-gray-400 dark:text-slate-500 mr-1">
                                  {log.targetType}:
                                </span>
                              )}
                              {log.targetId ? (
                                <span className="font-mono text-xs">{log.targetId}</span>
                              ) : (
                                <span className="text-xs italic">—</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DetailsDialog details={log.details} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {data.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-800">
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Página {data.page} de {data.totalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300 disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={data.page >= data.totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300 disabled:opacity-30"
                      >
                        Siguiente
                        <ChevronRightIcon className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty state when no data yet */}
      {!loading && !error && !data && (
        <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <CardContent className="p-8 text-center">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
            <p className="text-gray-500 dark:text-slate-400">No hay datos disponibles</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Details dialog sub-component                                       */
/* ------------------------------------------------------------------ */
function DetailsDialog({ details }: { details: unknown }) {
  const [open, setOpen] = useState(false);

  if (!details) return <span className="text-sm text-gray-300 dark:text-slate-600">—</span>;

  const formatted =
    typeof details === "object"
      ? JSON.stringify(details, null, 2)
      : String(details);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10"
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          Ver detalles
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles del log</DialogTitle>
        </DialogHeader>
        <pre className="bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 overflow-auto max-h-96 text-sm text-gray-800 dark:text-slate-200 font-mono whitespace-pre-wrap break-all">
          {formatted}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
