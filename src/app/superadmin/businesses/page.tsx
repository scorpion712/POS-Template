"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Search,
  Building2,
  Shield,
  Filter,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Mail,
  AlertTriangle,
  Loader2,
  Trash2,
  FileText,
  Settings,
  Plus,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getBusinessesPaginated,
  deleteBusinessSafe,
  createClient,
  updateBusiness,
  getPlans,
  type GetBusinessesPaginatedInput,
} from "@/actions/superadmin";

interface BusinessUser {
  id: string;
  name: string | null;
  email: string | null;
}

interface BusinessFeature {
  plan: string;
}

interface BusinessCount {
  products: number;
  orders: number;
}

interface Business {
  id: string;
  name: string;
  slug: string;
  accountStatus: string;
  lastPaymentDate: Date | null;
  createdAt: Date;
  userId: string | null;
  users: BusinessUser[];
  planDefinition: { id: string; name: string } | null;
  _count: BusinessCount;
}

interface PaginatedResult {
  businesses: Business[];
  total: number;
  page: number;
  totalPages: number;
}

interface DeleteWarning {
  name: string;
  products: number;
  orders: number;
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "ACTIVO":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "MOROSO":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    case "DESACTIVADO":
      return "bg-slate-500/10 text-gray-500 dark:text-slate-400 border-slate-500/20";
    default:
      return "";
  }
};

const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export default function BusinessesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = parseInt(searchParams.get("page") || "1", 10);
  const initialSearch = searchParams.get("search") || "";
  const initialStatus = searchParams.get("status") || "";

  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PaginatedResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusinessId, setDeleteBusinessId] = useState<string | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<DeleteWarning | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [fetchingWarning, setFetchingWarning] = useState(false);

  // Create dialog state
  const [createOpen, setCreateOpen] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: GetBusinessesPaginatedInput = { page };
    if (search) params.search = search;
    if (status) params.status = status;

    const result = await getBusinessesPaginated(params);

    if ("error" in result) {
      setError(result.error as string);
      setData(null);
    } else {
      setData(result.success as PaginatedResult);
    }

    setLoading(false);
  }, [page, search, status]);

  useEffect(() => {
    fetchBusinesses();
  }, [fetchBusinesses]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(`/superadmin/businesses${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, status, page, router]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatus(value === "all" ? "" : value);
    setPage(1);
  };

  const handleDeleteClick = async (businessId: string) => {
    setFetchingWarning(true);
    setDeleteBusinessId(businessId);
    const result = await deleteBusinessSafe(businessId);

    if ("error" in result) {
      toast.error(result.error as string);
      setDeleteBusinessId(null);
      setFetchingWarning(false);
      return;
    }

    setDeleteWarning(result.warning as DeleteWarning);
    setDeleteOpen(true);
    setFetchingWarning(false);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteBusinessId) return;

    setDeleteLoading(true);
    const result = await deleteBusinessSafe(deleteBusinessId, true);

    if ("error" in result) {
      toast.error(result.error as string);
    } else {
      toast.success("Negocio eliminado correctamente");
      setDeleteOpen(false);
      setDeleteBusinessId(null);
      setDeleteWarning(null);
      fetchBusinesses();
    }
    setDeleteLoading(false);
  };

  const handleEditClick = (business: Business) => {
    setEditingBusiness(business);
    setEditOpen(true);
  };

  // ── Create & Edit — standalone dialog components ─────────────────

  return (
    <div className="container mx-auto space-y-8 p-6 max-w-7xl animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
        <Link href="/superadmin/dashboard" className="hover:text-primary transition-colors">
          Superadmin
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">Negocios</span>
      </nav>

      {/* Header */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <CardHeader className="relative z-10 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <Shield className="w-3.5 h-3.5" />
                Superadmin
              </div>
              <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-gray-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-slate-300 dark:bg-clip-text dark:text-transparent pb-1">
                Negocios
              </CardTitle>
              <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                Gestión de negocios: consulta, configura ARCA y features, administra suscripciones.
              </p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Negocio
            </Button>
          </div>
        </CardHeader>

        {/* Search & Filters */}
        <CardContent className="relative z-10 border-t border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-950/40 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Buscar por nombre, slug o email del dueño..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={status || "all"} onValueChange={handleStatusFilter}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <Filter className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ACTIVO">Activo</SelectItem>
                  <SelectItem value="MOROSO">Moroso</SelectItem>
                  <SelectItem value="DESACTIVADO">Desactivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <p className="text-gray-500 dark:text-slate-400 text-sm">Cargando negocios...</p>
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
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Negocios
              </CardTitle>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {data.total} resultado{data.total !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-0">
            {data.businesses.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron negocios</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table className="[&_th]:px-4 [&_td]:px-4">
                    <TableHeader>
                      <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">
                          Negocio
                        </TableHead>
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap hidden md:table-cell">
                          Dueño
                        </TableHead>
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                          Plan
                        </TableHead>
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap">
                          Estado
                        </TableHead>
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap hidden xl:table-cell text-right">
                          Productos
                        </TableHead>
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap hidden xl:table-cell text-right">
                          Órdenes
                        </TableHead>
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                          Últ. Pago
                        </TableHead>
                        <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider whitespace-nowrap text-right">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.businesses.map((business: Business) => (
                        <TableRow
                          key={business.id}
                          className="border-gray-200 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800/50"
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{business.name}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                                {business.slug}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {business.userId ? (
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500 shrink-0" />
                                <span className="text-sm text-gray-600 dark:text-slate-300 truncate max-w-[180px]">
                                  {business.users[0]?.email || "Sin email"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300 dark:text-slate-600">Sin dueño</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {business.planDefinition ? (
                              <Badge
                                variant="outline"
                                className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs"
                              >
                                {business.planDefinition.name}
                              </Badge>
                            ) : (
                              <span className="text-sm text-gray-300 dark:text-slate-600">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`${statusBadgeClass(business.accountStatus)} text-xs`}
                            >
                              {business.accountStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-right">
                            <span className="text-sm text-gray-600 dark:text-slate-300">{business._count.products}</span>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell text-right">
                            <span className="text-sm text-gray-600 dark:text-slate-300">{business._count.orders}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-gray-500 dark:text-slate-400">
                              {business.lastPaymentDate
                                ? new Date(business.lastPaymentDate).toLocaleDateString("es-AR", {
                                    day: "numeric",
                                    month: "short",
                                  })
                                : "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-500/10 h-8 w-8 p-0"
                                title="Editar negocio"
                                onClick={() => handleEditClick(business)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10 h-8 w-8 p-0"
                                title="Configuración ARCA"
                              >
                                <Link href={`/superadmin/businesses/${business.id}/arca`}>
                                  <FileText className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                              <Button
                                asChild
                                variant="ghost"
                                size="sm"
                                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-500/10 h-8 w-8 p-0"
                                title="Features & Plan"
                              >
                                <Link href={`/superadmin/businesses/${business.id}/features`}>
                                  <Settings className="w-3.5 h-3.5" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 h-8 w-8 p-0"
                                title="Eliminar negocio"
                                onClick={() => handleDeleteClick(business.id)}
                                disabled={fetchingWarning}
                              >
                                {fetchingWarning && deleteBusinessId === business.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              Eliminar Negocio
            </DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              {deleteWarning && (
                <span>
                  ¿Eliminar <strong className="text-gray-900 dark:text-white">{deleteWarning.name}</strong>?
                  Esta acción no se puede deshacer.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {deleteWarning && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Se eliminarán todos los datos asociados:
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Productos</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{deleteWarning.products}</p>
                </div>
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wider">Órdenes</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">{deleteWarning.orders}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                También se eliminarán clientes, proveedores, categorías, marcas, movimientos de caja y más.
              </p>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="bg-transparent border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteLoading}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Business Dialog */}
      <CreateBusinessDialog
        open={createOpen}
        onClose={() => { setCreateOpen(false); }}
        onSuccess={() => { setCreateOpen(false); fetchBusinesses(); }}
      />

      {/* Edit Business Dialog */}
      <EditBusinessDialog
        open={editOpen}
        business={editingBusiness}
        onClose={() => { setEditOpen(false); setEditingBusiness(null); }}
        onSuccess={() => { setEditOpen(false); setEditingBusiness(null); fetchBusinesses(); }}
      />
    </div>
  );
}

// ── Create Business Dialog (standalone) ──────────────────────────────────

function CreateBusinessDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("BASIC");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availablePlans, setAvailablePlans] = useState<
    Array<{ id: string; name: string; price: number; isDefault: boolean }>
  >([]);

  // Reset manual slug flag when business name changes
  useEffect(() => {
    setSlugManuallyEdited(false);
  }, [businessName]);

  // Debounced auto-generation of slug from business name
  useEffect(() => {
    if (!businessName || slugManuallyEdited) return;
    const timer = setTimeout(() => {
      setSlug(generateSlug(businessName));
    }, 600);
    return () => clearTimeout(timer);
  }, [businessName, slugManuallyEdited]);

  // Load available plans from the database
  useEffect(() => {
    getPlans(true).then((result) => {
      if ("success" in result) {
        const plans = (result.success ?? []) as Array<{ id: string; name: string; price: number; isDefault: boolean }>;
        setAvailablePlans(plans);
      }
    });
  }, []);

  const handleClose = () => {
    onClose();
    // Reset form after animation
    setTimeout(() => {
      setOwnerName("");
      setOwnerEmail("");
      setOwnerPassword("");
      setBusinessName("");
      setSlug("");
      setPlan("BASIC");
      setSlugManuallyEdited(false);
      setError(null);
    }, 200);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    const result = await createClient({
      name: ownerName,
      email: ownerEmail,
      password: ownerPassword,
      businessName,
      slug,
      plan,
    });

    if ("error" in result) {
      setError(result.error as string);
      setSubmitting(false);
    } else {
      toast.success("Negocio creado correctamente");
      onSuccess();
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Nuevo Negocio
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            Crear un nuevo negocio con su dueño. El slug se genera automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Owner section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
              Datos del dueño
            </h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-slate-300">Nombre</Label>
                <Input
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="Nombre del dueño"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-slate-300">Email</Label>
                <Input
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  type="email"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-slate-300">Contraseña</Label>
                <Input
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="••••••"
                  type="password"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          {/* Business section */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">
              Datos del negocio
            </h4>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-slate-300">Nombre del negocio</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Nombre del negocio"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-slate-300">Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugManuallyEdited(e.target.value !== generateSlug(businessName));
                  }}
                  placeholder="mi-negocio"
                  className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
                />
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Se genera automáticamente desde el nombre. Podés editarlo manualmente.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-700 dark:text-slate-300">Plan</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    <SelectValue placeholder="Seleccionar plan" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                    {availablePlans.map((p) => (
                      <SelectItem key={p.id} value={p.name}>
                        {p.name} — ${p.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-transparent border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Crear Negocio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Business Dialog (standalone) ────────────────────────────────────

function EditBusinessDialog({
  open,
  business,
  onClose,
  onSuccess,
}: {
  open: boolean;
  business: Business | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form when editing business changes
  useEffect(() => {
    if (business) {
      setName(business.name);
      setSlug(business.slug);
    }
  }, [business]);

  const handleClose = () => {
    onClose();
    setError(null);
  };

  const handleSubmit = async () => {
    if (!business) return;

    setSubmitting(true);
    setError(null);

    const result = await updateBusiness(business.id, { name, slug });

    if ("error" in result) {
      setError(result.error as string);
      setSubmitting(false);
    } else {
      toast.success("Negocio actualizado correctamente");
      onSuccess();
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Editar Negocio
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            {business ? `Editando "${business.name}"` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label className="text-gray-700 dark:text-slate-300">Nombre del negocio</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre del negocio"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-gray-700 dark:text-slate-300">Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="mi-negocio"
              className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500"
            />
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Identificador único para el negocio.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-transparent border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
