import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ALL_ROLES } from "../lib/roles";
import {
  Video, ArrowRight, CheckCircle2, PlayCircle, Sparkles, Target,
} from "lucide-react";

export interface SpotlightSession {
  id: number;
  roleTitle: string;
  status: string;
}

interface AssessmentSpotlightProps {
  appliedRole?: string | null;
  sessions?: SpotlightSession[];
  onStart: (roleTitle: string) => void;
  onResume: (sessionId: number) => void;
  onViewResults: (sessionId: number) => void;
  isStarting?: boolean;
}

function matchRole(role: string) {
  const normalized = role.trim().toLowerCase();
  return (
    ALL_ROLES.find((r) => r.title.toLowerCase() === normalized) ??
    ALL_ROLES.find((r) => r.title.toLowerCase().includes(normalized) || normalized.includes(r.title.toLowerCase()))
  );
}

export function AssessmentSpotlight({
  appliedRole,
  sessions,
  onStart,
  onResume,
  onViewResults,
  isStarting,
}: AssessmentSpotlightProps) {
  const role = (appliedRole ?? "").trim();
  if (!role) return null;

  const meta = matchRole(role);
  const Icon = meta?.icon ?? Target;
  const accent = meta?.color ?? "text-primary";
  const desc =
    meta?.desc ?? "An AI-driven, role-specific technical interview calibrated to your experience.";

  const roleSessions = (sessions ?? []).filter(
    (s) => s.roleTitle.toLowerCase() === role.toLowerCase()
  );
  const sorted = [...roleSessions].sort((a, b) => b.id - a.id);
  const active = sorted.find(
    (s) => s.status === "in_progress" || s.status === "pending" || s.status === "completed"
  );
  const completed = sorted.find((s) => s.status === "evaluated");

  return (
    <Card className="relative overflow-hidden border-primary/30 bg-card/60 backdrop-blur">
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-[90px]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <CardContent className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex items-start gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-secondary/60 ring-1 ring-inset ring-primary/30 ${accent}`}>
            <Icon className="h-7 w-7" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Your Assessment
            </div>
            <h2 className="text-xl font-bold tracking-tight md:text-2xl">{role}</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{desc}</p>
            {completed && !active && (
              <div className="inline-flex items-center gap-1.5 pt-1 font-mono text-xs text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Assessment completed — the Arvencor team will reach out
              </div>
            )}
            {active && (
              <div className="inline-flex items-center gap-1.5 pt-1 font-mono text-xs text-amber-400">
                <PlayCircle className="h-3.5 w-3.5" />
                Assessment in progress
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          {active ? (
            <Button
              size="lg"
              className="font-mono shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.45)]"
              onClick={() => onResume(active.id)}
            >
              <PlayCircle className="mr-2 h-4 w-4" /> Resume Assessment
            </Button>
          ) : completed ? null : (
            <Button
              size="lg"
              className="font-mono shadow-[0_0_20px_rgba(6,182,212,0.25)] hover:shadow-[0_0_30px_rgba(6,182,212,0.45)]"
              onClick={() => onStart(role)}
              disabled={isStarting}
            >
              <Video className="mr-2 h-4 w-4" />
              {isStarting ? "Starting…" : "Start Video Interview"}
              {!isStarting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          )}
          {completed && (
            <Button
              size="lg"
              variant="outline"
              className="border-border/70 font-mono"
              onClick={() => onViewResults(completed.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" /> View Confirmation
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
