import { formatCurrency } from "@/lib/data";

interface ChartSummaryItem {
  color: string;
  label: string;
  value: number;
}

export function ChartDataSummary({
  description,
  items,
  showPercentage = true,
  total,
}: {
  description: string;
  items: ChartSummaryItem[];
  showPercentage?: boolean;
  total?: number;
}) {
  const calculatedTotal =
    total ?? items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="mt-5 border-t border-border pt-4">
      <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Resumo dos dados do gráfico">
        {items.map((item) => {
          const percentage =
            calculatedTotal !== 0
              ? (Math.abs(item.value) / Math.abs(calculatedTotal)) * 100
              : 0;

          return (
            <li
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg bg-muted/35 px-3 py-2"
              key={item.label}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full ring-1 ring-foreground/15"
                  style={{ backgroundColor: item.color }}
                />
                <span className="truncate text-sm text-foreground">
                  {item.label}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold text-foreground">
                  {formatCurrency(item.value)}
                </span>
                {showPercentage && (
                  <span className="block text-xs text-muted-foreground">
                    {percentage.toLocaleString("pt-BR", {
                      maximumFractionDigits: 1,
                      minimumFractionDigits: 1,
                    })}
                    %
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
