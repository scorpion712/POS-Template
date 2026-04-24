"use client";

// =============================================================================
// SORT DROPDOWN - Modern styled sort dropdown
// =============================================================================

import { useCallback } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, SortAsc } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortOption, SORT_OPTIONS } from "../types/catalog";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const handleValueChange = useCallback(
    (newValue: string) => {
      onChange(newValue as SortOption);
    },
    [onChange]
  );

  const getSortIcon = () => {
    switch (value) {
      case "price-asc":
        return <ArrowUp className="h-3.5 w-3.5" />;
      case "price-desc":
        return <ArrowDown className="h-3.5 w-3.5" />;
      default:
        return <SortAsc className="h-3.5 w-3.5" />;
    }
  };

  const currentLabel = SORT_OPTIONS.find(o => o.value === value)?.label || "Ordenar";

  return (
    <Select value={value} onValueChange={handleValueChange}>
      <SelectTrigger 
        className={[
          "w-full md:w-[160px] h-10 sm:h-11",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "rounded-lg",
          "text-sm",
          "focus:ring-2 focus:ring-primary focus:border-primary",
          "transition-all duration-200",
          "gap-2"
        ].join(" ")}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <SortAsc className="h-3.5 w-3.5" />
          <SelectValue placeholder="Ordenar">
            <span className="text-foreground">{currentLabel}</span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="rounded-lg">
        {SORT_OPTIONS.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="rounded-md text-sm"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SortDropdown;