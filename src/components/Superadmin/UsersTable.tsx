import { cn } from "@/lib/utils";
import { User, Users } from "lucide-react";

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  emailVerified: Date | null;
  cashbox: { name: string } | null;
}

interface UsersTableProps {
  users: UserData[];
}

const roleStyles: Record<string, string> = {
  ADMIN:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  USER: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export function UsersTable({ users }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-4 dark:bg-slate-800">
          <Users className="h-8 w-8 text-gray-400 dark:text-slate-500" />
        </div>
        <p className="text-lg font-medium text-gray-900 dark:text-white">
          Este negocio no tiene usuarios registrados
        </p>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Los empleados aparecerán aquí cuando el administrador del negocio los
          agregue.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-800">
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Usuario
            </th>
            <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
              Rol
            </th>
            <th className="hidden px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 md:table-cell">
              Caja Asignada
            </th>
            <th className="hidden px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400 lg:table-cell">
              Registro
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
          {users.map((user) => (
            <tr
              key={user.id}
              className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                    <User className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.name || "Sin nombre"}
                    </p>
                    {user.email && (
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    roleStyles[user.role] ||
                      "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300",
                  )}
                >
                  {user.role}
                </span>
              </td>
              <td className="hidden px-6 py-4 text-sm text-gray-700 dark:text-slate-300 md:table-cell">
                {user.cashbox?.name || (
                  <span className="text-gray-400 dark:text-slate-500">
                    Sin caja
                  </span>
                )}
              </td>
              <td className="hidden px-6 py-4 text-sm text-gray-700 dark:text-slate-300 lg:table-cell">
                {user.emailVerified
                  ? user.emailVerified.toLocaleDateString("es-AR", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
