"use client";

// =============================================================================
// COLOR SWATCH - Color circle for product variants
// =============================================================================

import { cn } from "@/lib/utils";

interface ColorSwatchProps {
  color: string;
  label: string;
  hex: string;
  checked?: boolean;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-4 w-4",
  md: "h-6 w-6", 
  lg: "h-8 w-8",
};

export function ColorSwatch({
  color,
  label,
  hex,
  checked = false,
  onClick,
  size = "md",
  className,
}: ColorSwatchProps) {
  const sizeClass = SIZES[size];
  
  // Determine border for light colors
  const isLight = ["blanco", "beige", "amarillo"].includes(color.toLowerCase());
  const borderClass = isLight ? "border-gray-300" : "border-transparent";
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative rounded-full flex items-center justify-center",
        sizeClass,
        borderClass,
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        "transition-all duration-200",
        checked && "ring-2 ring-primary ring-offset-2",
        !onClick && "cursor-default",
        className
      )}
      style={{ backgroundColor: hex }}
      title={label}
      aria-label={`Color: ${label}`}
      aria-pressed={checked}
    >
      {checked && (
        <svg
          className={cn(
            "absolute",
            size === "sm" && "w-2 h-2",
            size === "md" && "w-3 h-3", 
            size === "lg" && "w-4 h-4"
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke={isLight ? "#000" : "#fff"}
          strokeWidth="3"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  );
}

export default ColorSwatch;