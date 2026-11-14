"use client";

/** Local product illustration beside a visible name; missing artwork keeps the same row geometry. */
import Image from "next/image";
import { Package } from "lucide-react";
import { useState } from "react";
import { productImage } from "@/lib/client/product-images";

export function ProductThumbnail({ name }: { name: string }) {
  const source = productImage(name);
  const [failedSource, setFailedSource] = useState<string>();
  return <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gray-100" data-testid="product-thumbnail">
    {source && failedSource !== source
      // Assets are already small WebP files; serve them directly in standalone and local production.
      ? <Image src={source} alt="" width={48} height={48} unoptimized className="size-12 object-cover" onError={() => setFailedSource(source)} />
      : <Package className="size-5 text-zinc-600" />}
  </span>;
}
