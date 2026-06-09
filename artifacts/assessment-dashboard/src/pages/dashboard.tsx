import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useCurrentCandidate } from "../lib/use-candidate";
import { useGetDashboardStats, useListSessions, useCreateSession } from "@workspace/api-client-react";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { RoleCard } from "../components/role-card";
import { AssessmentSpotlight } from "../components/assessment-spotlight";
import { ALL_ROLES, ROLE_CATEGORIES, type RoleCategory } from "../lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, ShieldAlert, BadgeCheck, Clock, Layers, ChevronRight,
} from "lucide-react";

type Filter = "All" | RoleCategory;

function initials(name?: string | null): string {
  if (!name) return "··";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusTone(status: string): string {
  switch (status) {
    case "evaluated":
      return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
    case "in_progress":
      return "text-amber-400 border-amber-400/30 bg-amber-400/10";
    default:
      return "text-muted-foreground border-border/60 bg-secondary/40";
  }
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { candidate, isLoading: isLoadingCandidate } = useCurrentCandidate();
  const [filter, setFilter] = useState<Filter>("All");

  const { data: stats } = useGetDashboardStats();
  const { data: sessions, isLoading: isLoadingSessions } = useListSessions();
  const createSession = useCreateSession();

  useEffect(() => {
    if (candidate && !candidate.profileComplete) {
      setLocation("/profile");
    }
  }, [candidate, setLocation]);

  const handleRoleClick = (roleTitle: string) => {
    if (!candidate?.profileComplete) {
      setLocation("/profile");
      return;
    }
    createSession.mutate(
      { data: { roleTitle, jobDescription: `Standard senior-level assessment for ${roleTitle}` } },
      { onSuccess: (session) => setLocation(`/interview/${session.id}`) }
    );
  };

  const visibleRoles = useMemo(
    () => (filter === "All" ? ALL_ROLES : ALL_ROLES.filter((r) => r.category === filter)),
    [filter]
  );
  const filters: Filter[] = ["All", ...ROLE_CATEGORIES];

  const statCards = [
    { icon: Activity, label: "PLATFORM_AVG", value: stats?.averageScore != null ? `${stats.averageScore.toFixed(0)}` : "--", suffix: "/ 100" },
    { icon: BadgeCheck, label: "EVALUATIONS", value: stats?.completedSessions ?? "--" },
    { icon: ShieldAlert, label: "HIRE_RATE", value: stats?.hireRate != null ? `${stats.hireRate.toFixed(0)}%` : "--" },
  ];

  if (candidate && !candidate.profileComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-mono text-sm text-muted-foreground">
        REDIRECTING_TO_PROFILE…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <main className="z-10 mx-auto w-full max-w-7xl flex-1 space-y-8 px-4 py-10">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 font-mono text-lg font-bold text-primary">
              {initials(candidate?.name)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                  {isLoadingCandidate ? "Loading…" : `Welcome, ${candidate?.name?.split(" ")[0] ?? "Candidate"}`}
                </h1>
                {candidate?.profileComplete && (
                  <Badge variant="outline" className="border-primary/40 font-mono text-[10px] text-primary">
                    VERIFIED
                  </Badge>
                )}
              </div>
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {candidate?.role || "Select a role below to begin"}
              </p>
            </div>
          </div>
        </div>

        {/* Assessment Spotlight — tied to the role the candidate applied for */}
        {candidate?.role && (
          <AssessmentSpotlight
            appliedRole={candidate.role}
            sessions={sessions}
            onStart={handleRoleClick}
            onResume={(sessionId) => setLocation(`/interview/${sessionId}`)}
            onViewResults={(sessionId) => setLocation(`/results/${sessionId}`)}
            isStarting={createSession.isPending}
          />
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="mt-0.5 text-2xl font-bold">
                      {s.value}
                      {s.suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{s.suffix}</span>}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Role Cards */}
          <div className="space-y-5 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
                <Layers className="h-5 w-5 text-primary" /> AVAILABLE_ASSESSMENTS
              </h2>
              <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={filter === f}
                    onClick={() => setFilter(f)}
                    className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                      filter === f
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleRoles.map((role) => (
                <RoleCard
                  key={role.title}
                  role={role}
                  onSelect={handleRoleClick}
                  disabled={createSession.isPending}
                />
              ))}
            </div>
          </div>

          {/* Session Logs */}
          <div className="space-y-5">
            <h2 className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
              <Clock className="h-5 w-5 text-primary" /> SESSION_LOGS
            </h2>
            <Card className="border-border/50 bg-card/40">
              <CardContent className="p-0">
                {isLoadingSessions ? (
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-14 w-full bg-secondary/40" />
                    <Skeleton className="h-14 w-full bg-secondary/40" />
                    <Skeleton className="h-14 w-full bg-secondary/40" />
                  </div>
                ) : !sessions || sessions.length === 0 ? (
                  <div className="space-y-2 p-10 text-center font-mono text-xs text-muted-foreground">
                    <Activity className="mx-auto h-8 w-8 opacity-30" />
                    <p>NO_SESSIONS_FOUND</p>
                    <p className="text-[10px] opacity-60">Click any role card to begin</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() =>
                          setLocation(
                            session.status === "evaluated"
                              ? `/results/${session.id}`
                              : `/interview/${session.id}`
                          )
                        }
                        className="group flex w-full items-center justify-between gap-2 p-4 text-left transition-colors hover:bg-secondary/20"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{session.roleTitle}</p>
                          <span className={`mt-1.5 inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusTone(session.status)}`}>
                            {session.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors group-hover:text-primary">
                          {session.status === "evaluated" ? "RESULTS" : "RESUME"}
                          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
