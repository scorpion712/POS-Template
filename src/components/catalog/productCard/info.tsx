"use client";

// =============================================================================
// PRODUCT INFO - Product name, brand, code info
// =============================================================================

import { cn } from "@/lib/utils";
import type { PublicProduct } from "../types/catalog";

interface ProductInfoProps {
  product: PublicProduct;
  className?: string;
  showCode?: boolean;
  maxLines?: number;
}

export function ProductInfo({
  product,
  className,
  showCode = false,
  maxLines = 2,
}: ProductInfoProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Product name */}
      <h3
        className={cn(
          "font-semibold text-gray-900 dark:text-gray-100",
          "line-clamp-" + maxLines,
          "hover:text-primary transition-colors cursor-pointer"
        )}
        title={product.description ?? undefined}
      >
        {product.description ?? "Sin descripción"}
      </h3>
      
      {/* Brand */}
      {product.brand && (
        <span className="text-xs text-muted-foreground uppercase tracking-wider">
          {product.brand}
        </span>
      )}
      
      {/* Code */}
      {showCode && product.code && (
        <span className="text-xs text-muted-foreground">
          <span className="opacity-60 mr-1">#</span>
          {product.code}
        </span>
      )}
    </div>
  );
}

export default ProductInfo;