/** One product row recipe for the selected order in Agent View and the guarded consultant conversation. */
import { ProductThumbnail } from "./product-thumbnail";

type Item = { name: string; qty: number; unitPrice: number };

export function OrderItems({ items, currency }: { items: Item[]; currency: string }) {
  return <ul className="space-y-2">{items.map((item, index) => <li key={`${item.name}:${index}`} className="flex items-center gap-3">
    <ProductThumbnail name={item.name} />
    <span className="min-w-0 wrap-anywhere">{item.qty} × {item.name} · {item.unitPrice} {currency} each</span>
  </li>)}</ul>;
}
