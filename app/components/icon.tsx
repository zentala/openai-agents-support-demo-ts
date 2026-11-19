/** Semantic SVG renderer. Decorative by default; an explicit label exposes a named image. */
import type { SVGProps } from "react";
import { ICONS, type IconKey } from "@/lib/ui/icons";

type Props = Omit<SVGProps<SVGSVGElement>, "name" | "children"> & {
  name: IconKey;
  size?: number;
  label?: string;
};

export function Icon({ name, size = 16, label, className = "", ...props }: Props) {
  const Glyph = ICONS[name];
  return <Glyph {...props} size={size} className={`shrink-0 ${className}`} data-icon={name}
    aria-hidden={label ? undefined : true} aria-label={label} role={label ? "img" : undefined}
    focusable="false" />;
}
