import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useCurrentCandidate } from "../lib/use-candidate";
import { useListSessions, useCreateSession } from "@workspace/api-client-react";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { RoleCard } from "../components/role-card";
import { AssessmentSpotlight } from "../components/assessment-spotlight";
import { ALL_ROLES, ROLE_CATEGORIES, type RoleCategory } from "../lib/roles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Activity, ShieldAlert, Clock, Layers, ChevronRight, Search, CheckCircle2, Circle,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: sessions, isLoading: isLoadingSessions } = useListSessions();
  const createSession = useCreateSession();

  // Stats calculation
  const stats = useMemo(() => {
    const completedCount = sessions?.filter(s => s.status === "evaluated").length ?? 0;
    const activeCount = sessions?.filter(s => s.status !== "evaluated" && s.status !== "disqualified").length ?? 0;
    const disqualifiedCount = sessions?.filter(s => s.status === "disqualified").length ?? 0;
    return {
      roles: ALL_ROLES.length,
      completed: completedCount,
      active: activeCount,
      disqualified: disqualifiedCount,
    };
  }, [sessions]);

  // Profile setup progress
  const profileProgress = useMemo(() => {
    const cvUploaded = !!candidate?.cvFileName;
    const hasCompletedAssessment = sessions?.some(s => s.status === "evaluated") ?? false;
    const completed = [cvUploaded, hasCompletedAssessment].filter(Boolean).length;
    return {
      cvUploaded,
      hasCompletedAssessment,
      percentage: (completed / 2) * 100,
    };
  }, [candidate, sessions]);

  useEffect(() => {
    if (candidate && !candidate.profileComplete) {
      setLocation("/profile");
    }
  }, [candidate, setLocation]);

  const completedRoles = useMemo(() => {
    const set = new Set<string>();
    for (const s of sessions ?? []) {
      if (s.status === "evaluated") set.add(s.roleTitle.trim().toLowerCase());
    }
    return set;
  }, [sessions]);

  const hasCompleted = (roleTitle: string) => completedRoles.has(roleTitle.trim().toLowerCase());

  const handleRoleClick = (roleTitle: string) => {
    setActionError(null);
    if (!candidate?.profileComplete) {
      setLocation("/profile");
      return;
    }
    if (hasCompleted(roleTitle)) {
      setActionError(`You've already completed the assessment for "${roleTitle}". You can apply for a different role.`);
      return;
    }
    createSession.mutate(
      { data: { roleTitle, jobDescription: `Standard senior-level assessment for ${roleTitle}` } },
      {
        onSuccess: (session) => setLocation(`/interview/${session.id}`),
        onError: (err) => {
          const status = (err as { status?: number } | null)?.status;
          if (status === 409) {
            setActionError(`You've already completed the assessment for "${roleTitle}". You can apply for a different role.`);
          } else {
            setActionError("Couldn't start the assessment. Please try again.");
          }
        },
      }
    );
  };

  const visibleRoles = useMemo(
    () => {
      let filtered = filter === "All" ? ALL_ROLES : ALL_ROLES.filter((r) => r.category === filter);
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(r =>
          r.title.toLowerCase().includes(query) ||
          r.category.toLowerCase().includes(query) ||
          r.desc.toLowerCase().includes(query)
        );
      }
      return filtered;
    },
    [filter, searchQuery]
  );
  const filters: Filter[] = ["All", ...ROLE_CATEGORIES];

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
        <div className="flex flex-col gap-4 border-b border-border/60 pb-6 md:flex-row md:items-start md:justify-between">
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
          {/* Stats Row */}
          <div className="flex gap-6 md:gap-8">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{stats.roles}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">ROLES</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">{stats.completed}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">COMPLETED</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">{stats.active}</p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">ACTIVE</p>
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

        {actionError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {actionError}
          </div>
        )}

        {/* Profile Setup Card */}
        <Card className="border-border/50 bg-card/40">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-mono text-sm font-bold tracking-tight text-foreground">PROFILE_SETUP</h3>
              <span className="font-mono text-xs text-primary">{profileProgress.percentage}%</span>
            </div>
            <Progress value={profileProgress.percentage} className="mb-4 h-2" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3">
                {profileProgress.cvUploaded ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">Account created & CV uploaded</span>
              </div>
              <div className="flex items-center gap-3">
                {profileProgress.hasCompletedAssessment ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">Complete your first assessment</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* Role Cards */}
          <div className="space-y-5 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
                <Layers className="h-5 w-5 text-primary" /> AVAILABLE_ASSESSMENTS
                <span className="font-mono text-xs text-muted-foreground">({visibleRoles.length} roles)</span>
              </h2>
            </div>
            
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search roles by title, category, or skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 font-mono text-sm"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition-all duration-200 ease-out ${
                    filter === f
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-secondary/50 hover:text-foreground hover:-translate-y-0.5"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Roles grouped by category */}
            <div className="space-y-6">
              {filter === "All" ? (
                // Show all categories when "All" is selected
                ROLE_CATEGORIES.map((category) => {
                  const categoryRoles = visibleRoles.filter(r => r.category === category);
                  if (categoryRoles.length === 0) return null;
                  return (
                    <div key={category}>
                      <h3 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                        {category}
                        <span className="text-muted-foreground">({categoryRoles.length})</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {categoryRoles.map((role) => {
                          const completedSession = sessions?.find(s => 
                            s.roleTitle.trim().toLowerCase() === role.title.trim().toLowerCase() && 
                            s.status === "evaluated"
                          );
                          return (
                            <RoleCard
                              key={role.title}
                              role={role}
                              onSelect={handleRoleClick}
                              disabled={createSession.isPending}
                              completed={hasCompleted(role.title)}
                              onViewResults={completedSession ? () => setLocation(`/results/${completedSession.id}`) : undefined}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Show single category when specific filter is selected
                <>
                  <h3 className="mb-3 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-primary">
                    {filter}
                    <span className="text-muted-foreground">({visibleRoles.length})</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {visibleRoles.map((role) => {
                      const completedSession = sessions?.find(s => 
                        s.roleTitle.trim().toLowerCase() === role.title.trim().toLowerCase() && 
                        s.status === "evaluated"
                      );
                      return (
                        <RoleCard
                          key={role.title}
                          role={role}
                          onSelect={handleRoleClick}
                          disabled={createSession.isPending}
                          completed={hasCompleted(role.title)}
                          onViewResults={completedSession ? () => setLocation(`/results/${completedSession.id}`) : undefined}
                        />
                      );
                    })}
                  </div>
                </>
              )}
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
                        className="group flex w-full items-center justify-between gap-2 p-4 text-left transition-all duration-200 ease-out hover:bg-secondary/20 hover:border-primary/30 border border-transparent"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{session.roleTitle}</p>
                          <span className={`mt-1.5 inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusTone(session.status)}`}>
                            {session.status.replace("_", " ")}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 font-mono text-[11px] text-muted-foreground transition-colors group-hover:text-primary">
                          {session.status === "evaluated" ? "RESULTS" : "RESUME"}
                          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
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
