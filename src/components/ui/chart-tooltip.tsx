import type { ReactNode } from 'react';

interface Row {
  name?: string | number;
  value?: number | string | Array<number | string>;
  color?: string;
  dataKey?: string | number;
  payload?: unknown;
}

/**
 * Glass tooltip for Recharts. Values and labels stay in ink tokens; the
 * coloured swatch alone carries series identity.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v) => String(v),
  hide,
}: {
  active?: boolean;
  payload?: Row[];
  label?: ReactNode;
  labelFormatter?: (l: ReactNode) => ReactNode;
  valueFormatter?: (v: number, key?: string) => string;
  hide?: string[];
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => !hide?.includes(String(p.dataKey)) && p.value !== undefined && p.value !== null);
  if (!rows.length) return null;
  return (
    <div className="glass-strong min-w-40 rounded-md px-3 py-2 text-xs shadow-card">
      {label !== undefined && <div className="mb-1.5 font-mono text-fg-muted">{labelFormatter ? labelFormatter(label) : label}</div>}
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={String(r.dataKey ?? r.name)} className="flex items-center gap-2">
            <span className="size-2 rounded-full" style={{ background: r.color }} aria-hidden />
            <span className="flex-1 text-fg-muted">{r.name}</span>
            <span className="font-mono font-medium text-fg">
              {typeof r.value === 'number' ? valueFormatter(r.value, String(r.dataKey)) : String(r.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
