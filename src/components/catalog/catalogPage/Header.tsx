"use client";

// =============================================================================
// CATALOG HEADER - Search, sort, filters button, active filters
// =============================================================================

import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button"; 
import type { FilterState, FilterGroup, SortOption } from "../types/catalog";
import SearchInput from "../search/input";
import SortDropdown from "../search/sort-dropdown";
import { ActiveFiltersBar } from "../filters";

interface CatalogHeaderProps {
  filterState: FilterState;
  filterGroups: FilterGroup[];
  activeFilterCount: number;
  businessLogo?: string;
  businessName?: string;
  onSearchChange: (value: string) => void;
  onSortChange: (sort: SortOption) => void;
  onFilterRemove: (groupId: string, id: string) => void;
  onClearAll: () => void;
  onOpenFilters: () => void;
}

export function CatalogHeader({
  filterState,
  activeFilterCount,
  onSearchChange,
  onSortChange,
  onFilterRemove,
  onClearAll,
  onOpenFilters,
}: CatalogHeaderProps) {
  const handleRemoveFilter = (id: string) => {
    if (id === "search") {
      onSearchChange("");
    } else {
      onFilterRemove('', id);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
      <div className="p-3 sm:p-4 space-y-3">
        {/* Search and Sort Row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1">
            <SearchInput
              value={filterState.search}
              onChange={onSearchChange}
              placeholder="Buscar productos..."
            />
          </div>
          
          <SortDropdown
            value={filterState.sort}
            onChange={onSortChange}
          />

          {/* Mobile Filter Button */}
          <Button
            variant="outline"
            className="lg:hidden flex items-center justify-center gap-2"
            onClick={onOpenFilters}
          >
            <Filter className="h-4 w-4" />
            <span className="sm:hidden">Filtros</span>
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Active Filters */}
        {activeFilterCount > 0 && (
          <ActiveFiltersBar
            filterState={filterState}
            onRemove={handleRemoveFilter}
            onClearAll={onClearAll}
          />
        )}
      </div>
    </header>
  );
}