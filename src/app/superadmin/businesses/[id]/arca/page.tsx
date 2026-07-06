import { getBusinessArcaData } from "@/actions/arca";
import { ArcaForm } from "@/components/Superadmin/arca-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";

import { ArcaFieldsSchema } from "@/schemas";
import { ArcaData } from "@/models/Arca";
import * as z from "zod";

interface ArcaPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ArcaPage({ params }: ArcaPageProps) {
  const { id } = await params;
  const data: { success?: ArcaData; error?: string } =
    await getBusinessArcaData(id);

  if (data.error || !data.success) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <p className="text-destructive font-semibold">
          {data.error || "Datos no encontrados"}
        </p>
        <Button asChild variant="outline">
          <Link href="/superadmin/businesses">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Volver a Negocios
          </Link>
        </Button>
      </div>
    );
  }

  const business = data.success;

  // Ensure data matches the schema type for the form
  const initialData: z.infer<typeof ArcaFieldsSchema> = {
    cuit: business.cuit || "",
    razonSocial: business.razonSocial || "",
    inicioActividades: business.inicioActividades
      ? new Date(business.inicioActividades)
      : new Date(),
    condicionIva: business.condicionIva as
      | "MONOTRIBUTO"
      | "RESPONSABLE_INSCRIPTO",
    cert: "",
    key: "",
    ptoVenta: business.ptoVenta || [],
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
        <Link
          href="/superadmin"
          className="hover:text-primary transition-colors duration-200"
        >
          Dashboard
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <Link
          href="/superadmin/businesses"
          className="hover:text-primary transition-colors duration-200"
        >
          Negocios
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-primary font-semibold">ARCA</span>
      </nav>

      {/* Header Card */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-72 h-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute left-1/3 bottom-0 -mb-16 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl" />

        <CardHeader className="relative z-10 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                ARCA / AFIP
              </div>
              <CardTitle className="text-3xl md:text-4xl font-extrabold tracking-tight mt-2 text-gray-900 dark:bg-gradient-to-r dark:from-white dark:via-slate-100 dark:to-slate-300 dark:bg-clip-text dark:text-transparent">
                Gestión de ARCA
              </CardTitle>
              <p className="text-gray-500 dark:text-slate-400 text-base max-w-2xl">
                Configuración de facturación electrónica AFIP. Gestioná CUIT,
                puntos de venta y certificados.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start md:self-center">
              <Button
                asChild
                variant="outline"
                className="bg-transparent border-gray-200 hover:bg-gray-100 hover:text-gray-900 text-gray-600 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white dark:text-slate-300 transition-all duration-200"
              >
                <Link href="/superadmin/businesses">
                  <ChevronLeft className="w-4 h-4" />
                  Volver a Negocios
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <ArcaForm businessId={id} initialData={initialData} />
    </div>
  );
}
