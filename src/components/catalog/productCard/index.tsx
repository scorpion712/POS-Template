"use client";

// =============================================================================
// PRODUCT CARD - Modern, mobile-first product card
// =============================================================================

import { useState, useCallback, memo } from "react";
import { Info, ShoppingCart, Check, Bell, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProductImage } from "./image";
import { ProductBadge } from "./badge";
import { ProductPrice } from "./price";
import { ProductInfo } from "./info";
import { cn } from "@/lib/utils";
import type { PublicProduct } from "../types/catalog";

interface ProductCardProps {
  product: PublicProduct;
  onAddToCart: (product: PublicProduct, quantity: number) => void;
  onViewDetails?: (product: PublicProduct) => void;
  className?: string;
}

// Extended product type with additional fields for display
interface ExtendedProduct extends PublicProduct {
  colors?: string[];
  sizes?: string[];
  originalPrice?: number;
  isNew?: boolean;
  isOnSale?: boolean;
  hasPromo?: boolean;
  discountPercentage?: number;
}

function ProductCardComponent({
  product,
  onAddToCart,
  onViewDetails,
  className,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(0);
  const [isAdded, setIsAdded] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  // Extended product for display (with hardcoded promo for demo)
  const extProduct = product as ExtendedProduct;
  const hasDiscount = extProduct.originalPrice && extProduct.originalPrice > product.salePrice;
  const isOutOfStock = product.amount === 0;
  
  // Sizes for clothing products
  const sizes = extProduct.sizes ?? ["S", "M", "L", "XL"];
  
  // Max quantity available
  const maxQty = product.amount || 99;
  
  // Low stock warning threshold
  const lowStockThreshold = 5;
  const isLowStock = !isOutOfStock && product.amount <= lowStockThreshold;

  // Handle add to cart
  const handleAddToCart = useCallback(() => {
    if (quantity > 0 && !isOutOfStock) {
      onAddToCart(product, quantity);
      setIsAdded(true);
      setTimeout(() => {
        setIsAdded(false);
        setQuantity(0);
      }, 3000);
    }
  }, [quantity, product, onAddToCart, isOutOfStock]);

  // Handle quantity change
  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => {
      const currentMax = product.amount || 99;
      const newValue = prev + delta;
      if (newValue < 0) return 0;
      if (newValue > currentMax) return currentMax;
      return newValue;
    });
  }, [product.amount]);

  // Handle notify me
  const handleNotifyMe = useCallback(() => {
    setShowNotification(true);
  }, []);

  // Handle quick view
  const handleQuickView = useCallback(() => {
    if (onViewDetails) {
      onViewDetails(product);
    }
  }, [product, onViewDetails]);

  // Determine which badge/chip to show
  const showNewBadge = extProduct.isNew && !hasDiscount && !extProduct.hasPromo;
  const showSaleBadge = hasDiscount;

  return (
    <Card
      className={cn(
        "group flex flex-col overflow-hidden",
        "bg-white dark:bg-gray-800/50",
        "border-gray-100 dark:border-gray-700",
        "hover:shadow-xl transition-all duration-300",
        "rounded-2xl",
        "h-full",
        isOutOfStock && "opacity-60",
        className
      )}
    >
      {/* Image Section */}
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-900/50">
        {/* Product Image */}
        <div
          className="cursor-pointer h-full w-full group/image"
          onClick={handleQuickView}
        >
          <ProductImage
            src={product.image}
            alt={product.description ?? "Producto"}
            hoverZoom={true}
          />
        </div>

        {/* Quick View Overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/0 group-hover/image:bg-black/10",
            "transition-colors duration-300 flex items-center justify-center",
            "opacity-0 group-hover/image:opacity-100"
          )}
        >
          <button
            onClick={handleQuickView}
            className={cn(
              "bg-white/90 dark:bg-black/90 p-3 rounded-full",
              "shadow-lg transform translate-y-4 group-hover/image:translate-y-0",
              "transition-transform duration-300 text-primary",
              "hover:bg-white dark:hover:bg-gray-800"
            )}
          >
            <Info className="w-5 h-5" />
          </button>
        </div>

        {/* Badges - Top Left (Chip style) */}
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[70%]">
          {showNewBadge && <ProductBadge variant="new" />}
          {showSaleBadge && (
            <ProductBadge
              variant="sale"
              discountPercentage={extProduct.discountPercentage}
            />
          )}
          {extProduct.hasPromo && !hasDiscount && (
            <ProductBadge variant="new" />
          )}
          {isOutOfStock && <ProductBadge variant="out-of-stock" />}
        </div>
      </div>

      {/* Content Section - Compact */}
      <CardHeader className="p-2 pb-0">
        <ProductInfo product={product} showCode={false} />
        
        {/* Sizes - Below title for clothing */}
        {!isOutOfStock && sizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {sizes.slice(0, 5).map((size) => (
              <span 
                key={size}
                className="px-1.5 py-0.5 text-[9px] font-medium bg-gray-100 dark:bg-gray-800 rounded"
              >
                {size}
              </span>
            ))}
          </div>
        )}
        
        <ProductPrice
          price={product.salePrice}
          originalPrice={extProduct.originalPrice}
          showInstallments={true}
        />
      </CardHeader>

      {/* Actions Section - Compact */}
      <CardContent className="p-2 pt-1 mt-auto">
        {isOutOfStock ? (
          <div className="flex flex-col gap-2">
            {/* Notify button - Match same theme */}
            <button
              onClick={handleNotifyMe}
              className={cn(
                "w-full rounded-lg h-8 font-bold text-[11px] px-3",
                "flex items-center justify-center gap-1",
                "bg-gray-200 dark:bg-gray-700 text-gray-500",
                "hover:bg-gray-300 dark:hover:bg-gray-600",
                "transition-colors"
              )}
              disabled={showNotification}
            >
              <Bell className="w-3 h-3" />
              <span>{showNotification ? "Te notificaremos" : "Avisarme"}</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Single line: Quantity selector + Add button */}
            <div className="flex items-center gap-1">
              {/* Quantity Selector - Smaller */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded px-0.5">
                <button
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity === 0}
                  className={cn(
                    "h-7 w-7 rounded flex items-center justify-center",
                    "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600",
                    "hover:bg-gray-50 dark:hover:bg-gray-600",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "transition-colors text-base font-semibold"
                  )}
                  aria-label="Disminuir"
                >
                  −
                </button>
                
                <span className={cn(
                  "text-sm font-black min-w-[20px] text-center px-0.5",
                  quantity === 0 ? "text-gray-300" : "text-primary"
                )}>
                  {quantity}
                </span>
                
                <button
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= maxQty}
                  className={cn(
                    "h-7 w-7 rounded flex items-center justify-center",
                    "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600",
                    "hover:bg-gray-50 dark:hover:bg-gray-600",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "transition-colors text-base font-semibold"
                  )}
                  aria-label="Aumentar"
                >
                  +
                </button>
              </div>

              {/* Low stock hint */}
              {quantity > 0 && isLowStock && (
                <span className="text-[8px] text-orange-500 font-medium shrink-0">
                  {product.amount} left
                </span>
              )}

              {/* Add to Cart Button - Compact */}
              <button
                onClick={handleAddToCart}
                disabled={quantity === 0 || isAdded}
                className={cn(
                  "flex-1 rounded-lg h-7 font-bold text-[10px] px-2",
                  "transition-all duration-200 flex items-center justify-center gap-1",
                  isAdded
                    ? "bg-primary/85 text-white cursor-default"
                    : quantity === 0
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-primary hover:bg-primary/90 active:scale-[0.98] text-white"
                )}
              >
                {isAdded ? (
                  <>
                    <Check className="w-2.5 h-2.5" />
                    <span>Listo</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-2.5 h-2.5" />
                    <span>Agregar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Memoize for performance
export const ProductCard = memo(ProductCardComponent);

export default ProductCard;