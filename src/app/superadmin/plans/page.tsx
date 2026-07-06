"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Search,
  Shield,
  Filter,
  Plus,
  Edit3,
  Trash2,
  DollarSign,
  Crown,
  CreditCard,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
} from "@/actions/superadmin";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  features: {
    hasAfipBilling: boolean;
    hasPublicCatalog: boolean;
    hasClientLedger: boolean;
    hasMultiCashbox: boolean;
    hasSupplierFilter: boolean;
    hasBudget: boolean;
  };
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxCashboxes: number;
    maxClients: number;
    dailySalesLimit: number;
    dailyProductsLimit: number;
    dailyClientsLimit: number;
  };
  isActive: boolean;
  displayOrder: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Form state splits features/limits into flat fields for easier UI binding
interface PlanFormData {
  name: string;
  description: string;
  price: number;
  hasAfipBilling: boolean;
  hasPublicCatalog: boolean;
  hasClientLedger: boolean;
  hasMultiCashbox: boolean;
  hasSupplierFilter: boolean;
  hasBudget: boolean;
  maxUsers: number;
  maxProducts: number;
  isActive: boolean;
  displayOrder: number;
  isDefault: boolean;
}

const emptyFormData: PlanFormData = {
  name: "",
  description: "",
  price: 0,
  hasAfipBilling: false,
  hasPublicCatalog: false,
  hasClientLedger: false,
  hasMultiCashbox: false,
  hasSupplierFilter: false,
  hasBudget: false,
  maxUsers: 1,
  maxProducts: 100,
  isActive: true,
  displayOrder: 0,
  isDefault: false,
};

// ──────────────────────────────────────────────
// Feature badge config
// ──────────────────────────────────────────────

type PlanFeatureKey = keyof Plan["features"];

const featureBadges: { key: PlanFeatureKey; label: string }[] = [
  { key: "hasAfipBilling", label: "AFIP" },
  { key: "hasPublicCatalog", label: "Catálogo" },
  { key: "hasClientLedger", label: "Cartera" },
  { key: "hasMultiCashbox", label: "Multi Caja" },
  { key: "hasSupplierFilter", label: "Proveedores" },
  { key: "hasBudget", label: "Presupuestos" },
];

const featureColors: Record<PlanFeatureKey, string> = {
  hasAfipBilling: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  hasPublicCatalog: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  hasClientLedger: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
  hasMultiCashbox: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  hasSupplierFilter: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  hasBudget: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

const activeBadgeClass = (isActive: boolean) =>
  isActive
    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
    : "bg-slate-500/10 text-gray-500 dark:text-slate-400 border-slate-500/20";

// ──────────────────────────────────────────────
// Plan Form Dialog (shared by Create & Edit)
// ──────────────────────────────────────────────

interface PlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: Plan | null;
  onSuccess: () => void;
}

function PlanFormDialog({ open, onOpenChange, plan, onSuccess }: PlanFormDialogProps) {
  const isEdit = !!plan;
  const [form, setForm] = useState<PlanFormData>(emptyFormData);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof PlanFormData, string>>>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (plan) {
        setForm({
          name: plan.name,
          description: plan.description ?? "",
          price: plan.price,
          ...plan.features,
          maxUsers: plan.limits.maxUsers,
          maxProducts: plan.limits.maxProducts,
          isActive: plan.isActive,
          displayOrder: plan.displayOrder,
          isDefault: plan.isDefault,
        });
      } else {
        setForm(emptyFormData);
      }
      setErrors({});
    }
  }, [open, plan]);

  const update = <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PlanFormData, string>> = {};
    if (!form.name.trim()) newErrors.name = "El nombre es requerido";
    if (form.price < 0) newErrors.price = "El precio no puede ser negativo";
    if (form.maxUsers < 1) newErrors.maxUsers = "Debe ser al menos 1";
    if (form.maxProducts < 1) newErrors.maxProducts = "Debe ser al menos 1";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: form.price,
        features: {
          hasAfipBilling: form.hasAfipBilling,
          hasPublicCatalog: form.hasPublicCatalog,
          hasClientLedger: form.hasClientLedger,
          hasMultiCashbox: form.hasMultiCashbox,
          hasSupplierFilter: form.hasSupplierFilter,
          hasBudget: form.hasBudget,
        },
        limits: {
          maxUsers: form.maxUsers,
          maxProducts: form.maxProducts,
          maxCashboxes: 1,
          maxClients: 100,
          dailySalesLimit: 0,
          dailyProductsLimit: 0,
          dailyClientsLimit: 0,
        },
        isActive: form.isActive,
        displayOrder: form.displayOrder,
        isDefault: form.isDefault,
      };

      const result = isEdit
        ? await updatePlan(plan!.id, payload)
        : await createPlan(payload);

      if ("error" in result) {
        toast.error(result.error as string);
      } else {
        toast.success(isEdit ? "Plan actualizado" : "Plan creado");
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      toast.error("Error al guardar el plan");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 focus-visible:ring-blue-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
            {isEdit ? "Editar Plan" : "Nuevo Plan"}
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            {isEdit
              ? "Modificá los datos del plan"
              : "Completá los datos para crear un nuevo plan"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Name & Description */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-700 dark:text-slate-300 font-medium">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Ej: Plan Básico"
                className={inputClass + (errors.name ? " border-red-500" : "")}
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-gray-700 dark:text-slate-300 font-medium">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Descripción del plan..."
                rows={3}
                className={inputClass}
              />
            </div>
          </div>

          {/* Price & Display Order */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="price" className="text-gray-700 dark:text-slate-300 font-medium">
                Precio ($) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={form.price}
                onChange={(e) => update("price", parseFloat(e.target.value) || 0)}
                className={inputClass + (errors.price ? " border-red-500" : "")}
              />
              {errors.price && (
                <p className="text-xs text-red-500">{errors.price}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="displayOrder" className="text-gray-700 dark:text-slate-300 font-medium">
                Orden
              </Label>
              <Input
                id="displayOrder"
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => update("displayOrder", parseInt(e.target.value) || 0)}
                className={inputClass}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price" className="text-gray-700 dark:text-slate-300 font-medium opacity-0 select-none">
                placeholder
              </Label>
              <div className="flex items-center gap-3 h-10">
                <Checkbox
                  id="isDefault"
                  checked={form.isDefault}
                  onCheckedChange={(checked) => update("isDefault", checked === true)}
                />
                <Label
                  htmlFor="isDefault"
                  className="text-gray-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  Plan por defecto
                </Label>
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="grid gap-3">
            <Label className="text-gray-700 dark:text-slate-300 font-medium">
              Funcionalidades incluidas
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {featureBadges.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-3"
                >
                  <Label
                    htmlFor={key}
                    className="text-sm text-gray-700 dark:text-slate-300 cursor-pointer font-medium"
                  >
                    {label}
                  </Label>
                  <Switch
                    id={key}
                    checked={form[key as keyof PlanFormData] as boolean}
                    onCheckedChange={(checked) => update(key as keyof PlanFormData, checked)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="maxUsers" className="text-gray-700 dark:text-slate-300 font-medium">
                Máx. Usuarios
              </Label>
              <Input
                id="maxUsers"
                type="number"
                min={1}
                value={form.maxUsers}
                onChange={(e) => update("maxUsers", parseInt(e.target.value) || 1)}
                className={inputClass + (errors.maxUsers ? " border-red-500" : "")}
              />
              {errors.maxUsers && (
                <p className="text-xs text-red-500">{errors.maxUsers}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxProducts" className="text-gray-700 dark:text-slate-300 font-medium">
                Máx. Productos
              </Label>
              <Input
                id="maxProducts"
                type="number"
                min={1}
                value={form.maxProducts}
                onChange={(e) => update("maxProducts", parseInt(e.target.value) || 1)}
                className={inputClass + (errors.maxProducts ? " border-red-500" : "")}
              />
              {errors.maxProducts && (
                <p className="text-xs text-red-500">{errors.maxProducts}</p>
              )}
            </div>
          </div>

          {/* Active & Default */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-3">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(checked) => update("isActive", checked)}
              />
              <Label
                htmlFor="isActive"
                className="text-gray-700 dark:text-slate-300 font-medium cursor-pointer"
              >
                Plan activo
              </Label>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-gray-200 dark:border-slate-800 pt-4">
          <DialogClose asChild>
            <Button
              variant="outline"
              disabled={saving}
              className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300"
            >
              Cancelar
            </Button>
          </DialogClose>
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Guardando...
              </>
            ) : isEdit ? (
              "Actualizar Plan"
            ) : (
              "Crear Plan"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ──────────────────────────────────────────────
// Delete Confirmation Dialog
// ──────────────────────────────────────────────

interface DeletePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Plan | null;
  onSuccess: () => void;
}

function DeletePlanDialog({ open, onOpenChange, plan, onSuccess }: DeletePlanDialogProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!plan) return;
    setDeleting(true);
    try {
      const result = await deletePlan(plan.id);
      if ("error" in result) {
        toast.error(result.error as string);
      } else {
        toast.success("Plan eliminado");
        onOpenChange(false);
        onSuccess();
      }
    } catch {
      toast.error("Error al eliminar el plan");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900 dark:text-white">
            ¿Eliminar plan?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500 dark:text-slate-400">
            Vas a eliminar <strong className="text-gray-700 dark:text-slate-300">{plan?.name}</strong>.
            Esta acción no se puede deshacer. Si el plan está asignado a algún negocio, no se podrá eliminar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={deleting}
            className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {deleting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                Eliminando...
              </>
            ) : (
              "Eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<Plan | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getPlans(true); // always fetch all, filter client-side

    if ("error" in result) {
      setError(result.error as string);
      setPlans([]);
    } else {
      setPlans(result.success as Plan[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  // Client-side filtering
  const filteredPlans = plans.filter((plan) => {
    // Status filter
    if (statusFilter === "active" && !plan.isActive) return false;
    if (statusFilter === "inactive" && plan.isActive) return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      return (
        plan.name.toLowerCase().includes(q) ||
        (plan.description ?? "").toLowerCase().includes(q)
      );
    }

    return true;
  });

  return (
    <div className="container mx-auto space-y-8 p-6 max-w-7xl animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
        <Link href="/superadmin/dashboard" className="hover:text-primary transition-colors">
          Superadmin
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">Planes</span>
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
                Planes
              </CardTitle>
              <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                Gestión del catálogo de planes: creá, editá y eliminá planes del sistema.
              </p>
            </div>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/25"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Plan
            </Button>
          </div>
        </CardHeader>

        {/* Search & Filters */}
        <CardContent className="relative z-10 border-t border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-950/40 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-white dark:placeholder:text-slate-500 focus-visible:ring-blue-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <Filter className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activos</SelectItem>
                  <SelectItem value="inactive">Inactivos</SelectItem>
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
            <p className="text-gray-500 dark:text-slate-400 text-sm">Cargando planes...</p>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Crown className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Planes
              </CardTitle>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {filteredPlans.length} resultado{filteredPlans.length !== 1 ? "s" : ""}
              </span>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 p-0">
            {filteredPlans.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                <Crown className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {search || statusFilter !== "all"
                    ? "No se encontraron planes con esos filtros"
                    : "No hay planes registrados"}
                </p>
              </div>
            ) : (
              <Table className="[&_th]:px-4 [&_td]:px-4">
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Nombre
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">
                      Descripción
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Precio
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">
                      Funcionalidades
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden xl:table-cell">
                      Límites
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      Estado
                    </TableHead>
                    <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan) => (
                    <TableRow
                      key={plan.id}
                      className="border-gray-200 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 dark:text-white">{plan.name}</p>
                          {plan.isDefault && (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0"
                            >
                              Default
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-gray-500 dark:text-slate-400 line-clamp-2 max-w-[200px]">
                          {plan.description || (
                            <span className="italic text-gray-300 dark:text-slate-600">Sin descripción</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
                          <span className="font-mono font-semibold text-gray-900 dark:text-white">
                            {plan.price.toLocaleString("es-AR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1 max-w-[240px]">
                          {featureBadges
                            .filter(({ key }) => plan.features[key])
                            .map(({ key, label }) => (
                              <Badge
                                key={key}
                                variant="outline"
                                className={`${featureColors[key]} text-[10px] px-2 py-0`}
                              >
                                {label}
                              </Badge>
                            ))}
                          {featureBadges.filter(({ key }) => plan.features[key]).length === 0 && (
                            <span className="text-xs text-gray-300 dark:text-slate-600 italic">
                              Sin features
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-slate-400">
                          <span className="flex items-center gap-1" title="Usuarios">
                            <Users className="w-3.5 h-3.5" />
                            {plan.limits.maxUsers}
                          </span>
                          <span className="flex items-center gap-1" title="Productos">
                            <CreditCard className="w-3.5 h-3.5" />
                            {plan.limits.maxProducts}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`${activeBadgeClass(plan.isActive)} text-xs`}
                        >
                          {plan.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingPlan(plan);
                              setEditOpen(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-500/10"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeletingPlan(plan);
                              setDeleteOpen(true);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <PlanFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={fetchPlans}
      />
      <PlanFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        plan={editingPlan}
        onSuccess={fetchPlans}
      />
      <DeletePlanDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        plan={deletingPlan}
        onSuccess={fetchPlans}
      />
    </div>
  );
}
