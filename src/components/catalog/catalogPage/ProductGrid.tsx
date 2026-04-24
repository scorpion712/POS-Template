"use client";

// =============================================================================
// PRODUCT GRID - Product grid with infinite scroll
// =============================================================================

import { SearchX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "../ProductCard/index";
import type { PublicProduct } from "../types/catalog";

const ITEMS_PER_PAGE = 20;

interface ProductGridProps {
  products: PublicProduct[];
  onAddToCart: (product: PublicProduct, quantity: number) => void;
  onViewDetails: (product: PublicProduct) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

interface ProductGridContentProps extends ProductGridProps {
  displayedProducts: PublicProduct[];
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}

function ProductGridContent({
  displayedProducts,
  isLoadingMore,
  hasMore,
  loadMoreRef,
  onAddToCart,
  onViewDetails,
  onClearFilters,
  hasActiveFilters,
}: ProductGridContentProps) {
  if (displayedProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center px-4">
        <SearchX className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground mb-4 opacity-30" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">
          No se encontraron productos
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Intenta ajustar tu búsqueda o filtros
        </p>
        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="mt-4">
            Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Grid: 1 col xs, 2 col sm, 4 col lg+ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-3">
        {displayedProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={onAddToCart}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={loadMoreRef}
          className="flex items-center justify-center py-6"
        >
          {isLoadingMore ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Cargando más...</span>
            </div>
          ) : (
            <div className="h-10" />
          )}
        </div>
      )}

      {/* Result count footer */}
      {!hasMore && displayedProducts.length > 0 && (
        <div className="text-center py-4">
          <span className="text-sm text-muted-foreground">
            Mostrando todos los productos ({displayedProducts.length})
          </span>
        </div>
      )}
    </>
  );
}

// Export as named export
export { ProductGridContent };

// Default export for easy importing
export default ProductGridContent;