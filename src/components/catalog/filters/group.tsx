"use client";

// =============================================================================
// FILTER GROUP - Checkbox list with counters for filter groups
// =============================================================================

import { useMemo, useCallback, useState } from "react";
import { ChevronDown } from "lucide-react";
import { FilterCheckbox } from "./checkbox";
import { cn } from "@/lib/utils";
import type { FilterValue } from "../types/catalog";

interface FilterGroupProps {
  id: string;
  label: string;
  values: FilterValue[];
  onToggle: (value: string) => void;
  defaultOpen?: boolean;
  maxVisible?: number;
}

export function FilterGroup({
  id,
  label,
  values,
  onToggle,
  defaultOpen = true,
  maxVisible = 4,
}: FilterGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const visibleValues = useMemo(
    () => (isOpen ? values : values.slice(0, maxVisible)),
    [values, maxVisible, isOpen]
  );
  const hasMore = values.length > maxVisible;

  const handleToggle = useCallback(
    (value: string) => {
      onToggle(value);
    },
    [onToggle]
  );

  const handleToggleSection = () => {
    setIsOpen(!isOpen);
  };

  if (values.length === 0) {
    return null;
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button
        onClick={handleToggleSection}
        className={cn(
          "flex w-full items-center justify-between py-4 text-sm font-semibold",
          "text-gray-900 dark:text-gray-100",
          "hover:text-primary transition-colors"
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      
      <div
        className={cn(
          "space-y-1 pb-4",
          !isOpen && "hidden"
        )}
      >
        {visibleValues.map((item) => (
          <FilterCheckbox
            key={item.value}
            id={`${id}-${item.value}`}
            label={item.label}
            checked={item.checked}
            count={item.count}
            onChange={() => handleToggle(item.value)}
          />
        ))}
        
        {!isOpen && hasMore && (
          <button
            onClick={handleToggleSection}
            className="text-sm text-primary hover:text-primary/80 py-2"
          >
            +{values.length - maxVisible} más
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterGroup;