"use client";

// =============================================================================
// ACTIVE FILTERS BAR - Chips with clear all button
// =============================================================================

import { useMemo, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "./chip";
import { cn } from "@/lib/utils";
import type { FilterState } from "../types/catalog";

interface ActiveFiltersBarProps {
  filterState: FilterState;
  onRemove: (groupId: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFiltersBar({
  filterState,
  onRemove,
  onClearAll,
  className,
}: ActiveFiltersBarProps) {
  // Build chips from active filters
  const chips = useMemo(() => {
    const result: Array<{ id: string; label: string }> = [];

    if (filterState.search) {
      result.push({
        id: "search",
        label: `Búsqueda: "${filterState.search}"`,
      });
    }

    if (filterState.category.length > 0) {
      result.push({
        id: "category",
        label: `Categoría: ${filterState.category.join(", ")}`,
      });
    }

    if (filterState.brand.length > 0) {
      result.push({
        id: "brand",
        label: `Marca: ${filterState.brand.join(", ")}`,
      });
    }

    if (filterState["price-min"] !== null || filterState["price-max"] !== null) {
      const min = filterState["price-min"] ?? 0;
      const max = filterState["price-max"] ?? "∞";
      result.push({
        id: "price",
        label: `Precio: $${min} - $${max}`,
      });
    }

    return result;
  }, [filterState]);

  const handleRemove = useCallback(
    (id: string) => {
      onRemove(id);
    },
    [onRemove]
  );

  if (chips.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 p-3",
        "bg-white dark:bg-gray-900",
        "border-b border-gray-100 dark:border-gray-800",
        className
      )}
    >
      <span className="text-sm text-muted-foreground mr-2">
        Filtros activos:
      </span>
      
      {chips.map((chip) => (
        <FilterChip
          key={chip.id}
          id={chip.id}
          label={chip.label}
          onRemove={handleRemove}
        />
      ))}
      
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="ml-auto text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4 mr-1" />
        Limpiar todo
      </Button>
    </div>
  );
}

export default ActiveFiltersBar;