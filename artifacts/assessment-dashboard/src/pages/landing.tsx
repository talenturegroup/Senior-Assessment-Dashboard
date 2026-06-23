import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "../components/navbar";
import { Footer } from "../components/footer";
import { RoleCard } from "../components/role-card";
import { ALL_ROLES, ROLE_CATEGORIES, type RoleCategory } from "../lib/roles";
import { Button } from "@/components/ui/button";
import {
  Layers, ArrowRight, Video, FileText, Gauge,
} from "lucide-react";

type Filter = "All" | RoleCategory;

const HOW_IT_WORKS = [
  { icon: FileText, title: "Calibrate", desc: "Upload your CV so the AI tailors question depth to your experience." },
  { icon: Video, title: "Interview", desc: "Answer dynamic, role-specific questions in a live video session." },
  { icon: Gauge, title: "Get scored", desc: "Receive a rigorous, structured evaluation with strengths and gaps." },
];

export default function Landing() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<Filter>("All");

  const handleRoleClick = (roleTitle: string) => {
    sessionStorage.setItem("pendingRole", roleTitle);
    setLocation("/sign-in");
  };

  const visibleRoles = useMemo(
    () => (filter === "All" ? ALL_ROLES : ALL_ROLES.filter((r) => r.category === filter)),
    [filter]
  );

  const filters: Filter[] = ["All", ...ROLE_CATEGORIES];

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <Navbar />

      {/* Background grid + radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:28px_28px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/15 blur-[120px]" />

      <main className="z-10 mx-auto w-full max-w-7xl flex-1 px-4 py-16">

        {/* Hero */}
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="text-balance text-5xl font-extrabold tracking-tighter md:text-6xl">
            Get matched to top{" "}
            <span className="bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-transparent">
              AI
            </span>{" "}
            roles.
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Pick a role and face a rigorous, adaptive technical interview — calibrated for
            professionals with 5+ years of experience and scored in minutes.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              className="font-mono text-xs tracking-wider"
              onClick={() => document.getElementById("assessments")?.scrollIntoView({ behavior: "smooth" })}
            >
              BROWSE ASSESSMENTS <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="font-mono text-xs tracking-wider"
              onClick={() => setLocation("/sign-in")}
            >
              SIGN IN
            </Button>
          </div>
        </div>

        {/* How it works */}
        <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="relative rounded-lg border border-border/50 bg-card/40 p-5 backdrop-blur"
              >
                <span className="absolute right-4 top-4 font-mono text-xs text-muted-foreground/40">
                  0{i + 1}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Assessments */}
        <div id="assessments" className="mt-20 scroll-mt-20 space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
                  className={`rounded-full border px-3 py-1 font-mono text-xs transition-colors ${
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRoles.map((role) => (
              <RoleCard key={role.title} role={role} onSelect={handleRoleClick} />
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
