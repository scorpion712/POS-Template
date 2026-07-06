import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

/**
 * EmptyState — componente reutilizable para tablas vacías.
 *
 * Uso:
 *   <EmptyState
 *     icon={Users}
 *     title="Sin clientes"
 *     description="No hay clientes registrados aún."
 *     action={<Button>Crear cliente</Button>}
 *   />
 *
 * Por qué existe:
 *   Consistencia visual en todos los estados vacíos del superadmin.
 *   Cada tabla usa el mismo componente → misma apariencia → misma experiencia.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-slate-800">
        <Icon className="h-8 w-8 text-gray-400 dark:text-slate-500" />
      </div>
      <p className="text-lg font-medium text-gray-900 dark:text-white">
        {title}
      </p>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 max-w-md">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
