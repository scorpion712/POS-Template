"use client";

// =============================================================================
// FILTER DRAWER - Mobile full-screen filter bottom sheet (Simplified mobile UX)
// =============================================================================

import { useEffect, useCallback } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterGroup } from "./group";
import { cn } from "@/lib/utils";
import type { FilterGroup as FilterGroupType } from "../types/catalog";

interface FilterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  groups: FilterGroupType[];
  onToggleFilter: (groupId: string, value: string) => void;
  onClearAll: () => void;
  resultCount: number;
  className?: string;
}

export function FilterDrawer({
  isOpen,
  onClose,
  groups,
  onToggleFilter,
  onClearAll,
  resultCount,
  className,
}: FilterDrawerProps) {
  const handleToggle = useCallback(
    (groupId: string, value: string) => {
      onToggleFilter(groupId, value);
    },
    [onToggleFilter]
  );

  const handleApply = () => {
    onClose();
  };

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Active filters for display
  const activeFiltersCount = groups.reduce((acc, group) => {
    return acc + group.values.filter((v) => v.checked).length;
  }, 0);

  return (
    <>
      {/* Backdrop - Full screen overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer - Bottom sheet for mobile */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50",
          "bg-white dark:bg-gray-900",
          "rounded-t-2xl",
          "max-h-[90vh] flex flex-col",
          "shadow-2xl",
          "transform transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        {/* Header - Fixed */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100">
              Filtros
            </h2>
            {activeFiltersCount > 0 && (
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleApply}
            className="lg:hidden"
            aria-label="Aplicar filtros"
          >
            <Check className="h-5 w-5 text-green-500" />
          </Button>
        </div>

        {/* Filter Groups - Scrollable with better mobile UX */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {groups.map((group) => (
            <FilterGroup
              key={group.id}
              id={group.id}
              label={group.label}
              values={group.values}
              onToggle={(value) => handleToggle(group.id, value)}
              defaultOpen={true}
              maxVisible={4}
            />
          ))}
        </div>

        {/* Footer - Fixed sticky action bar for mobile */}
        <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 pb-safe">
          {/* Result count */}
          <div className="text-center mb-3">
            <span className="text-sm text-muted-foreground">
              <span className="font-bold text-primary text-base">{resultCount}</span>{" "}
              producto{resultCount !== 1 ? "s" : ""} encontrado{resultCount !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClearAll}
              className="flex-1 h-12"
              disabled={resultCount === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Limpiar todo</span>
              <span className="sm:hidden">Limpiar</span>
            </Button>
            <Button onClick={handleApply} className="flex-1 h-12">
              <Check className="h-4 w-4 mr-2" />
              <span>Ver {resultCount}</span>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default FilterDrawer;