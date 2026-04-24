"use client";

// =============================================================================
// PRODUCT IMAGE - Product image with hover zoom effect
// =============================================================================

import { useState, useCallback } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import noImgPhoto from "../../../../public/no-image.svg";

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  aspectRatio?: "square" | "video";
  hoverZoom?: boolean;
}

export function ProductImage({
  src,
  alt,
  className,
  aspectRatio = "square",
  hoverZoom = true,
}: ProductImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const isValidImage = src && src.includes("https") && !hasError;

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-50 dark:bg-gray-900/50",
        aspectRatio === "square" && "aspect-square",
        aspectRatio === "video" && "aspect-video",
        className
      )}
    >
      {isValidImage ? (
        <>
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-500",
              hoverZoom && "group-hover:scale-105",
              isLoading && "animate-pulse"
            )}
            onLoad={() => setIsLoading(false)}
            onError={handleError}
          />
          {isLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-full w-full">
          <Image
            src={noImgPhoto}
            alt="Imagen no disponible"
            className="w-1/2 h-1/2 opacity-30"
          />
        </div>
      )}
    </div>
  );
}

export default ProductImage;