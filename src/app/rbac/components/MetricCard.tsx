type MetricCardProps = {
  label: string;
  value: string;
  meta: string;
};

export function MetricCard({ label, value, meta }: MetricCardProps) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{meta}</p>
    </div>
  );
}

