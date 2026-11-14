/** Public catalog artwork. Exact product names select bundled files; data can never supply an image URL. */
const PRODUCT_IMAGES: Record<string, string> = {
  "Oslo dining chair": "/products/chair.webp",
  "Fjord 3-seater sofa": "/products/sofa.webp",
  "Bergen bookshelf": "/products/bookshelf.webp",
  "Trondheim armchair": "/products/armchair.webp",
  "Oak coffee table": "/products/table.webp",
  "Lund floor lamp": "/products/lamp.webp",
  "Stavanger desk": "/products/desk.webp",
  "Wool rug 160x230": "/products/rug.webp",
  "Aalborg 3-door wardrobe": "/products/wardrobe.webp",
};

export function productImage(name: string): string | undefined {
  // SECURITY: reject unknown names and inherited object keys; never construct paths from input.
  return Object.hasOwn(PRODUCT_IMAGES, name) ? PRODUCT_IMAGES[name] : undefined;
}
