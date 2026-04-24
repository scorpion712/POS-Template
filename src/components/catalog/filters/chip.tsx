"use client";

// =============================================================================
// FILTER CHIP - Removable chip for active filters
// =============================================================================

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilterChipProps {
  id: string;
  label: string;
  onRemove: (id: string) => void;
  variant?: "default" | "outline";
}

export function FilterChip({
  id,
  label,
  onRemove,
  variant = "default",
}: FilterChipProps) {
  const handleRemove = () => {
    onRemove(id);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
        "text-sm font-medium transition-all",
        variant === "default"
          ? "bg-primary/10 text-primary"
          : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
        "hover:bg-primary/20 transition-colors"
      )}
    >
      <span className="truncate max-w-[150px]">{label}</span>
      
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 rounded-full p-0 hover:bg-primary/20"
        onClick={handleRemove}
        aria-label={`Remover filtro: ${label}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default FilterChip;