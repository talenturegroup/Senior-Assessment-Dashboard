import { useLocation } from "wouter";
import { useCandidate } from "../lib/use-candidate";
import { useGetCandidate, useGetDashboardStats, useListSessions, useCreateSession } from "@workspace/api-client-react";
import { Navbar } from "../components/navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Play, ShieldAlert, BadgeCheck, Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const ROLES = [
  { title: "Senior Software Engineer", desc: "System architecture, full-stack complexity, scalability." },
  { title: "Cloud Architect", desc: "AWS/GCP, infrastructure as code, distributed systems." },
  { title: "AI / LLM Engineer", desc: "Model fine-tuning, RAG pipelines, ML ops." },
];

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { candidateId } = useCandidate();

  const { data: candidate, isLoading: isLoadingCandidate } = useGetCandidate(candidateId as number, {
    query: { enabled: !!candidateId }
  });

  const { data: stats } = useGetDashboardStats();
  const { data: sessions, isLoading: isLoadingSessions } = useListSessions({ candidateId: candidateId as number }, {
    query: { enabled: !!candidateId }
  });

  const createSession = useCreateSession();

  if (!candidateId) {
    setLocation("/");
    return null;
  }

  const handleStartAssessment = (roleTitle: string) => {
    createSession.mutate(
      {
        data: {
          candidateId: candidateId,
          roleTitle: roleTitle,
          jobDescription: "Standard senior level assessment for " + roleTitle,
        }
      },
      {
        onSuccess: (session) => {
          setLocation(`/interview/${session.id}`);
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto py-8 px-4 space-y-8">
        
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              Dashboard
              {candidate?.profileComplete && <Badge variant="outline" className="text-primary border-primary">VERIFIED</Badge>}
            </h1>
            <p className="text-muted-foreground mt-2 font-mono text-sm">
              Candidate: {candidate?.name || "Loading..."} // Role: {candidate?.role}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" /> PLATFORM_AVG
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.averageScore ? stats.averageScore.toFixed(1) : "--"} / 100</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" /> TOTAL_EVALUATIONS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.completedSessions || "--"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card/50 backdrop-blur border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono text-muted-foreground flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> PASS_RATE
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.hireRate ? `${stats.hireRate.toFixed(1)}%` : "--"}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" /> AVAILABLE_ASSESSMENTS
            </h2>
            <div className="grid gap-4">
              {ROLES.map((role) => (
                <Card key={role.title} className="border-border/50 hover:border-primary/50 transition-colors bg-card/40">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{role.title}</CardTitle>
                        <CardDescription className="mt-1">{role.desc}</CardDescription>
                      </div>
                      <Button 
                        size="sm" 
                        className="font-mono"
                        onClick={() => handleStartAssessment(role.title)}
                        disabled={createSession.isPending}
                      >
                        <Play className="h-4 w-4 mr-2" /> INIT
                      </Button>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-bold font-mono tracking-tight flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> SESSION_LOGS
            </h2>
            <Card className="border-border/50 bg-card/40">
              <CardContent className="p-0">
                {isLoadingSessions ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-12 w-full bg-secondary" />
                    <Skeleton className="h-12 w-full bg-secondary" />
                  </div>
                ) : !sessions || sessions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                    NO_SESSIONS_FOUND
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {sessions.map(session => (
                      <div key={session.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{session.roleTitle}</p>
                          <p className="text-xs text-muted-foreground font-mono mt-1">STATUS: {session.status.toUpperCase()}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setLocation(session.status === 'evaluated' ? `/results/${session.id}` : `/interview/${session.id}`)}>
                          VIEW
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
