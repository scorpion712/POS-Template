"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Shield,
  Building,
  Hash,
  Calendar,
  Users,
  CreditCard,
  TrendingUp,
  ArrowLeft,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  X,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getClientDetail,
  registerPayment,
  changeClientPlan,
  updateClient,
  deleteClient,
  getClientDeleteInfo,
  getPlans,
  type RegisterPaymentInput,
} from "@/actions/superadmin";

interface OwnerInfo {
  id: string;
  name: string | null;
  email: string | null;
}

interface PlanDefinitionInfo {
  id: string;
  name: string;
  description: string | null;
  features: Record<string, unknown>;
  limits: Record<string, unknown>;
  isActive: boolean;
  displayOrder: number;
}

interface PaymentInfo {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paidAt: Date;
  recordedAt: Date;
  recordedBy: string;
}

interface StatsInfo {
  products: number;
  orders: number;
}

interface ClientDetailData {
  business: {
    id: string;
    name: string;
    slug: string;
    userId: string | null;
    accountStatus: string;
    lastPaymentDate: Date | null;
    createdAt: Date;
    cuit: string | null;
    condicionIva: string | null;
  };
  owner: OwnerInfo | null;
  planDefinition: PlanDefinitionInfo | null;
  recentPayments: PaymentInfo[];
  businessStats: StatsInfo;
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

const PAYMENT_METHODS = ["EFECTIVO", "TRANSFERENCIA", "MERCADOPAGO", "OTRO"] as const;

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.id as string;

  const [data, setData] = useState<ClientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment dialog state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("TRANSFERENCIA");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  // Plan dialog state
  const [planOpen, setPlanOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [planSubmitting, setPlanSubmitting] = useState(false);

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBusinessName, setEditBusinessName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editPlan, setEditPlan] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    businessName: string;
    products: number;
    orders: number;
    payments: number;
  } | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Available plans state (loaded from DB)
  const [availablePlans, setAvailablePlans] = useState<
    Array<{ id: string; name: string; price: number }>
  >([]);

  useEffect(() => {
    getPlans(true).then((result) => {
      if ("success" in result) {
        setAvailablePlans(
          (result.success as Array<{ id: string; name: string; price: number }>).map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
          }))
        );
      }
    });
  }, []);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    const result = await getClientDetail(businessId);

    if ("error" in result) {
      setError(result.error as string);
      setData(null);
    } else {
      setData(result.success as ClientDetailData);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDetail();
  }, [businessId]);

  const handleRegisterPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("El monto debe ser mayor a cero");
      return;
    }

    setPaymentSubmitting(true);
    const payload: RegisterPaymentInput = {
      amount,
      method: paymentMethod,
    };
    if (paymentReference) payload.reference = paymentReference;
    if (paymentNotes) payload.notes = paymentNotes;

    const result = await registerPayment(businessId, payload);

    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Pago registrado correctamente");
      setPaymentOpen(false);
      resetPaymentForm();
      fetchDetail();
    }
    setPaymentSubmitting(false);
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;

    setPlanSubmitting(true);
    const result = await changeClientPlan(businessId, selectedPlan);

    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success("Plan actualizado correctamente");
      setPlanOpen(false);
      fetchDetail();
    }
    setPlanSubmitting(false);
  };

  const resetPaymentForm = () => {
    setPaymentAmount("");
    setPaymentMethod("TRANSFERENCIA");
    setPaymentReference("");
    setPaymentNotes("");
  };

  // ── Slug helpers ──────────────────────────────────────────────
  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

  // Debounced auto-slug from business name
  useEffect(() => {
    if (!slugManuallyEdited && editBusinessName) {
      const timer = setTimeout(() => {
        setEditSlug(slugify(editBusinessName));
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [editBusinessName, slugManuallyEdited]);

  // ── Edit handlers ─────────────────────────────────────────────
  const handleOpenEdit = () => {
    setEditName(owner?.name || "");
    setEditBusinessName(business.name);
    setEditSlug(business.slug);
    setEditPlan(planDefinition?.name || "BASIC");
    setSlugManuallyEdited(false);
    setEditOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editName.trim()) {
      toast.error("El nombre del dueño es obligatorio");
      return;
    }

    setEditSubmitting(true);
    const result = await updateClient(businessId, { name: editName.trim() });

    if ("error" in result) {
      toast.error(result.error as string);
    } else {
      toast.success("Cliente actualizado correctamente");
      setEditOpen(false);
      fetchDetail();
    }
    setEditSubmitting(false);
  };

  // ── Delete handlers ───────────────────────────────────────────
  const handleOpenDelete = async () => {
    setDeleteLoading(true);
    setDeleteOpen(true);

    const result = await getClientDeleteInfo(businessId);

    if ("error" in result) {
      toast.error(result.error as string);
      setDeleteOpen(false);
    } else {
      setDeleteInfo(result.success as {
        businessName: string;
        products: number;
        orders: number;
        payments: number;
      });
    }
    setDeleteLoading(false);
  };

  const handleDeleteConfirm = async () => {
    setDeleteSubmitting(true);
    const result = await deleteClient(businessId);

    if ("error" in result) {
      toast.error(result.error as string);
      setDeleteSubmitting(false);
    } else {
      toast.success("Cliente eliminado correctamente");
      router.push("/superadmin/clients");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        <Button
          variant="ghost"
          onClick={() => router.push("/superadmin/clients")}
          className="mb-4 text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Clientes
        </Button>
        <Card className="border-none shadow-md bg-gradient-to-br from-red-50 to-red-100/50 text-red-700 dark:from-red-900/40 dark:via-red-800/20 dark:to-slate-900 dark:text-red-400">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3" />
            <p>{error || "Cliente no encontrado"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { business, owner, planDefinition, recentPayments, businessStats } = data;

  return (
    <div className="container mx-auto space-y-8 p-6 max-w-7xl animate-fade-in">
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 font-medium">
        <Link href="/superadmin/dashboard" className="hover:text-primary transition-colors">
          Superadmin
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <Link href="/superadmin/clients" className="hover:text-primary transition-colors">
          Clientes
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">{business.name}</span>
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
                Cliente
              </div>
              <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-gray-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-slate-300 dark:bg-clip-text dark:text-transparent">
                {business.name}
              </CardTitle>
              <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                Información detallada del cliente, historial de pagos y opciones de gestión.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <Button
                variant="outline"
                onClick={handleOpenEdit}
                className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300"
              >
                <Pencil className="mr-2 w-4 h-4" />
                Editar
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenDelete}
                className="bg-transparent border-red-200 hover:bg-red-50 hover:text-red-600 text-red-500 dark:border-red-900/50 dark:hover:bg-red-950/50 dark:hover:text-red-400"
              >
                <Trash2 className="mr-2 w-4 h-4" />
                Eliminar
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/superadmin/clients")}
                className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Volver
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Metadata */}
        <CardContent className="relative z-10 border-t border-gray-200 bg-gray-50/80 dark:border-slate-800 dark:bg-slate-950/40 p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700/50">
                <Building className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Slug</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 font-mono">{business.slug}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700/50">
                <Hash className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">CUIT</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">{business.cuit || "—"}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700/50">
                <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Dueño</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200 truncate max-w-[180px]">
                  {owner?.name || owner?.email || "Sin dueño"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white border border-gray-200 dark:bg-slate-800 dark:border-slate-700/50">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Creado</span>
                <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">
                  {new Date(business.createdAt).toLocaleDateString("es-AR", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado y acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status + Actions */}
        <div className="space-y-6">
          {/* Estado actual */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="text-lg font-bold">Estado</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400 text-sm">Estado de cuenta</span>
                <Badge
                  variant="outline"
                  className={`${statusBadgeClass(business.accountStatus)} text-sm px-3 py-1`}
                >
                  {business.accountStatus}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400 text-sm">Plan actual</span>
                <Badge
                  variant="outline"
                  className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-sm px-3 py-1"
                >
                  {planDefinition?.name || "Sin plan"}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400 text-sm">Último pago</span>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  {business.lastPaymentDate
                    ? new Date(business.lastPaymentDate).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-slate-400 text-sm">IVA</span>
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
                  {business.condicionIva || "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Acciones rápidas */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="text-lg font-bold">Acciones</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-6 space-y-3">
              <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Registrar Pago
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle>Registrar Pago</DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-slate-400">
                      Registrar un pago de suscripción para {business.name}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-gray-700 dark:text-slate-300">Monto *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="5000"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method" className="text-gray-700 dark:text-slate-300">Método de pago *</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method} value={method}>
                              {method}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reference" className="text-gray-700 dark:text-slate-300">Referencia</Label>
                      <Input
                        id="reference"
                        placeholder="REC-001"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-gray-700 dark:text-slate-300">Notas</Label>
                      <Textarea
                        id="notes"
                        placeholder="Observaciones..."
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white min-h-[80px]"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => { setPaymentOpen(false); resetPaymentForm(); }}
                      className="bg-transparent border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleRegisterPayment}
                      disabled={paymentSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {paymentSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Registrar Pago
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={planOpen} onOpenChange={setPlanOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Cambiar Plan
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cambiar Plan</DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-slate-400">
                      Cambiar el plan de suscripción para {business.name}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="py-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 dark:text-slate-300">Plan actual: <span className="text-purple-600 dark:text-purple-400 font-bold">{planDefinition?.name || "Sin plan"}</span></Label>
                      <Select value={selectedPlan || planDefinition?.name || ""} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white mt-2">
                          <SelectValue placeholder="Seleccionar plan" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                          {availablePlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.name}>
                              {plan.name} — ${plan.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setPlanOpen(false)}
                      className="bg-transparent border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleChangePlan}
                      disabled={planSubmitting || !selectedPlan}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {planSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Cambiar Plan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                asChild
                variant="outline"
                className="w-full bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300"
              >
                <Link href={`/superadmin/businesses/${business.id}/features`}>
                  <Building className="w-4 h-4 mr-2" />
                  Configurar Features
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300"
              >
                <Link href={`/superadmin/businesses/${business.id}/users`}>
                  <Users className="w-4 h-4 mr-2" />
                  Ver Usuarios
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Stats + Payment History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
              <CardTitle className="text-lg font-bold">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-white/50 border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/30">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Productos</p>
                  <p className="text-2xl font-bold">{businessStats.products}</p>
                </div>
                <div className="p-4 rounded-xl bg-white/50 border border-gray-200 dark:bg-slate-800/50 dark:border-slate-700/30">
                  <p className="text-xs text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-1">Órdenes</p>
                  <p className="text-2xl font-bold">{businessStats.orders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
            <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
            <CardHeader className="relative z-10 border-b border-gray-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  Historial de Pagos
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="relative z-10 p-0">
              {recentPayments.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-slate-500">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin pagos registrados</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-200 dark:border-slate-800 hover:bg-transparent">
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">Fecha</TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider">Monto</TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden sm:table-cell">Método</TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden md:table-cell">Referencia</TableHead>
                      <TableHead className="text-gray-500 dark:text-slate-400 text-xs uppercase tracking-wider hidden lg:table-cell">Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPayments.map((payment: PaymentInfo) => (
                      <TableRow key={payment.id} className="border-gray-200 dark:border-slate-800 hover:bg-gray-100/50 dark:hover:bg-slate-800/50">
                        <TableCell>
                          <span className="text-sm text-gray-700 dark:text-slate-200">
                            {new Date(payment.paidAt).toLocaleDateString("es-AR", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            ${payment.amount.toLocaleString("es-AR")}
                          </span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="bg-white text-gray-600 border-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-xs">
                            {payment.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-gray-400 dark:text-slate-400 font-mono">
                            {payment.reference || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-gray-400 dark:text-slate-400 truncate max-w-[150px] block">
                            {payment.notes || "—"}
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

      {/* ── Edit Client Dialog ──────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription className="text-gray-500 dark:text-slate-400">
              Actualizar datos del cliente {business.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-gray-700 dark:text-slate-300">
                Nombre del Dueño *
              </Label>
              <Input
                id="edit-name"
                placeholder="Nombre del dueño"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-business" className="text-gray-700 dark:text-slate-300">
                Nombre del Negocio
              </Label>
              <Input
                id="edit-business"
                placeholder="Nombre del negocio"
                value={editBusinessName}
                onChange={(e) => {
                  setEditBusinessName(e.target.value);
                  if (slugManuallyEdited) setSlugManuallyEdited(false);
                }}
                className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-slug" className="text-gray-700 dark:text-slate-300">
                Slug
              </Label>
              <div className="relative">
                <Input
                  id="edit-slug"
                  placeholder="mi-negocio"
                  value={editSlug}
                  onChange={(e) => {
                    setEditSlug(e.target.value);
                    setSlugManuallyEdited(true);
                  }}
                  className="bg-white border-gray-200 text-gray-900 font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white pr-8"
                />
                {!slugManuallyEdited && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-blue-500 dark:text-blue-400 font-medium">
                    auto
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                {slugManuallyEdited
                  ? "Editado manualmente. Cambia el nombre del negocio para regenerar."
                  : "Generado automáticamente desde el nombre del negocio."}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plan" className="text-gray-700 dark:text-slate-300">
                Plan
              </Label>
              <Select value={editPlan} onValueChange={setEditPlan}>
                <SelectTrigger className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-white">
                  {availablePlans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.name}>
                      {plan.name} — ${plan.price.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              className="bg-transparent border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={editSubmitting || !editName.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Client AlertDialog ───────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-white border-gray-200 text-gray-900 dark:bg-slate-900 dark:border-slate-800 dark:text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Eliminar Cliente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-500 dark:text-slate-400 pt-2">
              {deleteLoading ? (
                <div className="flex items-center gap-2 text-gray-400 dark:text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Obteniendo información...
                </div>
              ) : deleteInfo ? (
                <div className="space-y-3">
                  <p>
                    ¿Estás seguro de eliminar a <strong className="text-gray-700 dark:text-slate-200">{deleteInfo.businessName}</strong>?
                  </p>
                  <p className="text-sm">
                    Esta acción eliminará permanentemente el negocio y todos sus datos asociados.
                  </p>
                  <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Productos</span>
                      <span className="font-semibold text-gray-700 dark:text-slate-200">{deleteInfo.products}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Órdenes</span>
                      <span className="font-semibold text-gray-700 dark:text-slate-200">{deleteInfo.orders}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-slate-400">Pagos registrados</span>
                      <span className="font-semibold text-gray-700 dark:text-slate-200">{deleteInfo.payments}</span>
                    </div>
                  </div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    Esta operación no se puede deshacer.
                  </p>
                </div>
              ) : (
                <p>No se pudo obtener la información del cliente.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleteSubmitting}
              className="bg-transparent border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteSubmitting || deleteLoading || !deleteInfo}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
