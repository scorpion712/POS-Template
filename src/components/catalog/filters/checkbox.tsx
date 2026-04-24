"use client";

// =============================================================================
// FILTER CHECKBOX - Single checkbox for filter groups
// =============================================================================

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  count?: number;
  onChange: () => void;
  disabled?: boolean;
}

export function FilterCheckbox({
  id,
  label,
  checked,
  count,
  onChange,
  disabled = false,
}: FilterCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-center gap-3 py-2.5 min-h-[48px]",
        "cursor-pointer",
        "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        "-mx-2 px-2 rounded-lg transition-colors",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn(
          "h-5 w-5 shrink-0 rounded-md border-2 border-gray-300 dark:border-gray-600",
          "flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors",
          checked && "bg-primary border-primary"
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="h-3 w-3 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      
      <span
        className={cn(
          "flex-1 text-sm truncate",
          "text-gray-700 dark:text-gray-300",
          checked && "font-medium"
        )}
      >
        {label}
      </span>
      
      {count !== undefined && (
        <span className="text-xs text-muted-foreground shrink-0 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </label>
  );
}

export default FilterCheckbox;