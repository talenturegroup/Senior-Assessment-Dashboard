import { useLocation } from "wouter";
import { Navbar } from "../components/navbar";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Terminal, Play, Layers,
  Code2, Server, Brain, Cloud, Briefcase, Globe,
  Zap, Cpu, Smartphone, Database, Lock,
} from "lucide-react";

const ALL_ROLES = [
  { title: "Cybersecurity Analyst", category: "Security", desc: "Threat analysis, incident response, SIEM, vulnerability management.", icon: Lock, color: "text-red-400", border: "hover:border-red-400/40" },
  { title: "Senior Software Engineer", category: "Engineering", desc: "System architecture, full-stack complexity, scalability.", icon: Code2, color: "text-cyan-400", border: "hover:border-cyan-400/40" },
  { title: "DevOps / Site Reliability Engineer", category: "Infrastructure", desc: "CI/CD pipelines, Kubernetes, observability, platform engineering.", icon: Server, color: "text-orange-400", border: "hover:border-orange-400/40" },
  { title: "Data Scientist / ML Engineer", category: "Data & AI", desc: "ML model design, feature engineering, experimentation at scale.", icon: Brain, color: "text-purple-400", border: "hover:border-purple-400/40" },
  { title: "Cloud Architect", category: "Infrastructure", desc: "AWS/GCP/Azure design, Terraform, distributed systems.", icon: Cloud, color: "text-blue-400", border: "hover:border-blue-400/40" },
  { title: "Product Manager (Technical)", category: "Product", desc: "Technical roadmaps, stakeholder alignment, product strategy.", icon: Briefcase, color: "text-yellow-400", border: "hover:border-yellow-400/40" },
  { title: "Full-Stack Developer", category: "Engineering", desc: "End-to-end features across frontend, backend, and database layers.", icon: Globe, color: "text-emerald-400", border: "hover:border-emerald-400/40" },
  { title: "Backend Engineer (Node.js / Python)", category: "Engineering", desc: "High-performance APIs, microservices, distributed systems.", icon: Zap, color: "text-amber-400", border: "hover:border-amber-400/40" },
  { title: "Frontend Engineer (React)", category: "Engineering", desc: "React performance, accessibility, component architecture.", icon: Cpu, color: "text-sky-400", border: "hover:border-sky-400/40" },
  { title: "AI / LLM Engineer", category: "Data & AI", desc: "LLM fine-tuning, RAG pipelines, prompt engineering, MLOps.", icon: Brain, color: "text-violet-400", border: "hover:border-violet-400/40" },
  { title: "Mobile Developer (iOS/Android)", category: "Engineering", desc: "Native and cross-platform apps, performance, device APIs.", icon: Smartphone, color: "text-rose-400", border: "hover:border-rose-400/40" },
  { title: "Database Administrator", category: "Infrastructure", desc: "Schema design, query optimization, replication, reliability.", icon: Database, color: "text-teal-400", border: "hover:border-teal-400/40" },
];

export default function Landing() {
  const [, setLocation] = useLocation();

  const handleRoleClick = (roleTitle: string) => {
    sessionStorage.setItem("pendingRole", roleTitle);
    setLocation("/sign-in");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      {/* Subtle background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

      <main className="flex-1 container mx-auto py-10 px-4 space-y-10 max-w-7xl z-10">

        {/* Compact hero */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-mono">
            <Terminal className="h-4 w-4" />
            <span>SENIOR_ASSESSMENT_PROTOCOL</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
            Choose your assessment.
          </h1>
          <p className="text-muted-foreground font-mono text-sm md:text-base">
            Select a role below to begin. Our AI-driven video interviewer runs rigorous,
            dynamic technical assessments calibrated for professionals with 5+ years of experience.
          </p>
        </div>

        {/* Role cards — the first thing users see */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-mono tracking-tight flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> AVAILABLE_ASSESSMENTS
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <Card
                  key={role.title}
                  className={`border-border/40 transition-all duration-200 bg-card/40 cursor-pointer group ${role.border}`}
                  onClick={() => handleRoleClick(role.title)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-2 rounded bg-secondary/60 shrink-0 ${role.color}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="text-sm leading-snug">{role.title}</CardTitle>
                          <Badge variant="secondary" className="font-mono text-[10px] mt-1 px-1.5 py-0">
                            {role.category}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`font-mono text-xs shrink-0 h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity ${role.color} hover:bg-secondary/80`}
                        onClick={(e) => { e.stopPropagation(); handleRoleClick(role.title); }}
                      >
                        <Play className="h-3 w-3 mr-1" /> START
                      </Button>
                    </div>
                    <CardDescription className="text-xs mt-3 leading-relaxed">
                      {role.desc}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

      </main>
    </div>
  );
}
