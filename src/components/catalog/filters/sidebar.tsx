"use client";

// =============================================================================
// FILTER SIDEBAR - Desktop filter sidebar (240px sticky)
// =============================================================================

import { useMemo, useCallback } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterGroup } from "./group";
import { cn } from "@/lib/utils";
import type { FilterGroup as FilterGroupType, FilterState } from "../types/catalog";

interface FilterSidebarProps {
  groups: FilterGroupType[];
  filterState: FilterState;
  onToggleFilter: (groupId: string, value: string) => void;
  onClearAll: () => void;
  resultCount: number;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

export function FilterSidebar({
  groups,
  filterState,
  onToggleFilter,
  onClearAll,
  resultCount,
  isOpen = true,
  onClose,
  className,
}: FilterSidebarProps) {
  const handleToggle = useCallback(
    (groupId: string, value: string) => {
      onToggleFilter(groupId, value);
    },
    [onToggleFilter]
  );

  const activeFilters = useMemo(() => {
    let count = 0;
    if (filterState.search) count++;
    if (filterState.category.length > 0) count++;
    if (filterState.brand.length > 0) count++;
    if (filterState["price-min"] !== null || filterState["price-max"] !== null) count++;
    return count;
  }, [filterState]);

  return (
    <aside
      className={cn(
        "w-60 shrink-0 h-full",
        "bg-white dark:bg-gray-900",
        "border-r border-gray-100 dark:border-gray-800",
        "overflow-y-auto",
        !isOpen && "hidden lg:block",
        className
      )}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            <h2 className="font-bold text-gray-900 dark:text-gray-100">
              Filtros
            </h2>
            {activeFilters > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilters}
              </span>
            )}
          </div>
          
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Filter Groups */}
      <div className="p-4">
        {groups.map((group) => (
          <FilterGroup
            key={group.id}
            id={group.id}
            label={group.label}
            values={group.values}
            onToggle={(value) => handleToggle(group.id, value)}
          />
        ))}
      </div>
      
      {/* Footer with results count */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            <span className="font-bold text-primary">{resultCount}</span>{" "}
            resultado{resultCount !== 1 ? "s" : ""}
          </span>
          
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Limpiar todo
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}

export default FilterSidebar;