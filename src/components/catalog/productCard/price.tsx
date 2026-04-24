"use client";

// =============================================================================
// PRODUCT PRICE - Price display with optional sale price
// =============================================================================

import { cn } from "@/lib/utils";

interface ProductPriceProps {
  price: number;
  originalPrice?: number;
  showInstallments?: boolean;
  className?: string;
}

export function ProductPrice({
  price,
  originalPrice,
  showInstallments = true,
  className,
}: ProductPriceProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const discountPercentage = hasDiscount
    ? Math.round(((originalPrice! - price) / originalPrice!) * 100)
    : 0;

  // Calculate installments (assuming 3 payments without interest)
  const installmentPrice = showInstallments ? price / 3 : null;
  const show3x = showInstallments && price >= 3;

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-baseline gap-1">
        {hasDiscount && (
          <span className="text-sm text-muted-foreground line-through">
            ${originalPrice?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
        <span className="text-2xl font-black text-primary">
          ${price.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      
      {hasDiscount && (
        <span className="text-xs font-bold text-red-500">
          -{discountPercentage}% OFF
        </span>
      )}
      
      {show3x && (
        <span className="text-xs text-muted-foreground">
          3x ${installmentPrice?.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sin interés
        </span>
      )}
    </div>
  );
}

export default ProductPrice;