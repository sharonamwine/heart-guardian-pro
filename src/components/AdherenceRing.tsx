type Props = {
  /** 0..1 */
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
};

export function AdherenceRing({ value, size = 140, stroke = 12, label, sublabel }: Props) {
  const clamped = Math.max(0, Math.min(1, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * clamped;
  const pct = Math.round(clamped * 100);
  const color =
    clamped >= 0.95 ? "var(--color-success)" : clamped >= 0.85 ? "var(--color-warning)" : "var(--color-destructive)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-muted)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: "stroke-dasharray 600ms cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-bold tabular-nums">{pct}%</span>
        {label && <span className="text-[11px] font-medium text-muted-foreground mt-0.5">{label}</span>}
        {sublabel && <span className="text-[10px] text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}
