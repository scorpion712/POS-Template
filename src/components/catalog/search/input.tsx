"use client";

// =============================================================================
// SEARCH INPUT - Modern debounced search input for catalog
// =============================================================================

import { useState, useCallback, useEffect } from "react";
import { Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar productos...",
  debounceMs = 300,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue("");
    onChange("");
  }, [onChange]);

  const isFocused = false; // Could add state for focus

  return (
    <div className="relative w-full">
      <Search 
        className={cn(
          "absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
          localValue ? "text-primary" : "text-muted-foreground"
        )} 
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className={cn(
          "pl-10 pr-10 h-10 sm:h-11 rounded-lg",
          "bg-white dark:bg-gray-800",
          "border border-gray-200 dark:border-gray-700",
          "text-sm sm:text-base",
          "placeholder:text-muted-foreground",
          "focus:ring-2 focus:ring-primary focus:border-primary",
          "transition-all duration-200"
        )}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2",
            "h-7 w-7 flex items-center justify-center rounded-md",
            "text-muted-foreground hover:text-foreground",
            "hover:bg-gray-100 dark:hover:bg-gray-700",
            "transition-colors"
          )}
          aria-label="Limpiar búsqueda"
        >
          <SearchX className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;