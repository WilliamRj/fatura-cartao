import Image from "next/image";

import { cn } from "@/lib/utils";

export const BRAND_NAME = "MW Cartão Inteligente";
export const BRAND_TAGLINE = "Sua fatura. Seu controle.";

interface BrandLogoProps {
  className?: string;
  markClassName?: string;
  markOnly?: boolean;
  showTagline?: boolean;
  textClassName?: string;
}

export function BrandLogo({
  className,
  markClassName,
  markOnly = false,
  showTagline = true,
  textClassName,
}: BrandLogoProps) {
  return (
    <div
      aria-label={markOnly ? BRAND_NAME : undefined}
      className={cn("flex min-w-0 items-center gap-2.5", className)}
      role={markOnly ? "img" : undefined}
    >
      <span
        aria-hidden="true"
        className={cn("relative block size-9 shrink-0", markClassName)}
      >
        <Image
          alt=""
          className="size-full object-contain"
          height={512}
          src="/brand/mw-card-mark.png"
          width={512}
        />
      </span>

      {!markOnly && (
        <span className={cn("min-w-0 leading-tight", textClassName)}>
          <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            <strong className="text-sm font-extrabold text-current">MW</strong>
            <span className="truncate text-sm font-semibold text-current">
              Cartão Inteligente
            </span>
          </span>
          {showTagline && (
            <span className="block truncate text-[11px] text-muted-foreground">
              {BRAND_TAGLINE}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
