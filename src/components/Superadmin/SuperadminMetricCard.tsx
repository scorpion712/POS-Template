import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface SuperadminMetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
}

export const SuperadminMetricCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
}: SuperadminMetricCardProps) => {
  return (
    <Card className="border-none shadow-md bg-gradient-to-br from-white via-gray-50 to-gray-100 text-gray-900 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02] bg-[size:20px_20px]" />
      <div className="absolute right-0 top-0 -mt-8 -mr-8 w-32 h-32 rounded-full bg-blue-500/10 blur-3xl" />

      <CardContent className="relative z-10 p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              {title}
            </p>
            <p className="text-3xl font-extrabold tracking-tight">
              {value}
            </p>
            {description && (
              <p className="text-xs text-gray-400 dark:text-slate-500">{description}</p>
            )}
            {trend && (
              <p
                className={`text-xs font-semibold ${
                  trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                }`}
              >
                {trend.positive ? "↑" : "↓"} {trend.value}
              </p>
            )}
          </div>
          <div className="p-3 rounded-xl bg-white border border-gray-200 text-gray-400 dark:bg-slate-800 dark:border-slate-700/50 dark:text-slate-300 shrink-0">
            <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
