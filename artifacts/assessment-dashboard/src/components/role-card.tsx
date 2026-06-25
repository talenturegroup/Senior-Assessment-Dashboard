import { ArrowUpRight } from "lucide-react";
import type { Role } from "../lib/roles";

interface RoleCardProps {
  role: Role;
  onSelect: (title: string) => void;
  disabled?: boolean;
  completed?: boolean;
  onViewResults?: () => void;
}

export function RoleCard({ role, onSelect, disabled, completed = false, onViewResults }: RoleCardProps) {
  const Icon = role.icon;
  const handleClick = () => {
    if (completed && onViewResults) {
      onViewResults();
    } else if (!completed) {
      onSelect(role.title);
    }
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`group relative w-full text-left overflow-hidden rounded-lg border border-border/50 bg-card/40 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:bg-card/70 hover:shadow-[0_0_30px_-8px_hsl(var(--primary)/0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${
        completed ? "opacity-70" : ""
      }`}
    >
      {/* top accent line */}
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-primary to-transparent transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary/60 ring-1 ring-inset ring-border/60 transition-colors group-hover:ring-primary/30 ${role.color}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className={`truncate text-sm font-semibold leading-snug ${completed ? "text-muted-foreground" : "text-foreground"}`}>
              {role.title}
            </h3>
            <span className="mt-1 inline-flex items-center rounded-md border border-transparent bg-secondary px-1.5 py-0 font-mono text-[10px] font-semibold text-secondary-foreground">
              {role.category}
            </span>
          </div>
        </div>
        {completed && (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 -translate-x-1 translate-y-1 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:text-primary" />
        )}
      </div>

      <p className={`mt-3 text-xs leading-relaxed ${completed ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
        {role.desc}
      </p>

      {completed ? (
        <div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-emerald-400">
          <span className="h-1 w-1 rounded-full bg-emerald-400" />
          Assessment completed
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
            Initialize assessment
          </div>
        </div>
      )}
    </button>
  );
}
