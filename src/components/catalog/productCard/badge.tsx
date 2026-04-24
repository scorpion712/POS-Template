"use client";

// =============================================================================
// PRODUCT BADGE - Badge for product status (Nuevo, Sale, Agotado)
// =============================================================================

import { cn } from "@/lib/utils";

interface ProductBadgeProps {
  variant: "new" | "sale" | "out-of-stock";
  discountPercentage?: number;
  className?: string;
}

const BADGE_CONFIG = {
  new: {
    label: "NUEVO",
    className: "bg-blue-500 text-white shadow-blue-500/20",
  },
  sale: {
    label: "OFERTA",
    className: "bg-red-500 text-white shadow-red-500/20",
  },
  "out-of-stock": {
    label: "AGOTADO",
    className: "bg-gray-400 text-white grayscale",
  },
};

export function ProductBadge({
  variant,
  discountPercentage,
  className,
}: ProductBadgeProps) {
  const config = BADGE_CONFIG[variant];
  
  const label = variant === "sale" && discountPercentage
    ? `-${discountPercentage}%`
    : config.label;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm",
        config.className,
        className
      )}
    >
      {label}
    </span>
  );
}

export default ProductBadge;