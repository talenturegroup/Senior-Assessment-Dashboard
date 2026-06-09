import { useEffect } from "react";
import { useLocation } from "wouter";
import { useCandidate } from "../lib/use-candidate";
import { useGetCandidate, useGetDashboardStats, useListSessions, useCreateSession, getListSessionsQueryKey } from "@workspace/api-client-react";
import { Navbar } from "../components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Play, ShieldAlert, BadgeCheck, Clock, Layers,
  Shield, Server, Brain, Cloud, Briefcase, Code2, Cpu,
  Smartphone, Database, Globe, Zap, Lock
} from "lucide-react";

const ALL_ROLES = [
  {
    title: "Cybersecurity Analyst",
    category: "Security",
    desc: "Threat analysis, incident response, SIEM, vulnerability management.",
    icon: Lock,
    color: "text-red-400",
    border: "hover:border-red-400/40",
  },
  {
    title: "Senior Software Engineer",
    category: "Engineering",
    desc: "System architecture, full-stack complexity, scalability.",
    icon: Code2,
    color: "text-cyan-400",
    border: "hover:border-cyan-400/40",
  },
  {
    title: "DevOps / Site Reliability Engineer",
    category: "Infrastructure",
    desc: "CI/CD pipelines, Kubernetes, observability, platform engineering.",
    icon: Server,
    color: "text-orange-400",
    border: "hover:border-orange-400/40",
  },
  {
    title: "Data Scientist / ML Engineer",
    category: "Data & AI",
    desc: "ML model design, feature engineering, experimentation at scale.",
    icon: Brain,
    color: "text-purple-400",
    border: "hover:border-purple-400/40",
  },
  {
    title: "Cloud Architect",
    category: "Infrastructure",
    desc: "AWS/GCP/Azure design, Terraform, distributed systems.",
    icon: Cloud,
    color: "text-blue-400",
    border: "hover:border-blue-400/40",
  },
  {
    title: "Product Manager (Technical)",
    category: "Product",
    desc: "Technical roadmaps, stakeholder alignment, product strategy.",
    icon: Briefcase,
    color: "text-yellow-400",
    border: "hover:border-yellow-400/40",
  },
  {
    title: "Full-Stack Developer",
    category: "Engineering",
    desc: "End-to-end features across frontend, backend, and database layers.",
    icon: Globe,
    color: "text-emerald-400",
    border: "hover:border-emerald-400/40",
  },
  {
    title: "Backend Engineer (Node.js / Python)",
    category: "Engineering",
    desc: "High-performance APIs, microservices, distributed systems.",
    icon: Zap,
    color: "text-amber-400",
    border: "hover:border-amber-400/40",
  },
  {
    title: "Frontend Engineer (React)",
    category: "Engineering",
    desc: "React performance, accessibility, component architecture.",
    icon: Cpu,
    color: "text-sky-400",
    border: "hover:border-sky-400/40",
  },
  {
    title: "AI / LLM Engineer",
    category: "Data & AI",
    desc: "LLM fine-tuning, RAG pipelines, prompt engineering, MLOps.",
    icon: Brain,
    color: "text-violet-400",
    border: "hover:border-violet-400/40",
  },
  {
    title: "Mobile Developer (iOS/Android)",
    category: "Engineering",
    desc: "Native and cross-platform apps, performance, device APIs.",
    icon: Smartphone,
    color: "text-rose-400",
    border: "hover:border-rose-400/40",
  },
  {
    title: "Database Administrator",
    category: "Infrastructure",
    desc: "Schema design, query optimization, replication, reliability.",
    icon: Database,
    color: "text-teal-400",
    border: "hover:border-teal-400/40",
  },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { candidateId } = useCandidate();

  const { data: candidate, isLoading: isLoadingCandidate } = useGetCandidate(candidateId as number);

  const { data: stats } = useGetDashboardStats();
  const { data: sessions, isLoading: isLoadingSessions } = useListSessions(
    { candidateId: candidateId as number },
    { query: { enabled: !!candidateId, queryKey: getListSessionsQueryKey({ candidateId: candidateId as number }) } }
  );

  const createSession = useCreateSession();

  const handleRoleClick = (roleTitle: string) => {
    if (!candidateId) {
      setLocation(`/register?role=${encodeURIComponent(roleTitle)}`);
      return;
    }
    if (!candidate?.profileComplete) {
      setLocation("/profile");
      return;
    }
    createSession.mutate(
      {
        data: {
          candidateId: candidateId,
          roleTitle,
          jobDescription: `Standard senior-level assessment for ${roleTitle}`,
        },
      },
      {
        onSuccess: (session) => {
          setLocation(`/interview/${session.id}`);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 container mx-auto py-8 px-4 space-y-8 max-w-7xl">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Assessment Center
              {candidate?.profileComplete && (
                <Badge variant="outline" className="text-primary border-primary font-mono text-xs">
                  VERIFIED
                </Badge>
              )}
            </h1>
            {candidateId ? (
              <p className="text-muted-foreground mt-2 font-mono text-sm">
                {isLoadingCandidate ? "Loading..." : `${candidate?.name ?? "—"} // ${candidate?.role ?? "—"}`}
              </p>
            ) : (
              <p className="text-muted-foreground mt-2 font-mono text-sm">
                Select a role to begin your assessment
              </p>
            )}
          </div>
          {!candidateId && (
            <Button onClick={() => setLocation("/register")} className="font-mono text-xs tracking-wider">
              CREATE PROFILE
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> PLATFORM_AVG
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.averageScore ? `${stats.averageScore.toFixed(0)}` : "--"}
                <span className="text-sm text-muted-foreground ml-1">/ 100</span>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> EVALUATIONS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.completedSessions ?? "--"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> HIRE_RATE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {stats?.hireRate != null ? `${stats.hireRate.toFixed(0)}%` : "--"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Role Cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> AVAILABLE_ASSESSMENTS
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_ROLES.map((role) => {
                const Icon = role.icon;
                return (
                  <Card
                    key={role.title}
                    className={`border-border/40 transition-all duration-200 bg-card/40 cursor-pointer group ${role.border}`}
                    onClick={() => handleRoleClick(role.title)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`p-1.5 rounded bg-secondary/60 shrink-0 ${role.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm leading-snug">{role.title}</CardTitle>
                            <Badge variant="secondary" className="font-mono text-[10px] mt-0.5 px-1.5 py-0">
                              {role.category}
                            </Badge>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={`font-mono text-xs shrink-0 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity ${role.color} hover:bg-secondary/80`}
                          onClick={(e) => { e.stopPropagation(); handleRoleClick(role.title); }}
                          disabled={createSession.isPending}
                        >
                          <Play className="h-3 w-3 mr-1" /> START
                        </Button>
                      </div>
                      <CardDescription className="text-xs mt-2 leading-relaxed">
                        {role.desc}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Session Logs */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> SESSION_LOGS
            </h2>
            <Card className="border-border/50 bg-card/40">
              <CardContent className="p-0">
                {!candidateId ? (
                  <div className="p-8 text-center text-muted-foreground font-mono text-xs space-y-2">
                    <Shield className="h-8 w-8 mx-auto opacity-30" />
                    <p>CREATE_PROFILE_TO_VIEW</p>
                  </div>
                ) : isLoadingSessions ? (
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-12 w-full bg-secondary/40" />
                    <Skeleton className="h-12 w-full bg-secondary/40" />
                  </div>
                ) : !sessions || sessions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-mono text-xs space-y-2">
                    <Activity className="h-8 w-8 mx-auto opacity-30" />
                    <p>NO_SESSIONS_FOUND</p>
                    <p className="text-[10px] opacity-60">Click any role card to begin</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {sessions.map((session) => (
                      <div key={session.id} className="p-4 flex items-center justify-between hover:bg-secondary/20 transition-colors">
                        <div className="min-w-0 mr-2">
                          <p className="font-medium text-sm truncate">{session.roleTitle}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                            {session.status.toUpperCase()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="font-mono text-xs shrink-0 h-7 px-2"
                          onClick={() =>
                            setLocation(
                              session.status === "evaluated"
                                ? `/results/${session.id}`
                                : `/interview/${session.id}`
                            )
                          }
                        >
                          {session.status === "evaluated" ? "RESULTS" : "RESUME"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
