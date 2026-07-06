"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Search,
  Users,
  Shield,
  Filter,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Building2,
  Mail,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getClientsPaginated, createClient, getPlans, type GetClientsPaginatedInput } from "@/actions/superadmin";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Client {
  id: string;
  name: string;
  slug: string;
  accountStatus: string;
  createdAt: Date;
  userId: string | null;
  users: { id: string; name: string | null; email: string | null }[];
  planDefinition: { name: string } | null;
}

interface PaginatedResult {
  clients: Client[];
  total: number;
  page: number;
  totalPages: number;
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

export default function ClientsPage() {
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
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: GetClientsPaginatedInput = { page };
    if (search) params.search = search;
    if (status) params.status = status;

    const result = await getClientsPaginated(params);

    if ("error" in result) {
      setError(result.error as string);
      setData(null);
    } else {
      setData(result.success as PaginatedResult);
    }

    setLoading(false);
  }, [page, search, status]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    router.replace(`/superadmin/clients${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [search, status, page, router]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatus(value === "all" ? "" : value);
    setPage(1);
  };

  return (
    <div className="container mx-auto space-y-8 p-6 max-w-7xl animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
        <Link href="/superadmin/dashboard" className="hover:text-primary transition-colors">
          Superadmin
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">Clientes</span>
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
                Clientes
              </CardTitle>
                <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                  Gestión de clientes: consulta, registra pagos y cambia planes.
                </p>
              </div>
              <Button
                onClick={() => setDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nuevo Cliente
              </Button>
            </div>
          </CardHeader>

        {/* Search & Filters */}
        <CardContent className="relative z-10 border-t border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-950/40 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Buscar por nombre, email o CUIT..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={status || "all"}
                onValueChange={handleStatusFilter}
              >
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
            <p className="text-gray-500 dark:text-slate-400 text-sm">Cargando clientes...</p>
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
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Clientes
              </CardTitle>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {data.total} resultado{data.total !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-0">
            {data.clients.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No se encontraron clientes</p>
              </div>
            ) : (
              <>
                <Table className="[&_th]:px-4 [&_td]:px-4">
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        Negocio
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">
                        Dueño
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">
                        Plan
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        Estado
                      </TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.clients.map((client: Client) => (
                      <TableRow
                        key={client.id}
                        className="border-gray-200 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800/50"
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{client.name}</p>
                            <p className="text-xs text-gray-400 dark:text-slate-500 font-mono">
                              {client.slug}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {client.userId ? (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                              <span className="text-sm text-gray-600 dark:text-slate-300 truncate max-w-[180px]">
                                {client.users[0]?.email || "Sin email"}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-slate-600">Sin dueño</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {client.planDefinition ? (
                            <Badge
                              variant="outline"
                              className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-xs"
                            >
                              {client.planDefinition.name}
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-300 dark:text-slate-600">Sin plan</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`${statusBadgeClass(client.accountStatus)} text-xs`}
                          >
                            {client.accountStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10"
                          >
                            <Link href={`/superadmin/clients/${client.id}`}>
                              Gestionar
                              <ChevronRightIcon className="ml-1 w-3.5 h-3.5" />
                            </Link>
                          </Button>
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
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
            <p className="text-gray-500 dark:text-slate-400">No hay datos disponibles</p>
          </CardContent>
        </Card>
      )}

      <CreateClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchClients}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// Create Client Dialog
// ──────────────────────────────────────────────

function CreateClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<Array<{ id: string; name: string; price: number; isDefault: boolean }>>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getPlans(true).then((result) => {
      if ("success" in result) {
        const plans = (result.success ?? []) as { id: string; name: string; price: number; isDefault: boolean }[];
        setAvailablePlans(plans);
        // Auto-select the default plan
        const defaultPlan = plans.find((p) => p.isDefault);
        if (defaultPlan && !plan) {
          setPlan(defaultPlan.name);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleBusinessNameChange = (value: string) => {
    setBusinessName(value);
    if (!slugManuallyEdited) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setSlug(generateSlug(value));
      }, 500);
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value);
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPassword("");
    setBusinessName("");
    setSlug("");
    setPlan("");
    setErrors({});
    setSlugManuallyEdited(false);
    setLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!name || name.length < 2) {
      setErrors({ name: "El nombre debe tener al menos 2 caracteres" });
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Email inválido" });
      return;
    }
    if (!password || password.length < 6) {
      setErrors({ password: "La contraseña debe tener al menos 6 caracteres" });
      return;
    }
    if (!businessName || businessName.length < 2) {
      setErrors({ businessName: "El nombre del negocio debe tener al menos 2 caracteres" });
      return;
    }
    if (!slug || slug.length < 2 || !/^[a-z0-9-]+$/.test(slug)) {
      setErrors({
        slug:
          "El slug debe tener al menos 2 caracteres y solo contener letras minúsculas, números y guiones",
      });
      return;
    }

    setLoading(true);
    const result = await createClient({
      name,
      email,
      password,
      businessName,
      slug,
      plan: plan as "BASIC" | "PRO" | "ENTERPRISE",
    });

    if ("error" in result) {
      setErrors({ general: result.error as string });
      setLoading(false);
    } else {
      toast.success("Cliente creado exitosamente");
      resetForm();
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Nuevo Cliente</DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            Completá los datos para crear un nuevo cliente.
          </DialogDescription>
        </DialogHeader>

        {errors.general && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-900/30 dark:border-red-800 dark:text-red-400">
            {errors.general}
          </div>
        )}

        <div className="space-y-6 py-2">
          {/* Section: Datos del dueño */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Datos del dueño
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="owner-name">Nombre</Label>
                <Input
                  id="owner-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-email">Email</Label>
                <Input
                  id="owner-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ej: juan@ejemplo.com"
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-password">Contraseña</Label>
                <Input
                  id="owner-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password}</p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-slate-800" />

          {/* Section: Datos del negocio */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Datos del negocio
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business-name">Nombre del negocio</Label>
                <Input
                  id="business-name"
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                  placeholder="Ej: Mi Tienda"
                  className={errors.businessName ? "border-red-500" : ""}
                />
                {errors.businessName && (
                  <p className="text-xs text-red-500">{errors.businessName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-slug">Slug</Label>
                <Input
                  id="business-slug"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="mi-tienda"
                  className={errors.slug ? "border-red-500" : ""}
                />
                {errors.slug && (
                  <p className="text-xs text-red-500">{errors.slug}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Se genera automáticamente desde el nombre. Podés editarlo manualmente.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="business-plan">Plan</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger
                    id="business-plan"
                    className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
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

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Crear Cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
