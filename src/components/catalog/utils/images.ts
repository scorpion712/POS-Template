// =============================================================================
// IMAGE UTILS - Utilities for fetching product images
// =============================================================================

// Pre-selected fashion image IDs from Unsplash (public, no API key needed)
const FASHION_IMAGE_IDS = [
  "photo-1521572163474-6864f9cf17ab", // White t-shirt
  "photo-1542272604-787c083553b1",   // Jeans
  "photo-1549298916-b41d501d3772",   // Sneakers
  "photo-1556821840-3a63f95609a7", // Hoodie
  "photo-1551028719-0012b1b16f87", // Leather jacket
  "photo-1581655353564-df123a1ebc82", // Oversize t-shirt
  "photo-1582418702059-3c2cada9b7d4", // Black jeans
  "photo-1608231387042-658d9d021770", // Boots
  "photo-1434389677669-e08b4cac3105", // Sweater
  "photo-1588850561407-ed78c156e1f5", // Cap
  "photo-1576566588028-4147f3842f27", // Dry fit shirt
  "photo-1624378439575-d8705ad7ae80", // Cargo pants
  "photo-1600269452121-4f2416e55c28", // Runner shoes
  "photo-1539533018447-63fcce2678e3", // Winter jacket
  "photo-1552458902-2f1dd8bc8bc5", // Boxer shorts
  "photo-1586350977771-b3b0abd50c82", // Socks
  "photo-1553062407-98eeb64c6a84", // Fanny pack
  "photo-1591047139829-d91aecb6caea", // Vest
  "photo-1506629082955-511b1aa562c8", // Leggings
  "photo-1598556776372-dd7a3c4bb27f", // Classic polo
];

// Image sources
export const ImageSource = {
  LOREM_PICSUM: "picsum",
  UNSPLASH: "unsplash",
} as const;

export type ImageSourceType = typeof ImageSource[keyof typeof ImageSource];

/**
 * Get a random image from Picsum (free, no API key needed)
 * @param id - Optional specific image ID
 * @param width - Image width
 * @param height - Image height
 * @param blur - Whether to add blur for variety
 */
export function getPicsumImage(
  id?: number,
  width = 400,
  height = 400,
  blur = false
): string {
  const imageId = id || Math.floor(Math.random() * 1000) + 1;
  const blurParam = blur ? "/blur" : "";
  return `https://picsum.photos/id/${imageId}/${width}${blurParam}`;
}

/**
 * Get a clothing/fashion image from Unsplash
 * Uses pre-selected fashion-related image IDs (publicly accessible)
 */
export function getUnsplashClothingImage(index: number): string {
  const imageId = FASHION_IMAGE_IDS[index % FASHION_IMAGE_IDS.length];
  return `https://images.unsplash.com/${imageId}?w=400&h=400&fit=crop`;
}

/**
 * Get a product image with consistent URL based on product ID
 */
export function getProductImage(productId: string): string {
  // Generate consistent image ID based on product ID
  const seed = productId.split("-").pop();
  const index = (parseInt(seed || "1", 10) - 1) % FASHION_IMAGE_IDS.length;
  return getUnsplashClothingImage(index);
}

export default {
  getPicsumImage,
  getUnsplashClothingImage,
  getProductImage,
  ImageSource,
};