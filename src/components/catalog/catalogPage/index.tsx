"use client";

// =============================================================================
// CATALOG PAGE - Main catalog page component (refactored)
// =============================================================================

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image"; 
import { FilterSidebar } from "../filters/sidebar";
import { FilterDrawer } from "../filters/drawer";
import { CatalogProvider, useCatalog } from "../context/catalog-context";
import { useCart } from "../context/CartProvider";
import Product from "@/models/Product";
import type { PublicProduct, CatalogBusiness } from "../types/catalog";
import { CatalogHeader } from "./Header";
import ProductGridContent from "./ProductGrid";

const ITEMS_PER_PAGE = 20;

// Internal content component
function CatalogContent({ business }: { business: CatalogBusiness | null }) {
  const {
    filteredProducts,
    filterState,
    filterGroups,
    activeFilterCount,
    setSearch,
    toggleFilter,
    clearFilters,
    setSort,
  } = useCatalog();

  const { addItem } = useCart();
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [displayedProducts, setDisplayedProducts] = useState<PublicProduct[]>([]);
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset products when filters change
  useEffect(() => {
    setDisplayedProducts(filteredProducts.slice(0, ITEMS_PER_PAGE));
    setPage(1);
  }, [filteredProducts.length, filterState.search, filterState.category, filterState.brand, filterState["price-min"], filterState["price-max"], filterState.sort]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMore && displayedProducts.length < filteredProducts.length) {
          setIsLoadingMore(true);
          setTimeout(() => {
            const nextPage = page + 1;
            const start = (nextPage - 1) * ITEMS_PER_PAGE;
            const end = start + ITEMS_PER_PAGE;
            const newProducts = filteredProducts.slice(start, end);
            if (newProducts.length > 0) {
              setDisplayedProducts((prev) => [...prev, ...newProducts]);
              setPage(nextPage);
            }
            setIsLoadingMore(false);
          }, 300);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [isLoadingMore, displayedProducts.length, filteredProducts.length, page]);

  // Handlers
  const handleAddToCart = useCallback((product: PublicProduct, quantity: number) => {
    const productToAdd = new Product();
    productToAdd.id = product.id;
    productToAdd.code = product.code || "";
    productToAdd.description = product.description || "";
    productToAdd.brand = product.brand || "";
    productToAdd.category = product.category || "";
    productToAdd.salePrice = product.salePrice;
    productToAdd.price = product.salePrice;
    productToAdd.unit = product.unit || "unidades";
    productToAdd.image = product.image || "";
    productToAdd.amount = quantity;
    addItem(productToAdd);
  }, [addItem]);

  const handleViewDetails = useCallback((product: PublicProduct) => {
    console.log("View details:", product.id);
  }, []);

  const resultCount = filteredProducts.length;
  const hasMoreProducts = displayedProducts.length < filteredProducts.length;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 w-60 h-screen z-30">
        <FilterSidebar
          groups={filterGroups}
          filterState={filterState}
          onToggleFilter={toggleFilter}
          onClearAll={clearFilters}
          resultCount={resultCount}
          isOpen={true}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen lg:ml-60">
        {/* Business Logo */}
        {business?.logo && (
          <div className="py-4 sm:py-6 text-center border-b border-gray-100 dark:border-gray-800">
            <div className="inline-block">
              <Image src={business.logo} alt={business.name} width={128} height={48} className="object-contain" />
            </div>
          </div>
        )}

        {/* Header */}
        <CatalogHeader
          filterState={filterState}
          filterGroups={filterGroups}
          activeFilterCount={activeFilterCount}
          onSearchChange={setSearch}
          onSortChange={setSort}
          onFilterRemove={toggleFilter}
          onClearAll={clearFilters}
          onOpenFilters={() => setIsMobileFilterOpen(true)}
        />

        {/* Product Grid */}
        <div className="flex-1 p-2 sm:p-3 lg:p-4">
          <ProductGridContent
            products={filteredProducts}
            displayedProducts={displayedProducts}
            isLoadingMore={isLoadingMore}
            hasMore={hasMoreProducts}
            loadMoreRef={loadMoreRef}
            onAddToCart={handleAddToCart}
            onViewDetails={handleViewDetails}
            onClearFilters={clearFilters}
            hasActiveFilters={activeFilterCount > 0}
          />
        </div>
      </main>

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        groups={filterGroups}
        onToggleFilter={toggleFilter}
        onClearAll={clearFilters}
        resultCount={resultCount}
      />
    </div>
  );
}

// Props interface
interface CatalogPageProps {
  products: PublicProduct[];
  business: CatalogBusiness | null;
}

// Main export
export function CatalogPage({ products, business }: CatalogPageProps) {
  return (
    <CatalogProvider products={products} business={business}>
      <CatalogContent business={business} />
    </CatalogProvider>
  );
}

export default CatalogPage;