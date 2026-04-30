/**
 * Stat Card
 *
 * Reusable metric card with icon, label, value, and optional trend.
 */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ icon, label, value, trend, trendUp }: StatCardProps) {
  return (
    <div className="glass rounded-2xl p-5 hover:border-border-hover transition-all duration-300 animate-fade-in group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 text-accent border border-accent/10 group-hover:border-accent/20 transition-colors">
          {icon}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              trendUp
                ? "bg-success/10 text-success"
                : "bg-error/10 text-error"
            }`}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="text-sm text-muted mt-1">{label}</p>
    </div>
  );
}
